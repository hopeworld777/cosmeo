import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  // pg's default idleTimeoutMillis (10s) was closing the pooled connection
  // during the ~10-20s a person spends reading the page and typing
  // credentials. The next query — the login lookup — then paid a full
  // TCP+TLS reconnect to the remote DB (measured ~1.7-2s), which is exactly
  // the "login feels slow" delay. Keep connections open much longer so a
  // normal login (or any other request) almost never pays that cost.
  idleTimeoutMillis: 5 * 60 * 1000,
  keepAlive: true,
});

// A connection that's open for minutes can still get dropped by the DB
// provider or an intermediate proxy. pg surfaces that as an 'error' event on
// the pool; without a listener it crashes the whole process. Log and let the
// pool create a fresh connection on the next query instead.
pool.on("error", (err) => {
  console.error("Postgres pool error (idle client):", err.message);
});

// Belt-and-suspenders: ping periodically so at least one connection stays
// warm even across long idle stretches (e.g. overnight), so the very first
// login attempt of the day isn't the one that pays the reconnect cost.
setInterval(() => {
  pool.query("SELECT 1").catch((err) => {
    console.error("DB keep-alive ping failed:", err.message);
  });
}, 4 * 60 * 1000);

export default pool;

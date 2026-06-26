import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/wallet — get current balance
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT balance FROM users WHERE id = $1",
      [req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    res.json({ balance: Number(result.rows[0].balance) });
  } catch (err) {
    console.error("Wallet fetch error:", err);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// POST /api/wallet/withdraw
router.post("/withdraw", requireAuth, async (req, res) => {
  const { amount, account_number, bank } = req.body;
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: "Enter a valid withdrawal amount" });
  }
  if (!account_number || String(account_number).trim().length < 4) {
    return res.status(400).json({ error: "Enter a valid account number" });
  }

  const withdrawAmt = Number(amount);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      "SELECT balance FROM users WHERE id = $1 FOR UPDATE",
      [req.userId]
    );
    if (!userRes.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }

    const currentBalance = Number(userRes.rows[0].balance);
    if (withdrawAmt > currentBalance) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Insufficient balance. Available: ₾${currentBalance.toFixed(2)}` });
    }

    const newBalance = currentBalance - withdrawAmt;
    await client.query(
      "UPDATE users SET balance = $1 WHERE id = $2",
      [newBalance, req.userId]
    );

    await client.query("COMMIT");
    res.json({
      success: true,
      withdrawn: withdrawAmt,
      new_balance: newBalance,
      message: `₾${withdrawAmt.toFixed(2)} withdrawal to ${bank || "your bank"} is being processed.`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Withdraw error:", err);
    res.status(500).json({ error: "Withdrawal failed" });
  } finally {
    client.release();
  }
});

export default router;

-- Kosmeo database schema
-- Run once to initialize all tables

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(30)    NOT NULL UNIQUE,
  email           VARCHAR(255)   NOT NULL UNIQUE,
  password_hash   TEXT           NOT NULL,
  bio             TEXT           DEFAULT '',
  avatar_url      TEXT,
  location        VARCHAR(100),
  balance         NUMERIC(10,2)  DEFAULT 0,
  rating          NUMERIC(3,2),
  review_count    INTEGER        DEFAULT 0,
  sales_count     INTEGER        DEFAULT 0,
  email_verified  BOOLEAN        DEFAULT false,
  is_admin        BOOLEAN        DEFAULT false,
  is_banned       BOOLEAN        DEFAULT false,
  warning_count   INTEGER        DEFAULT 0,
  created_at      TIMESTAMPTZ    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT         NOT NULL UNIQUE,
  type        VARCHAR(50)  NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listings (
  id           SERIAL PRIMARY KEY,
  seller_id    INTEGER        REFERENCES users(id) ON DELETE CASCADE,
  title        VARCHAR(200)   NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2),
  rent_price   NUMERIC(10,2),
  is_for_sale  BOOLEAN        DEFAULT false,
  is_for_rent  BOOLEAN        DEFAULT false,
  category     VARCHAR(50),
  fandom       VARCHAR(100),
  size         VARCHAR(50),
  condition    VARCHAR(50),
  status       VARCHAR(20)    DEFAULT 'active',
  is_active    BOOLEAN        DEFAULT true,
  is_flagged   BOOLEAN        DEFAULT false,
  views        INTEGER        DEFAULT 0,
  sold_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listing_images (
  id          SERIAL PRIMARY KEY,
  listing_id  INTEGER  REFERENCES listings(id) ON DELETE CASCADE,
  image_url   TEXT     NOT NULL,
  sort_order  INTEGER  DEFAULT 0
);

CREATE TABLE IF NOT EXISTS favorites (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      REFERENCES users(id)    ON DELETE CASCADE,
  listing_id  INTEGER      REFERENCES listings(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id          SERIAL PRIMARY KEY,
  listing_id  INTEGER      REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id    INTEGER      REFERENCES users(id)    ON DELETE CASCADE,
  seller_id   INTEGER      REFERENCES users(id)    ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id               SERIAL PRIMARY KEY,
  conversation_id  INTEGER      REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        INTEGER      REFERENCES users(id)         ON DELETE CASCADE,
  recipient_id     INTEGER      REFERENCES users(id)         ON DELETE CASCADE,
  body             TEXT         NOT NULL,
  is_read          BOOLEAN      DEFAULT false,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id           SERIAL PRIMARY KEY,
  listing_id   INTEGER  REFERENCES listings(id) ON DELETE SET NULL,
  reviewer_id  INTEGER  REFERENCES users(id)    ON DELETE CASCADE,
  seller_id    INTEGER  REFERENCES users(id)    ON DELETE CASCADE,
  rating       INTEGER  CHECK (rating >= 1 AND rating <= 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id               SERIAL PRIMARY KEY,
  reporter_id      INTEGER      REFERENCES users(id)         ON DELETE CASCADE,
  reported_user_id INTEGER      REFERENCES users(id)         ON DELETE SET NULL,
  listing_id       INTEGER      REFERENCES listings(id)      ON DELETE SET NULL,
  conversation_id  INTEGER      REFERENCES conversations(id) ON DELETE SET NULL,
  reason           VARCHAR(100) NOT NULL,
  detail           TEXT         DEFAULT '',
  status           VARCHAR(20)  DEFAULT 'open',
  resolution_note  TEXT,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      INTEGER      REFERENCES users(id)         ON DELETE SET NULL,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- Kosmeo database schema
-- Run once to initialize all tables

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(30)    NOT NULL UNIQUE,
  email           VARCHAR(255)   NOT NULL UNIQUE,
  password_hash   TEXT,
  bio             TEXT           DEFAULT '',
  avatar_url      TEXT,
  location        VARCHAR(100),
  balance         NUMERIC(10,2)  DEFAULT 0,
  rating          NUMERIC(3,2),
  review_count    INTEGER        DEFAULT 0,
  sales_count     INTEGER        DEFAULT 0,
  buyer_rating       NUMERIC(3,2),
  buyer_review_count INTEGER     DEFAULT 0,
  email_verified  BOOLEAN        DEFAULT false,
  is_admin        BOOLEAN        DEFAULT false,
  is_verified     BOOLEAN        DEFAULT false,
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
  is_featured  BOOLEAN        DEFAULT false,
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
  body             TEXT,
  is_read          BOOLEAN      DEFAULT false,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);
-- Idempotent migration guard: a pre-existing messages table (created before
-- image attachments existed) has body NOT NULL — a message with only an
-- image attachment and no caption needs body to be nullable. Running this
-- against an already-nullable column is a safe no-op.
ALTER TABLE messages ALTER COLUMN body DROP NOT NULL;

-- Chat image attachments, kept in their own table (mirroring listing_images
-- for listings) so chat media is never mixed with listing media — a message
-- can have zero or more attachments, independent of its text body.
CREATE TABLE IF NOT EXISTS message_attachments (
  id          SERIAL PRIMARY KEY,
  message_id  INTEGER      REFERENCES messages(id) ON DELETE CASCADE,
  image_url   TEXT         NOT NULL,
  thumb_url   TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id           SERIAL PRIMARY KEY,
  listing_id   INTEGER  REFERENCES listings(id) ON DELETE SET NULL,
  reviewer_id  INTEGER  REFERENCES users(id)    ON DELETE CASCADE,
  seller_id    INTEGER  REFERENCES users(id)    ON DELETE CASCADE,
  buyer_id     INTEGER  REFERENCES users(id)    ON DELETE CASCADE,
  review_type  VARCHAR(10) NOT NULL DEFAULT 'seller' CHECK (review_type IN ('seller', 'buyer')),
  rating       INTEGER  CHECK (rating >= 1 AND rating <= 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, reviewer_id, review_type)
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

-- Idempotent migration guard: ensures is_featured exists even if this schema
-- file is re-run against a database created before the column was added.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Idempotent migration guard: cosplay brand/maker field on listings.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50)  NOT NULL,
  message_en  TEXT,
  message_ka  TEXT,
  is_read     BOOLEAN      DEFAULT false,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Idempotent migration guards for the reviews/buyer-rating feature, in case
-- this schema file is re-run against a database created before it existed.
-- Waitlist table for pre-launch email capture
CREATE TABLE IF NOT EXISTS waitlist (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  status          VARCHAR(50)  NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  link_sent       BOOLEAN      NOT NULL DEFAULT false,
  link_sent_at    TIMESTAMPTZ,
  vip_invited     BOOLEAN      NOT NULL DEFAULT false,
  vip_invited_at  TIMESTAMPTZ
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS buyer_rating NUMERIC(3,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS buyer_review_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_type VARCHAR(10) NOT NULL DEFAULT 'seller' CHECK (review_type IN ('seller', 'buyer'));
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_listing_id_reviewer_id_review_type_key'
  ) THEN
    ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_listing_id_reviewer_id_key;
    ALTER TABLE reviews ADD CONSTRAINT reviews_listing_id_reviewer_id_review_type_key UNIQUE (listing_id, reviewer_id, review_type);
  END IF;
END $migration$;

-- Invite-only beta access system.
-- access_status drives whether an authenticated user gets full app access
-- or is held on the waitlist screen: WAITLIST (default) | VIP | ADMIN.
-- Kept as a plain column (not derived) so it survives independently of
-- is_admin/is_banned and can be flipped by hand for support purposes.
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_status VARCHAR(10) NOT NULL DEFAULT 'WAITLIST'
  CHECK (access_status IN ('WAITLIST', 'VIP', 'ADMIN'));

-- Keep existing admin accounts consistent with the new column.
UPDATE users SET access_status = 'ADMIN' WHERE is_admin = true AND access_status <> 'ADMIN';

-- Reusable invite-link codes, e.g. /invite/COSMEOBETA — anyone who signs up
-- through a valid, active code is granted VIP access immediately.
CREATE TABLE IF NOT EXISTS invite_codes (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(50)  NOT NULL UNIQUE,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
-- Idempotent migration guard: covers a pre-existing invite_codes table
-- (created before is_active existed) so this file stays safe to re-run.
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
INSERT INTO invite_codes (code) VALUES ('COSMEOBETA') ON CONFLICT (code) DO NOTHING;

-- Google Sign-In support: accounts created (or linked) via Google have no
-- local password, so password_hash must be nullable. google_id is the
-- stable Google "sub" claim — unique per Google account, used to find or
-- link a user without ever creating a duplicate for the same email.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Create user_credentials table for password authentication
CREATE TABLE IF NOT EXISTS user_credentials (
  id TEXT PRIMARY KEY, -- Same as user_id
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_credentials_email ON user_credentials(email);

-- Create passkeys table for WebAuthn credentials
CREATE TABLE IF NOT EXISTS passkeys (
  id TEXT PRIMARY KEY, -- credential_id from WebAuthn
  user_id TEXT NOT NULL,
  credential_public_key BYTEA NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}',
  backup_eligible BOOLEAN NOT NULL DEFAULT false,
  backup_state BOOLEAN NOT NULL DEFAULT false,
  name TEXT, -- User-friendly name for the passkey (e.g., "iPhone", "YubiKey")
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON passkeys(user_id);

-- Index for credential_id lookups (primary authentication)
CREATE INDEX IF NOT EXISTS idx_passkeys_id ON passkeys(id);

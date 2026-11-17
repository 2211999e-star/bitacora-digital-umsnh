ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin TINYINT(1) NOT NULL DEFAULT 0;

UPDATE users
SET is_admin = 1
WHERE username = 'ivan';

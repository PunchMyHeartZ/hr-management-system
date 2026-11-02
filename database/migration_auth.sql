-- ============================================================
-- HR System - Auth migration (users table)
-- Seeding demo accounts is done by the node migration runner
-- (password hashes are generated with bcryptjs).
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    user_id       SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(150) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'executive'
                  CHECK (role IN ('hr', 'executive')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

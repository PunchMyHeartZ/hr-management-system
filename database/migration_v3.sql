-- Migration v3: announcements, performance reviews, recruitment, employee self-service
-- Run against hr_db (idempotent: safe to re-run)

BEGIN;

-- Self-service: link user accounts to employees + allow 'employee' role
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id INT REFERENCES employees(employee_id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee ON users(employee_id) WHERE employee_id IS NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('hr', 'executive', 'employee'));

-- Company announcements
CREATE TABLE IF NOT EXISTS announcements (
  announcement_id SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  created_by  INT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance reviews
CREATE TABLE IF NOT EXISTS reviews (
  review_id     SERIAL PRIMARY KEY,
  employee_id   INT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  period_year   INT NOT NULL,
  reviewer_name VARCHAR(150) NOT NULL,
  overall_score NUMERIC(4,2),
  strengths     TEXT,
  improvements  TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, period_year)
);
CREATE INDEX IF NOT EXISTS idx_reviews_employee ON reviews(employee_id);

CREATE TABLE IF NOT EXISTS review_goals (
  goal_id   SERIAL PRIMARY KEY,
  review_id INT NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
  title     VARCHAR(255) NOT NULL,
  weight    INT NOT NULL DEFAULT 1,
  score     NUMERIC(4,2)
);
CREATE INDEX IF NOT EXISTS idx_review_goals_review ON review_goals(review_id);

-- Recruitment
CREATE TABLE IF NOT EXISTS positions (
  position_id   SERIAL PRIMARY KEY,
  title         VARCHAR(150) NOT NULL,
  department_id INT REFERENCES departments(department_id) ON DELETE SET NULL,
  description   TEXT,
  headcount     INT NOT NULL DEFAULT 1,
  status        VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applicants (
  applicant_id SERIAL PRIMARY KEY,
  position_id  INT NOT NULL REFERENCES positions(position_id) ON DELETE CASCADE,
  full_name    VARCHAR(150) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  phone        VARCHAR(20),
  status       VARCHAR(20) NOT NULL DEFAULT 'applied',
  notes        TEXT,
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_applicants_position ON applicants(position_id);

COMMIT;

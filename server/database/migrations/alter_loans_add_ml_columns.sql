ALTER TABLE loans
  MODIFY COLUMN status ENUM('approved', 'rejected', 'pending') NOT NULL,
  ADD COLUMN IF NOT EXISTS risk_score DECIMAL(6,4) DEFAULT NULL AFTER decision_reason,
  ADD COLUMN IF NOT EXISTS statement_path VARCHAR(255) DEFAULT NULL AFTER existing_loans;

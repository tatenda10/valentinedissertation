CREATE TABLE IF NOT EXISTS loan_repayments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  loan_id INT NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(100) DEFAULT NULL,
  reference_note VARCHAR(255) DEFAULT NULL,
  recorded_by_user_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_loan_repayments_loan
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
  CONSTRAINT fk_loan_repayments_user
    FOREIGN KEY (recorded_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_loan_repayments_loan (loan_id),
  INDEX idx_loan_repayments_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

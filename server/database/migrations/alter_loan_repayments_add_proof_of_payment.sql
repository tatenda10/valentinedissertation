ALTER TABLE loan_repayments
  ADD COLUMN proof_of_payment_path VARCHAR(255) DEFAULT NULL AFTER reference_note;

-- Reconstructed CREATE TABLE statements for the application
-- Assumptions:
-- 1) `Gender` column name is used in code in mixed case; on Windows/MySQL this is case-insensitive.
-- 2) Employment and other enums are inferred from usages in code.
-- 3) Adjust types/lengths as needed for your environment.

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  INDEX idx_user_roles_user (user_id),
  INDEX idx_user_roles_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(50),
  Gender ENUM('male','female','other') DEFAULT 'other',
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_zip_code VARCHAR(20),
  address_country VARCHAR(100),
  date_of_birth DATE,
  employment_status ENUM('employed','self-employed','unemployed','retired') DEFAULT 'employed',
  monthly_income DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clients_email (email),
  INDEX idx_clients_employment (employment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- loans table (copied / adapted from existing migration)
CREATE TABLE IF NOT EXISTS loans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  loan_reference VARCHAR(20) NOT NULL UNIQUE,
  client_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  purpose VARCHAR(255) NOT NULL,
  duration INT NOT NULL COMMENT 'Loan duration in months',
  interest_rate DECIMAL(5, 2) NOT NULL,
  monthly_payment DECIMAL(10, 2) NOT NULL,
  status ENUM('approved', 'rejected', 'pending') NOT NULL,
  decision_reason TEXT NOT NULL,
  risk_score DECIMAL(6,4) DEFAULT NULL,
  monthly_income DECIMAL(10, 2) NOT NULL,
  employment_status ENUM('employed', 'self-employed', 'unemployed', 'retired') NOT NULL,
  existing_loans INT NOT NULL DEFAULT 0,
  statement_path VARCHAR(255) DEFAULT NULL,
  application_date TIMESTAMP NOT NULL,
  decision_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  INDEX idx_loan_reference (loan_reference),
  INDEX idx_client_id (client_id),
  INDEX idx_status (status),
  INDEX idx_application_date (application_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- audit_logs (copied from existing SQL)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action_type ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'ROLE_CHANGE') NOT NULL,
    action_description TEXT NOT NULL,
    entity_type ENUM('USER', 'ROLE', 'PERMISSION', 'SYSTEM') NOT NULL,
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    status ENUM('SUCCESS', 'FAILURE') NOT NULL DEFAULT 'SUCCESS',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_action (action_type),
    INDEX idx_created_at (created_at),
    INDEX idx_user (user_id)
);

-- End of file

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  is_enabled BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_order_amount DECIMAL(10,2),
  instructions TEXT,
  notes TEXT,
  requires_proof BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  bank_name VARCHAR(100) NOT NULL,
  account_title VARCHAR(100) NOT NULL,
  account_number VARCHAR(50),
  iban VARCHAR(50),
  branch_name VARCHAR(100),
  branch_code VARCHAR(20),
  swift_code VARCHAR(20),
  qr_image_url TEXT,
  qr_image_public_id TEXT,
  logo_url TEXT,
  logo_public_id TEXT,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Digital Wallets Table
CREATE TABLE IF NOT EXISTS digital_wallets (
  id SERIAL PRIMARY KEY,
  type VARCHAR(30) UNIQUE NOT NULL,
  account_name VARCHAR(100),
  mobile_number VARCHAR(20),
  username VARCHAR(100),
  raast_id VARCHAR(100),
  linked_bank VARCHAR(100),
  qr_image_url TEXT,
  qr_image_public_id TEXT,
  instructions TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Proofs Table
CREATE TABLE IF NOT EXISTS payment_proofs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  payment_method VARCHAR(30) NOT NULL,
  screenshot_url TEXT NOT NULL,
  screenshot_public_id TEXT,
  transaction_id VARCHAR(100),
  sender_name VARCHAR(100),
  sender_number VARCHAR(20),
  payment_date DATE,
  notes TEXT,
  amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','refunded')),
  admin_note TEXT,
  verified_at TIMESTAMP,
  verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_order ON payment_proofs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON payment_proofs(status);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_method ON payment_proofs(payment_method);

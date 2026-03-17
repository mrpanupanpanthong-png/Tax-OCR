-- Create Audit Logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES tax_invoices(id) ON DELETE CASCADE,
    user_id UUID, -- Placeholder for actual user ID from Supabase Auth
    user_name TEXT, -- To show who made the change
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Mock some roles for the existing client setup if needed, 
-- or simply assume the role will be checked in the app logic for now.
-- In a real scenario, we would have a 'profiles' table.
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    role VARCHAR(50) DEFAULT 'data_entry', -- 'data_entry' or 'supervisor'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_audit_logs_invoice_id ON audit_logs(invoice_id);

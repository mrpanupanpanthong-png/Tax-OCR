-- Create Enums
CREATE TYPE invoice_status AS ENUM ('pending', 'confirmed');
CREATE TYPE invoice_type AS ENUM ('purchase', 'sale');

-- Create the clients table (for accounting firm's customers)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50) NOT NULL, -- Client's Tax ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the main invoices table
CREATE TABLE tax_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    file_url TEXT NOT NULL,
    
    -- Extracted OCR Data
    vendor_name VARCHAR(255),
    tax_id VARCHAR(50),      -- Vendor's Tax ID
    invoice_no VARCHAR(100),
    invoice_date DATE,
    
    -- Amounts
    total_amount NUMERIC(12, 2),
    vat_amount NUMERIC(12, 2),
    net_amount NUMERIC(12, 2),
    
    -- Processing status & type
    status invoice_status DEFAULT 'pending',
    type invoice_type DEFAULT 'purchase',
    
    -- Raw Gemini API JSON Response
    raw_data JSONB
);

-- Index for searching by client
CREATE INDEX idx_tax_invoices_client_id ON tax_invoices(client_id);

-- Index for querying by status
CREATE INDEX idx_tax_invoices_status ON tax_invoices(status);

-- Add a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tax_invoices_modtime
    BEFORE UPDATE ON tax_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Optional: Enable Row Level Security (RLS) if Supabase Auth is strictly applied
-- ALTER TABLE tax_invoices ENABLE ROW LEVEL SECURITY;

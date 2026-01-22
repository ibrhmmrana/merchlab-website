-- Create table to store voice agent call records
CREATE TABLE call_records (
    id BIGSERIAL PRIMARY KEY,
    transcript TEXT,
    cost DECIMAL(10, 6),
    call_recording TEXT,
    summary TEXT,
    name VARCHAR(255),
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    item TEXT, -- Item (Colour - Size - Qty)
    quote_number VARCHAR(100),
    quote TEXT, -- Quote URL
    grand_total VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on quote_number for faster lookups
CREATE INDEX idx_call_records_quote_number ON call_records(quote_number);

-- Create index on email for faster lookups
CREATE INDEX idx_call_records_email ON call_records(email);

-- Create index on phone for faster lookups
CREATE INDEX idx_call_records_phone ON call_records(phone);

-- Create index on created_at for time-based queries
CREATE INDEX idx_call_records_created_at ON call_records(created_at);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_call_records_updated_at
    BEFORE UPDATE ON call_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE call_records IS 'Stores voice agent call records with transcript, cost, customer info, and quote details';
COMMENT ON COLUMN call_records.cost IS 'Cost of the call in currency units';
COMMENT ON COLUMN call_records.call_recording IS 'URL to the call recording file';
COMMENT ON COLUMN call_records.quote IS 'URL to the quote PDF file';
COMMENT ON COLUMN call_records.item IS 'Item details in format: Item Name (Colour - Size - Qty), can contain multiple items';

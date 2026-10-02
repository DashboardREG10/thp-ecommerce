-- Supabase Schema for THP e-Commerce
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shipments table (converted from D1 schema)
CREATE TABLE shipments (
    track_no TEXT PRIMARY KEY,
    date_received TEXT,
    sender_name TEXT,
    receiver_name TEXT,
    destination_office TEXT,
    cod_amount TEXT,
    current_status TEXT,
    receiver_address TEXT,
    receiver_phone TEXT,
    area TEXT,
    owner TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance (matching D1 indexes + additional)
CREATE INDEX IF NOT EXISTS idx_shipments_owner ON shipments(owner);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(current_status);
CREATE INDEX IF NOT EXISTS idx_shipments_date ON shipments(date_received);
CREATE INDEX IF NOT EXISTS idx_shipments_updated ON shipments(updated_at);
CREATE INDEX IF NOT EXISTS idx_shipments_owner_updated ON shipments(owner, updated_at);
CREATE INDEX IF NOT EXISTS idx_shipments_track_no ON shipments(track_no);

-- Optional: Add RLS policies if you want to enable Row Level Security later
-- ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own shipments" ON shipments
--     FOR SELECT USING (owner = current_user_id());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View for daily stats (useful for dashboard)
CREATE OR REPLACE VIEW daily_shipment_stats AS
SELECT 
    date_received as date,
    COUNT(*) as total_shipments,
    COUNT(CASE WHEN current_status ILIKE '%นำจ่ายถึงผู้รับ%' OR current_status ILIKE '%ชำระเงินเรียบร้อย%' THEN 1 END) as successful,
    COUNT(CASE WHEN current_status ILIKE '%ส่งคืน%' OR current_status ILIKE '%ตีกลับ%' THEN 1 END) as returned,
    SUM(CAST(REPLACE(cod_amount, ',', '') AS DECIMAL)) as total_cod
FROM shipments
WHERE date_received IS NOT NULL
GROUP BY date_received
ORDER BY date_received DESC;

-- View for destination stats
CREATE OR REPLACE VIEW destination_stats AS
SELECT 
    destination_office,
    COUNT(*) as total_shipments,
    COUNT(CASE WHEN current_status ILIKE '%นำจ่ายถึงผู้รับ%' OR current_status ILIKE '%ชำระเงินเรียบร้อย%' THEN 1 END) as successful,
    AVG(CASE 
        WHEN date_received ~ '^\d{2}/\d{2}/\d{4}' THEN
            EXTRACT(DAY FROM (NOW() - TO_DATE(date_received, 'DD/MM/YYYY')))
        ELSE NULL
    END) as avg_days
FROM shipments
WHERE destination_office IS NOT NULL
GROUP BY destination_office
ORDER BY total_shipments DESC;
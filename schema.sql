DROP TABLE IF EXISTS shipments;
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for reducing Full Table Scan and Rows Read quota
CREATE INDEX IF NOT EXISTS idx_shipments_owner ON shipments(owner);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(current_status);
CREATE INDEX IF NOT EXISTS idx_shipments_date ON shipments(date_received);
CREATE INDEX IF NOT EXISTS idx_shipments_updated ON shipments(updated_at);
CREATE INDEX IF NOT EXISTS idx_shipments_owner_updated ON shipments(owner, updated_at);

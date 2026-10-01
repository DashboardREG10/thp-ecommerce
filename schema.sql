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

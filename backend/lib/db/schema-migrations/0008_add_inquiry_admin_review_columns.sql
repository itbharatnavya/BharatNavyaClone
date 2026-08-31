-- A broad RFQ that matches zero sellers (novel category/product, or a real
-- category nobody stocks yet) used to be a silent dead end: the buyer got a
-- false "sent" confirmation and no seller or admin ever saw it. These columns
-- back a new admin "Unmatched RFQs" queue (routes/adminInquiries.js) that can
-- view and manually forward such an inquiry to a chosen seller, or dismiss it.
-- Naming mirrors category-suggestions.json's status/decidedBy/decidedAt.
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS unmatched BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS admin_status TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS decided_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;

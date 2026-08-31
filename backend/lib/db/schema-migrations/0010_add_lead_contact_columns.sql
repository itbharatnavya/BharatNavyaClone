-- Backs the RFQ "Connect" feature: a seller calling/WhatsApp-ing a buyer
-- directly (replacing the removed Quote-back flow) records which channel and
-- when, right on the lead delivery row, so buyer/seller/admin RFQ lists can
-- all show the same contact status.
ALTER TABLE leads_ledger ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ;
ALTER TABLE leads_ledger ADD COLUMN IF NOT EXISTS contacted_via TEXT;

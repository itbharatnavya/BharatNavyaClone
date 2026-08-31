-- The RFQ quote-back flow (seller fills in a price/MOQ/delivery quote form,
-- buyer compares quotes) is retired — RFQ now works like every other Directory
-- contact path: the seller connects with the buyer directly by call/WhatsApp
-- (see leads_ledger's contacted_at/contacted_via, 0010_add_lead_contact_columns.sql).
-- Nothing else in the codebase reads or writes this table.
DROP TABLE IF EXISTS quotes;

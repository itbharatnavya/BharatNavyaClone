-- Fixes a real cross-product data leak: blogs.json/stories.json only ever keyed
-- content by seller_id (= the author's user id, regardless of product), so a user
-- with BOTH a seller_profile (Directory) and an employer_profile (Recruitment) had
-- one merged, undivided blog/story list shown identically in both dashboards' Blogs
-- and Stories tabs. author_type records which dashboard a post was created under so
-- it can be filtered per product from here on. Existing rows default to 'seller'
-- since Directory predates Recruitment and all pre-existing content was authored
-- as a seller.
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author_type TEXT NOT NULL DEFAULT 'seller';
ALTER TABLE stories ADD COLUMN IF NOT EXISTS author_type TEXT NOT NULL DEFAULT 'seller';

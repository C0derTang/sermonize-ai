-- Add CHECK constraint for chunk_type
ALTER TABLE bible_chunks
ADD CONSTRAINT chunk_type CHECK (chunk_type IN ('single', 'verse_group'));
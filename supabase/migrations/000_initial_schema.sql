-- Enable pg_vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create translations table
CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT DEFAULT 'en'
);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  testament TEXT NOT NULL CHECK (testament IN ('old', 'new')),
  book_order INTEGER NOT NULL
);

-- Create verses table
CREATE TABLE IF NOT EXISTS verses (
  id SERIAL PRIMARY KEY,
  translation_id TEXT REFERENCES translations(id),
  book_id INTEGER REFERENCES books(id),
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  reference TEXT NOT NULL,
  text TEXT NOT NULL
);

-- Create bible_chunks table with vector embedding
CREATE TABLE IF NOT EXISTS bible_chunks (
  id SERIAL PRIMARY KEY,
  translation_id TEXT REFERENCES translations(id),
  book_id INTEGER REFERENCES books(id),
  chapter_start INTEGER NOT NULL,
  verse_start INTEGER NOT NULL,
  chapter_end INTEGER NOT NULL,
  verse_end INTEGER NOT NULL,
  reference TEXT NOT NULL,
  text TEXT NOT NULL,
  chunk_type TEXT NOT NULL,
  embedding vector(1536)
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_bible_chunks_embedding ON bible_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_bible_chunks_reference ON bible_chunks(reference);
CREATE INDEX IF NOT EXISTS idx_bible_chunks_book_id ON bible_chunks(book_id);
CREATE INDEX IF NOT EXISTS idx_bible_chunks_chunk_type ON bible_chunks(chunk_type);
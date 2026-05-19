-- Enable pg_vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create function for cosine similarity search
CREATE OR REPLACE FUNCTION match_bible_chunks(
  query_embedding vector(1536),
  match_count INTEGER DEFAULT 5,
  filter_types TEXT[] DEFAULT NULL
)
RETURNS TABLE(
  id INTEGER,
  reference TEXT,
  text TEXT,
  chunk_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.id,
    bc.reference,
    bc.text,
    bc.chunk_type,
    1 - (bc.embedding <=> query_embedding)::FLOAT AS similarity
  FROM bible_chunks bc
  WHERE filter_types IS NULL OR bc.chunk_type = ANY(filter_types)
  ORDER BY bc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
# sermonize.ai — Backend Design

## Overview

A Supabase-backed Bible verse search system that enables semantic search across scripture. The primary use case: a user writes a sermon, submits it, and the system extracts key points and returns relevant Bible verses to support those points.

## Tech Stack

- **Database**: Supabase (PostgreSQL)
- **Runtime**: Supabase Edge Functions (Deno)
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dims, one-time generation)
- **Search**: PostgreSQL `pg_vector` for vector similarity

## Database Schema

### Existing tables (provided by user)

```sql
CREATE TABLE translations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT DEFAULT 'en'
);

CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  testament TEXT NOT NULL,
  book_order INTEGER NOT NULL
);

CREATE TABLE verses (
  id SERIAL PRIMARY KEY,
  translation_id TEXT REFERENCES translations(id),
  book_id INTEGER REFERENCES books(id),
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  reference TEXT NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE bible_chunks (
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
```

## Functionality

### 1. Import Verses (one-time setup)

**Edge function**: `import-verses`

**Input**: Files in format `eng-web_{book_id}_{book_name}_{chapter}_read.txt`
- Line 1: Book title (skipped)
- Line 2: Chapter header (skipped)
- Line 3+: `{verse_number} {verse_text}`

**Process**:
1. Parse all chapter files, extracting verse number and text
2. Insert into `verses` table with correct `book_id`, `chapter`, `verse`
3. Return count of imported verses

**Books mapping**: Derived from filename (e.g., `GEN` → Genesis, `MAT` → Matthew)

### 2. Generate Embeddings (one-time setup)

**Edge function**: `embed-verses`

**Process**:
1. Read all verses from `verses` table
2. Create two chunk types:
   - **single**: Each verse as its own chunk
   - **verse_group**: Groups of 3-5 consecutive verses per chunk
3. For each chunk, generate OpenAI embedding
4. Insert into `bible_chunks` table with embedding vectors

**Chunk sizing**:
- verse_group: 3-5 consecutive verses from same book/chapter
- Single verse chunks for precise matching

### 3. Search (user-facing API)

**Edge function**: `search`

**Input**:
```json
{ "query": "string", "limit": 5 }
```

**Process**:
1. Take raw query, embed directly with OpenAI
2. Query `bible_chunks` using `pg_vector` cosine similarity
3. Return top matches with reference, text, and similarity score

**Output**:
```json
{
  "chunks": [
    { "reference": "Genesis 1:1-3", "text": "...", "similarity": 0.84 },
    ...
  ]
}
```

### 4. Hybrid Search (future enhancement)

After direct search is working, add LLM-based point extraction:

**Process**:
1. Send sermon text to LLM with prompt: "Extract 3-5 main theological points from this sermon"
2. Embed each extracted point
3. Search against bible_chunks
4. Return combined/deduplicated results

## File Format

Bible text files follow pattern: `eng-web_{book_id}_{book_name}_{chapter}_read.txt`

Example: `eng-web_002_GEN_01_read.txt` = Genesis Chapter 1

Each line after chapter header: `{verse_number} {verse_text}`

## Edge Functions Structure

```
supabase/
  functions/
    import-verses/
      index.ts
    embed-verses/
      index.ts
    search/
      index.ts
```

## Configuration

Environment variables:
- `OPENAI_API_KEY` — for embeddings
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — for admin operations

## TODO

- [ ] Create `import-verses` edge function to parse files and populate `verses` table
- [ ] Create `embed-verses` edge function to generate chunks and embeddings
- [ ] Create `search` edge function for vector similarity queries
- [ ] Write SQL migration for `chunk_type` CHECK constraint
- [ ] Document file naming convention and book mapping
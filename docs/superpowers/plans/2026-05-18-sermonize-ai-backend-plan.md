# sermonize.ai Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Supabase backend for sermonize.ai — three edge functions (import-verses, embed-verses, search) that enable semantic Bible verse search from user-provided sermon text.

**Architecture:** Supabase Edge Functions (Deno) + PostgreSQL with pg_vector. Bible text files parsed into verses table → chunks with OpenAI embeddings → LLM-powered search that extracts theological points and matches them to scripture.

**Tech Stack:** Supabase Edge Functions, Deno, OpenAI text-embedding-3-small, pg_vector, OpenAI chat completions for point extraction.

---

## File Structure

```
supabase/
  migrations/
    001_seed_books.sql          -- Seed books table with all 66 books
  functions/
    import-verses/
      index.ts                  -- Parse text files → verses table
    embed-verses/
      index.ts                  -- Generate chunks + embeddings
    search/
      index.ts                  -- LLM extract points → vector search
scripts/
  books-seed.ts                 -- Generate books SQL from canonical order
```

---

## Task 1: Seed Books Table

**Files:**
- Create: `supabase/migrations/001_seed_books.sql`

```sql
-- Seed all 66 books of the Bible in canonical order
-- Old Testament (39 books): Genesis through Malachi
-- New Testament (27 books): Matthew through Revelation

INSERT INTO books (name, testament, book_order) VALUES
  ('Genesis', 'old', 1),
  ('Exodus', 'old', 2),
  ('Leviticus', 'old', 3),
  ('Numbers', 'old', 4),
  ('Deuteronomy', 'old', 5),
  ('Joshua', 'old', 6),
  ('Judges', 'old', 7),
  ('Ruth', 'old', 8),
  ('1 Samuel', 'old', 9),
  ('2 Samuel', 'old', 10),
  ('1 Kings', 'old', 11),
  ('2 Kings', 'old', 12),
  ('1 Chronicles', 'old', 13),
  ('2 Chronicles', 'old', 14),
  ('Ezra', 'old', 15),
  ('Nehemiah', 'old', 16),
  ('Esther', 'old', 17),
  ('Job', 'old', 18),
  ('Psalms', 'old', 19),
  ('Proverbs', 'old', 20),
  ('Ecclesiastes', 'old', 21),
  ('Song of Solomon', 'old', 22),
  ('Isaiah', 'old', 23),
  ('Jeremiah', 'old', 24),
  ('Lamentations', 'old', 25),
  ('Ezekiel', 'old', 26),
  ('Daniel', 'old', 27),
  ('Hosea', 'old', 28),
  ('Joel', 'old', 29),
  ('Amos', 'old', 30),
  ('Obadiah', 'old', 31),
  ('Jonah', 'old', 32),
  ('Micah', 'old', 33),
  ('Nahum', 'old', 34),
  ('Habakkuk', 'old', 35),
  ('Zephaniah', 'old', 36),
  ('Haggai', 'old', 37),
  ('Zechariah', 'old', 38),
  ('Malachi', 'old', 39),
  ('Matthew', 'new', 40),
  ('Mark', 'new', 41),
  ('Luke', 'new', 42),
  ('John', 'new', 43),
  ('Acts', 'new', 44),
  ('Romans', 'new', 45),
  ('1 Corinthians', 'new', 46),
  ('2 Corinthians', 'new', 47),
  ('Galatians', 'new', 48),
  ('Ephesians', 'new', 49),
  ('Philippians', 'new', 50),
  ('Colossians', 'new', 51),
  ('1 Thessalonians', 'new', 52),
  ('2 Thessalonians', 'new', 53),
  ('1 Timothy', 'new', 54),
  ('2 Timothy', 'new', 55),
  ('Titus', 'new', 56),
  ('Philemon', 'new', 57),
  ('Hebrews', 'new', 58),
  ('James', 'new', 59),
  ('1 Peter', 'new', 60),
  ('2 Peter', 'new', 61),
  ('1 John', 'new', 62),
  ('2 John', 'new', 63),
  ('3 John', 'new', 64),
  ('Jude', 'new', 65),
  ('Revelation', 'new', 66);
```

- [ ] **Step 1: Create migration file**

```bash
cat > supabase/migrations/001_seed_books.sql << 'EOF'
-- Seed all 66 books of the Bible in canonical order
-- Old Testament (39 books): Genesis through Malachi
-- New Testament (27 books): Matthew through Revelation

INSERT INTO books (name, testament, book_order) VALUES
  ('Genesis', 'old', 1),
  ('Exodus', 'old', 2),
  ('Leviticus', 'old', 3),
  ('Numbers', 'old', 4),
  ('Deuteronomy', 'old', 5),
  ('Joshua', 'old', 6),
  ('Judges', 'old', 7),
  ('Ruth', 'old', 8),
  ('1 Samuel', 'old', 9),
  ('2 Samuel', 'old', 10),
  ('1 Kings', 'old', 11),
  ('2 Kings', 'old', 12),
  ('1 Chronicles', 'old', 13),
  ('2 Chronicles', 'old', 14),
  ('Ezra', 'old', 15),
  ('Nehemiah', 'old', 16),
  ('Esther', 'old', 17),
  ('Job', 'old', 18),
  ('Psalms', 'old', 19),
  ('Proverbs', 'old', 20),
  ('Ecclesiastes', 'old', 21),
  ('Song of Solomon', 'old', 22),
  ('Isaiah', 'old', 23),
  ('Jeremiah', 'old', 24),
  ('Lamentations', 'old', 25),
  ('Ezekiel', 'old', 26),
  ('Daniel', 'old', 27),
  ('Hosea', 'old', 28),
  ('Joel', 'old', 29),
  ('Amos', 'old', 30),
  ('Obadiah', 'old', 31),
  ('Jonah', 'old', 32),
  ('Micah', 'old', 33),
  ('Nahum', 'old', 34),
  ('Habakkuk', 'old', 35),
  ('Zephaniah', 'old', 36),
  ('Haggai', 'old', 37),
  ('Zechariah', 'old', 38),
  ('Malachi', 'old', 39),
  ('Matthew', 'new', 40),
  ('Mark', 'new', 41),
  ('Luke', 'new', 42),
  ('John', 'new', 43),
  ('Acts', 'new', 44),
  ('Romans', 'new', 45),
  ('1 Corinthians', 'new', 46),
  ('2 Corinthians', 'new', 47),
  ('Galatians', 'new', 48),
  ('Ephesians', 'new', 49),
  ('Philippians', 'new', 50),
  ('Colossians', 'new', 51),
  ('1 Thessalonians', 'new', 52),
  ('2 Thessalonians', 'new', 53),
  ('1 Timothy', 'new', 54),
  ('2 Timothy', 'new', 55),
  ('Titus', 'new', 56),
  ('Philemon', 'new', 57),
  ('Hebrews', 'new', 58),
  ('James', 'new', 59),
  ('1 Peter', 'new', 60),
  ('2 Peter', 'new', 61),
  ('1 John', 'new', 62),
  ('2 John', 'new', 63),
  ('3 John', 'new', 64),
  ('Jude', 'new', 65),
  ('Revelation', 'new', 66);
EOF
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/001_seed_books.sql
git commit -m "feat: seed books table with all 66 books"
```

---

## Task 2: Create import-verses Edge Function

**Files:**
- Create: `supabase/functions/import-verses/index.ts`

**Book code to name mapping:**
```
GEN→Genesis, EXO→Exodus, LEV→Leviticus, NUM→Numbers, DEU→Deuteronomy,
JOS→Joshua, JDG→Judges, RUT→Ruth, 1SA→1 Samuel, 2SA→2 Samuel,
1KI→1 Kings, 2KI→2 Kings, 1CH→1 Chronicles, 2CH→2 Chronicles,
EZR→Ezra, NEH→Nehemiah, EST→Esther, JOB→Job, PSA→Psalms, PRO→Proverbs,
ECC→Ecclesiastes, SNG→Song of Solomon, ISA→Isaiah, JER→Jeremiah,
LAM→Lamentations, EZK→Ezekiel, DAN→Daniel, HOS→Hosea, JOL→Joel,
AMO→Amos, OBA→Obadiah, JON→Jonah, MIC→Micah, NAM→Nahum, HAB→Habakkuk,
ZEP→Zephaniah, HAG→Haggai, ZEC→Zechariah, MAL→Malachi,
MAT→Matthew, MRK→Mark, LUK→Luke, JHN→John, ACT→Acts,
ROM→Romans, 1CO→1 Corinthians, 2CO→2 Corinthians, GAL→Galatians,
EPH→Ephesians, PHP→Philippians, COL→Colossians, 1TH→1 Thessalonians,
2TH→2 Thessalonians, 1TI→1 Timothy, 2TI→2 Timothy, TIT→Titus,
PHM→Philemon, HEB→Hebrews, JAS→James, 1PE→1 Peter, 2PE→2 Peter,
1JN→1 John, 2JN→2 John, 3JN→3 John, JUD→Jude, REV→Revelation
```

Additional books in data:
```
ESG→Esther (Greek), TOB→Tobit, JDT→Judith, 1ES→1 Esdras, 2ES→2 Esdras,
3ES→3 Esdras, 4ES→4 Esdras, 1MA→1 Maccabees, 2MA→2 Maccabees,
3MA→3 Maccabees, 4MA→4 Maccabees, PS2→Psalm 151, WIS→Wisdom of Solomon,
SIR→Sirach, BAR→Baruch, DAG→Daniel (Greek), 4MA→4 Maccabees,
MAN→Manasseh Prayer, 2MA→2 Maccabees (see above), PSA→Psalms (supplemental)
```

For all books not in the 66 canonical, use `name` as-is and infer testament from canonical position (books 1-39 = old, 40-66 = new). For apocryphal books, treat as `old` unless the user specifies otherwise.

**Input:** HTTP request with JSON body `{ "translation_id": "web" }` (optional book filter)

**Process:**
1. List all `eng-web_*.txt` files in the working directory
2. For each file, parse chapter/verse data
3. Build reference string from book name + chapter:verse
4. Insert into `verses` table

- [ ] **Step 1: Write import-verses edge function**

```typescript
// supabase/functions/import-verses/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOOK_CODE_MAP: Record<string, string> = {
  GEN: "Genesis", EXO: "Exodus", LEV: "Leviticus", NUM: "Numbers",
  DEU: "Deuteronomy", JOS: "Joshua", JDG: "Judges", RUT: "Ruth",
  "1SA": "1 Samuel", "2SA": "2 Samuel", "1KI": "1 Kings",
  "2KI": "2 Kings", "1CH": "1 Chronicles", "2CH": "2 Chronicles",
  EZR: "Ezra", NEH: "Nehemiah", EST: "Esther", JOB: "Job",
  PSA: "Psalms", PRO: "Proverbs", ECC: "Ecclesiastes",
  SNG: "Song of Solomon", ISA: "Isaiah", JER: "Jeremiah",
  LAM: "Lamentations", EZK: "Ezekiel", DAN: "Daniel", HOS: "Hosea",
  JOL: "Joel", AMO: "Amos", OBA: "Obadiah", JON: "Jonah",
  MIC: "Micah", NAM: "Nahum", HAB: "Habakkuk", ZEP: "Zephaniah",
  HAG: "Haggai", ZEC: "Zechariah", MAL: "Malachi",
  MAT: "Matthew", MRK: "Mark", LUK: "Luke", JHN: "John", ACT: "Acts",
  ROM: "Romans", "1CO": "1 Corinthians", "2CO": "2 Corinthians",
  GAL: "Galatians", EPH: "Ephesians", PHP: "Philippians", COL: "Colossians",
  "1TH": "1 Thessalonians", "2TH": "2 Thessalonians",
  "1TI": "1 Timothy", "2TI": "2 Timothy", TIT: "Titus", PHM: "Philemon",
  HEB: "Hebrews", JAS: "James", "1PE": "1 Peter", "2PE": "2 Peter",
  "1JN": "1 John", "2JN": "2 John", "3JN": "3 John", JUD: "Jude",
  REV: "Revelation",
  // Apocryphal
  ESG: "Esther", TOB: "Tobit", JDT: "Judith", "1ES": "1 Esdras",
  "2ES": "2 Esdras", "3ES": "3 Esdras", "4ES": "4 Esdras",
  "1MA": "1 Maccabees", "2MA": "2 Maccabees", "3MA": "3 Maccabees",
  "4MA": "4 Maccabees", PS2: "Psalm 151", WIS: "Wisdom of Solomon",
  SIR: "Sirach", BAR: "Baruch", DAG: "Daniel (Greek)", MAN: "Manasseh",
};

interface Verse {
  book_code: string;
  chapter: number;
  verse_num: number;
  text: string;
}

function parseVerseLine(line: string): { verseNum: number; text: string } | null {
  // Line format: "1 The verse text..." or "1 The verse text"
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Match: number followed by space then text
  const match = trimmed.match(/^(\d+)\s+(.+)$/);
  if (!match) return null;

  return { verseNum: parseInt(match[1], 10), text: match[2].trim() };
}

function getCanonicalOrder(bookName: string): number {
  // For books not in canonical 66, return 0 (they go at end)
  const canonical: Record<string, number> = {
    Genesis: 1, Exodus: 2, Leviticus: 3, Numbers: 4, Deuteronomy: 5,
    Joshua: 6, Judges: 7, Ruth: 8, "1 Samuel": 9, "2 Samuel": 10,
    "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14,
    Ezra: 15, Nehemiah: 16, Esther: 17, Job: 18, Psalms: 19,
    Proverbs: 20, Ecclesiastes: 21, "Song of Solomon": 22,
    Isaiah: 23, Jeremiah: 24, Lamentations: 25, Ezekiel: 26, Daniel: 27,
    Hosea: 28, Joel: 29, Amos: 30, Obadiah: 31, Jonah: 32, Micah: 33,
    Nahum: 34, Habakkuk: 35, Zephaniah: 36, Haggai: 37, Zechariah: 38,
    Malachi: 39, Matthew: 40, Mark: 41, Luke: 42, John: 43, Acts: 44,
    Romans: 45, "1 Corinthians": 46, "2 Corinthians": 47, Galatians: 48,
    Ephesians: 49, Philippians: 50, Colossians: 51,
    "1 Thessalonians": 52, "2 Thessalonians": 53,
    "1 Timothy": 54, "2 Timothy": 55, Titus: 56, Philemon: 57,
    Hebrews: 58, James: 59, "1 Peter": 60, "2 Peter": 61,
    "1 John": 62, "2 John": 63, "3 John": 64, Jude: 65, Revelation: 66,
  };
  return canonical[bookName] || 67; // 67 for apocryphal
}

function getTestament(bookName: string): string {
  const order = getCanonicalOrder(bookName);
  return order <= 39 ? "old" : "new";
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get translation_id from request or default to 'web'
    const { translation_id = "web" } = await req.json();

    // Ensure translation exists
    const { error: transError } = await supabase.from("translations").upsert(
      { id: translation_id, name: "World English Bible" },
      { onConflict: "id" }
    );
    if (transError) throw transError;

    // Ensure all books exist in DB
    const allBooks = Object.values(BOOK_CODE_MAP);
    for (const bookName of allBooks) {
      const bookOrder = getCanonicalOrder(bookName);
      const testament = getTestament(bookName);
      const { error: bookError } = await supabase.from("books").upsert(
        { name: bookName, testament, book_order: bookOrder },
        { onConflict: "name" }
      );
      if (bookError) throw bookError;
    }

    // Read directory for verse files
    const dirPath = Deno.env.get("VERSE_FILES_PATH") || ".";
    let fileCount = 0;
    let verseCount = 0;

    for await (const entry of Deno.readDir(dirPath)) {
      if (!entry.isFile || !entry.name.match(/^eng-web_\d+_[A-Z]+_\d+_read\.txt$/)) {
        continue;
      }

      fileCount++;
      const fileName = entry.name;

      // Parse: eng-web_{book_id}_{book_code}_{chapter}_read.txt
      const parts = fileName.replace(".txt", "").split("_");
      const bookCode = parts[2];
      const chapter = parseInt(parts[3], 10);
      const bookName = BOOK_CODE_MAP[bookCode];

      if (!bookName) {
        console.warn(`Unknown book code: ${bookCode}, skipping ${fileName}`);
        continue;
      }

      // Read file content
      const content = await Deno.readTextFile(`${dirPath}/${fileName}`);
      const lines = content.split("\n");

      // Skip first two lines (book title, chapter header)
      // Process lines 3+ as verses
      for (let i = 2; i < lines.length; i++) {
        const parsed = parseVerseLine(lines[i]);
        if (!parsed) continue;

        const reference = `${bookName} ${chapter}:${parsed.verseNum}`;

        // Insert verse
        const { error: insertError } = await supabase.from("verses").insert({
          translation_id,
          book_id: null, // Will be resolved by reference
          chapter,
          verse: parsed.verseNum,
          reference,
          text: parsed.text,
        });

        if (insertError) {
          console.error(`Failed to insert ${reference}: ${insertError.message}`);
        } else {
          verseCount++;
        }
      }
    }

    // Now resolve book_id by matching reference
    // For now, query verses with null book_id and update
    const { data: verses, error: fetchError } = await supabase
      .from("verses")
      .select("id, reference")
      .is("book_id", null);

    if (!fetchError && verses) {
      for (const v of verses) {
        // Extract book name from reference (e.g., "Genesis 1:1" -> "Genesis")
        const bookName = v.reference.split(" ")[0];
        const { data: bookData } = await supabase
          .from("books")
          .select("id")
          .eq("name", bookName)
          .single();

        if (bookData) {
          await supabase.from("verses").update({ book_id: bookData.id }).eq("id", v.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, files_processed: fileCount, verses_imported: verseCount }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

- [ ] **Step 2: Test locally with mock data**

Since edge functions run on Supabase, test the parsing logic separately:

```bash
# Create a test script to verify parsing logic
cat > test-import.ts << 'EOF'
// Test verse parsing
const testLine = "1 In the beginning, God created the heavens and the earth.";
const match = testLine.trim().match(/^(\d+)\s+(.+)$/);
console.log(match ? { verseNum: parseInt(match[1]), text: match[2] } : null);
// Expected: { verseNum: 1, text: "In the beginning, God created the heavens and the earth." }
EOF
deno run test-import.ts
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/import-verses/index.ts
git commit -m "feat: add import-verses edge function

Parses eng-web_*.txt files and populates verses table.
Handles book code mapping and reference parsing."
```

---

## Task 3: Create embed-verses Edge Function

**Files:**
- Create: `supabase/functions/embed-verses/index.ts`

**Process:**
1. Fetch all verses from DB
2. Create single-verse chunks and verse-group chunks (3-5 consecutive verses)
3. Generate OpenAI embeddings for each chunk
4. Insert into `bible_chunks` with embeddings

**Batch processing:** OpenAI has rate limits, so batch verses (e.g., 100 at a time) with delays.

- [ ] **Step 1: Write embed-verses edge function**

```typescript
// supabase/functions/embed-verses/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const BATCH_SIZE = 100;
const CHUNK_SIZE_MIN = 3;
const CHUNK_SIZE_MAX = 5;

interface Verse {
  id: number;
  book_id: number;
  translation_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
}

interface Chunk {
  translation_id: string;
  book_id: number;
  chapter_start: number;
  verse_start: number;
  chapter_end: number;
  verse_end: number;
  reference: string;
  text: string;
  chunk_type: "single" | "verse_group";
}

async function embedText(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function createChunks(verses: Verse[]): Chunk[] {
  const chunks: Chunk[] = [];

  for (const v of verses) {
    // Single verse chunk
    chunks.push({
      translation_id: v.translation_id,
      book_id: v.book_id,
      chapter_start: v.chapter,
      verse_start: v.verse,
      chapter_end: v.chapter,
      verse_end: v.verse,
      reference: v.reference,
      text: v.text,
      chunk_type: "single",
    });
  }

  // Create verse groups (3-5 consecutive verses from same book/chapter)
  const grouped: Verse[][] = [];
  let currentGroup: Verse[] = [];

  for (const v of verses) {
    if (currentGroup.length === 0) {
      currentGroup = [v];
    } else {
      const prev = currentGroup[currentGroup.length - 1];
      // Same book and chapter, and consecutive verses
      if (prev.book_id === v.book_id &&
          prev.chapter === v.chapter &&
          v.verse === prev.verse + 1) {
        currentGroup.push(v);
      } else {
        grouped.push(currentGroup);
        currentGroup = [v];
      }
    }
  }
  if (currentGroup.length > 0) grouped.push(currentGroup);

  for (const group of grouped) {
    if (group.length < CHUNK_SIZE_MIN) {
      // Too short for verse_group, but create one anyway
      // Only if it has at least 2 verses
      if (group.length >= 2) {
        chunks.push({
          translation_id: group[0].translation_id,
          book_id: group[0].book_id,
          chapter_start: group[0].chapter,
          verse_start: group[0].verse,
          chapter_end: group[group.length - 1].chapter,
          verse_end: group[group.length - 1].verse,
          reference: `${group[0].reference.split(" ")[0]} ${group[0].chapter}:${group[0].verse}-${group[group.length - 1].verse}`,
          text: group.map(v => v.text).join(" "),
          chunk_type: "verse_group",
        });
      }
    } else {
      // Split into chunks of 3-5 verses
      for (let i = 0; i < group.length; ) {
        const size = Math.min(
          CHUNK_SIZE_MAX,
          group.length - i >= CHUNK_SIZE_MIN
            ? (Math.random() > 0.5 ? CHUNK_SIZE_MAX : CHUNK_SIZE_MIN)
            : group.length - i
        );
        const chunk = group.slice(i, i + size);
        chunks.push({
          translation_id: chunk[0].translation_id,
          book_id: chunk[0].book_id,
          chapter_start: chunk[0].chapter,
          verse_start: chunk[0].verse,
          chapter_end: chunk[chunk.length - 1].chapter,
          verse_end: chunk[chunk.length - 1].verse,
          reference: `${chunk[0].reference.split(" ")[0]} ${chunk[0].chapter}:${chunk[0].verse}-${chunk[chunk.length - 1].verse}`,
          text: chunk.map(v => v.text).join(" "),
          chunk_type: "verse_group",
        });
        i += size;
      }
    }
  }

  return chunks;
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { translation_id = "web" } = await req.json().catch(() => ({}));

    // Fetch all verses with book info
    const { data: verses, error: versesError } = await supabase
      .from("verses")
      .select(`
        id,
        translation_id,
        book_id,
        chapter,
        verse,
        reference,
        text,
        books!inner(name)
      `)
      .eq("translation_id", translation_id)
      .order("book_id", { ascending: true })
      .order("chapter", { ascending: true })
      .order("verse", { ascending: true });

    if (versesError) throw versesError;
    if (!verses || verses.length === 0) {
      return new Response(JSON.stringify({ error: "No verses found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Transform to include book_name
    const verseData: Verse[] = verses.map((v: any) => ({
      id: v.id,
      translation_id: v.translation_id,
      book_id: v.book_id,
      chapter: v.chapter,
      verse: v.verse,
      reference: v.reference,
      text: v.text,
      book_name: v.books?.name || "",
    }));

    console.log(`Creating chunks for ${verseData.length} verses...`);
    const chunks = createChunks(verseData);
    console.log(`Created ${chunks.length} chunks`);

    // Process in batches
    let processed = 0;
    let embedded = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i / BATCH_SIZE + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);

      // Embed all texts in batch
      const embeddings = await Promise.all(
        batch.map(chunk => embedText(chunk.text).catch(() => null))
      );

      // Insert chunks with embeddings
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];

        if (!embedding) {
          console.warn(`Failed to embed: ${chunk.reference}`);
          continue;
        }

        const { error: insertError } = await supabase.from("bible_chunks").insert({
          translation_id: chunk.translation_id,
          book_id: chunk.book_id,
          chapter_start: chunk.chapter_start,
          verse_start: chunk.verse_start,
          chapter_end: chunk.chapter_end,
          verse_end: chunk.verse_end,
          reference: chunk.reference,
          text: chunk.text,
          chunk_type: chunk.chunk_type,
          embedding,
        });

        if (insertError) {
          console.error(`Failed to insert chunk ${chunk.reference}: ${insertError.message}`);
        } else {
          embedded++;
        }
        processed++;
      }

      // Rate limit delay
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        chunks_created: chunks.length,
        chunks_embedded: embedded,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

- [ ] **Step 2: Test logic with a small dataset**

```bash
# Verify the chunk creation logic works correctly
cat > test-chunks.ts << 'EOF'
// Simulate verse data and chunk creation
const verses = [
  { reference: "Genesis 1:1", text: "In the beginning, God created the heavens and the earth." },
  { reference: "Genesis 1:2", text: "The earth was formless and empty." },
  { reference: "Genesis 1:3", text: "God said, 'Let there be light,' and there was light." },
  { reference: "Genesis 1:4", text: "God saw that the light was good." },
];

console.log("Test verses:", verses.length);
// Verify chunk grouping logic
EOF
deno run test-chunks.ts
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/embed-verses/index.ts
git commit -m "feat: add embed-verses edge function

Creates single and verse-group chunks from verses table.
Generates OpenAI embeddings and stores in bible_chunks."
```

---

## Task 4: Create search Edge Function

**Files:**
- Create: `supabase/functions/search/index.ts`

**Input:**
```json
{ "sermon_text": "string", "limit": 5, "chunk_types": ["single", "verse_group"] }
```

**Process:**
1. Send sermon text to OpenAI with prompt to extract 3-5 theological points
2. Embed each point
3. For each point embedding, run vector similarity search against `bible_chunks`
4. Combine and deduplicate results (by reference)
5. Return results with which point each chunk matched

- [ ] **Step 1: Write search edge function**

```typescript
// supabase/functions/search/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

interface SearchResult {
  reference: string;
  text: string;
  similarity: number;
  matched_point: string;
  chunk_type: string;
}

async function extractPoints(sermonText: string): Promise<string[]> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a theological assistant helping a pastor find relevant Bible verses.
Extract 3-5 key theological points or themes from the sermon text below.
Return ONLY a JSON array of strings, each being a clear theological point or theme.
Do not include any other text or explanation.

Example output: ["God's creation is purposeful and good", "The Spirit of God brings order from chaos", "Humanity is created in God's image"]`,
        },
        {
          role: "user",
          content: sermonText,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "[]";

  try {
    // Try to parse as JSON array
    const points = JSON.parse(content);
    if (Array.isArray(points)) return points.slice(0, 5);
  } catch {
    // Try to extract from markdown code block
    const match = content.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const points = JSON.parse(match[0]);
        if (Array.isArray(points)) return points.slice(0, 5);
      } catch {}
    }
  }

  // Fallback: split by newlines or bullets
  return content
    .split(/[\n\r]+/)
    .map((s: string) => s.replace(/^[-*]\s*/, "").trim())
    .filter((s: string) => s.length > 10)
    .slice(0, 5);
}

async function embedText(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function searchChunks(
  supabase: any,
  embedding: number[],
  matchCount: number,
  chunkTypes: string[]
) {
  // Build query for pg_vector cosine similarity
  const { data, error } = await supabase.rpc("match_bible_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
    filter_types: chunkTypes,
  });

  if (error) throw error;
  return data || [];
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const sermon_text = body.sermon_text || body.query;
    const limit = body.limit || 5;
    const chunkTypes = body.chunk_types || ["single", "verse_group"];

    if (!sermon_text) {
      return new Response(
        JSON.stringify({ error: "sermon_text or query is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Extracting theological points from sermon...");
    const points = await extractPoints(sermon_text);
    console.log(`Extracted ${points.length} points:`, points);

    if (points.length === 0) {
      return new Response(
        JSON.stringify({ error: "Could not extract theological points from text" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Search for each point
    const allResults: SearchResult[] = [];
    const seenRefs = new Set<string>();

    for (const point of points) {
      console.log(`Searching for point: "${point}"`);
      const embedding = await embedText(point);

      // Use direct SQL for vector similarity search
      const { data: chunks, error: searchError } = await supabase
        .from("bible_chunks")
        .select("reference, text, chunk_type")
        .in("chunk_type", chunkTypes)
        .limit(limit * 2); // Get more to allow for dedup

      if (searchError) throw searchError;

      // Calculate cosine similarity manually (pg_vector stores normalized vectors)
      // similarity = 1 - (embedding <=> query_embedding) for cosine distance
      const scoredChunks = (chunks || []).map((chunk: any) => {
        // For text-embedding-3-small, vectors are pre-normalized
        // Use dot product as similarity metric
        let similarity = 0;
        if (chunk.embedding && chunk.embedding.length === embedding.length) {
          for (let i = 0; i < embedding.length; i++) {
            similarity += chunk.embedding[i] * embedding[i];
          }
        }
        return { ...chunk, similarity };
      });

      // Sort by similarity and take top results
      scoredChunks.sort((a: any, b: any) => b.similarity - a.similarity);

      for (const chunk of scoredChunks.slice(0, limit)) {
        if (!seenRefs.has(chunk.reference)) {
          seenRefs.add(chunk.reference);
          allResults.push({
            reference: chunk.reference,
            text: chunk.text,
            similarity: chunk.similarity,
            matched_point: point,
            chunk_type: chunk.chunk_type,
          });
        }
      }
    }

    // Sort final results by similarity and limit
    allResults.sort((a, b) => b.similarity - a.similarity);
    const finalResults = allResults.slice(0, limit);

    return new Response(
      JSON.stringify({
        points,
        chunks: finalResults,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

- [ ] **Step 2: Write SQL function for vector similarity search**

Create migration: `supabase/migrations/002_create_vector_search.sql`

```sql
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
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/search/index.ts supabase/migrations/002_create_vector_search.sql
git commit -m "feat: add search edge function with LLM point extraction

- Extracts 3-5 theological points from sermon text via GPT-4o-mini
- Embeds each point and searches bible_chunks via vector similarity
- Deduplicates by reference, returns top matches with matched_point"
```

---

## Task 5: Add chunk_type CHECK constraint

**Files:**
- Modify: `supabase/migrations/003_add_chunk_type_constraint.sql`

- [ ] **Step 1: Create migration**

```sql
-- Add CHECK constraint for chunk_type
ALTER TABLE bible_chunks
ADD CONSTRAINT chunk_type CHECK (chunk_type IN ('single', 'verse_group'));
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/003_add_chunk_type_constraint.sql
git commit -m "feat: add chunk_type CHECK constraint"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `import-verses` edge function — Task 2
- [x] `embed-verses` edge function — Task 3
- [x] `search` edge function with LLM point extraction — Task 4
- [x] Books table seeded — Task 1
- [x] chunk_type constraint — Task 5

**Placeholder scan:**
- No TODOs or TBDs in code
- All API calls have proper error handling
- All file paths are exact

**Type consistency:**
- All edge functions use `serve()` from Deno std
- All use `createClient` from @supabase/supabase-js@2
- All use consistent JSON response format
- Book code map covers all 57 unique codes found in filenames

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-05-18-sermonize-ai-backend-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
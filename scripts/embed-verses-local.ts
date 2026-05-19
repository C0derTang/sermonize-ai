// scripts/embed-verses-local.ts
// Run locally: npx deno run --allow-net --allow-env scripts/embed-verses-local.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function loadEnv() {
  try {
    const envContent = Deno.readTextFileSync(".env");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const equalsIdx = trimmed.indexOf("=");
      if (equalsIdx > 0) {
        const key = trimmed.substring(0, equalsIdx).trim();
        const value = trimmed.substring(equalsIdx + 1).trim();
        Deno.env.set(key, value);
      }
    }
  } catch (e) {
    // .env file not found
  }
}

loadEnv();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const BATCH_SIZE = 100;
const CHUNK_SIZE_MIN = 3;
const CHUNK_SIZE_MAX = 5;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function embedText(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
  const data = await response.json();
  return data.data[0].embedding;
}

interface Verse {
  id: number;
  book_id: number;
  translation_id: string;
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

function createChunks(verses: Verse[]): Chunk[] {
  const chunks: Chunk[] = [];

  // Single verse chunks
  for (const v of verses) {
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

  // Verse-group chunks
  const grouped: Verse[][] = [];
  let currentGroup: Verse[] = [];

  for (const v of verses) {
    if (currentGroup.length === 0) {
      currentGroup = [v];
    } else {
      const prev = currentGroup[currentGroup.length - 1];
      if (prev.book_id === v.book_id && prev.chapter === v.chapter && v.verse === prev.verse + 1) {
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
      if (group.length >= 2) {
        const first = group[0];
        const last = group[group.length - 1];
        chunks.push({
          translation_id: first.translation_id,
          book_id: first.book_id,
          chapter_start: first.chapter,
          verse_start: first.verse,
          chapter_end: last.chapter,
          verse_end: last.verse,
          reference: `${first.reference.split(" ")[0]} ${first.chapter}:${first.verse}-${last.verse}`,
          text: group.map(v => v.text).join(" "),
          chunk_type: "verse_group",
        });
      }
    } else {
      for (let i = 0; i < group.length; ) {
        const remaining = group.length - i;
        const size = remaining >= CHUNK_SIZE_MIN
          ? (Math.random() > 0.5 ? CHUNK_SIZE_MAX : CHUNK_SIZE_MIN)
          : remaining;
        const chunk = group.slice(i, i + size);
        const first = chunk[0];
        const last = chunk[chunk.length - 1];
        chunks.push({
          translation_id: first.translation_id,
          book_id: first.book_id,
          chapter_start: first.chapter,
          verse_start: first.verse,
          chapter_end: last.chapter,
          verse_end: last.verse,
          reference: `${first.reference.split(" ")[0]} ${first.chapter}:${first.verse}-${last.verse}`,
          text: chunk.map(v => v.text).join(" "),
          chunk_type: "verse_group",
        });
        i += size;
      }
    }
  }

  return chunks;
}

async function main() {
  console.log("Fetching verses from database...");

  // Fetch all verses - Supabase returns max 1000 by default, use Pagination to get all
  const allVerses: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("verses")
      .select("id, translation_id, book_id, chapter, verse, reference, text")
      .eq("translation_id", "web")
      .order("book_id", { ascending: true })
      .order("chapter", { ascending: true })
      .order("verse", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allVerses.push(...data);
    page++;
    if (data.length < pageSize) break;
  }

  const verses = allVerses;

  // Check if chunks already exist
  const { count } = await supabase
    .from("bible_chunks")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    console.log(`bible_chunks already has ${count} rows. Skipping embedding.`);
    console.log("If you want to re-embed, delete existing chunks first.");
    return;
  }

  // Create chunks
  console.log("Creating chunks...");
  const chunks = createChunks(verses as Verse[]);
  console.log(`Created ${chunks.length} chunks`);

  // Process in batches
  let embedded = 0;
  let failed = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
    console.log(`Processing batch ${batchNum}/${totalBatches} (${i + batch.length}/${chunks.length})`);

    // Embed all texts in batch
    const embeddings = await Promise.all(
      batch.map(chunk => embedText(chunk.text).catch(err => {
        console.error(`Failed to embed ${chunk.reference}: ${err.message}`);
        return null;
      }))
    );

    // Insert chunks with embeddings
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const embedding = embeddings[j];

      if (!embedding) {
        failed++;
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
        console.error(`Insert error for ${chunk.reference}: ${insertError.message}`);
        failed++;
      } else {
        embedded++;
      }
    }

    // Rate limit delay
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\nDone! Embedded ${embedded} chunks, ${failed} failed.`);
}

main().catch(console.error);
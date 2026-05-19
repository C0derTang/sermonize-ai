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
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
  const data = await response.json();
  return data.data[0].embedding;
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
      for (let i = 0; i < group.length; ) {
        const remaining = group.length - i;
        const size = remaining >= CHUNK_SIZE_MIN
          ? (Math.random() > 0.5 ? CHUNK_SIZE_MAX : CHUNK_SIZE_MIN)
          : remaining;
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

    const { data: verses, error: versesError } = await supabase
      .from("verses")
      .select(`id, translation_id, book_id, chapter, verse, reference, text, books!inner(name)`)
      .eq("translation_id", translation_id)
      .order("book_id", { ascending: true })
      .order("chapter", { ascending: true })
      .order("verse", { ascending: true });

    if (versesError) throw versesError;
    if (!verses || verses.length === 0) {
      return new Response(JSON.stringify({ error: "No verses found" }), { status: 400 });
    }

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

    let embedded = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i / BATCH_SIZE + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);

      const embeddings = await Promise.all(
        batch.map(chunk => embedText(chunk.text).catch(() => null))
      );

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];
        if (!embedding) continue;

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

        if (!insertError) embedded++;
      }

      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return new Response(
      JSON.stringify({ success: true, chunks_created: chunks.length, chunks_embedded: embedded }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

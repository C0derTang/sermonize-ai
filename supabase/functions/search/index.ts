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
        { role: "user", content: sermonText },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
  const data = await response.json();
  const content = data.choices[0]?.message?.content || "[]";

  try {
    const points = JSON.parse(content);
    if (Array.isArray(points)) return points.slice(0, 5);
  } catch {
    const match = content.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const points = JSON.parse(match[0]);
        if (Array.isArray(points)) return points.slice(0, 5);
      } catch {}
    }
  }

  return content.split(/[\n\r]+/)
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
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
  const data = await response.json();
  return data.data[0].embedding;
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
      return new Response(JSON.stringify({ error: "sermon_text or query is required" }), { status: 400 });
    }

    console.log("Extracting theological points from sermon...");
    const points = await extractPoints(sermon_text);
    console.log(`Extracted ${points.length} points:`, points);

    if (points.length === 0) {
      return new Response(JSON.stringify({ error: "Could not extract theological points" }), { status: 400 });
    }

    const allResults: SearchResult[] = [];
    const seenRefs = new Set<string>();

    for (const point of points) {
      console.log(`Searching for point: "${point}"`);
      const embedding = await embedText(point);

      // Use RPC for proper vector similarity search
      const { data: chunks, error: searchError } = await supabase.rpc("match_bible_chunks", {
        query_embedding: embedding,
        match_count: limit * 2,
        filter_types: chunkTypes,
      });

      if (searchError) {
        console.error("RPC error, falling back to manual search:", searchError.message);
        // Fallback: fetch all and compute manually
        const { data: fallbackChunks } = await supabase
          .from("bible_chunks")
          .select("reference, text, chunk_type, embedding")
          .in("chunk_type", chunkTypes)
          .limit(200);

        const scoredChunks = (fallbackChunks || []).map((chunk: any) => {
          let similarity = 0;
          if (chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length === embedding.length) {
            for (let i = 0; i < embedding.length; i++) {
              similarity += (chunk.embedding[i] || 0) * (embedding[i] || 0);
            }
          }
          return { ...chunk, similarity };
        });

        scoredChunks.sort((a: any, b: any) => b.similarity - a.similarity);
        chunks = scoredChunks;
      }

      const scoredChunks = (chunks || []).map((chunk: any) => {
        return {
          reference: chunk.reference,
          text: chunk.text,
          similarity: chunk.similarity || 0,
          chunk_type: chunk.chunk_type,
        };
      });

      scoredChunks.sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0));

      for (const chunk of scoredChunks.slice(0, limit)) {
        if (!seenRefs.has(chunk.reference)) {
          seenRefs.add(chunk.reference);
          allResults.push({
            reference: chunk.reference,
            text: chunk.text,
            similarity: chunk.similarity || 0,
            matched_point: point,
            chunk_type: chunk.chunk_type,
          });
        }
      }
    }

    allResults.sort((a, b) => b.similarity - a.similarity);
    const finalResults = allResults.slice(0, limit);

    return new Response(
      JSON.stringify({ points, chunks: finalResults }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
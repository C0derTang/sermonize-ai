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
      model: "gpt-3.5-turbo",
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

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  const data = await response.json();

  // Debug: log the full response
  console.log("OpenAI extractPoints response:", JSON.stringify(data));

  // Navigate the response - handle different possible structures
  let content: string = "";
  if (data.choices && data.choices.length > 0) {
    content = data.choices[0].message?.content ?? "";
  } else if (data.output && data.output.content) {
    content = data.output.content;
  } else if (data.message) {
    content = data.message;
  }

  content = content.trim();

  // If content is empty or not a valid string, return empty array
  if (!content) {
    console.error("Empty content from OpenAI API. Full response:", JSON.stringify(data));
    return [];
  }

  try {
    // Handle both string content and object content (o1-mini format)
    const rawContent = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.content ?? "";
    content = typeof rawContent === "string" ? rawContent.trim() : JSON.stringify(rawContent);
  } catch {
    content = "";
  }

  // If content is empty, return empty array
  if (!content) {
    console.error("Empty content from OpenAI API. Full response:", JSON.stringify(data));
    return [];
  }

  try {
    const points = JSON.parse(content);
    if (Array.isArray(points) && points.length > 0) return points.slice(0, 5);
  } catch {
    const match = content.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const points = JSON.parse(match[0]);
        if (Array.isArray(points) && points.length > 0) return points.slice(0, 5);
      } catch {}
    }
  }

  const lines = content.split(/[\n\r]+/).map((s: string) => s.replace(/^[-*]\s*/, "").trim()).filter((s: string) => s.length > 10);
  console.log("Extracted lines:", lines);
  return lines.slice(0, 5);
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const sermon_text = body.sermon_text || body.query;
    const limit = body.limit || 5;
    const chunkTypes = body.chunk_types || ["single", "verse_group"];

    if (!sermon_text) {
      return new Response(JSON.stringify({ error: "sermon_text or query is required" }), { status: 400, headers: corsHeaders });
    }

    console.log("Extracting theological points from sermon...");
    const points = await extractPoints(sermon_text);
    console.log(`Extracted ${points.length} points:`, points);

    if (points.length === 0) {
      return new Response(JSON.stringify({ error: "Could not extract theological points" }), { status: 400, headers: corsHeaders });
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
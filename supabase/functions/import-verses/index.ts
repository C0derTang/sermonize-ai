// supabase/functions/import-verses/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOOK_CODE_MAP: Record<string, string> = {
  // Canonical books (1-66)
  GEN: "Genesis",
  EXO: "Exodus",
  LEV: "Leviticus",
  NUM: "Numbers",
  DEU: "Deuteronomy",
  JOS: "Joshua",
  JDG: "Judges",
  RUT: "Ruth",
  "1SA": "1 Samuel",
  "2SA": "2 Samuel",
  "1KI": "1 Kings",
  "2KI": "2 Kings",
  "1CH": "1 Chronicles",
  "2CH": "2 Chronicles",
  EZR: "Ezra",
  NEH: "Nehemiah",
  EST: "Esther",
  JOB: "Job",
  PSA: "Psalms",
  PRO: "Proverbs",
  ECC: "Ecclesiastes",
  SNG: "Song of Solomon",
  ISA: "Isaiah",
  JER: "Jeremiah",
  LAM: "Lamentations",
  EZK: "Ezekiel",
  DAN: "Daniel",
  HOS: "Hosea",
  JOL: "Joel",
  AMO: "Amos",
  OBA: "Obadiah",
  JON: "Jonah",
  MIC: "Micah",
  NAM: "Nahum",
  HAB: "Habakkuk",
  ZEP: "Zephaniah",
  HAG: "Haggai",
  ZEC: "Zechariah",
  MAL: "Malachi",
  MAT: "Matthew",
  MRK: "Mark",
  LUK: "Luke",
  JHN: "John",
  ACT: "Acts",
  ROM: "Romans",
  "1CO": "1 Corinthians",
  "2CO": "2 Corinthians",
  GAL: "Galatians",
  EPH: "Ephesians",
  PHP: "Philippians",
  COL: "Colossians",
  "1TH": "1 Thessalonians",
  "2TH": "2 Thessalonians",
  "1TI": "1 Timothy",
  "2TI": "2 Timothy",
  TIT: "Titus",
  PHM: "Philemon",
  HEB: "Hebrews",
  JAS: "James",
  "1PE": "1 Peter",
  "2PE": "2 Peter",
  "1JN": "1 John",
  "2JN": "2 John",
  "3JN": "3 John",
  JUD: "Jude",
  REV: "Revelation",
  // Apocryphal books
  ESG: "Esther",
  TOB: "Tobit",
  JDT: "Judith",
  "1ES": "1 Esdras",
  "2ES": "2 Esdras",
  "3ES": "3 Esdras",
  "4ES": "4 Esdras",
  "1MA": "1 Maccabees",
  "2MA": "2 Maccabees",
  "3MA": "3 Maccabees",
  "4MA": "4 Maccabees",
  PS2: "Psalm 151",
  WIS: "Wisdom of Solomon",
  SIR: "Sirach",
  BAR: "Baruch",
  DAG: "Daniel (Greek)",
  MAN: "Manasseh",
};

function parseVerseLine(line: string): { verseNum: number; text: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+)\s+(.+)$/);
  if (!match) return null;
  return { verseNum: parseInt(match[1], 10), text: match[2].trim() };
}

function getCanonicalOrder(bookName: string): number {
  const canonical: Record<string, number> = {
    Genesis: 1,
    Exodus: 2,
    Leviticus: 3,
    Numbers: 4,
    Deuteronomy: 5,
    Joshua: 6,
    Judges: 7,
    Ruth: 8,
    "1 Samuel": 9,
    "2 Samuel": 10,
    "1 Kings": 11,
    "2 Kings": 12,
    "1 Chronicles": 13,
    "2 Chronicles": 14,
    Ezra: 15,
    Nehemiah: 16,
    Esther: 17,
    Job: 18,
    Psalms: 19,
    Proverbs: 20,
    Ecclesiastes: 21,
    "Song of Solomon": 22,
    Isaiah: 23,
    Jeremiah: 24,
    Lamentations: 25,
    Ezekiel: 26,
    Daniel: 27,
    Hosea: 28,
    Joel: 29,
    Amos: 30,
    Obadiah: 31,
    Jonah: 32,
    Micah: 33,
    Nahum: 34,
    Habakkuk: 35,
    Zephaniah: 36,
    Haggai: 37,
    Zechariah: 38,
    Malachi: 39,
    Matthew: 40,
    Mark: 41,
    Luke: 42,
    John: 43,
    Acts: 44,
    Romans: 45,
    "1 Corinthians": 46,
    "2 Corinthians": 47,
    Galatians: 48,
    Ephesians: 49,
    Philippians: 50,
    Colossians: 51,
    "1 Thessalonians": 52,
    "2 Thessalonians": 53,
    "1 Timothy": 54,
    "2 Timothy": 55,
    Titus: 56,
    Philemon: 57,
    Hebrews: 58,
    James: 59,
    "1 Peter": 60,
    "2 Peter": 61,
    "1 John": 62,
    "2 John": 63,
    "3 John": 64,
    Jude: 65,
    Revelation: 66,
    // Apocryphal books
    Esther: 67,
    Tobit: 68,
    Judith: 69,
    "1 Esdras": 70,
    "2 Esdras": 71,
    "3 Esdras": 72,
    "4 Esdras": 73,
    "1 Maccabees": 74,
    "2 Maccabees": 75,
    "3 Maccabees": 76,
    "4 Maccabees": 77,
    "Psalm 151": 78,
    "Wisdom of Solomon": 79,
    Sirach: 80,
    Baruch: 81,
    "Daniel (Greek)": 82,
    Manasseh: 83,
  };
  return canonical[bookName] || 67;
}

function getTestament(bookName: string): string {
  const order = getCanonicalOrder(bookName);
  if (order >= 67) return "old"; // Apocryphal books are old testament
  return order <= 39 ? "old" : "new";
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { translation_id = "web" } = await req.json();

    // Ensure translation exists
    await supabase.from("translations").upsert(
      { id: translation_id, name: "World English Bible" },
      { onConflict: "id" }
    );

    // Ensure all books exist in DB
    const allBooks = Object.values(BOOK_CODE_MAP);
    for (const bookName of allBooks) {
      const bookOrder = getCanonicalOrder(bookName);
      const testament = getTestament(bookName);
      await supabase.from("books").upsert(
        { name: bookName, testament, book_order: bookOrder },
        { onConflict: "name" }
      );
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
      const parts = fileName.replace(".txt", "").split("_");
      const bookCode = parts[2];
      const chapter = parseInt(parts[3], 10);
      const bookName = BOOK_CODE_MAP[bookCode];

      if (!bookName) {
        console.warn(`Unknown book code: ${bookCode}, skipping ${fileName}`);
        continue;
      }

      const content = await Deno.readTextFile(`${dirPath}/${fileName}`);
      const lines = content.split("\n");

      // Skip first two lines (book title, chapter header)
      for (let i = 2; i < lines.length; i++) {
        const parsed = parseVerseLine(lines[i]);
        if (!parsed) continue;

        const reference = `${bookName} ${chapter}:${parsed.verseNum}`;

        const { error: insertError } = await supabase.from("verses").insert({
          translation_id,
          book_id: null,
          chapter,
          verse: parsed.verseNum,
          reference,
          text: parsed.text,
        });

        if (!insertError) verseCount++;
      }
    }

    // Resolve book_id by matching reference
    const { data: verses } = await supabase
      .from("verses")
      .select("id, reference")
      .is("book_id", null);

    if (verses) {
      for (const v of verses) {
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
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
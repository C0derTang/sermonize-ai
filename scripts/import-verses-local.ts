// scripts/import-verses-local.ts
// Run locally: npx deno run --allow-net --allow-read scripts/import-verses-local.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERSE_FILES_PATH = Deno.env.get("VERSE_FILES_PATH") || ".";

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

const CANONICAL_ORDER: Record<string, number> = {
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

function getBookOrder(name: string): number {
  return CANONICAL_ORDER[name] || 67;
}

function getTestament(name: string): string {
  return getBookOrder(name) <= 39 ? "old" : "new";
}

function parseVerseLine(line: string): { verseNum: number; text: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+)\s+(.+)$/);
  if (!match) return null;
  return { verseNum: parseInt(match[1], 10), text: match[2].trim() };
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const translationId = "web";

  console.log("Seeding translations and books...");

  // Seed translation
  await supabase.from("translations").upsert(
    { id: translationId, name: "World English Bible" },
    { onConflict: "id" }
  );

  // Seed books
  const allBooks = Object.values(BOOK_CODE_MAP);
  for (const bookName of allBooks) {
    const bookOrder = getBookOrder(bookName);
    const testament = getTestament(bookName);
    await supabase.from("books").upsert(
      { name: bookName, testament, book_order: bookOrder },
      { onConflict: "name" }
    );
  }

  console.log("Importing verses from files...");

  let fileCount = 0;
  let verseCount = 0;
  const verses: any[] = [];

  for await (const entry of Deno.readDir(VERSE_FILES_PATH)) {
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

    const content = await Deno.readTextFile(`${VERSE_FILES_PATH}/${fileName}`);
    const lines = content.split("\n");

    for (let i = 2; i < lines.length; i++) {
      const parsed = parseVerseLine(lines[i]);
      if (!parsed) continue;

      const reference = `${bookName} ${chapter}:${parsed.verseNum}`;
      verses.push({
        translation_id: translationId,
        chapter,
        verse: parsed.verseNum,
        reference,
        text: parsed.text,
      });
    }
  }

  console.log(`Inserting ${verses.length} verses...`);

  // Insert in batches
  const BATCH_SIZE = 500;
  for (let i = 0; i < verses.length; i += BATCH_SIZE) {
    const batch = verses.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("verses").insert(batch);
    if (error) {
      console.error(`Batch insert error: ${error.message}`);
    } else {
      verseCount += batch.length;
      console.log(`Inserted ${verseCount}/${verses.length} verses`);
    }
  }

  // Resolve book_id
  console.log("Resolving book_ids...");
  const { data: versesWithoutBook } = await supabase
    .from("verses")
    .select("id, reference")
    .is("book_id", null);

  if (versesWithoutBook) {
    for (const v of versesWithoutBook) {
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

  console.log(`\nDone! Imported ${verseCount} verses from ${fileCount} files.`);
}

main().catch(console.error);
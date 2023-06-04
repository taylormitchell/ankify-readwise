import dotenv from "dotenv";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { getDefinitions } from "./dictionary.js";
dotenv.config();

const LAST_RUN_FILE = path.resolve(process.env.LAST_RUN_FILE);

// Anki

async function anki(action, params) {
  const res = await fetch("http://localhost:8765", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      version: 6,
      params,
    }),
  });
  return await res.json();
}

async function insertFlashcard(note) {
  // const { fields } = note;
  // const { result, error } = await anki("findNotes", { query: `SourceId:${fields.SourceId}` });
  // const noteId = result[0];
  // if (error) {
  //   console.log(error);
  // } else if (noteId) {
  //   console.debug(`Skipping ${fields.SourceId} because it already exists`);
  // } else {
  const res = await anki("addNote", {
    note: {
      deckName: "2-Recent",
      modelName: "Basic (synced)",
      fields: { Front: "", Back: "", SourceId: "" },
      options: { allowDuplicate: false },
      ...note,
    },
  });
  if (res.error) {
    console.log(res.error);
  }
  // }
}

function getKindleUrl(asin, location) {
  return `kindle://book?action=open&asin=${asin}&location=${location}`;
}

export function parseQuestions(text) {
  const res = [];
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const current = lines[i];
    const next = lines[i + 1] || "";
    if (!current.startsWith("Q:")) {
      i++;
      continue;
    }
    const question = current.slice(2).trim();
    const answer = next.startsWith("A:") ? next.slice(2).trim() : "";
    res.push({ question, answer });
    i += answer ? 2 : 1;
  }
  return res;
}

export async function ankifyRecent() {
  console.log("Ankifying recent highlights");

  // Get highlights since last run
  const lastRun = fs.existsSync(LAST_RUN_FILE) ? fs.readFileSync(LAST_RUN_FILE, "utf8") : 0;

  console.log("Fetching highlights and books from Readwise");
  let highlights = await fetch("https://readwise.io/api/v2/highlights/", {
    method: "GET",
    headers: {
      Authorization: `Token ${process.env.READWISE_API_KEY}`,
    },
  })
    .then((res) => res.json())
    .then((res) => res.results);
  let books = await fetch("https://readwise.io/api/v2/books/", {
    method: "GET",
    headers: {
      Authorization: `Token ${process.env.READWISE_API_KEY}`,
    },
  })
    .then((res) => res.json())
    .then((res) => res.results);

  console.log("Filtering highlights and books since last run");
  const recentHighlights = highlights.filter((h) => h.highlighted_at > lastRun);
  const recentBooks = books.filter((b) => b.last_highlight_at > lastRun);

  console.log("Converting highlights to Anki notes");
  const ankiNotes = [];
  const vocabWords = new Set();
  for (const highlight of recentHighlights) {
    const book = books.find((b) => b.id === highlight.book_id);
    const note = highlight.note || "";
    const title = `<i style="font-size: 0.9rem; color: rgba(0, 0, 0, 0.5)">${book.title}</i>`;
    // Remove leading and trailing non-word characters
    const textTrimmed = (highlight.text || "").replace(/^\W+|\W+$/g, "");
    const source_url = book.source_url || getKindleUrl(book.asin, book.location);

    const qas = parseQuestions(note);
    // Question and answer -> Ankify as question card
    if (qas.length > 0) {
      for (const { question, answer } of qas) {
        ankiNotes.push({
          fields: {
            Front: [title, question].join("<br>"),
            Back: answer,
            SourceId: source_url,
          },
        });
      }
    }
    // Single word highlights or "d" for dictionary -> Ankify as vocabulary card
    else if (textTrimmed.match(/^\S+$/) || note.match(/^[dD]$/)) {
      // Collect all vocab words to look up definitions in bulk
      vocabWords.add(textTrimmed);
    }
    // "q" for question -> Ankify highlight text as question card
    else if (note.match(/^[qQ]$/)) {
      ankiNotes.push({
        fields: {
          Front: [title, textTrimmed].join("<br>"),
          Back: "",
          SourceId: source_url,
        },
      });
    }
  }
  // Look up definitions for all vocab words in bulk
  const definitions = await getDefinitions(Array.from(vocabWords));
  // Convert vocab words to Anki notes
  for (const definition of definitions) {
    ankiNotes.push({
      modelName: "Vocab.2023-04-08",
      fields: {
        Word: definition.word,
        Definition: definition.definition,
        Examples: definition.examples.join("<br>"),
      },
    });
  }

  for (const book of recentBooks) {
    const source_url = book.source_url || getKindleUrl(book.asin, book.location);
    ankiNotes.push({
      fields: {
        Front: `Who's the author of ${book.title}?`,
        Back: book.author,
        SourceId: source_url,
      },
    });
  }

  console.log("Inserting notes into Anki");
  for (const note of ankiNotes) {
    await insertFlashcard(note);
  }

  fs.writeFileSync(LAST_RUN_FILE, new Date().toISOString());
  console.log("Done");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ankifyRecent();
}

import dotenv from "dotenv";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { getDefinition } from "./dictionary.js";
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
  for (const h of recentHighlights) {
    const book = books.find((b) => b.id === h.book_id);
    const note = h.note || "";
    const title = `<i style="font-size: 0.9rem; color: rgba(0, 0, 0, 0.5)">${book.title}</i>`;
    const text = h.text || "";
    const source_url = book.source_url || getKindleUrl(book.asin, book.location);
    const lines = note.split("\n");
    if (note.match(/^[qQ]$/)) {
      // Ankify highlight
      ankiNotes.push({
        fields: {
          Front: [title, text].join("<br>"),
          Back: "",
          SourceId: source_url,
        },
      });
    } else if (note.match(/^[dD]$/)) {
      // Ankify definition
      let word = text;
      word = word[0].toUpperCase() + word.slice(1);
      const { definition, examples } = await getDefinition(word);
      ankiNotes.push({
        modelName: "Vocab.2023-04-08",
        fields: {
          Word: word,
          Definition: definition,
          Examples: examples.join("<br>"),
        },
      });
    } else {
      let i = 0;
      while (i < lines.length - 1) {
        if (lines[i].startsWith("Q:") && lines[i + 1].startsWith("A:")) {
          // Ankify question
          // title at 0.75rem and slightly transparent
          const title = `<i style="font-size: 0.9rem; color: rgba(0, 0, 0, 0.5)">${book.title}</i>`;
          const question = lines[i].slice(2).trim();
          const answer = lines[i + 1].slice(2).trim();
          ankiNotes.push({
            fields: {
              Front: [title, question].join("<br>"),
              Back: answer,
              SourceId: source_url,
            },
          });
          i += 2;
        }
        i++;
      }
    }
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

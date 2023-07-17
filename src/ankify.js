import dotenv from "dotenv";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
// import { getDefinitions } from "./dictionary.js";
import { annotationsToItems } from "./gpt.js";
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
  // const lastRun = fs.existsSync(LAST_RUN_FILE) ? fs.readFileSync(LAST_RUN_FILE, "utf8") : 0;
  // iso string 1 week ago
  // const lastRun = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString();
  // const lastRun = Date.now() - 1000 * 60 * 60 * 24 * 7; // 1 week ago

  // console.log("Fetching highlights and books from Readwise");
  // let highlights = await fetch("https://readwise.io/api/v2/highlights/", {
  //   method: "GET",
  //   headers: {
  //     Authorization: `Token ${process.env.READWISE_API_KEY}`,
  //   },
  // })
  //   .then((res) => res.json())
  //   .then((res) => res.results);
  // let books = await fetch("https://readwise.io/api/v2/books/", {
  //   method: "GET",
  //   headers: {
  //     Authorization: `Token ${process.env.READWISE_API_KEY}`,
  //   },
  // })
  //   .then((res) => res.json())
  //   .then((res) => res.results);

  // console.log("Filtering highlights and books since last run");
  // let recentHighlights = highlights.filter((h) => h.highlighted_at > lastRun).slice(0, 10);
  // recentHighlights = recentHighlights.slice(0, 10); // temp
  // const recentBooks = books.filter((b) => b.last_highlight_at > lastRun);

  // console.log("Create items from annotations");
  const ankiNotes = [];
  // const annotations = recentHighlights.map((h) => {
  //   const book = books.find((b) => b.id === h.book_id);
  //   const note = (h.note || "").replace("\n", "<br>");
  //   return {
  //     passage: h.text,
  //     note,
  //     title: book.title,
  //     author: book.author,
  //     uri: book.source_url || getKindleUrl(book.asin, h.location),
  //   };
  // });
  const annotations = [
    {
      passage:
        "Understanding an idea meant entangling it so thoroughly with all the other symbols in your mind that it changed the way you thought about everything.",
      note: "!",
      title: "Diaspora",
      author: "Greg Egan",
      uri: "kindle://book?action=open&asin=B00H6STTU6&location=undefined",
    },
    {
      passage:
        "Learning was a strange business. Ve could have had vis exoself wire all this raw information straight into vis mind, in an instant – ve could have engulfed a complete copy of the Truth Mines, like an amoeba ingesting a planet – but the facts would have become barely more accessible than they already were, and it would have done nothing to increase vis understanding. The only way to grasp a mathematical concept was to see it in a multitude of different contexts, think through dozens of specific examples, and find at least two or three metaphors to power intuitive speculations.",
      note: "",
      title: "Diaspora",
      author: "Greg Egan",
      uri: "kindle://book?action=open&asin=B00H6STTU6&location=undefined",
    },
    {
      passage: "exegesis",
      note: "",
      title: "Diaspora",
      author: "Greg Egan",
      uri: "kindle://book?action=open&asin=B00H6STTU6&location=undefined",
    },
    {
      passage:
        "In the Truth Mines, though, the tags weren’t just references; they included complete statements of the particular definitions, axioms, or theorems the objects represented. The Mines were self-contained: every mathematical result that fleshers and their descendants had ever proven was on display in its entirety.",
      note: "",
      title: "Diaspora",
      author: "Greg Egan",
      uri: "kindle://book?action=open&asin=B00H6STTU6&location=undefined",
    },
    {
      passage: "ethereal",
      note: "",
      title: "Diaspora",
      author: "Greg Egan",
      uri: "kindle://book?action=open&asin=B00H6STTU6&location=undefined",
    },
    {
      passage: "Radiya",
      note: "Also a teacher",
      title: "Diaspora",
      author: "Greg Egan",
      uri: "kindle://book?action=open&asin=B00H6STTU6&location=undefined",
    },
    {
      passage:
        "‘Really?’ Yatima felt a surge of pride; Euler and Gauss were legendary miners – long-dead fleshers, but their skills had rarely been equalled.",
      note: "I like this.<br>Referring to truth-seakers as miners<br>It's cool",
      title: "Diaspora",
      author: "Greg Egan",
      uri: "kindle://book?action=open&asin=B00H6STTU6&location=undefined",
    },
    {
      passage: "gestalt tags,",
      note: "",
      title: "Diaspora",
      author: "Greg Egan",
      uri: "kindle://book?action=open&asin=B00H6STTU6&location=undefined",
    },
    {
      passage: "incandescent",
      note: "Incadescent. Phosphorescent. What other words like this exist?",
      title: "Diaspora",
      author: "Greg Egan",
      uri: "kindle://book?action=open&asin=B00H6STTU6&location=undefined",
    },
    {
      passage: "a generic symbol had formed which encompassed all the strangers in the scape,",
      note: "theres something interesting here<br>creating a symbol for something, and tying it to objects or assigning props<br>but not giving it a name yet <br>i think thats similar to what ive been gesturing at with the Page concept i was considering for ideaflow",
      title: "Diaspora",
      author: "Greg Egan",
      uri: "kindle://book?action=open&asin=B00H6STTU6&location=undefined",
    },
  ];
  const items = await annotationsToItems(annotations);

  console.log("Mapping items to Anki notes");
  for (const item of items) {
    const titleHTML = `<i style="font-size: 0.9rem; color: rgba(0, 0, 0, 0.5)">${item.title}</i>`;
    if (item.type === "definition") {
      ankiNotes.push({
        modelName: "Vocab.2023-04-08",
        fields: {
          Word: item.word,
          Definition: item.definition,
          Examples: item.examples.join("<br>"),
        },
      });
    } else if (item.type === "flashcard") {
      ankiNotes.push({
        fields: {
          Front: [titleHTML, item.q].join("<br>"),
          Back: item.A,
          SourceId: item.uri,
        },
      });
    } else {
      console.log("Skipping item of type " + item.type);
    }
  }

  console.log("Creating Anki notes from recent books");
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

  // console.log("Inserting notes into Anki");
  // for (const note of ankiNotes) {
  //   await insertFlashcard(note);
  // }

  // fs.writeFileSync(LAST_RUN_FILE, new Date().toISOString());
  // console.log("Done");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ankifyRecent();
}

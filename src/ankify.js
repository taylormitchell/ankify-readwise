import dotenv from "dotenv";
import fs from "fs";
import invariant from "tiny-invariant";
import path from "path";
import fetch from "node-fetch";
dotenv.config();

const dataDir = process.env.DATA_DIR;
invariant(dataDir, "Missing DATA_DIR env variable!");

// Find new books and annotations

function getChanges(curr, prev) {
  const changes = [];
  Object.entries(curr).forEach(([bookId, book]) => {
    if (!prev?.[bookId]) {
      changes.push({ type: "book", data: book });
    }
    for (const [annotationId, annotation] of Object.entries(book.annotations)) {
      if (!prev?.[bookId]?.annotations[annotationId]) {
        changes.push({ type: "annotation", data: { ...annotation, book } });
      }
    }
  });
  return changes;
}

function getLatestChanges() {
  const files = fs
    .readdirSync(dataDir)
    .filter((n) => n.startsWith("books"))
    .sort()
    .reverse();
  const curr = JSON.parse(fs.readFileSync(path.join(dataDir, files[0])));
  const prev = JSON.parse(fs.readFileSync(path.join(dataDir, files[1])));
  return getChanges(curr.books, prev.books);
}

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

async function upsertFlashcard(flashcard) {
  const { result, error } = await anki("findNotes", { query: `SourceId:${flashcard.SourceId}` });
  const noteId = result[0];
  if (noteId) {
    const res = await anki("updateNoteFields", {
      note: {
        id: noteId,
        fields: flashcard,
      },
    });
    if (res.error) {
      console.log(res.error);
    }
  } else {
    const res = await anki("addNote", {
      note: {
        deckName: "2-Recent",
        modelName: "Basic (synced)",
        fields: flashcard,
        options: { allowDuplicate: false },
      },
    });
    if (res.error) {
      console.log(res.error);
    }
  }
}

async function insertFlashcard(flashcard) {
  const { result, error } = await anki("findNotes", { query: `SourceId:${flashcard.SourceId}` });
  const noteId = result[0];
  if (error) {
    console.log(error);
  } else if (noteId) {
    console.debug(`Skipping ${flashcard.SourceId} because it already exists`);
  } else {
    const res = await anki("addNote", {
      note: {
        deckName: "2-Recent",
        modelName: "Basic (synced)",
        fields: flashcard,
        options: { allowDuplicate: false },
      },
    });
    if (res.error) {
      console.log(res.error);
    }
  }
}

async function ankifyChanges(changes) {
  const flashcards = [];
  for (const change of changes) {
    if (change.type === "book") {
      flashcards.push({
        Front: `Who's the author of ${change.data.title}?`,
        Back: change.data.author,
        SourceId: `author-${change.data.id}`,
      });
    }
    if (change.type === "annotation") {
      const note = change.data.note || "";
      const lines = note.split("\n");
      if (note === "q") {
        // Ankify highlight
        flashcards.push({
          Front: [`<i>${change.data.book.title}</i>`, `<i>${change.data.highlight}</i>`].join(
            "<br>"
          ),
          Back: "",
          SourceId: `highlight-${change.data.id}`,
        });
      } else if (lines.length === 2 && lines[0].startsWith("Q:") && lines[1].startsWith("A:")) {
        // Ankify question
        // title at 0.75rem and slightly transparent
        const title = `<i style="font-size: 0.9rem; color: rgba(0, 0, 0, 0.5)">${change.data.book.title}</i>`;
        const question = lines[0].slice(2).trim();
        const answer = lines[1].slice(2).trim();
        flashcards.push({
          Front: [title, question].join("<br>"),
          Back: answer,
          SourceId: `question-${change.data.id}`,
        });
      }
    }
  }
  for (const flashcard of flashcards) {
    await insertFlashcard(flashcard);
  }
}

export async function ankifyLatest() {
  await ankifyChanges(getLatestChanges());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ankifyLatest();
}

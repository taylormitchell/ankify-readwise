import puppeteer from "puppeteer";
import dotenv from "dotenv";
import fs from "fs";
import invariant from "tiny-invariant";
import path from "path";
// const filedir = path.dirname(new URL(import.meta.url).pathname);
// dotenv.config({ path: path.join(filedir, ".env") });
dotenv.config();

const user = process.env.AMAZON_USER;
invariant(user, "Missing USER env variable!");
const pass = process.env.AMAZON_PASS;
invariant(pass, "Missing PASS env variable!");

async function getAnnotations() {
  console.log("Opening browser");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(60_000);
  //   await page._client.send("Page.setDownloadBehavior", {
  //     behavior: "allow",
  //   });

  console.log("Going to amazon");
  await page.goto("https://read.amazon.com/notebook");
  await page.waitForSelector('form[name="signIn"]');

  console.log("Logging in");
  await page.click("#ap_email");
  await page.type("#ap_email", user);
  await page.click("#ap_password");
  await page.type("#ap_password", pass);
  await page.click("#signInSubmit");
  await page.waitForSelector("#library");

  console.log("Getting books");
  let books = {};
  const indexElements = await page.$$("#kp-notebook-library > div");
  for (const element of indexElements.slice(0, 3)) {
    // Get book info
    let book = await page.evaluate((el) => {
      return {
        id: el.id,
        title: el.querySelector("h2").innerText,
        author: el.querySelector("p").innerText,
      };
    }, element);
    // Click on book
    await page.waitForTimeout(200);
    await element.click();
    // await page.waitForTimeout(1000);
    await page.waitForSelector("#kp-notebook-annotations-pane > div");
    // Get annotations
    book.annotations = await page.evaluate(() => {
      let annotations = {};
      document.querySelectorAll("#kp-notebook-annotations > div").forEach((el) => {
        const id = el.id;
        const highlight = el.querySelector("#highlight")?.innerText;
        const note = el.querySelector("#note")?.innerText;
        if (!id) return;
        if (!highlight && !note) return;
        annotations[id] = { id, note, highlight };
      });
      return annotations;
    });
    books[book.id] = book;
  }

  console.log("Close browser");
  browser.close();

  return books;
}

async function downloadAnnotations() {
  const books = await getAnnotations();
  const name = `books-${new Date().toISOString().slice(0, 10)}.json`;
  fs.writeFileSync(path.join("data", name), JSON.stringify(books, null, 2));
}

function getDiff(curr, prev) {
  const diff = Object.entries(curr).reduce((acc, [bookId, book]) => {
    let hasNew = false;
    const newBook = { ...book, annotations: {} };
    for (const [annotationId, annotation] of Object.entries(book.annotations)) {
      if (!prev?.[bookId]?.annotations[annotationId]) {
        newBook.annotations[annotationId] = annotation;
        hasNew = true;
      }
    }
    const res = { ...acc };
    if (hasNew) res[bookId] = newBook;
    return res;
  }, {});
  return diff;
}

function calcDiff() {
  const prev = JSON.parse(fs.readFileSync("data/books-2023-03-30.json"));
  const curr = JSON.parse(fs.readFileSync("data/books-2023-03-31.json"));
  const diff = getDiff(curr, prev);
  fs.writeFileSync("diff.json", JSON.stringify(diff, null, 2));
}

// downloadAnnotations();
calcDiff();

import puppeteer from "puppeteer";
import dotenv from "dotenv";
import fs from "fs";
import invariant from "tiny-invariant";
import path from "path";
dotenv.config();

const user = process.env.AMAZON_USER;
invariant(user, "Missing USER env variable!");
const pass = process.env.AMAZON_PASS;
invariant(pass, "Missing PASS env variable!");
const dataDir = process.env.DATA_DIR;
const url = "https://read.amazon.com/notebook";

export async function getAnnotations(limit = 10) {
  console.log("Opening browser");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(60_000);
  //   await page._client.send("Page.setDownloadBehavior", {
  //     behavior: "allow",
  //   });

  console.log("Going to amazon");
  await page.goto(url);
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
  for (const element of indexElements.slice(0, limit)) {
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

export async function downloadAnnotations() {
  const books = await getAnnotations();
  const res = {
    books,
    account: user,
    snapshotDate: new Date().toISOString(),
    source: url,
  };
  const name = `books-${res.snapshotDate}.json`;
  fs.writeFileSync(path.join(dataDir, name), JSON.stringify(res, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAnnotations();
}

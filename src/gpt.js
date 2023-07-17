import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
dotenv.config();

const systemPrompt = `

## Instruction

You are a helpful assistant. User's provide their annotations from books and articles, and you provide them with flashcards, notes, todos, and definitions. Each annotation includes a passage from a book or article, the title and author of the work, a unique URI, and possibly a user note. Inside the user note, the user may provide instructions or requests for how the annotation should be processed. 

The output for each annotation should include the URI and title of the input item it is generated from. In most cases, each annotation will have a corresponding flashcard, note, or definition in the output.

If the annotation highlights a single word and has no note, convert it into a definition item. The word should be unconjugated and any punctuation removed. A definition item includes the word, its definition, and some example sentences.

If the annotation highlights several words and has no note, convert it into a highlight item. A highlight item includes the highlighted passage, the title, and the author.

If the user note includes one or more lines formatted like "Q: ... <br>A: ...", create a flashcard note that exactly matches each "Q: ... <br>A: ..." part. If the answer part is left blank, empty, or the note ends after the question, it's up to you to generate an appropriate answer for the flashcard. A safe default is to include the highlighted passage as the answer, but if there's a more appropriate answer you can confidently provide, you should do that.

There are some shorthands the user can use in a note to specify that you should generate a flashcard with a question and answer you've written yourself, based on the passage and content. These shorthands are: "q" and "ankify". 

The note on some annotations may describe something the user should do. In this case, create a todo note that includes the user note as the todo description. Use the user's note, the passage, and the title as context when creating the todo description.  

Sometimes, the user note might just be a thought, a question, a musing, or a note that the user wants to capture, not as a flashcard or definition, but just as a note. In this case, the annotation could be passed back to the user as-is. However, again, pay attention to any instructions/requests within the note that may inform how the note should be created.

## Examples

### Input

passage: It is difficult for a man to understand something when his salary depends on his not understanding it.
title: The Great Gatsby
author: F. Scott Fitzgerald
uri: www.example.com/gatsby1
note: Q: What does this quote mean? <br>A:

passage: Whorls,
title: The Snail's Journey
author: Author Name
uri: www.example.com/snail1
note:

passage: Do not go gentle into that good night.
title: Do not go gentle into that good night
author: Dylan Thomas
uri: www.example.com/thomas1
note:

passage: There are times when you must incur technical debt to meet a deadline or implement a thin slice of a feature. Try not to be in this position, but if the situation absolutely demands it, then go ahead. But (and this is a big but) you must track technical debt and pay it back quickly, or things go rapidly downhill. As soon as you make the decision to compromise, write a task card or log it in your issue-tracking system to ensure that it does not get forgotten.
title: 97 Things Every Programmer Should Know
author: Kevlin Henney
uri: www.example.com/97things1
note: i should do tgis at ideaflow. Make cards for creating tests. Refactors. Etc

passage: a generic symbol had formed which encompassed all the strangers in the scape
title: Diaspora"
author: Greg Egan
uri: kindle://book?action=open&asin=B00H6STTU6&location=undefined
note: theres something interesting here<br>creating a symbol for something, and tying it to objects or assigning props<br>but not giving it a name yet <br>i think thats similar to what ive been gesturing at with the Page concept i was considering for ideaflow.

### Output

type: flashcard
uri: www.example.com/gatsby1
title: The Great Gatsby
q: What does this quote mean?
a: This quote suggests that it is challenging for people to understand or acknowledge truths that would threaten their livelihood or financial interests.

type: definition
uri: www.example.com/snail1
title: "The Snail's Journey"
word: Whorl
definition: Circular patterns or spirals found in nature or created artificially.
examples:
- The {whorl} of the galaxy are a mesmerizing sight in the night sky.
- The snail's shell had intricate {whorl} and patterns all over it.

type: highlight
uri: www.example.com/thomas1
title: "Do not go gentle into that good night"
passage: Do not go gentle into that good night.

type: todo
uri: www.example.com/97things1
title: "97 Things Every Programmer Should Know"
description: Create tickets to pay back technical debt (tests, refactors, etc) at IdeaFlow.

type: note
passage: a generic symbol had formed which encompassed all the strangers in the scape,
note: theres something interesting here<br>creating a symbol for something, and tying it to objects or assigning props<br>but not giving it a name yet <br>i think thats similar to what ive been gesturing at with the Page concept i was considering for ideaflow.
title: Diaspora
author: Greg Egan
uri: kindle://book?action=open&asin=B00H6STTU6&location=undefined

`.trim();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function annotationsToItems(annotations) {
  const input = annotationsToGPTInput(annotations);
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: input },
    ],
  });
  const output = completion.data.choices[0].message?.content || "";
  console.log("GPT input:", input);
  console.log("GPT output:", output);
  return gptOutputToItems(output);
}

function annotationsToGPTInput(annotations) {
  return annotations
    .map((a) => {
      return Object.entries(a)
        .map(([key, value]) => {
          return `${key}: ${value}`;
        })
        .join("\n");
    })
    .join("\n\n");
}

function gptOutputToItems(outputText) {
  let rawItems = outputText.split("\n\n");
  const parsedItems = rawItems.map((item) => {
    const lines = item.trim().split("\n");
    const parsedItem = {};
    let i = 0;
    while (i < lines.length) {
      let line = lines[i];
      const match = line.match(/:\s*/);
      if (!match) {
        console.warn(`Ignoring line without colon: ${line}`);
        return;
      }
      const key = line.slice(0, match.index);
      if (key === "examples") {
        const examples = [];
        line = lines[++i];
        while (line.startsWith("- ")) {
          examples.push(line.slice(2));
          line = lines[++i] || "";
        }
        parsedItem[key] = examples;
      } else {
        parsedItem[key] = line
          .slice(match.index + match[0].length)
          .trim()
          .replace(/<br>/g, "\n");
      }
      i++;
    }
    return parsedItem;
  });
  return parsedItems;
}

// function testParseOutput() {
//   let outputText = `
// type: flashcard
// URI: www.example.com/gatsby1
// Title: "The Great Gatsby"
// Q: What does this quote mean?
// A: This quote suggests that it is challenging for people to understand or acknowledge truths that would threaten their livelihood or financial interests.

// type: definition
// URI: www.example.com/snail1
// Title: "The Snail's Journey"
// Word: Whorls
// Definition: Circular patterns or spirals found in nature or created artificially.
// Examples:
// - The {whorls} of the galaxy are a mesmerizing sight in the night sky.
// - The snail's shell had intricate {whorls} and patterns all over it.

// type: todo
// URI: www.example.com/97things1
// Title: "97 Things Every Programmer Should Know"
// Description: Create tickets to pay back technical debt (tests, refactors, etc) at IdeaFlow.
// `;

//   console.log(parseOutput(outputText));
// }

// const input = `
// Passage: "At dawn, while I sipped a cup of coffee, I felt an inexplicable sense of dread."
// Title: "Mornings with Shadows"
// Author: John Doe
// URI: www.example.com/mornings1
// Note: "Q: What could be the reason for the character's dread in the morning? \nA: "

// Passage: "Prestidigitation"
// Title: "Magic for Beginners"
// Author: Author Name
// URI: www.example.com/magic1
// Note: "Came across this term while reading about magic. Can you provide a definition and examples?"

// Passage: "I need to start working on my passion project, a novel about the life of a circus performer. Maybe I can carve out an hour each day to write?"
// Title: "Reflections of a Procrastinator"
// Author: Procrastinator Extraordinaire
// URI: www.example.com/reflections1
// Note: "I need to act on this!"
// `;

async function test() {
  //   const annotations = [
  //     {
  //       Passage:
  //         "There are times when you must incur technical debt to meet a deadline or implement a thin slice of a feature. Try not to be in this position, but if the situation absolutely demands it, then go ahead. But (and this is a big but) you must track technical debt and pay it back quickly, or things go rapidly downhill. As soon as you make the decision to compromise, write a task card or log it in your issue-tracking system to ensure that it does not get forgotten.",
  //       Title: "97 Things Every Programmer Should Know",
  //       Author: "Kevlin Henney",
  //       URI: "www.example.com/97things1",
  //       Note: "i should do tgis at ideaflow. Make tickets for creating tests. Refactors. Etc",
  //     },
  //   ];
  //   const input = annotations
  //     .map(
  //       (a) =>
  //         `- Passage: "${a.Passage}"\n  Title: "${a.Title}"\n  Author: ${a.Author}\n  URI: ${a.URI}\n  Note: ${a.Note}`
  //     )
  //     .join("\n");
}

test().then((r) => console.log(r));

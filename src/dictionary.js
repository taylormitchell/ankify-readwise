import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function getDefinitions(words) {
  if (words.length === 0) return [];
  const wordList = words.map((w) => `- ${w}`).join("\n");
  const prompt = `
## Instruction
Provide a succinct definition and 2-5 examples sentences for each of the words provided to you. In each of the example sentences, wrap the word in curly brackets. The example sentences should be such that, a person could intuit the definition just from those sentences. If the provided word is conjugated, then provide the unconjugate version of it.

The following is an example list, output, and format.

### Example

List of words to define:
- Surly
- Whorls
- Indignant

Word: Surly
Definition: unfriendly and bad-tempered; hostile
Examples:
- The {surly} bus driver refused to answer any questions from the passengers.
- Jane's {surly} attitude towards the customers resulted in her being fired from her job at the restaurant.
- The {surly} security guard at the entrance glared at everyone who entered.
---
Word: Whorl
Definition: Circular patterns or spirals found in nature or created artificially.
Examples:
- The {whorls} of the galaxy are a mesmerizing sight in the night sky.
- The snail's shell had intricate {whorls} and patterns all over it.
- The artist carefully painted the {whorls} of a seashell, capturing its beauty and complexity.
- The ancient pottery was decorated with {whorls} and spirals, showcasing the craftsmanship of its makers.
- The tornado formed a {whorl} of destruction as it swept through the countryside.

## Task

List of words to define:
${wordList}
  `.trim();

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ],
  });
  const response = completion.data.choices[0].message?.content || "";
  return parseDefinitions(response);
}

function parseDefinitions(content) {
  const lines = content.split("\n");
  const res = [];
  let i = 0;
  while (i < lines.length) {
    // Found start of a vocab
    if (lines[i].startsWith("Word:")) {
      const vocab = {};
      // Parse the word
      vocab.word = lines[i].split("Word:")[1].trim();
      i++;
      // Parse definition
      if (lines[i].startsWith("Definition:")) {
        vocab.definition = lines[i].split("Definition:")[1].trim();
        i++;
      } else {
        // If there is no definition, skip this vocab
        console.error("Definition not found, skipping");
        i++;
        continue;
      }
      // Parse examples
      if (lines[i].startsWith("Examples:")) {
        vocab.examples = [];
        i++;
        while (i < lines.length && lines[i].startsWith("-")) {
          vocab.examples.push(lines[i].split("-")[1].trim());
          i++;
        }
        res.push(vocab);
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  return res;
}

import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function getDefinition(word) {
  const prompt = `
    Provide a succinct definition of the word ${word}. DO NOT use the word in the definition. 
    Then provide 5 examples using in a sentence, with the word in bold.
    Your response should be in the following format:

    Word: ${word}
    Definition: …
    Examples:
    - …
    - …
    `
    .trim()
    .replace(/^\s*/gm, "");
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ],
  });
  const response = completion.data.choices[0].message?.content || "";
  const definition = response.split("Definition:").pop().split("Examples:")[0].trim();
  const examples = response
    .split("Examples:")
    .pop()
    .trim()
    .split("-")
    .map((x) => x.trim())
    .filter(Boolean);
  return { word, definition, examples };
}

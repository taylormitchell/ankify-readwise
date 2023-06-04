import { parseQuestions } from "./ankify";

test("single question", () => {
  const text = `
Q: What is the author's name?
A: A thing
`.trim();
  expect(parseQuestions(text)).toEqual([
    {
      question: "What is the author's name?",
      answer: "A thing",
    },
  ]);
});

test("question without answer", () => {
  const text = "Q: Some card";
  expect(parseQuestions(text)).toEqual([
    {
      question: "Some card",
      answer: "",
    },
  ]);
});

test("multiple questions", () => {
  const text = `
Q: A question
Q: Another question
A: With an answer
non-question line

Q: Last question
A: With an answer
    `;
  expect(parseQuestions(text)).toEqual([
    {
      question: "A question",
      answer: "",
    },
    {
      question: "Another question",
      answer: "With an answer",
    },
    {
      question: "Last question",
      answer: "With an answer",
    },
  ]);
});

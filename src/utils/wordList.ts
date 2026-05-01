export type WordFilter = (word: string) => boolean;

export const letterboxedWordFilter: WordFilter = (word) => word.length >= 3;

export const hangmanWordFilter: WordFilter = (word) => {
  return word.length >= 4 && word.length <= 10 && /^[A-Z]+$/.test(word);
};

export async function loadWords(filter?: WordFilter) {
  const response = await fetch("/words.txt");
  const text = await response.text();
  const words = text
    .split(/\r?\n/)
    .map((word) => word.trim().toUpperCase())
    .filter(Boolean);

  return filter ? words.filter(filter) : words;
}
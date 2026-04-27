import React, { useState } from 'react';

function seededRandom(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += h << 13; h ^= h >>> 7;
    h += h << 3; h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967295;
  };
}

// Generate a puzzle for a given puzzle number
function generatePuzzle(puzzleNumber: number) {
  const seed = puzzleNumber.toString(); // Use puzzle number directly as the seed
  const rand = seededRandom(seed);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  let letters: string[] = [];
  // Pick 12 unique letters
  while (letters.length < 12) {
    const i = Math.floor(rand() * alphabet.length);
    const l = alphabet[i];
    if (!letters.includes(l)) letters.push(l);
  }
  // Group into 4 sides
  return [0, 1, 2, 3].map(i => letters.slice(i * 3, i * 3 + 3));
}

// Check if at least one word can be made from the puzzle letters
function isSolvable(sides: string[][], wordList: string[]): boolean {
  const allowed = new Set(sides.flat());
  return wordList.some(word =>
    word.length >= 3 &&
    [...word].every(l => allowed.has(l))
  );
}

// Helper: get puzzle number (days since first puzzle)
function getPuzzleNumber() {
  const start = new Date("2026-01-01"); // Fixed start date for the first puzzle
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

function Letterboxed() {
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const [wordSet, setWordSet] = useState<Set<string> | null>(null);

  // Load words.txt on mount
  React.useEffect(() => {
    fetch('/words.txt')
      .then(res => res.text())
      .then(text => {
        const words = text.split(/\r?\n/).map(w => w.trim().toUpperCase()).filter(w => w.length >= 3);
        setWordSet(new Set(words));
      });
  }, []);

  // Generate today's puzzle, retry if not solvable (up to 10 times)
  let sides: string[][] = [];
  const puzzleNumber = getPuzzleNumber();
  // Only check solvability if wordSet is loaded
  for (let i = 0; i < 10; i++) {
    sides = generatePuzzle(puzzleNumber + i); // Use puzzleNumber with retries
    // If wordSet is not loaded yet, skip solvability check
    if (!wordSet || isSolvable(sides, Array.from(wordSet))) break;
  }

  // Track which letters have been used across all guesses
  const usedLetters = new Set(guesses.join("").split(""));
  const allLetters = sides.flat();
  const unusedLetters = allLetters.filter(l => !usedLetters.has(l));

  // Helper: get side index for a letter
  function getSideIndex(letter: string) {
    for (let i = 0; i < 4; i++) {
      if (sides[i].includes(letter)) return i;
    }
    return -1;
  }

  // Track which letters are in the current guess
  const guessLetters = guess.toUpperCase().split("");
  const lastGuessLetter = guessLetters.length > 0 ? guessLetters[guessLetters.length - 1] : null;

  // Validation logic for a guess
  function validateGuess(word: string): string | null {
    const upper = word.toUpperCase();
    if (upper.length < 3) return "Word must be at least 3 letters.";
    if (!wordSet) return "Loading word list...";
    if (!wordSet.has(upper)) return "Not in word list.";
    if (guesses.includes(upper)) return "Word already used.";
    // Each word must start with the last letter of the previous word (if any)
    if (guesses.length > 0) {
      const prev = guesses[guesses.length - 1];
      if (upper[0] !== prev[prev.length - 1]) return `Word must start with '${prev[prev.length - 1]}'`;
    }
    // Only use board letters
    const allowed = new Set(sides.flat());
    if (![...upper].every(l => allowed.has(l))) return "Use only board letters.";
    // No consecutive letters from same side
    let prevSide = getSideIndex(upper[0]);
    for (let i = 1; i < upper.length; i++) {
      const side = getSideIndex(upper[i]);
      if (side === prevSide) return "No consecutive letters from same side.";
      prevSide = side;
    }
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitGuess();
  }

  function submitGuess() {
    if (!wordSet) {
      setError("Loading word list...");
      return;
    }
    const trimmed = guess.trim().toUpperCase();
    if (!trimmed) return;
    const validation = validateGuess(trimmed);
    if (validation) {
      setError(validation);
      return;
    }
    setGuesses([...guesses, trimmed]);
    setGuess("");
    setError("");
  }

  function handleReset() {
    setGuesses([]);
    setGuess("");
    setError("");
  }

  function handleLetterClick(l: string) {
    setGuess(g => g + l);
  }

  function handleBackspace() {
    setGuess(g => {
      if (g.length > 0) {
        return g.slice(0, -1);
      } else if (guesses.length > 0) {
        // Pop last word and put it back in the input
        const last = guesses[guesses.length - 1];
        setGuesses(guesses.slice(0, -1));
        return last;
      }
      return "";
    });
  }
  // If not the first word, force the first letter to be the required one
  const requiredFirstLetter = guesses.length > 0 ? guesses[guesses.length - 1].slice(-1) : null;

  // Helper to enforce first letter
  function enforceFirstLetter(input: string) {
    if (!requiredFirstLetter) return input;
    // Always ensure the first letter is requiredFirstLetter
    if (input.length === 0) return requiredFirstLetter;
    if (input[0] !== requiredFirstLetter) {
      // Remove all occurrences of requiredFirstLetter and prepend it
      return requiredFirstLetter + input.replaceAll(requiredFirstLetter, "").slice(0);
    }
    return input;
  }

  // Win condition: all letters used at least once
  const isWin = unusedLetters.length === 0;

  const [showHelp, setShowHelp] = useState(false);

  return (
    <main className="min-h-screen pixel-bg flex flex-col items-center justify-start py-16 px-4">
      <a
        href="/"
        className="fixed top-4 left-4 z-50 bg-gray-800 hover:bg-green-700 text-green-300 hover:text-white font-mono px-4 py-2 rounded shadow transition border border-green-900"
      >
        ← Back to Games Menu
      </a>
      <div className="fixed top-4 right-4 z-50">
        <button
          className="bg-gray-800 hover:bg-green-700 text-green-300 hover:text-white font-mono px-4 py-2 rounded shadow transition border border-green-900"
          onClick={() => setShowHelp(true)}
        >
          ❓ Help
        </button>
      </div>
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-green-300 p-6 rounded shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">How to Play</h2>
            <p className="mb-4">Form words using the letters on the board. Each word must start with the last letter of the previous word. Use all the letters to win!</p>
            <button
              className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600 transition"
              onClick={() => setShowHelp(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center mb-2">
        <h1 className="text-4xl md:text-5xl font-extrabold text-green-400">Letterboxed</h1>
      </div>
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-2">
            {sides[0].map((l, i) => {
              const isInGuess = guessLetters.includes(l);
              const isSelected = lastGuessLetter === l && guessLetters.lastIndexOf(l) === guessLetters.length - 1;
              return (
                <button
                  key={i}
                  type="button"
                  className={`w-12 h-12 bg-gray-900 flex items-center justify-center text-2xl font-mono select-none transition focus:outline-none focus:ring-2 focus:ring-green-400
                    ${isSelected ? 'border-4 border-green-400 text-green-100 bg-green-900' : isInGuess ? 'border-green-400 text-green-100 bg-green-900 border-2' : usedLetters.has(l) ? 'border-green-400 text-green-100 bg-green-900 border-2' : 'border-green-600 text-green-300 border-2'}`}
                  title={usedLetters.has(l) ? 'Used' : 'Unused'}
                  onClick={() => !isWin && handleLetterClick(l)}
                  tabIndex={0}
                  aria-label={`Add letter ${l}`}
                >
                  {l}
                </button>
              );
            })}
          </div>
          {/* Right */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            {sides[1].map((l, i) => {
              const isInGuess = guessLetters.includes(l);
              const isSelected = lastGuessLetter === l && guessLetters.lastIndexOf(l) === guessLetters.length - 1;
              return (
                <button
                  key={i}
                  type="button"
                  className={`w-12 h-12 bg-gray-900 flex items-center justify-center text-2xl font-mono select-none transition focus:outline-none focus:ring-2 focus:ring-green-400
                    ${isSelected ? 'border-4 border-green-400 text-green-100 bg-green-900' : isInGuess ? 'border-green-400 text-green-100 bg-green-900 border-2' : usedLetters.has(l) ? 'border-green-400 text-green-100 bg-green-900 border-2' : 'border-green-600 text-green-300 border-2'}`}
                  title={usedLetters.has(l) ? 'Used' : 'Unused'}
                  onClick={() => !isWin && handleLetterClick(l)}
                  tabIndex={0}
                  aria-label={`Add letter ${l}`}
                >
                  {l}
                </button>
              );
            })}
          </div>
          {/* Bottom */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2">
            {sides[2].map((l, i) => {
              const isInGuess = guessLetters.includes(l);
              const isSelected = lastGuessLetter === l && guessLetters.lastIndexOf(l) === guessLetters.length - 1;
              return (
                <button
                  key={i}
                  type="button"
                  className={`w-12 h-12 bg-gray-900 flex items-center justify-center text-2xl font-mono select-none transition focus:outline-none focus:ring-2 focus:ring-green-400
                    ${isSelected ? 'border-4 border-green-400 text-green-100 bg-green-900' : isInGuess ? 'border-green-400 text-green-100 bg-green-900 border-2' : usedLetters.has(l) ? 'border-green-400 text-green-100 bg-green-900 border-2' : 'border-green-600 text-green-300 border-2'}`}
                  title={usedLetters.has(l) ? 'Used' : 'Unused'}
                  onClick={() => !isWin && handleLetterClick(l)}
                  tabIndex={0}
                  aria-label={`Add letter ${l}`}
                >
                  {l}
                </button>
              );
            })}
          </div>
          {/* Left */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            {sides[3].map((l, i) => {
              const isInGuess = guessLetters.includes(l);
              const isSelected = lastGuessLetter === l && guessLetters.lastIndexOf(l) === guessLetters.length - 1;
              return (
                <button
                  key={i}
                  type="button"
                  className={`w-12 h-12 bg-gray-900 flex items-center justify-center text-2xl font-mono select-none transition focus:outline-none focus:ring-2 focus:ring-green-400
                    ${isSelected ? 'border-4 border-green-400 text-green-100 bg-green-900' : isInGuess ? 'border-green-400 text-green-100 bg-green-900 border-2' : usedLetters.has(l) ? 'border-green-400 text-green-100 bg-green-900 border-2' : 'border-green-600 text-green-300 border-2'}`}
                  title={usedLetters.has(l) ? 'Used' : 'Unused'}
                  onClick={() => !isWin && handleLetterClick(l)}
                  tabIndex={0}
                  aria-label={`Add letter ${l}`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="w-full max-w-xs mb-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-lg">
            {guesses.map((word, i) => (
              <span key={i} className="bg-gray-800 border border-green-700 rounded px-3 py-1 text-green-200">
                {word}
              </span>
            ))}
            {guesses.length > 0 && (
              <span className="ml-2 text-green-400 text-xl font-bold">{guesses[guesses.length - 1].slice(-1)}</span>
            )}
          </div>
        </div>
      {!isWin && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap gap-2 mb-6 items-center justify-center"
          onKeyDown={e => {
            if (e.key === "Backspace" && guess.length === 0 && guesses.length > 0) {
              e.preventDefault();
              handleBackspace();
            }
          }}
        >
          <input
            type="text"
            value={guess}
            onChange={e => {
              let val = e.target.value.toUpperCase();
              if (requiredFirstLetter) {
                val = enforceFirstLetter(val);
              }
              setGuess(val);
            }}
            className="px-4 py-2 rounded bg-gray-900 border border-green-600 text-green-200 font-mono focus:outline-none focus:ring-2 focus:ring-green-400 w-full sm:w-auto"
            placeholder="Enter word..."
            disabled={isWin}
          />
          <button
            type="button"
            className="px-3 py-2 rounded bg-gray-800 border border-green-700 text-green-200 font-mono hover:bg-green-700 hover:text-white transition"
            onClick={handleBackspace}
            tabIndex={-1}
            aria-label="Backspace"
            disabled={isWin}
          >
            ⌫
          </button>
          <button type="submit" className="px-4 py-2 rounded bg-green-700 text-white font-mono hover:bg-green-600 transition" disabled={isWin}>
            Submit
          </button>
        </form>
      )}
      {error && !isWin && (
        <div className="mb-4 text-red-400 font-mono text-center">{error}</div>
      )}
      {isWin && (
        <div className="mb-6 p-4 bg-green-900 border border-green-500 rounded text-green-200 font-mono text-center shadow-lg">
          <h2 className="text-2xl font-bold text-green-300 mb-2">You solved it!</h2>
          <div>Words used: <span className="font-bold text-green-100">{guesses.length}</span></div>
          <div className="mt-2">Your words:</div>
          <ul className="space-y-1 mt-1">
            {guesses.map((word, i) => (
              <li key={i} className="inline-block mx-1 px-2 py-1 bg-gray-800 border border-green-700 rounded text-green-200">{word}</li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-4 px-4 py-2 rounded bg-green-700 text-white font-mono hover:bg-green-600 transition border border-green-400 shadow"
            onClick={() => {
              const puzzleNum = getPuzzleNumber();
              const shareText = `I solved Letterboxed #${puzzleNum} in ${guesses.length} words!\nPlay: https://games.jthome.net/letterboxed`;
              navigator.clipboard.writeText(shareText);
              setToast('Results copied to clipboard!');
              setTimeout(() => setToast(""), 2500);
            }}
          >
            Share Results
          </button>
        </div>
      )}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs flex gap-3 justify-center z-40">
        <button
          type="button"
          className="px-3 py-1 rounded bg-gray-900 border border-green-800 text-green-400 font-mono text-sm opacity-80 hover:opacity-100 hover:bg-green-900 hover:text-white transition"
          onClick={handleReset}
        >
          Reset
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-gray-900 border border-green-800 text-green-400 font-mono text-sm opacity-80 hover:opacity-100 hover:bg-green-900 hover:text-white transition"
          onClick={() => {
            navigator.clipboard.writeText("Play LetterBoxed: https://games.jthome.net/letterboxed");
            setToast('Share link copied to clipboard!');
            setTimeout(() => setToast(""), 2000);
          }}
        >
          Share
        </button>
      </div>
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-800 text-green-100 px-6 py-3 rounded shadow-lg font-mono text-lg z-50 border border-green-400 animate-fade-in">
          {toast}
        </div>
      )}
    </main>
  );
}

export default Letterboxed;

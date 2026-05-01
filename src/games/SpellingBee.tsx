import { useEffect, useMemo, useState } from "react";
import { copyTextToClipboard } from "../utils/clipboard";
import { getPuzzleNumber, seededRandom, selectDailyItem } from "../utils/puzzle";
import { loadWords } from "../utils/wordList";

type BeePuzzle = {
  letters: string[];
  center: string;
  validWords: Set<string>;
};

function uniqueLetters(word: string) {
  return Array.from(new Set(word.split("")));
}

function scoreWord(word: string, puzzleLetters: Set<string>) {
  const isPangram = puzzleLetters.size === uniqueLetters(word).length && [...puzzleLetters].every((l) => word.includes(l));
  if (word.length === 4) return isPangram ? 8 : 1;
  return word.length + (isPangram ? 7 : 0);
}

function shuffleDeterministic(letters: string[], seed: string) {
  const rand = seededRandom(seed);
  const shuffled = [...letters];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function buildPuzzle(words: string[], puzzleNumber: number): BeePuzzle | null {
  const normalized = words.filter((w) => w.length >= 4 && /^[A-Z]+$/.test(w));
  const candidates = normalized.filter((word) => uniqueLetters(word).length === 7);
  if (candidates.length === 0) return null;

  const seedWord = selectDailyItem(candidates, puzzleNumber);
  if (!seedWord) return null;

  const startIndex = candidates.indexOf(seedWord);
  const maxAttempts = Math.min(candidates.length, 100);

  for (let offset = 0; offset < maxAttempts; offset++) {
    const candidate = candidates[(startIndex + offset) % candidates.length];
    const letters = uniqueLetters(candidate);
    const shuffledLetters = shuffleDeterministic(letters, `${puzzleNumber}-${offset}-bee`);
    const center = shuffledLetters[0];
    const letterSet = new Set(shuffledLetters);

    const validWords = new Set(
      normalized.filter((word) => {
        if (word.length < 4) return false;
        if (!word.includes(center)) return false;
        return word.split("").every((ch) => letterSet.has(ch));
      })
    );

    if (validWords.size >= 20) {
      return {
        letters: shuffledLetters,
        center,
        validWords
      };
    }
  }

  const fallback = uniqueLetters(seedWord);
  const shuffledFallback = shuffleDeterministic(fallback, `${puzzleNumber}-fallback-bee`);
  const center = shuffledFallback[0];
  const letterSet = new Set(shuffledFallback);
  const validWords = new Set(
    normalized.filter((word) => {
      if (word.length < 4) return false;
      if (!word.includes(center)) return false;
      return word.split("").every((ch) => letterSet.has(ch));
    })
  );

  return {
    letters: shuffledFallback,
    center,
    validWords
  };
}

function SpellingBee() {
  const [allWords, setAllWords] = useState<string[]>([]);
  const [puzzle, setPuzzle] = useState<BeePuzzle | null>(null);
  const [guess, setGuess] = useState("");
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  const puzzleNumber = getPuzzleNumber();

  useEffect(() => {
    let cancelled = false;

    loadWords()
      .then((words) => {
        if (cancelled) return;
        setAllWords(words);
      })
      .catch(() => {
        if (cancelled) return;
        setMessage("Could not load words list.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (allWords.length === 0) return;
    const built = buildPuzzle(allWords, puzzleNumber);
    setPuzzle(built);
  }, [allWords, puzzleNumber]);

  const letterSet = useMemo(() => new Set(puzzle?.letters ?? []), [puzzle]);

  const totalScore = useMemo(() => {
    if (!puzzle) return 0;
    return foundWords.reduce((sum, word) => sum + scoreWord(word, letterSet), 0);
  }, [foundWords, letterSet, puzzle]);

  const maxScore = useMemo(() => {
    if (!puzzle) return 0;
    return Array.from(puzzle.validWords).reduce((sum, word) => sum + scoreWord(word, letterSet), 0);
  }, [letterSet, puzzle]);

  const progressPercent = maxScore > 0 ? Math.min(100, Math.round((totalScore / maxScore) * 100)) : 0;
  const isSolved = puzzle ? foundWords.length === puzzle.validWords.size : false;

  function submitGuess() {
    if (!puzzle) return;
    const word = guess.trim().toUpperCase();
    if (!word) return;

    if (word.length < 4) {
      setMessage("Word must be at least 4 letters.");
      return;
    }
    if (!word.includes(puzzle.center)) {
      setMessage(`Word must include center letter ${puzzle.center}.`);
      return;
    }
    if (!word.split("").every((ch) => letterSet.has(ch))) {
      setMessage("Use only puzzle letters.");
      return;
    }
    if (!puzzle.validWords.has(word)) {
      setMessage("Not in word list.");
      return;
    }
    if (foundWords.includes(word)) {
      setMessage("Already found.");
      return;
    }

    setFoundWords((prev) => [word, ...prev]);
    setGuess("");
    setMessage("Nice!");
  }

  function addLetter(letter: string) {
    if (!/^[A-Z]$/.test(letter)) return;
    setGuess((prev) => prev + letter);
  }

  function shuffleOuterLetters() {
    if (!puzzle) return;
    const outer = puzzle.letters.filter((l) => l !== puzzle.center);
    const reshuffled = shuffleDeterministic(outer, `${puzzleNumber}-${Date.now()}-shuffle`);
    setPuzzle({
      ...puzzle,
      letters: [puzzle.center, ...reshuffled]
    });
  }

  function clearGuess() {
    setGuess("");
    setMessage("");
  }

  function backspaceGuess() {
    setGuess((prev) => prev.slice(0, -1));
  }

  function resetProgress() {
    setFoundWords([]);
    setGuess("");
    setMessage("");
    setShareMessage("");
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "Backspace") {
        event.preventDefault();
        backspaceGuess();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        submitGuess();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        clearGuess();
        return;
      }

      if (event.key.length === 1) {
        const upper = event.key.toUpperCase();
        if (/^[A-Z]$/.test(upper)) {
          event.preventDefault();
          addLetter(upper);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [addLetter, backspaceGuess, clearGuess, submitGuess]);

  async function shareResults() {
    if (!puzzle) return;
    const shareText = [
      `Spelling Bee #${puzzleNumber}`,
      `Score: ${totalScore}/${maxScore}`,
      `Words found: ${foundWords.length}/${puzzle.validWords.size}`,
      `${window.location.origin}${window.location.pathname}#spellingbee`
    ].join("\n");

    const copied = await copyTextToClipboard(shareText);
    setShareMessage(copied ? "Results copied to clipboard." : "Could not copy results.");
  }

  if (!puzzle) {
    return (
      <main className="min-h-screen pixel-bg flex flex-col items-center justify-start py-16 px-4">
        <a
          href="#"
          className="fixed top-4 left-4 z-50 bg-gray-800 hover:bg-green-700 text-green-300 hover:text-white font-mono px-4 py-2 rounded shadow transition border border-green-900"
        >
          {"<- Back to Games Menu"}
        </a>
        <div className="mt-24 text-green-300 font-mono text-xl">Loading Spelling Bee...</div>
      </main>
    );
  }

  const center = puzzle.center;
  const outerLetters = puzzle.letters.filter((l) => l !== center);
  const hexPositions = [
    { letter: outerLetters[0], className: "left-1/2 top-4 -translate-x-1/2" },
    { letter: outerLetters[1], className: "right-7 top-[34%] -translate-y-1/2" },
    { letter: outerLetters[2], className: "right-7 bottom-[34%] translate-y-1/2" },
    { letter: outerLetters[3], className: "left-1/2 bottom-4 -translate-x-1/2" },
    { letter: outerLetters[4], className: "left-7 bottom-[34%] translate-y-1/2" },
    { letter: outerLetters[5], className: "left-7 top-[34%] -translate-y-1/2" }
  ];

  return (
    <main className="min-h-screen pixel-bg flex flex-col items-center justify-start py-16 px-4">
      <a
        href="#"
        className="fixed top-4 left-4 z-50 bg-gray-800 hover:bg-green-700 text-green-300 hover:text-white font-mono px-4 py-2 rounded shadow transition border border-green-900"
      >
        {"<- Back to Games Menu"}
      </a>

      <div className="w-full max-w-5xl flex flex-col items-center gap-6">
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-green-400">Spelling Bee</h1>
          <p className="text-gray-300 mt-2">Puzzle #{puzzleNumber}</p>
        </header>

        <section className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-green-600 p-6 flex flex-col gap-4">
            <h2 className="text-lg text-green-400 font-mono">Build Words</h2>

            <div className="font-mono text-3xl tracking-[0.2em] text-green-200 min-h-12 break-all">{guess || "_"}</div>

            <div className="relative mx-auto h-68 w-68 max-w-full">
              {hexPositions.map(({ letter, className }) => (
                <button
                  key={letter}
                  type="button"
                  className={`absolute flex h-15 w-15 items-center justify-center bg-gray-800 px-1 py-1 text-xl font-mono text-green-200 transition hover:bg-green-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-400 overflow-hidden ${className}`}
                  style={{
                    clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)",
                    padding: "0.35rem",
                    boxShadow: "inset 0 0 0 2px bg-gray-800"
                  }}
                  onClick={() => addLetter(letter)}
                  aria-label={`Add letter ${letter}`}
                >
                  {letter}
                </button>
              ))}

              <button
                type="button"
                className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-green-700 px-1 py-1 text-xl font-mono text-white shadow-lg shadow-green-900/40 transition hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300 overflow-hidden"
                style={{
                  clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)",
                  padding: "0.4rem",
                  boxShadow: "inset 0 0 0 2px bg-gray-800"
                }}
                onClick={() => addLetter(center)}
                aria-label={`Add center letter ${center}`}
              >
                {center}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="px-3 py-2 bg-gray-800 border border-green-700 text-green-200 font-mono hover:bg-green-800" onClick={shuffleOuterLetters}>Shuffle</button>
              <button type="button" className="px-3 py-2 bg-gray-800 border border-green-700 text-green-200 font-mono hover:bg-green-800" onClick={backspaceGuess}>Backspace</button>
              <button type="button" className="px-3 py-2 bg-gray-800 border border-green-700 text-green-200 font-mono hover:bg-green-800" onClick={clearGuess}>Clear</button>
              <button type="button" className="px-3 py-2 bg-green-700 border border-green-500 text-white font-mono hover:bg-green-600" onClick={submitGuess}>Submit</button>
            </div>

            {message && <p className="text-yellow-300 font-mono">{message}</p>}
            {isSolved && <p className="text-green-300 font-mono font-bold">Perfect: you found every valid word!</p>}
            {shareMessage && <p className="text-blue-300 font-mono">{shareMessage}</p>}
          </div>

          <div className="bg-gray-900 border border-green-600 p-6 flex flex-col gap-4 font-mono text-green-200">
            <h2 className="text-lg text-green-400">Stats</h2>
            <p>Score: <span className="text-green-100 font-bold">{totalScore}</span> / {maxScore}</p>
            <p>Words found: <span className="text-green-100 font-bold">{foundWords.length}</span> / {puzzle.validWords.size}</p>
            <p>Progress: <span className="text-green-100 font-bold">{progressPercent}%</span></p>

            <div className="w-full h-3 bg-gray-800 border border-green-700">
              <div className="h-full bg-green-600" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="px-3 py-2 bg-gray-800 border border-green-700 text-green-200 hover:bg-green-800" onClick={shareResults}>Share Results</button>
              <button type="button" className="px-3 py-2 bg-gray-800 border border-green-700 text-green-200 hover:bg-green-800" onClick={resetProgress}>Reset Progress</button>
            </div>

            <div>
              <h3 className="text-green-400 mb-2">Found Words</h3>
              <div className="max-h-64 overflow-y-auto border border-green-700 bg-gray-950 p-3 flex flex-wrap gap-2">
                {foundWords.length === 0 && <p className="text-gray-400">No words found yet.</p>}
                {foundWords.map((word) => (
                  <span key={word} className="px-2 py-1 text-sm bg-gray-800 border border-green-700 text-green-200">
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default SpellingBee;

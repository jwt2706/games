import { useCallback, useEffect, useMemo, useState } from "react";
import { copyTextToClipboard } from "../utils/clipboard";
import { getPuzzleNumber, selectDailyItem } from "../utils/puzzle";
import { hangmanWordFilter, loadWords } from "../utils/wordList";

const MAX_WRONG_GUESSES = 6;

function Hangman() {
  const [words, setWords] = useState<string[]>([]);
  const [targetWord, setTargetWord] = useState("");
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [shareStatus, setShareStatus] = useState("");

  const puzzleNumber = getPuzzleNumber();

  useEffect(() => {
    let cancelled = false;

    loadWords(hangmanWordFilter)
      .then((loadedWords) => {
        if (cancelled) return;
        setWords(loadedWords);
      })
      .catch(() => {
        if (cancelled) return;
        setStatusMessage("Could not load words list.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (words.length === 0) return;
    const selectedWord = selectDailyItem(words, puzzleNumber);
    setTargetWord(selectedWord ?? "");
  }, [words, puzzleNumber]);

  const maskedWord = useMemo(() => {
    if (!targetWord) return "";
    return targetWord
      .split("")
      .map((letter) => (guessedLetters.includes(letter) ? letter : "_"))
      .join(" ");
  }, [targetWord, guessedLetters]);

  const isWon = targetWord.length > 0 && targetWord.split("").every((letter) => guessedLetters.includes(letter));
  const isLost = wrongGuesses >= MAX_WRONG_GUESSES;
  const isGameOver = isWon || isLost;

  const resultLabel = isWon ? "Won" : isLost ? "Lost" : "In Progress";

  const hangmanStages = [
    [
      " +---+",
      " |   |",
      "     |",
      "     |",
      "     |",
      "     |",
      "======="
    ],
    [
      " +---+",
      " |   |",
      " O   |",
      "     |",
      "     |",
      "     |",
      "======="
    ],
    [
      " +---+",
      " |   |",
      " O   |",
      " |   |",
      "     |",
      "     |",
      "======="
    ],
    [
      " +---+",
      " |   |",
      " O   |",
      "/|   |",
      "     |",
      "     |",
      "======="
    ],
    [
      " +---+",
      " |   |",
      " O   |",
      "/|\\  |",
      "     |",
      "     |",
      "======="
    ],
    [
      " +---+",
      " |   |",
      " O   |",
      "/|\\  |",
      "/    |",
      "     |",
      "======="
    ],
    [
      " +---+",
      " |   |",
      " O   |",
      "/|\\  |",
      "/ \\  |",
      "     |",
      "======="
    ]
  ];

  const handleGuess = useCallback(
    (letter: string) => {
      const upper = letter.toUpperCase();
      if (!/^[A-Z]$/.test(upper)) return;
      if (!targetWord || isGameOver) return;

      if (guessedLetters.includes(upper)) {
        setStatusMessage(`You already guessed ${upper}.`);
        return;
      }

      const nextGuessed = [...guessedLetters, upper];
      setGuessedLetters(nextGuessed);

      if (!targetWord.includes(upper)) {
        setWrongGuesses((prev) => prev + 1);
      }

      setStatusMessage("");
    },
    [guessedLetters, isGameOver, targetWord]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.length !== 1) return;
      handleGuess(event.key);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleGuess]);

  function resetPuzzle() {
    setGuessedLetters([]);
    setWrongGuesses(0);
    setStatusMessage("");
    setShareStatus("");
  }

  async function shareResult() {
    if (!targetWord || !isGameOver) return;

    const shareText = [
      `Hangman #${puzzleNumber} ${resultLabel} with ${wrongGuesses}/${MAX_WRONG_GUESSES}`,
      `${window.location.origin}${window.location.pathname}#hangman`
    ].join("\n");

    try {
      const copied = await copyTextToClipboard(shareText);
      if (!copied) {
        setShareStatus("Could not copy automatically. You can copy manually from the game screen.");
        return;
      }
      setShareStatus("Result copied to clipboard.");
    } catch {
      setShareStatus("Could not copy automatically. You can copy manually from the game screen.");
    }
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <main className="min-h-screen pixel-bg flex flex-col items-center justify-start py-16 px-4">
      <a
        href="#"
        className="fixed top-4 left-4 z-50 bg-gray-800 hover:bg-green-700 text-green-300 hover:text-white font-mono px-4 py-2 rounded shadow transition border border-green-900"
      >
        {"<- Back to Games Menu"}
      </a>

      <div className="w-full max-w-4xl flex flex-col items-center gap-6">
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-green-400">Hangman</h1>
          <p className="text-gray-300 mt-2">Puzzle #{puzzleNumber}</p>
        </header>

        <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-green-600 p-5 font-mono text-green-300">
            <h2 className="text-lg text-green-400 mb-3">Progress</h2>
            <pre className="text-sm leading-5 overflow-x-auto">{hangmanStages[Math.min(wrongGuesses, MAX_WRONG_GUESSES)].join("\n")}</pre>
            <p className="mt-3 text-gray-300">
              Wrong guesses: {wrongGuesses}/{MAX_WRONG_GUESSES}
            </p>
            <p className="text-gray-300">Remaining: {Math.max(0, MAX_WRONG_GUESSES - wrongGuesses)}</p>
          </div>

          <div className="bg-gray-900 border border-green-600 p-5 font-mono text-green-300 flex flex-col gap-4">
            <h2 className="text-lg text-green-400">Word</h2>
            <p className="text-2xl md:text-3xl tracking-[0.35em] break-all">{maskedWord || "Loading..."}</p>
            <p className="text-sm text-gray-300">Guessed letters: {guessedLetters.join(" ") || "None yet"}</p>

            {statusMessage && <p className="text-yellow-300">{statusMessage}</p>}
            {isWon && <p className="text-green-300 font-bold">You win! Great job.</p>}
            {isLost && <p className="text-red-300 font-bold">You lost. The word was {targetWord}.</p>}
            {shareStatus && <p className="text-blue-300">{shareStatus}</p>}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="self-start bg-gray-800 hover:bg-green-700 text-green-300 hover:text-white px-4 py-2 border border-green-900 transition disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={shareResult}
                disabled={!isGameOver || !targetWord}
              >
                Share Result
              </button>
              <button
                type="button"
                className="self-start bg-gray-800 hover:bg-green-700 text-green-300 hover:text-white px-4 py-2 border border-green-900 transition"
                onClick={resetPuzzle}
              >
                Reset Puzzle
              </button>
            </div>
          </div>
        </section>

        <section className="w-full bg-gray-900 border border-green-600 p-5 font-mono">
          <h2 className="text-lg text-green-400 mb-3">Guess Letters</h2>
          <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-13 gap-2">
            {alphabet.map((letter) => {
              const alreadyGuessed = guessedLetters.includes(letter);
              const isCorrect = targetWord.includes(letter);
              const disabled = alreadyGuessed || isGameOver || !targetWord;

              let buttonClass = "bg-gray-800 text-green-300 border-green-900";
              if (alreadyGuessed && isCorrect) {
                buttonClass = "bg-green-800 text-white border-green-500";
              } else if (alreadyGuessed && !isCorrect) {
                buttonClass = "bg-red-900 text-red-200 border-red-700";
              }

              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleGuess(letter)}
                  disabled={disabled}
                  aria-label={`Guess ${letter}`}
                  className={`font-mono border px-0 py-2 text-center transition ${buttonClass} ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-green-700 hover:text-white"}`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
          <p className="text-gray-400 mt-3">Tip: You can type letters on your keyboard too.</p>
        </section>
      </div>
    </main>
  );
}

export default Hangman;

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import Letterboxed from "./games/Letterboxed";
import Hangman from "./games/Hangman";
import SpellingBee from "./games/SpellingBee";

const games: Record<string, React.FC> = {
  letterboxed: Letterboxed,
  hangman: Hangman,
  spellingbee: SpellingBee,
};

function Main() {
  const [currentGame, setCurrentGame] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // remove the hashtag
      setCurrentGame(hash || null);
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const GameComponent = currentGame && games[currentGame] ? games[currentGame] : App;

  return (
    <React.StrictMode>
      <GameComponent />
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Main />);

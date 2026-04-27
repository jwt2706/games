import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import Letterboxed from "./games/Letterboxed";

// Add new games here
const games: Record<string, React.FC> = {
  letterboxed: Letterboxed,
};

function Main() {
  const [currentGame, setCurrentGame] = useState<string | null>(null);

  useEffect(() => {
    // Listen for hash changes
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // remove the hashtag
      setCurrentGame(hash || null);
    };

    // Initialize the hash value
    handleHashChange();

    // Add event listener for hash changes
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

import React from "react";

function Letterboxed() {
  return (
    <main className="min-h-screen pixel-bg flex flex-col items-center justify-center py-16 px-4">
      <a
        href="/"
        className="fixed top-4 left-4 z-50 bg-gray-800 hover:bg-green-700 text-green-300 hover:text-white font-mono px-4 py-2 rounded shadow transition border border-green-900"
      >
        ← Back to Games Menu
      </a>
      <h1 className="text-4xl md:text-5xl font-extrabold text-green-400 mb-6">Letterboxed</h1>
      <p className="text-lg text-gray-300 mb-4">Game coming soon!</p>
    </main>
  );
}

export default Letterboxed;

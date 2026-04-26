import { useState } from 'react'

function App() {
  return (
    <main className="min-h-screen pixel-bg flex flex-col items-center justify-start py-16 px-4">
      <a
        href="https://jthome.net"
        className="fixed top-4 left-4 z-50 bg-green-700 hover:bg-green-600 text-white font-mono px-4 py-2 rounded shadow transition border border-green-900"
        target="_blank"
        rel="noopener noreferrer"
      >
        ← Back to Home
      </a>
      <header className="mb-12 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-green-400 drop-shadow-lg tracking-tight mb-4">
          Daily Games
        </h1>
        <p className="text-lg text-gray-300 max-w-xl mx-auto">
          Welcome to my daily games collection! Explore and play the games below everyday.
        </p>
      </header>
      <section className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-6">
        <a href="/letterboxed" className="bg-gray-900 border border-green-600 font-mono text-left p-6 flex flex-col items-start justify-center hover:bg-green-950 transition group shadow-md rounded-none">
          <span className="text-2xl mb-2 select-none">🔲</span>
          <span className="text-lg font-bold text-green-400 group-hover:text-green-200 tracking-wider">Letterboxed</span>
        </a>
      </section>
    </main>
  )
}

export default App

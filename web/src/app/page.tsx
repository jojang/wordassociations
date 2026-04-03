'use client';

import Link from 'next/link';
import { useDarkMode } from '@/contexts/DarkModeContext';

const GAMES = [
  {
    slug: 'word-associations',
    title: 'Word Associations',
    description: 'Guess words associated with a given word before you run out of lives.',
  },
];

export default function Home() {
  const { darkMode } = useDarkMode();

  const bg = darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black';
  const card = darkMode
    ? 'border-gray-700 hover:border-white'
    : 'border-gray-200 hover:border-black';

  return (
    <main className={`min-h-screen flex flex-col items-center justify-center p-8 ${bg}`}>
      <h1 className="text-4xl tracking-wide mb-2" style={{ fontFamily: 'KarnakPro' }}>Word Games</h1>
      <p className="text-gray-500 mb-12" style={{ fontFamily: 'NeueHelvetica' }}>Pick a game to play</p>
      <div className="grid gap-4 w-full max-w-md">
        {GAMES.map((game) => (
          <Link
            key={game.slug}
            href={`/games/${game.slug}`}
            className={`block p-6 rounded-2xl border transition-colors ${card}`}
          >
            <div className="text-lg" style={{ fontFamily: 'NeueHelvetica' }}>{game.title}</div>
            <div className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'NeueHelvetica' }}>{game.description}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}

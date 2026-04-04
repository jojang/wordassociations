'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/auth/AuthModal';
import type { User } from '@supabase/supabase-js';

const GAMES = [
  {
    slug: 'word-associations',
    title: 'Word Associations',
    description: 'Guess words associated with a given word before you run out of lives.',
  },
];

export default function Home() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const bg = darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black';
  const card = darkMode ? 'border-gray-700 hover:border-white' : 'border-gray-200 hover:border-black';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className={`min-h-screen flex flex-col items-center justify-center p-8 ${bg}`}>
      {showAuth && <AuthModal darkMode={darkMode} onClose={() => setShowAuth(false)} />}

      {/* Header */}
      <div className="w-full flex justify-between items-center absolute top-0 px-6 py-3">
        <button
          onClick={toggleDarkMode}
          className={`w-9 h-9 rounded-full font-bold transition-all hover:scale-110 active:scale-95 shadow-sm ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-700'}`}
        >
          {darkMode ? '☀' : '☾'}
        </button>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs tracking-widest hover:opacity-60 transition-opacity"
              style={{ fontFamily: 'NeueHelvetica' }}
            >
              SIGN OUT
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className={`px-6 py-2 rounded-full text-sm tracking-widest transition-all hover:scale-105 active:scale-95 ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-700'}`}
            style={{ fontFamily: 'NeueHelvetica' }}
          >
            SIGN IN
          </button>
        )}
      </div>

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

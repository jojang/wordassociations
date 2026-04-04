'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, LogIn, ChevronDown } from 'lucide-react';
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
  const [username, setUsername] = useState<string | null>(null);

  const border = darkMode ? 'border-gray-800' : 'border-gray-100';
  const card = darkMode ? 'border-gray-800 hover:border-gray-600 hover:bg-gray-900' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50';
  const iconBtn = darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black';

  const fetchUsername = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
    setUsername(data?.display_name ?? null);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) fetchUsername(data.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUsername(session.user.id);
      else setUsername(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'}`}>
      {showAuth && <AuthModal darkMode={darkMode} onClose={() => setShowAuth(false)} />}

      {/* Header */}
      <header className={`w-full flex items-center justify-between px-6 py-4 border-b ${border}`}>
        <span className="text-xl tracking-wide" style={{ fontFamily: 'KarnakPro' }}>Wordbook</span>

        <div className="flex items-center gap-3">
          <button onClick={toggleDarkMode} className={`p-2 rounded-lg transition-colors ${iconBtn}`}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <div className="relative group">
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${iconBtn}`} style={{ fontFamily: 'NeueHelvetica' }}>
                <span className="tracking-wide">{username ?? user.email}</span>
                <ChevronDown size={14} />
              </button>
              <div className={`absolute right-0 mt-1 w-36 rounded-xl border shadow-lg overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity z-10 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className={`w-full px-4 py-3 text-xs tracking-widest text-left transition-colors ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
                  style={{ fontFamily: 'NeueHelvetica' }}
                >
                  SIGN OUT
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm tracking-widest transition-colors ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-900' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
              style={{ fontFamily: 'NeueHelvetica' }}
            >
              <LogIn size={15} />
              SIGN IN
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-5xl tracking-wide mb-2" style={{ fontFamily: 'KarnakPro' }}>Wordbook</h1>
        <p className={`text-sm tracking-widest mb-12 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: 'NeueHelvetica' }}>PICK A GAME</p>

        <div className="grid gap-3 w-full max-w-sm">
          {GAMES.map((game) => (
            <Link
              key={game.slug}
              href={`/games/${game.slug}`}
              className={`block p-5 rounded-2xl border transition-all ${card}`}
            >
              <div className="text-base tracking-wide mb-1" style={{ fontFamily: 'KarnakPro' }}>{game.title}</div>
              <div className={`text-xs tracking-wide leading-relaxed ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: 'NeueHelvetica' }}>{game.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, LogIn, ChevronDown, BarChart2 } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { supabase } from '@/lib/supabase';
import { getProfile, getUserStats } from '@/lib/api';

type GameStats = { highScore: number; totalGames: number; avgScore: number };
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
  const [stats, setStats] = useState<Record<string, GameStats>>({});
  const [showNudge, setShowNudge] = useState(false);

  const border = darkMode ? 'border-gray-800' : 'border-gray-100';
  const card = darkMode ? 'border-gray-800 hover:border-gray-600 hover:bg-gray-900' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50';
  const iconBtn = darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black';

  const fetchUsername = async (userId: string) => {
    const displayName = await getProfile(userId);
    setUsername(displayName);
  };

  const fetchAllStats = async (userId: string) => {
    const mapped: Record<string, GameStats> = {};
    const games = ['word-associations'];
    await Promise.all(games.map(async (game) => {
      const data = await getUserStats(userId, game);
      if (data) mapped[game] = { highScore: data.high_score, totalGames: data.total_games, avgScore: data.avg_score };
    }));
    setStats(mapped);
  };

  useEffect(() => {
    if (!localStorage.getItem('nudge_dismissed')) setShowNudge(true);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) { fetchUsername(data.user.id); fetchAllStats(data.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { fetchUsername(session.user.id); fetchAllStats(session.user.id); }
      else { setUsername(null); setStats({}); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const dismissNudge = () => {
    localStorage.setItem('nudge_dismissed', '1');
    setShowNudge(false);
  };

  return (
    <main className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'}`}>
      {showAuth && <AuthModal darkMode={darkMode} onClose={() => setShowAuth(false)} />}

      {showNudge && !user && (
        <div className="fixed top-14 right-6 z-40">
          {/* Arrow pointing up */}
          <div className={`w-3 h-3 rotate-45 border-t border-l ml-auto mr-4 -mb-1.5 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-300'}`} />
          <div className={`rounded-xl border shadow-md px-4 py-3 w-56 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-300'}`}>
            <p className={`text-xs leading-relaxed mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ fontFamily: 'NeueHelvetica' }}>
              Sign in to save your stats and view post-game insights.
            </p>
            <button
              onClick={dismissNudge}
              className="text-xs tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
              style={{ fontFamily: 'NeueHelvetica' }}
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

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
          {GAMES.map((game) => {
            const gameStats = stats[game.slug] ?? null;
            return (
              <div key={game.slug}>
                <Link
                  href={`/games/${game.slug}`}
                  className={`block p-5 rounded-2xl border transition-all ${card}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-base tracking-wide" style={{ fontFamily: 'KarnakPro' }}>{game.title}</div>
                    <div className="relative group/stats" onClick={(e) => e.preventDefault()}>
                      <BarChart2 size={15} className={`transition-colors ${darkMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'}`} />
                      <div className={`absolute left-full top-1/2 -translate-y-1/2 ml-3 rounded-xl border shadow-lg p-3 opacity-0 group-hover/stats:opacity-100 pointer-events-none group-hover/stats:pointer-events-auto transition-opacity z-10 ${user && gameStats ? 'w-48' : 'w-32'} ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                        {user && gameStats ? (
                          <>
                            <div className="text-xs tracking-widest text-gray-400 mb-2" style={{ fontFamily: 'NeueHelvetica' }}>YOUR STATS</div>
                            <div className="flex justify-between text-xs" style={{ fontFamily: 'NeueHelvetica' }}>
                              <span className="text-gray-400">Best</span><span>{gameStats.highScore}</span>
                            </div>
                            <div className="flex justify-between text-xs mt-1" style={{ fontFamily: 'NeueHelvetica' }}>
                              <span className="text-gray-400">Games</span><span>{gameStats.totalGames}</span>
                            </div>
                            <div className="flex justify-between text-xs mt-1" style={{ fontFamily: 'NeueHelvetica' }}>
                              <span className="text-gray-400">Avg</span><span>{gameStats.avgScore}</span>
                            </div>
                          </>
                        ) : user ? (
                          <div className="text-xs text-gray-400 text-center" style={{ fontFamily: 'NeueHelvetica' }}>No game data</div>
                        ) : (
                          <div className="text-xs text-gray-400 leading-relaxed text-center" style={{ fontFamily: 'NeueHelvetica' }}>Sign in to view<br />your stats</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs tracking-wide leading-relaxed mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: 'NeueHelvetica' }}>{game.description}</div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

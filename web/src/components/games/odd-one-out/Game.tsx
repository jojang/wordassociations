'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, ChevronLeft, BarChart2 } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { supabase } from '@/lib/supabase';
import { getDailyPuzzle, getOddOneOutStats, completeOddOneOut } from '@/lib/api';
import type { PuzzleSet, OddOneOutStats } from '@/lib/api';
import AuthModal from '@/components/auth/AuthModal';
import type { User } from '@supabase/supabase-js';


export default function Game() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<PuzzleSet[]>([]);
  const [today, setToday] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [currentResult, setCurrentResult] = useState<boolean | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [stats, setStats] = useState<OddOneOutStats | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const puzzle = await getDailyPuzzle();
        setSets(puzzle.sets);
        setToday(puzzle.date);

        // Restore in-progress session for today
        const saved = localStorage.getItem('oo-progress');
        if (saved) {
          const { date, index, results: savedResults } = JSON.parse(saved);
          if (date === puzzle.date) {
            setCurrentIndex(index);
            setResults(savedResults);
          } else {
            localStorage.removeItem('oo-progress');
          }
        }

        // Check if already played today (works for guests and logged-in users)
        const played = localStorage.getItem('oo-played');
        if (played) {
          const { date, score } = JSON.parse(played);
          if (date === puzzle.date) {
            setFinalScore(score);
            setGameOver(true);
            localStorage.removeItem('oo-progress');
          }
        }

        if (user) {
          const s = await getOddOneOutStats(user.id);
          if (s) {
            setStats(s);
            if (s.last_played_date === puzzle.date) {
              setFinalScore(s.last_score ?? 0);
              setGameOver(true);
              localStorage.removeItem('oo-progress');
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const currentSet = sets[currentIndex];
  const oddOneOut = currentSet?.odd_one_out?.trim().toUpperCase();
  const isCorrect = currentResult !== null ? currentResult : (picked !== null && picked.trim().toUpperCase() === oddOneOut);

  const handlePick = (word: string) => {
    if (showResult) return;
    setPicked(word);
  };

  const handleSubmit = () => {
    if (!picked || showResult) return;
    const correct = picked.trim().toUpperCase() === oddOneOut;
    const newResults = [...results, correct];
    setCurrentResult(correct);
    setShowResult(true);
    // Save progress pointing to the NEXT set so resume skips this completed set
    const nextIndex = currentIndex + 1;
    if (nextIndex < sets.length) {
      localStorage.setItem('oo-progress', JSON.stringify({ date: today, index: nextIndex, results: newResults }));
    }
  };

  const handleNext = async () => {
    const correct = currentResult ?? false;
    const newResults = [...results, correct];
    setResults(newResults);
    setCurrentResult(null);

    if (currentIndex === sets.length - 1) {
      const score = newResults.filter(Boolean).length;
      setFinalScore(score);
      setGameOver(true);
      localStorage.removeItem('oo-progress');
      localStorage.setItem('oo-played', JSON.stringify({ date: today, score }));
      if (user) {
        setSaving(true);
        const updated = await completeOddOneOut(user.id, score, today);
        if (updated) setStats(updated);
        setSaving(false);
      }
    } else {
      setCurrentIndex(currentIndex + 1);
      setPicked(null);
      setShowResult(false);
    }
  };

  const border = darkMode ? 'border-gray-800' : 'border-gray-100';
  const iconBtn = darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black';

  const maxDist = stats ? Math.max(...stats.distribution, 1) : 1;

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'}`}>
        <div className={`h-8 w-8 rounded-full border-2 border-t-transparent animate-spin ${darkMode ? 'border-gray-400' : 'border-gray-600'}`} />
        <p className="text-xs tracking-widest text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>
          GENERATING TODAY'S PUZZLE...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'}`}>
      {showAuth && <AuthModal darkMode={darkMode} onClose={() => setShowAuth(false)} />}

      {/* End modal */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
            <div className="text-center mb-4">
              <div className="text-sm tracking-widest text-gray-400 mb-3" style={{ fontFamily: 'NeueHelvetica' }}>TODAY'S PUZZLE</div>
              <div className="text-6xl tracking-wide mb-3" style={{ fontFamily: 'KarnakPro' }}>{finalScore} / 5</div>
              {saving && <div className="text-xs text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>Saving...</div>}
            </div>

            {user && stats ? (
              <div>
                <div className="text-xs tracking-widest text-gray-400 mb-3 text-center" style={{ fontFamily: 'NeueHelvetica' }}>SCORE DISTRIBUTION</div>
                <div className="flex flex-col gap-1.5">
                  {stats.distribution.map((count, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'NeueHelvetica' }}>
                      <span className="w-4 text-right text-gray-400">{i}</span>
                      <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: darkMode ? '#1f2937' : '#f3f4f6' }}>
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${(count / maxDist) * 100}%`,
                            background: i === finalScore ? (darkMode ? '#fff' : '#000') : (darkMode ? '#4b5563' : '#d1d5db'),
                            minWidth: count > 0 ? '2rem' : 0,
                          }}
                        />
                      </div>
                      <span className="w-4 text-gray-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : !user ? (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-4" style={{ fontFamily: 'NeueHelvetica' }}>
                  Sign in to track your score distribution.
                </p>
                <button
                  onClick={() => { setGameOver(false); setShowAuth(true); }}
                  className={`w-full py-2 rounded-full text-sm tracking-widest transition-all hover:scale-105 active:scale-95 ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
                  style={{ fontFamily: 'NeueHelvetica' }}
                >
                  SIGN IN
                </button>
              </div>
            ) : null}

            <Link
              href="/"
              className={`mt-6 flex items-center justify-center w-full py-2.5 rounded-full text-sm tracking-widest transition-all hover:scale-105 active:scale-95 border ${darkMode ? 'border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400 hover:text-black'}`}
              style={{ fontFamily: 'NeueHelvetica' }}
            >
              BACK TO HOME
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`w-full flex items-center justify-center relative px-6 py-4 border-b ${border}`}>
        <Link
          href="/"
          className={`absolute left-6 flex items-center gap-1 text-sm transition-colors ${iconBtn}`}
          style={{ fontFamily: 'KarnakPro' }}
        >
          <ChevronLeft size={16} />HOME
        </Link>
        <span className="text-xl tracking-wide" style={{ fontFamily: 'KarnakPro' }}>Odd One Out</span>
        <div className="absolute right-6 flex items-center gap-2">
          {/* Stats */}
          <div className="relative group">
            <button className={`p-2 rounded-lg transition-colors ${iconBtn}`}>
              <BarChart2 size={18} />
            </button>
            <div className={`absolute right-0 mt-1 rounded-xl border shadow-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10 ${user && stats ? 'w-44' : 'w-36'} ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              {user && stats ? (
                <>
                  <div className="flex items-center justify-between mb-2" style={{ fontFamily: 'NeueHelvetica' }}>
                    <span className="text-xs tracking-widest text-gray-400">YOUR STATS</span>
                    <span className="text-xs text-gray-400">{stats.total_games} {stats.total_games === 1 ? 'play' : 'plays'}</span>
                  </div>
                  <div className={`border-t mb-2 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`} />
                  {stats.distribution.map((count, i) => {
                    const maxDist = Math.max(...stats.distribution, 1);
                    return (
                      <div key={i} className="flex items-center gap-1.5 mb-1" style={{ fontFamily: 'NeueHelvetica' }}>
                        <span className="text-xs text-gray-400 w-3 text-right">{i}</span>
                        <div className="flex-1 h-2.5 rounded overflow-hidden" style={{ background: darkMode ? '#1f2937' : '#f3f4f6' }}>
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${(count / maxDist) * 100}%`,
                              background: i === stats.last_score ? (darkMode ? '#fff' : '#000') : (darkMode ? '#4b5563' : '#d1d5db'),
                              minWidth: count > 0 ? '0.5rem' : 0,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-3">{count}</span>
                      </div>
                    );
                  })}
                </>
              ) : user ? (
                <div className="text-xs text-gray-400 text-center" style={{ fontFamily: 'NeueHelvetica' }}>No game data</div>
              ) : (
                <div className="text-xs text-gray-400 leading-relaxed text-center" style={{ fontFamily: 'NeueHelvetica' }}>Sign in to view<br />your stats</div>
              )}
            </div>
          </div>
          <button onClick={toggleDarkMode} className={`p-2 rounded-lg transition-colors ${iconBtn}`}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {!user && (
            <button
              onClick={() => setShowAuth(true)}
              className={`px-4 py-1.5 rounded-lg text-sm tracking-widest transition-colors ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-900' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
              style={{ fontFamily: 'NeueHelvetica' }}
            >
              SIGN IN
            </button>
          )}
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col items-center justify-start w-full max-w-sm px-6 pt-24 pb-8">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8">
          {sets.map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-8 rounded-full transition-all"
              style={{
                background: i < currentIndex
                  ? results[i] ? '#22c55e' : '#ef4444'
                  : i === currentIndex && showResult
                    ? isCorrect ? '#22c55e' : '#ef4444'
                    : darkMode ? '#374151' : '#e5e7eb',
              }}
            />
          ))}
        </div>

        {currentSet && !gameOver && (
          <>
            {/* Word grid */}
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              {currentSet.words.map((word) => {
                const wordNorm = word.trim().toUpperCase();
                const isPicked = picked?.trim().toUpperCase() === wordNorm;
                const isOdd = wordNorm === oddOneOut;
                let bg = darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200';

                if (showResult) {
                  if (isOdd) bg = 'bg-green-500 border-green-500 text-white';
                  else if (isPicked && !isOdd) bg = 'bg-red-500 border-red-500 text-white';
                  else bg = darkMode ? 'bg-gray-900 border-gray-800 opacity-40' : 'bg-gray-50 border-gray-200 opacity-40';
                } else if (isPicked) {
                  bg = darkMode ? 'bg-gray-700 border-gray-500' : 'bg-gray-200 border-gray-400';
                } else {
                  bg += darkMode ? ' hover:border-gray-500' : ' hover:border-gray-400';
                }

                const animation = showResult
                  ? isCorrect && isOdd ? 'pop 0.4s ease-out' : isPicked && !isOdd ? 'shake 0.35s ease-in-out' : undefined
                  : undefined;

                return (
                  <button
                    key={word}
                    onClick={() => handlePick(word)}
                    disabled={showResult}
                    className={`py-5 rounded-2xl border text-sm tracking-widest font-medium transition-colors ${bg} ${!showResult ? 'active:scale-95' : ''}`}
                    style={{ fontFamily: 'NeueHelvetica', animation }}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            {/* Fixed-height result + action area — no layout shift */}
            <div className="flex flex-col items-center" style={{ height: '96px' }}>
              <div className="text-center mb-4" style={{ height: '40px' }}>
                {showResult && (
                  <>
                    <div className={`text-xs tracking-widest mb-1 ${isCorrect ? 'text-green-500' : 'text-red-500'}`} style={{ fontFamily: 'NeueHelvetica' }}>
                      {isCorrect ? 'CORRECT' : 'WRONG'}
                    </div>
                    <div className="text-base tracking-wide" style={{ fontFamily: 'KarnakPro' }}>
                      {currentSet.category}
                    </div>
                  </>
                )}
              </div>

              {showResult ? (
                <button
                  onClick={handleNext}
                  className={`px-12 py-3 rounded-full text-sm tracking-widest transition-all hover:scale-105 active:scale-95 ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
                  style={{ fontFamily: 'NeueHelvetica' }}
                >
                  {currentIndex === sets.length - 1 ? 'FINISH' : 'NEXT'}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  onKeyDown={(e) => e.preventDefault()}
                  disabled={!picked}
                  className={`px-12 py-3 rounded-full text-sm tracking-widest transition-all ${picked ? 'hover:scale-105 active:scale-95' : 'opacity-30 cursor-not-allowed'} ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
                  style={{ fontFamily: 'NeueHelvetica' }}
                >
                  SUBMIT
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

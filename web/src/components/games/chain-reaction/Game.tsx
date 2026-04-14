'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sun, Moon, ChevronLeft, BarChart2 } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { supabase } from '@/lib/supabase';
import { getChainWord, scoreChainGuess, getChainStats, saveChainStats, getProfile } from '@/lib/api';
import type { ChainReactionStats } from '@/lib/api';
import AuthModal from '@/components/auth/AuthModal';
import type { User } from '@supabase/supabase-js';

const STRIKES_MAX = 3;

type InputState = '' | 'correct' | 'error' | 'invalid';

export default function Game() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingWord, setFetchingWord] = useState(false);

  const [currentWord, setCurrentWord] = useState('');
  const [prevWord, setPrevWord] = useState('');
  const [chain, setChain] = useState<string[]>([]);
  const [sliding, setSliding] = useState(false);

  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(STRIKES_MAX);
  const [guess, setGuess] = useState('');
  const [inputState, setInputState] = useState<InputState>('');
  const [invalidMsg, setInvalidMsg] = useState('');

  const [showEnd, setShowEnd] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalChain, setFinalChain] = useState<string[]>([]);
  const [isNewBest, setIsNewBest] = useState(false);
  const [isNewLongest, setIsNewLongest] = useState(false);

  const [gameStats, setGameStats] = useState<ChainReactionStats | null>(null);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [leaveAction, setLeaveAction] = useState<'home' | 'signout'>('home');

  const inputRef = useRef<HTMLInputElement>(null);

  // Auth
  const fetchUsername = async (userId: string) => {
    const displayName = await getProfile(userId);
    setUsername(displayName);
  };

  const fetchStats = useCallback(async (userId: string) => {
    const s = await getChainStats(userId);
    if (s) setGameStats(s);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) { fetchUsername(data.user.id); fetchStats(data.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { fetchUsername(session.user.id); fetchStats(session.user.id); }
      else { setUsername(null); setGameStats(null); }
    });
    return () => subscription.unsubscribe();
  }, [fetchStats]);

  // Fetch seed word
  const fetchWord = useCallback(async () => {
    setFetchingWord(true);
    try {
      const word = await getChainWord();
      setCurrentWord(word);
      setChain([word]);
      setPrevWord('');
    } finally {
      setFetchingWord(false);
    }
  }, []);

  useEffect(() => {
    if (started) fetchWord();
  }, [started, fetchWord]);

  // Restore focus
  useEffect(() => {
    if (!loading && started && !showEnd) inputRef.current?.focus();
  }, [loading, started, showEnd]);

  // Escape closes leave warning
  useEffect(() => {
    if (!showLeaveWarning) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLeaveWarning(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showLeaveWarning]);

  // End when lives hit 0
  useEffect(() => {
    if (!started || strikes > 0) return;
    endGame(score, chain);
  }, [strikes, started]);

  const saveStats = useCallback(async (final: number, chainLen: number) => {
    if (!user) return;
    const updated = await saveChainStats(user.id, final, chainLen);
    if (updated) setGameStats(updated);
  }, [user]);

  const endGame = useCallback(async (final: number, finalChainArr: string[]) => {
    setFinalScore(final);
    setFinalChain(finalChainArr);
    setIsNewBest(!!user && (!gameStats || final > gameStats.high_score));
    setIsNewLongest(!!user && (!gameStats || finalChainArr.length - 1 > gameStats.longest_chain));
    setShowEnd(true);
    await saveStats(final, finalChainArr.length - 1); // -1 because seed word doesn't count
  }, [gameStats, saveStats]);

  const flashInput = useCallback((state: InputState) => {
    setInputState(state);
    setTimeout(() => setInputState(''), 500);
  }, []);

  const showInvalidMsg = useCallback((msg: string) => {
    setInvalidMsg(msg);
    setTimeout(() => setInvalidMsg(''), 1100);
  }, []);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || loading || !currentWord) return;

    const trimmed = guess.trim().toLowerCase();
    if (!trimmed) { flashInput('invalid'); return; }

    if (trimmed.length < 2) {
      flashInput('invalid');
      showInvalidMsg('Too short — min 2 letters');
      setGuess('');
      return;
    }

    if (trimmed === currentWord.toLowerCase()) {
      flashInput('invalid');
      showInvalidMsg('Same as the current word');
      setGuess('');
      return;
    }

    setLoading(true);
    try {
      const result = await scoreChainGuess(currentWord, trimmed);

      if (result.correct) {
        flashInput('correct');
        const newScore = score + result.score;
        const newChain = [...chain, trimmed];
        setScore(newScore);
        setChain(newChain);
        setStrikes(STRIKES_MAX);
        setGuess('');

        // Slot machine animation
        setPrevWord(currentWord);
        setSliding(true);
        setTimeout(() => {
          setCurrentWord(trimmed);
          setPrevWord('');
          setSliding(false);
        }, 320);
      } else {
        flashInput('error');
        const newStrikes = strikes - 1;
        setStrikes(newStrikes);
        setGuess('');
        if (result.reason === 'bad_letter') {
          showInvalidMsg(`Must start with "${currentWord.slice(-1).toUpperCase()}"`);
        } else {
          showInvalidMsg('Not associated enough');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const resetGame = () => {
    setScore(0);
    setStrikes(STRIKES_MAX);
    setGuess('');
    setChain([]);
    setCurrentWord('');
    setPrevWord('');
    setSliding(false);
    setInputState('');
    setInvalidMsg('');
    setShowEnd(false);
  };

  const inputStyle = {
    animation: inputState === 'invalid' ? 'shake 0.35s ease-in-out' : undefined,
    boxShadow:
      inputState === 'error' ? '0 0 8px 3px rgba(255, 80, 80, 0.5), 0 0 20px 6px rgba(255, 80, 80, 0.2)' :
      inputState === 'correct' ? '0 0 8px 3px rgba(43, 255, 0, 0.45), 0 0 20px 6px rgba(43, 255, 0, 0.18)' :
      undefined,
    borderRadius: '8px',
  };

  const bg = darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black';
  const border = darkMode ? 'border-gray-800' : 'border-gray-100';
  const iconBtn = darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black';
  const nextLetter = currentWord ? currentWord.slice(-1).toUpperCase() : '';

  return (
    <div className={`min-h-screen flex flex-col items-center ${bg}`}>
      {showAuth && <AuthModal darkMode={darkMode} onClose={() => setShowAuth(false)} />}

      {/* Leave warning */}
      {showLeaveWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLeaveWarning(false)}>
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl text-center`} onClick={e => e.stopPropagation()}>
            <h2 className="text-xl tracking-wide mb-3" style={{ fontFamily: 'KarnakPro' }}>LEAVE GAME?</h2>
            <p className={`text-sm mb-6 leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ fontFamily: 'NeueHelvetica' }}>
              {user ? 'Your current score will be saved.' : 'Your progress will be lost. Sign in to save your stats.'}
            </p>
            <button
              onClick={async () => { setShowLeaveWarning(false); await saveStats(score, chain.length - 1); if (leaveAction === 'signout') await supabase.auth.signOut(); router.push('/'); }}
              className={`w-full py-2 rounded-full text-sm tracking-widest mb-3 ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
              style={{ fontFamily: 'NeueHelvetica' }}
            >LEAVE</button>
            <button
              onClick={() => setShowLeaveWarning(false)}
              className={`w-full py-2 rounded-full border text-xs tracking-widest ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}
              style={{ fontFamily: 'NeueHelvetica' }}
            >KEEP PLAYING</button>
          </div>
        </div>
      )}

      {/* End modal */}
      {showEnd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowEnd(false); setStarted(false); }}>
          <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'} rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl text-center`} onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl tracking-wide mb-3" style={{ fontFamily: 'KarnakPro' }}>GAME OVER</h2>

            <div className="text-xs tracking-widest text-gray-400 mb-2" style={{ fontFamily: 'NeueHelvetica' }}>FINAL SCORE</div>
            <div className="text-6xl mb-1" style={{ fontFamily: 'NeueHelvetica' }}>{finalScore}</div>
            <div className="mb-1">
              {isNewBest
                ? <span className="text-xs tracking-widest text-green-500" style={{ fontFamily: 'NeueHelvetica' }}>NEW BEST</span>
                : gameStats ? <span className="text-xs text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>BEST <span className={darkMode ? 'text-white' : 'text-black'}>{gameStats.high_score}</span></span> : null
              }
            </div>

            <div className="text-xs tracking-widest text-gray-400 mt-4 mb-1" style={{ fontFamily: 'NeueHelvetica' }}>
              CHAINED {finalChain.length - 1} WORD{finalChain.length - 1 !== 1 ? 'S' : ''}
            </div>
            <div className="mb-5">
              {isNewLongest
                ? <span className="text-xs tracking-widest text-green-500" style={{ fontFamily: 'NeueHelvetica' }}>NEW LONGEST CHAIN</span>
                : gameStats ? <span className="text-xs text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>BEST <span className={darkMode ? 'text-white' : 'text-black'}>{gameStats.longest_chain}</span></span> : null
              }
            </div>

            {/* Chain display */}
            {finalChain.length > 1 && (
              <div className={`rounded-xl border p-3 mb-6 max-h-32 overflow-y-auto ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                <div className="flex flex-wrap gap-1 justify-center">
                  {finalChain.map((w, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`} style={{ fontFamily: 'NeueHelvetica' }}>{w}</span>
                      {i < finalChain.length - 1 && <span className="text-gray-400 text-xs">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => { resetGame(); setStarted(true); }}
              className={`w-full py-2 rounded-full text-sm tracking-widest transition-all hover:scale-105 active:scale-95 mb-3 ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
              style={{ fontFamily: 'NeueHelvetica' }}
            >PLAY AGAIN</button>
            <div className="flex gap-3">
              <Link
                href="/"
                className={`flex-1 py-2 rounded-full border text-xs tracking-widest text-center transition-colors ${darkMode ? 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black'}`}
                style={{ fontFamily: 'NeueHelvetica' }}
              >HOME</Link>
              {!user && (
                <button
                  onClick={() => { setShowEnd(false); setStarted(false); setShowAuth(true); }}
                  className={`flex-1 py-2 rounded-full border text-xs tracking-widest transition-colors ${darkMode ? 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black'}`}
                  style={{ fontFamily: 'NeueHelvetica' }}
                >SIGN IN</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`w-full flex items-center justify-center relative px-6 py-4 border-b ${border}`}>
        {started && !showEnd ? (
          <button
            onClick={() => { setLeaveAction('home'); setShowLeaveWarning(true); }}
            className={`absolute left-6 flex items-center gap-1 text-sm transition-colors ${iconBtn}`}
            style={{ fontFamily: 'KarnakPro' }}
          ><ChevronLeft size={16} />HOME</button>
        ) : (
          <Link href="/" className={`absolute left-6 flex items-center gap-1 text-sm transition-colors ${iconBtn}`} style={{ fontFamily: 'KarnakPro' }}>
            <ChevronLeft size={16} />HOME
          </Link>
        )}

        <span className="text-xl tracking-wide" style={{ fontFamily: 'KarnakPro' }}>Chain Reaction</span>

        <div className="absolute right-6 flex items-center gap-2">
          {/* Stats */}
          <div className="relative group">
            <button className={`p-2 rounded-lg transition-colors ${iconBtn}`}><BarChart2 size={18} /></button>
            <div className={`absolute right-0 mt-1 rounded-xl border shadow-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10 ${user && gameStats ? 'w-44' : 'w-36'} ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              {user && gameStats ? (
                <>
                  <div className="flex items-center justify-between mb-2" style={{ fontFamily: 'NeueHelvetica' }}>
                    <span className="text-xs tracking-widest text-gray-400">YOUR STATS</span>
                    <span className="text-xs text-gray-400">{gameStats.total_games} {gameStats.total_games === 1 ? 'play' : 'plays'}</span>
                  </div>
                  <div className={`border-t mb-2 ${border}`} />
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>Best</span>
                    <span className="text-xs" style={{ fontFamily: 'NeueHelvetica' }}>{gameStats.high_score}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>Avg</span>
                    <span className="text-xs" style={{ fontFamily: 'NeueHelvetica' }}>{gameStats.avg_score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>Longest chain</span>
                    <span className="text-xs" style={{ fontFamily: 'NeueHelvetica' }}>{gameStats.longest_chain}</span>
                  </div>
                </>
              ) : user ? (
                <div className="text-xs text-gray-400 text-center" style={{ fontFamily: 'NeueHelvetica' }}>No game data</div>
              ) : (
                <div className="text-xs text-gray-400 text-center leading-relaxed" style={{ fontFamily: 'NeueHelvetica' }}>Sign in to view<br />your stats</div>
              )}
            </div>
          </div>

          <button onClick={toggleDarkMode} className={`p-2 rounded-lg transition-colors ${iconBtn}`}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {!user ? (
            <button
              onClick={() => setShowAuth(true)}
              className={`px-4 py-1.5 rounded-lg text-sm tracking-widest transition-colors ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-900' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
              style={{ fontFamily: 'NeueHelvetica' }}
            >SIGN IN</button>
          ) : (
            <div className="relative group">
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${iconBtn}`} style={{ fontFamily: 'NeueHelvetica' }}>
                <span className="tracking-wide">{username ?? user.email}</span>
                <span className="text-xs">▾</span>
              </button>
              <div className={`absolute right-0 mt-1 w-36 rounded-xl border shadow-lg overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity z-10 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                <button
                  onClick={() => { if (started && !showEnd) { setLeaveAction('signout'); setShowLeaveWarning(true); } else { supabase.auth.signOut(); } }}
                  className={`w-full px-4 py-3 text-xs tracking-widest text-left transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}
                  style={{ fontFamily: 'NeueHelvetica' }}
                >SIGN OUT</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats pill — full width, right-aligned like WA */}
      <div className={`w-full flex justify-end px-6 mt-4 ${started && !showEnd ? '' : 'invisible'}`}>
        <div
          className={`flex divide-x rounded-2xl border text-center overflow-hidden ${darkMode ? 'border-gray-700 divide-gray-700' : 'border-gray-200 divide-gray-200'}`}
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          <div className="px-8 py-3">
            <div className="text-xs tracking-widest text-gray-400 mb-1">LIVES</div>
            <div className="flex gap-1 justify-center">
              {[1,2,3].map(i => <span key={i} className={`transition-colors ${i <= strikes ? 'text-red-500' : darkMode ? 'text-gray-700' : 'text-gray-300'}`}>♥</span>)}
            </div>
          </div>
          <div className="px-8 py-3">
            <div className="text-xs tracking-widest text-gray-400 mb-1">SCORE</div>
            <div className="text-xl tracking-wide">{score}</div>
          </div>
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col items-center justify-center pb-48">

        {started && !showEnd && (
          <>
            {/* Slot machine word display */}
            <div className="relative h-14 flex items-center justify-center overflow-hidden mb-4">
              {sliding && prevWord && (
                <div
                  className="absolute text-4xl tracking-wide text-gray-400"
                  style={{ fontFamily: 'NeueHelvetica', animation: 'chainSlideOut 0.32s ease forwards' }}
                >
                  {prevWord}
                </div>
              )}
              {fetchingWord ? (
                <div className={`h-10 w-32 rounded-lg animate-pulse ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} />
              ) : (
                <div
                  key={currentWord}
                  className="text-4xl tracking-wide"
                  style={{ fontFamily: 'NeueHelvetica', animation: sliding ? undefined : 'chainSlideIn 0.32s ease forwards' }}
                >
                  {currentWord}
                </div>
              )}
            </div>

            {/* Letter hint — always rendered to prevent layout shift */}
            <div className="text-xs tracking-widest text-gray-400 mb-12 h-4" style={{ fontFamily: 'NeueHelvetica' }}>
              {!fetchingWord && <>next word starts with <span className={`font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{nextLetter}</span></>}
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              value={guess}
              onChange={e => setGuess(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={loading ? '' : `starts with ${nextLetter}...`}
              disabled={loading || fetchingWord}
              className="w-full max-w-xs text-center bg-transparent border-none outline-none text-3xl tracking-wide [font-family:NeueHelvetica] disabled:opacity-30 disabled:cursor-not-allowed"
              style={inputStyle}
              autoFocus
            />
            <p className="text-xs text-red-400 mt-2 tracking-wide h-4" style={{ fontFamily: 'NeueHelvetica' }}>
              {invalidMsg}
            </p>
          </>
        )}

        {/* Start screen */}
        {!started && (
          <button
            onClick={() => setStarted(true)}
            className={`px-16 py-3 rounded-full text-xl tracking-widest transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
            style={{ fontFamily: 'NeueHelvetica' }}
          >
            START
          </button>
        )}
      </div>
    </div>
  );
}

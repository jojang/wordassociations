'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sun, Moon, CircleHelp, ChevronLeft, ChevronDown, BarChart2 } from 'lucide-react';
import { generateWord, scoreGuess, getInsights } from '@/lib/api';
import type { Insight } from '@/lib/api';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { supabase } from '@/lib/supabase';
import RulesModal from './RulesModal';
import EndModal from './EndModal';
import AuthModal from '@/components/auth/AuthModal';
import type { User } from '@supabase/supabase-js';

export type GameStats = {
  highScore: number;
  totalGames: number;
  avgScore: number;
};

const TIMER_DURATION = 15;
const STRIKES_MAX = 3;

type InputState = '' | 'error' | 'correct' | 'invalid';

export default function Game() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [leaveAction, setLeaveAction] = useState<'home' | 'signout'>('home');
  const [loading, setLoading] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(STRIKES_MAX);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [inputState, setInputState] = useState<InputState>('');
  const [finalScore, setFinalScore] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const failedWordsRef = useRef<{ word: string; wrong_guesses: string[] }[]>([]);
  const currentWrongGuessesRef = useRef<string[]>([]);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  const fetchUsername = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
    setUsername(data?.display_name ?? null);
  };

  const fetchStats = async (userId: string) => {
    const { data } = await supabase
      .from('user_stats')
      .select('total_games, high_score, avg_score')
      .eq('user_id', userId)
      .eq('game', 'word-associations')
      .single();
    if (data) setGameStats({ highScore: data.high_score, totalGames: data.total_games, avgScore: data.avg_score });
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) { fetchUsername(data.user.id); fetchStats(data.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { fetchUsername(session.user.id); fetchStats(session.user.id); }
      else setUsername(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchNextWord = useCallback(async () => {
    setLoading(true);
    try {
      const word = await generateWord();
      setCurrentWord(word);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);

  const flashInput = useCallback((state: InputState) => {
    setInputState(state);
    setTimeout(() => setInputState(''), 500);
  }, []);

  const saveStats = useCallback(async (final: number) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('user_stats')
      .select('total_games, high_score, avg_score')
      .eq('user_id', user.id)
      .eq('game', 'word-associations')
      .single();

    const totalGames = (existing?.total_games ?? 0) + 1;
    const highScore = Math.max(existing?.high_score ?? 0, final);
    const avgScore = Math.round(((existing?.avg_score ?? 0) * (existing?.total_games ?? 0) + final) / totalGames);

    await supabase.from('user_stats').upsert({
      user_id: user.id,
      game: 'word-associations',
      total_games: totalGames,
      high_score: highScore,
      avg_score: avgScore,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,game' });

    setGameStats({ highScore, totalGames, avgScore });
  }, [user]);

  const endGame = useCallback(async (final: number) => {
    setFinalScore(final);
    setScore(0);
    setStrikes(STRIKES_MAX);
    setTimeLeft(TIMER_DURATION);
    setShowEnd(true);
    fetchNextWord();
    await saveStats(final);
    setInsights([]);
    const failed = failedWordsRef.current;
    if (failed.length > 0 && user) {
      getInsights(failed).then(setInsights).catch(() => {});
    }
    failedWordsRef.current = [];
    currentWrongGuessesRef.current = [];
  }, [fetchNextWord, saveStats]);

  // Fetch first word when game starts
  useEffect(() => {
    if (started) fetchNextWord();
  }, [started, fetchNextWord]);

  // Countdown timer — paused while loading or end modal is open
  useEffect(() => {
    if (!started || showEnd || loading) return;
    if (timeLeft === 0) {
      if (currentWrongGuessesRef.current.length > 0) {
        failedWordsRef.current.push({ word: currentWord, wrong_guesses: [...currentWrongGuessesRef.current] });
        currentWrongGuessesRef.current = [];
      }
      endGame(score);
      return;
    }
    const tick = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(tick);
  }, [timeLeft, started, showEnd, loading, score, endGame]);

  // End game when strikes hit 0
  useEffect(() => {
    if (!started || strikes > 0) return;
    endGame(score);
  }, [strikes, started, score, endGame]);

  // Escape closes leave warning
  useEffect(() => {
    if (!showLeaveWarning) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLeaveWarning(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showLeaveWarning]);

  // Restore focus after loading completes
  useEffect(() => {
    if (!loading && started && !showEnd) {
      inputRef.current?.focus();
    }
  }, [loading, started, showEnd]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || loading || !currentWord) return;

    const trimmed = guess.trim().toLowerCase();
    const word = currentWord.toLowerCase();

    if (trimmed === '') {
      flashInput('invalid');
      return;
    }

    if (trimmed.length < 3) {
      flashInput('invalid');
      setGuess('');
      return;
    }

    if (word.includes(trimmed) || trimmed.includes(word)) {
      flashInput('invalid');
      setGuess('');
      return;
    }

    setLoading(true);
    try {
      const result = await scoreGuess(currentWord, trimmed);
      if (result.correct) {
        flashInput('correct');
        setScore((s) => s + result.score);
        setGuess('');
        setStrikes(STRIKES_MAX);
        setTimeLeft(TIMER_DURATION);
        currentWrongGuessesRef.current = [];
        await fetchNextWord();
      } else {
        flashInput('error');
        currentWrongGuessesRef.current.push(trimmed);
        const newStrikes = strikes - 1;
        setStrikes(newStrikes);
        setGuess('');
        if (newStrikes === 0) {
          failedWordsRef.current.push({ word: currentWord, wrong_guesses: [...currentWrongGuessesRef.current] });
          currentWrongGuessesRef.current = [];
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full max-w-xs text-center bg-transparent border-none outline-none text-3xl tracking-wide [font-family:NeueHelvetica] disabled:opacity-30 disabled:cursor-not-allowed';

  const inputStyle = {
    animation: inputState === 'invalid' ? 'shake 0.35s ease-in-out' : undefined,
    boxShadow:
      inputState === 'error' ? '0 0 8px 3px rgba(255, 80, 80, 0.5), 0 0 20px 6px rgba(255, 80, 80, 0.2)' :
      inputState === 'correct' ? '0 0 8px 3px rgba(43, 255, 0, 0.45), 0 0 20px 6px rgba(43, 255, 0, 0.18)' :
      undefined,
    borderRadius: '8px',
  };

  const timerClass = `tabular-nums ${timeLeft <= 5 && !loading ? 'text-red-500' : ''}`;

  return (
    <div className={`min-h-screen flex flex-col items-center ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'}`}>

      {showAuth && <AuthModal darkMode={darkMode} onClose={() => setShowAuth(false)} />}
      {showRules && <RulesModal darkMode={darkMode} onClose={() => setShowRules(false)} />}
      {showLeaveWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLeaveWarning(false)}>
          <div className={`rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl text-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl mb-3 tracking-wide" style={{ fontFamily: 'KarnakPro' }}>LEAVE GAME?</h2>
            <p className="text-sm text-gray-400 mb-6" style={{ fontFamily: 'NeueHelvetica' }}>
              {user ? 'Your current score will be saved.' : 'Your progress will be lost. Sign in to save your stats.'}
            </p>
            <button
              onClick={async () => { setShowLeaveWarning(false); await saveStats(score); if (leaveAction === 'signout') await supabase.auth.signOut(); router.push('/'); }}
              className={`w-full py-2 rounded-full text-sm tracking-widest mb-3 transition-all hover:scale-105 active:scale-95 ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
              style={{ fontFamily: 'NeueHelvetica' }}
            >
              LEAVE
            </button>
            <button
              onClick={() => setShowLeaveWarning(false)}
              className={`w-full py-2 rounded-full border text-sm tracking-widest transition-all hover:scale-105 active:scale-95 ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
              style={{ fontFamily: 'NeueHelvetica' }}
            >
              KEEP PLAYING
            </button>
          </div>
        </div>
      )}
      {showEnd && (
        <EndModal
          darkMode={darkMode}
          finalScore={finalScore}
          stats={gameStats}
          isGuest={!user}
          insights={insights}
          onPlayAgain={() => setShowEnd(false)}
          onDismiss={() => { setShowEnd(false); setStarted(false); }}
          onSignIn={() => { setShowEnd(false); setStarted(false); setShowAuth(true); }}
        />
      )}

      {/* Header */}
      <div className={`w-full flex items-center justify-center relative px-6 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>

        {/* Left: Home */}
        {started && !showEnd ? (
          <button
            onClick={() => { setLeaveAction('home'); setShowLeaveWarning(true); }}
            className={`absolute left-6 flex items-center gap-1 text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black'}`}
            style={{ fontFamily: 'KarnakPro' }}
          >
            <ChevronLeft size={16} />HOME
          </button>
        ) : (
          <Link
            href="/"
            className={`absolute left-6 flex items-center gap-1 text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black'}`}
            style={{ fontFamily: 'KarnakPro' }}
          >
            <ChevronLeft size={16} />HOME
          </Link>
        )}

        {/* Center: Title */}
        <span className="text-xl tracking-wide" style={{ fontFamily: 'KarnakPro' }}>Word Associations</span>

        {/* Right: Stats, Help, Dark mode, Username */}
        <div className="absolute right-6 flex items-center gap-2">
          {/* Stats */}
          <div className="relative group">
            <button className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black'}`}>
              <BarChart2 size={18} />
            </button>
            <div className={`absolute right-0 mt-1 rounded-xl border shadow-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10 ${user && gameStats ? 'w-48' : 'w-32'} ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              {user && gameStats ? (
                <>
                  <div className="text-xs tracking-widests text-gray-400 mb-2" style={{ fontFamily: 'NeueHelvetica' }}>YOUR STATS</div>
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
          {/* Help */}
          <button onClick={() => setShowRules(true)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black'}`}>
            <CircleHelp size={18} />
          </button>
          {/* Dark mode */}
          <button onClick={toggleDarkMode} className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black'}`}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {/* Sign in / user */}
          {!user && (
            <button
              onClick={() => setShowAuth(true)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm tracking-widest transition-colors ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-900' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
              style={{ fontFamily: 'NeueHelvetica' }}
            >
              SIGN IN
            </button>
          )}
          {user && (
            <div className="relative group">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black'}`}
                style={{ fontFamily: 'NeueHelvetica' }}
              >
                <span className="tracking-wide">{username ?? user.email}</span>
                <ChevronDown size={14} />
              </button>
              <div className={`absolute right-0 mt-1 w-36 rounded-xl border shadow-lg overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity z-10 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                <button
                  onClick={() => { if (started && !showEnd) { setLeaveAction('signout'); setShowLeaveWarning(true); } else { supabase.auth.signOut(); } }}
                  className={`w-full px-4 py-3 text-xs tracking-widest text-left transition-colors ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
                  style={{ fontFamily: 'NeueHelvetica' }}
                >
                  SIGN OUT
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Score + Timer + Lives */}
      <div className={`w-full flex justify-end px-6 mt-4 ${!started ? 'invisible' : ''}`}>
        <div
          className={`flex divide-x rounded-2xl border text-center overflow-hidden ${darkMode ? 'border-gray-700 divide-gray-700' : 'border-gray-200 divide-gray-200'}`}
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          <div className="px-8 py-3">
            <div className="text-xs tracking-widest text-gray-400 mb-1">TIME</div>
            <div className={`text-xl tracking-wide ${timerClass}`}>{loading ? '—' : timeLeft}</div>
          </div>
          <div className="px-8 py-3">
            <div className="text-xs tracking-widest text-gray-400 mb-1">LIVES</div>
            <div className="flex gap-1 justify-center text-base">
              {[1, 2, 3].map((i) => (
                <span key={i} className={`transition-colors ${i <= strikes ? 'text-red-500' : darkMode ? 'text-gray-700' : 'text-gray-300'}`}>
                  ♥
                </span>
              ))}
            </div>
          </div>
          <div className="px-8 py-3">
            <div className="text-xs tracking-widests text-gray-400 mb-1">SCORE</div>
            <div className="text-xl tracking-wide">{score}</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center pb-48">
        {/* Current word */}
        {started && !showEnd && (
          <div className="text-4xl tracking-wide mb-12" style={{ fontFamily: 'NeueHelvetica' }}>
            {loading
              ? <div className={`h-10 w-32 rounded-lg animate-pulse ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} />
              : currentWord}
          </div>
        )}

        {/* Input */}
        {started && (
          <input
            ref={inputRef}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={loading ? '' : 'Enter word here...'}
            disabled={loading}
            className={inputClass}
            style={inputStyle}
            autoFocus
          />
        )}

        {/* Start button */}
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

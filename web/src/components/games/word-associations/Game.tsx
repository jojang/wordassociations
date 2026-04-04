'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { generateWord, scoreGuess } from '@/lib/api';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { supabase } from '@/lib/supabase';
import RulesModal from './RulesModal';
import EndModal from './EndModal';
import type { User } from '@supabase/supabase-js';

export type GameStats = {
  highScore: number;
  totalGames: number;
  avgScore: number;
};

const TIMER_DURATION = 15;
const STRIKES_MAX = 3;

type InputState = '' | 'error' | 'correct';

export default function Game() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [started, setStarted] = useState(false);
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
  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
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

  const endGame = useCallback(async (final: number) => {
    setFinalScore(final);
    setScore(0);
    setStrikes(STRIKES_MAX);
    setTimeLeft(TIMER_DURATION);
    setShowEnd(true);
    fetchNextWord();

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
  }, [fetchNextWord, user]);

  // Fetch first word when game starts
  useEffect(() => {
    if (started) fetchNextWord();
  }, [started, fetchNextWord]);

  // Countdown timer — paused while loading or end modal is open
  useEffect(() => {
    if (!started || showEnd || loading) return;
    if (timeLeft === 0) {
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

  // Restore focus after loading completes
  useEffect(() => {
    if (!loading && started && !showEnd) {
      inputRef.current?.focus();
    }
  }, [loading, started, showEnd]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || loading || !currentWord) return;

    if (guess.trim() === '') {
      flashInput('error');
      return;
    }

    setLoading(true);
    try {
      const result = await scoreGuess(currentWord, guess.trim());
      if (result.correct) {
        flashInput('correct');
        setScore((s) => s + result.score);
        setGuess('');
        setStrikes(STRIKES_MAX);
        setTimeLeft(TIMER_DURATION);
        await fetchNextWord();
      } else {
        flashInput('error');
        setStrikes((s) => s - 1);
        setGuess('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = [
    'w-full max-w-xs text-center bg-transparent border-none outline-none text-3xl tracking-wide [font-family:NeueHelvetica]',
    'disabled:opacity-30 disabled:cursor-not-allowed transition-opacity',
    inputState === 'error' ? 'shadow-[0_0_0.5em_red]' : '',
    inputState === 'correct' ? 'shadow-[0_0_0.5em_#2bff00]' : '',
  ].filter(Boolean).join(' ');

  const timerClass = `tabular-nums ${timeLeft <= 5 && !loading ? 'text-red-500' : ''}`;

  return (
    <div className={`min-h-screen flex flex-col items-center ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'}`}>

      {showRules && <RulesModal darkMode={darkMode} onClose={() => setShowRules(false)} />}
      {showEnd && (
        <EndModal
          darkMode={darkMode}
          finalScore={finalScore}
          stats={gameStats}
          onClose={() => { setShowEnd(false); }}
        />
      )}

      {/* Header */}
      <div className="w-full flex items-center justify-center relative px-6 py-3 border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="absolute left-6 text-sm tracking-widest hover:opacity-60 transition-opacity" style={{ fontFamily: 'KarnakPro' }}>
          ← HOME
        </Link>
        <span className="text-2xl tracking-wide" style={{ fontFamily: 'KarnakPro' }}>Word Associations</span>
        <div className="absolute right-6 flex items-center gap-4">
          <button
            onClick={toggleDarkMode}
            className={`w-9 h-9 rounded-full font-bold transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-md ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-700'}`}
          >
            {darkMode ? '☀' : '☾'}
          </button>
          <button
            onClick={() => setShowRules(true)}
            className={`w-9 h-9 rounded-full font-bold transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-md ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-700'}`}
          >
            ?
          </button>
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
            {loading ? '...' : currentWord}
          </div>
        )}

        {/* Input */}
        {started && (
          <input
            ref={inputRef}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={loading ? 'Loading...' : 'Enter word here...'}
            disabled={loading}
            className={inputClass}
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

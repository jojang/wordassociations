'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Switch from '@mui/material/Switch';
import { getAssociations } from '@/lib/api';
import { useDarkMode } from '@/contexts/DarkModeContext';
import RulesModal from './RulesModal';
import EndModal from './EndModal';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const randomWords = require('random-words');

const TIMER_DURATION = 15;

type InputState = '' | 'error' | 'correct';

export default function Game() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentWord, setCurrentWord] = useState<string>(() => randomWords({ exactly: 1, min: 3 })[0]);
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(3);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [wordList, setWordList] = useState<string[]>([]);
  const [scoreList, setScoreList] = useState<Record<string, number>>({});
  const [inputState, setInputState] = useState<InputState>('');
  const [finalScore, setFinalScore] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const nextWord = useCallback(() => {
    setCurrentWord(randomWords({ exactly: 1, min: 3 })[0]);
  }, []);

  const flashInput = useCallback((state: InputState) => {
    setInputState(state);
    setTimeout(() => setInputState(''), 500);
  }, []);

  const endGame = useCallback((finalScore: number) => {
    setFinalScore(finalScore);
    setScore(0);
    setStrikes(3);
    setTimeLeft(TIMER_DURATION);
    setShowEnd(true);
    nextWord();
  }, [nextWord]);

  // Fetch associations whenever the current word changes — pauses timer while loading
  useEffect(() => {
    if (!started) return;
    setLoading(true);
    getAssociations(currentWord)
      .then((data) => {
        if (data.result_msg === 'Entry word not found') {
          nextWord();
        } else {
          setWordList(data.associations_array);
          setScoreList(data.associations_scored);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentWord, started, nextWord]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || loading) return;

    if (guess === '') {
      flashInput('error');
      return;
    }

    if (wordList.includes(guess)) {
      flashInput('correct');
      setScore((s) => s + Math.round((scoreList[guess] ?? 0) * 10000));
      setGuess('');
      setStrikes(3);
      setTimeLeft(TIMER_DURATION);
      nextWord();
    } else {
      flashInput('error');
      setStrikes((s) => s - 1);
      setGuess('');
    }
  };

  const inputClass = [
    'w-full max-w-xs text-center bg-transparent border-none outline-none text-3xl tracking-wide mt-28 [font-family:NeueHelvetica]',
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
          onClose={() => setShowEnd(false)}
        />
      )}

      {/* Header */}
      <div className="w-full flex items-center justify-center relative px-6 py-3 border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="absolute left-6 text-sm tracking-widest hover:opacity-60 transition-opacity" style={{ fontFamily: 'NeueHelvetica' }}>
          ← HOME
        </Link>
        <span className="text-2xl tracking-wide" style={{ fontFamily: 'KarnakPro' }}>Word Associations</span>
        <div className="absolute right-6 flex items-center gap-2">
          <Switch checked={darkMode} onChange={toggleDarkMode} size="small" />
          <button
            onClick={() => setShowRules(true)}
            className="w-8 h-8 rounded-full bg-black text-white font-bold hover:bg-gray-700 transition-colors"
          >
            ?
          </button>
        </div>
      </div>

      {/* Score + Lives + Timer */}
      <div className="flex gap-12 mt-6 text-sm tracking-widest" style={{ fontFamily: 'NeueHelvetica' }}>
        <span>SCORE: {score}</span>
        <span className={timerClass}>{loading ? 'TIME: —' : `TIME: ${timeLeft}`}</span>
        <span>LIVES: {strikes}</span>
      </div>

      {/* Current word */}
      {started && !showEnd && (
        <div className="mt-28 text-4xl tracking-wide" style={{ fontFamily: 'NeueHelvetica' }}>
          {loading ? '...' : currentWord}
        </div>
      )}

      {/* Input */}
      {started && (
        <input
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
          className="mt-28 px-16 py-3 rounded-full bg-black text-white text-xl tracking-widest hover:bg-gray-700 transition-colors"
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          START
        </button>
      )}
    </div>
  );
}

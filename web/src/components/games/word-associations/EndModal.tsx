'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import type { GameStats } from './Game';
import type { Insight } from '@/lib/api';

interface EndModalProps {
  darkMode: boolean;
  finalScore: number;
  stats: GameStats | null;
  isGuest: boolean;
  insights: Insight[];
  onPlayAgain: () => void;
  onDismiss: () => void;
  onSignIn: () => void;
}

export default function EndModal({ darkMode, finalScore, stats, isGuest, insights, onPlayAgain, onDismiss, onSignIn }: EndModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDismiss]);

  const bg = darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onDismiss}>
      <div className={`${bg} rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl text-center`} onClick={(e) => e.stopPropagation()}>

        {/* Score */}
        <h2 className="text-2xl tracking-wide mb-3" style={{ fontFamily: 'KarnakPro' }}>GAME OVER</h2>
        <div className="text-xs tracking-widest text-gray-400 mb-2" style={{ fontFamily: 'NeueHelvetica' }}>FINAL SCORE</div>
        <div className="text-6xl mb-4" style={{ fontFamily: 'NeueHelvetica' }}>{finalScore}</div>

        {/* Inline stats */}
        {stats && (
          <div className="flex justify-center gap-6 mb-6" style={{ fontFamily: 'NeueHelvetica' }}>
            <div>
              <div className="text-xs tracking-widest text-gray-400">BEST</div>
              <div className="text-sm">{stats.highScore}</div>
            </div>
            <div>
              <div className="text-xs tracking-widest text-gray-400">GAMES</div>
              <div className="text-sm">{stats.totalGames}</div>
            </div>
            <div>
              <div className="text-xs tracking-widests text-gray-400">AVG</div>
              <div className="text-sm">{stats.avgScore}</div>
            </div>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className={`text-left rounded-xl border p-4 mb-6 space-y-2 ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
            <div className="text-xs tracking-widest text-gray-400 mb-2" style={{ fontFamily: 'NeueHelvetica' }}>INSIGHTS</div>
            {insights.map((item, i) => (
              <div key={i} style={{ fontFamily: 'NeueHelvetica' }}>
                <span className="text-xs text-gray-400">{item.word} → {item.guess}: </span>
                <span className="text-xs">{item.insight}</span>
              </div>
            ))}
          </div>
        )}

        {/* Primary action */}
        <button
          onClick={onPlayAgain}
          className={`w-full py-2 rounded-full text-sm tracking-widest transition-colors mb-3 mt-6 ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          PLAY AGAIN
        </button>

        {/* Secondary actions */}
        <div className="flex gap-3">
          <Link
            href="/"
            className={`flex-1 py-2 rounded-full border text-xs tracking-widest text-center transition-colors ${darkMode ? 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black'}`}
            style={{ fontFamily: 'NeueHelvetica' }}
          >
            HOME
          </Link>
          {isGuest && (
            <button
              onClick={onSignIn}
              className={`flex-1 py-2 rounded-full border text-xs tracking-widest transition-colors ${darkMode ? 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black'}`}
              style={{ fontFamily: 'NeueHelvetica' }}
            >
              SIGN IN
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

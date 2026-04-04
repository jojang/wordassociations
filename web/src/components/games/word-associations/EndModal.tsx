'use client';

import Link from 'next/link';
import type { GameStats } from './Game';

interface EndModalProps {
  darkMode: boolean;
  finalScore: number;
  stats: GameStats | null;
  onClose: () => void;
}

export default function EndModal({ darkMode, finalScore, stats, onClose }: EndModalProps) {
  const bg = darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black';
  const subtle = darkMode ? 'text-gray-400' : 'text-gray-500';
  const outline = darkMode ? 'border-white hover:bg-gray-800' : 'border-black hover:bg-gray-100';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${bg} rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl text-center`}>
        <h2
          className="text-3xl mb-2 tracking-wide"
          style={{ fontFamily: 'KarnakPro' }}
        >
          GAME OVER
        </h2>
        <p
          className={`text-sm mb-2 tracking-wide ${subtle}`}
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          FINAL SCORE
        </p>
        <div
          className="text-5xl mb-6"
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          {finalScore}
        </div>

        {stats && (
          <div
            className={`flex divide-x rounded-2xl border text-center overflow-hidden mb-8 ${darkMode ? 'border-gray-700 divide-gray-700' : 'border-gray-200 divide-gray-200'}`}
            style={{ fontFamily: 'NeueHelvetica' }}
          >
            <div className="flex-1 px-4 py-3">
              <div className="text-xs tracking-widest text-gray-400 mb-1">BEST</div>
              <div className="text-lg">{stats.highScore}</div>
            </div>
            <div className="flex-1 px-4 py-3">
              <div className="text-xs tracking-widest text-gray-400 mb-1">GAMES</div>
              <div className="text-lg">{stats.totalGames}</div>
            </div>
            <div className="flex-1 px-4 py-3">
              <div className="text-xs tracking-widests text-gray-400 mb-1">AVG</div>
              <div className="text-lg">{stats.avgScore}</div>
            </div>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full py-2 rounded-full bg-black text-white tracking-widest hover:bg-gray-700 transition-colors mb-3"
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          PLAY AGAIN
        </button>
        <Link
          href="/"
          className={`block w-full py-2 rounded-full border text-sm tracking-widest transition-colors ${outline}`}
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          HOME
        </Link>
      </div>
    </div>
  );
}

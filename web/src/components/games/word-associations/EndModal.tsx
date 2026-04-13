'use client';

import { useEffect, Fragment } from 'react';
import Link from 'next/link';
import type { GameStats } from './Game';
import type { Insight } from '@/lib/api';

interface EndModalProps {
  darkMode: boolean;
  finalScore: number;
  isNewBest: boolean;
  stats: GameStats | null;
  isGuest: boolean;
  insights: Insight[];
  insightsLoading: boolean;
  onPlayAgain: () => void;
  onDismiss: () => void;
  onSignIn: () => void;
}

export default function EndModal({ darkMode, finalScore, isNewBest, stats, isGuest, insights, insightsLoading, onPlayAgain, onDismiss, onSignIn }: EndModalProps) {
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
        <div className="text-6xl mb-3" style={{ fontFamily: 'NeueHelvetica' }}>{finalScore}</div>
        <div className="mb-5">
          {isNewBest
            ? <span className="text-xs tracking-widest px-2 py-1 rounded-full bg-black text-white" style={{ fontFamily: 'NeueHelvetica' }}>NEW BEST</span>
            : stats ? <span className="text-xs text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>BEST <span className={darkMode ? 'text-white' : 'text-black'}>{stats.highScore}</span></span> : null
          }
        </div>

        {/* Insights */}
        {(insightsLoading || insights.length > 0) && (
          <div className={`text-left rounded-xl border p-4 mb-6 ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
            <div className="text-xs tracking-widest text-gray-400 mb-3" style={{ fontFamily: 'NeueHelvetica' }}>INSIGHTS</div>
            {insightsLoading ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <div className="text-xs text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>Generating insights...</div>
              </div>
            ) : (
            <div className="space-y-4">
              {insights.map((item, i) => (
                <div key={i}>
                  {/* Word + definition */}
                  <div className="mb-2">
                    <span className="text-xs font-semibold tracking-wide" style={{ fontFamily: 'NeueHelvetica' }}>{item.word}</span>
                    {item.definition && (
                      <span className={`text-xs ml-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontFamily: 'NeueHelvetica' }}>— {item.definition}</span>
                    )}
                  </div>
                  {/* Divider */}
                  <div className={`border-t mb-2 ${darkMode ? 'border-gray-800' : 'border-gray-100'}`} />
                  {/* Guesses */}
                  <div className="grid gap-y-1 mb-3" style={{ gridTemplateColumns: 'auto 1fr' }}>
                    {(item.guesses ?? []).filter((g, j, arr) => arr.findIndex(x => x.guess === g.guess) === j).map((g, j) => (
                      <Fragment key={j}>
                        <span className={`text-xs pr-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} style={{ fontFamily: 'NeueHelvetica' }}>{g.guess}</span>
                        <span className="text-xs text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>{g.insight}</span>
                      </Fragment>
                    ))}
                  </div>
                  {/* Alternatives */}
                  {(item.alternatives ?? []).length > 0 && (
                    <div>
                      <div className="text-xs tracking-widest text-gray-400 mb-1.5" style={{ fontFamily: 'NeueHelvetica' }}>STRONGER ASSOCIATIONS</div>
                      <div className="flex gap-1 flex-wrap">
                        {item.alternatives.map((alt, k) => (
                          <span key={k} className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`} style={{ fontFamily: 'NeueHelvetica' }}>{alt}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Divider between words */}
                  {i < insights.length - 1 && (
                    <div className={`mt-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`} />
                  )}
                </div>
              ))}
            </div>
            )}
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

'use client';

import { useEffect } from 'react';

interface RulesModalProps {
  darkMode: boolean;
  onClose: () => void;
}

export default function RulesModal({ darkMode, onClose }: RulesModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const bg = darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black';
  const subtle = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${bg} rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <h2
          className="text-2xl mb-4 tracking-wide"
          style={{ fontFamily: 'KarnakPro' }}
        >
          HOW TO PLAY
        </h2>
        <ul
          className={`space-y-3 mb-6 text-sm tracking-wide leading-relaxed ${subtle}`}
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          <li>Type a word associated with the given word.</li>
          <li>Stronger associations score more points.</li>
          <li>3 ♥ per word — a wrong guess costs one.</li>
          <li>15 seconds per word — the clock resets on a correct guess, lives do too.</li>
        </ul>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-full bg-black text-white tracking-widest hover:bg-gray-700 transition-colors"
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          BACK TO GAME
        </button>
      </div>
    </div>
  );
}

'use client';

interface RulesModalProps {
  darkMode: boolean;
  onClose: () => void;
}

export default function RulesModal({ darkMode, onClose }: RulesModalProps) {
  const bg = darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black';
  const subtle = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${bg} rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl`}>
        <h2
          className="text-2xl mb-4 tracking-wide"
          style={{ fontFamily: 'KarnakPro' }}
        >
          HOW TO PLAY
        </h2>
        <ul
          className={`space-y-2 mb-6 text-sm tracking-wide leading-relaxed ${subtle}`}
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          <li>You are given a random word.</li>
          <li>Type a word you associate with it and press Enter.</li>
          <li>Stronger associations earn more points.</li>
          <li>Wrong guesses cost a life — you have 3.</li>
          <li>You have 15 seconds per word. A correct guess resets the timer.</li>
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

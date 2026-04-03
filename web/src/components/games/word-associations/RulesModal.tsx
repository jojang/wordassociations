'use client';

interface RulesModalProps {
  onClose: () => void;
}

export default function RulesModal({ onClose }: RulesModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-2xl font-bold mb-4">How to Play</h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 mb-6">
          <li>You are given a random word.</li>
          <li>Type a word you associate with it and press Enter.</li>
          <li>Correct associations earn points based on strength.</li>
          <li>Wrong guesses cost a life — you have 3.</li>
          <li>A correct guess resets your lives and gives a new word.</li>
        </ul>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-full bg-black text-white font-bold tracking-widest hover:bg-gray-700 transition-colors"
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}

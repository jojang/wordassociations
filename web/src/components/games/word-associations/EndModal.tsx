'use client';

interface EndModalProps {
  finalScore: number;
  onClose: () => void;
}

export default function EndModal({ finalScore, onClose }: EndModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl text-center">
        <h2 className="text-3xl font-bold mb-2">Game Over</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">You ran out of lives.</p>
        <div className="text-5xl font-bold mb-8">{finalScore}</div>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-full bg-black text-white font-bold tracking-widest hover:bg-gray-700 transition-colors"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}

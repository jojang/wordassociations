import Link from 'next/link';

const GAMES = [
  {
    slug: 'word-associations',
    title: 'Word Associations',
    description: 'Guess words associated with a given word before you run out of lives.',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl tracking-wide mb-2" style={{ fontFamily: 'KarnakPro' }}>Word Games</h1>
      <p className="text-gray-500 mb-12">Pick a game to play</p>
      <div className="grid gap-4 w-full max-w-md">
        {GAMES.map((game) => (
          <Link
            key={game.slug}
            href={`/games/${game.slug}`}
            className="block p-6 rounded-2xl border border-gray-200 hover:border-black transition-colors"
          >
            <div className="font-bold text-lg">{game.title}</div>
            <div className="text-gray-500 text-sm mt-1">{game.description}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}

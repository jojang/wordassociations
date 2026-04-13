const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface ScoreResponse {
  correct: boolean;
  score: number;
  similarity: number;
}

export interface Insight {
  word: string;
  definition?: string;
  guesses: { guess: string; insight: string }[];
  alternatives: string[];
}

export async function generateWord(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/words/generate`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.word;
}

export async function scoreGuess(word: string, guess: string): Promise<ScoreResponse> {
  const res = await fetch(`${API_BASE}/api/words/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, guess }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ─── Odd One Out ──────────────────────────────────────────────────────────────

export interface PuzzleSet {
  words: string[];
  odd_one_out: string;
  category: string;
}

export interface DailyPuzzle {
  date: string;
  sets: PuzzleSet[];
}

export interface OddOneOutStats {
  total_games: number;
  distribution: number[];
  last_played_date: string | null;
  last_score: number | null;
}

export async function getDailyPuzzle(): Promise<DailyPuzzle> {
  const res = await fetch(`${API_BASE}/api/games/odd-one-out/daily`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getOddOneOutStats(userId: string): Promise<OddOneOutStats | null> {
  const res = await fetch(`${API_BASE}/api/games/odd-one-out/stats/${userId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.stats ?? null;
}

export async function completeOddOneOut(userId: string, score: number, date: string): Promise<OddOneOutStats | null> {
  const res = await fetch(`${API_BASE}/api/games/odd-one-out/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, score, date }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.stats ?? null;
}

export async function getInsights(failedWords: { word: string; wrong_guesses: string[] }[]): Promise<Insight[]> {
  const res = await fetch(`${API_BASE}/api/insights/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ failed_words: failedWords }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.insights;
}

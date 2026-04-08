const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── Word Associations ────────────────────────────────────────────────────────

export async function generateWord(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/games/word-associations/word`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.word;
}

export interface ScoreResponse {
  correct: boolean;
  score: number;
  similarity: number;
}

export async function scoreGuess(word: string, guess: string): Promise<ScoreResponse> {
  const res = await fetch(`${API_BASE}/api/games/word-associations/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, guess }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface Insight {
  word: string;
  definition?: string;
  guesses: { guess: string; insight: string }[];
  alternatives: string[];
}

export async function getInsights(failedWords: { word: string; wrong_guesses: string[] }[]): Promise<Insight[]> {
  const res = await fetch(`${API_BASE}/api/games/word-associations/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ failed_words: failedWords }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.insights;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface GameStats {
  high_score: number;
  total_games: number;
  avg_score: number;
}

export async function getProfile(userId: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/users/profile/${userId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.display_name ?? null;
}

export async function upsertProfile(userId: string, displayName: string): Promise<void> {
  await fetch(`${API_BASE}/api/users/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, display_name: displayName }),
  });
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/users/username-available?username=${encodeURIComponent(username)}`);
  if (!res.ok) return false;
  const data = await res.json();
  return data.available;
}

export async function getEmailByUsername(username: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/users/email?username=${encodeURIComponent(username)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.email ?? null;
}

export async function getUserStats(userId: string, game: string): Promise<GameStats | null> {
  const res = await fetch(`${API_BASE}/api/users/stats/${userId}?game=${encodeURIComponent(game)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.stats ?? null;
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

export async function saveUserStats(userId: string, game: string, score: number): Promise<GameStats | null> {
  const res = await fetch(`${API_BASE}/api/users/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, game, score }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.stats ?? null;
}

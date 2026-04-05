const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function generateWord(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/words/generate`);
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
  const res = await fetch(`${API_BASE}/api/words/score`, {
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
  const res = await fetch(`${API_BASE}/api/insights/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ failed_words: failedWords }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.insights;
}

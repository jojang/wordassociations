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

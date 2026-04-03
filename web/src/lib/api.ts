const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface AssociationsResponse {
  associations_array: string[];
  associations_scored: Record<string, number>;
  result_msg: string;
}

export async function getAssociations(word: string): Promise<AssociationsResponse> {
  const res = await fetch(`${API_BASE}/api/word-associations/associations?entry=${encodeURIComponent(word)}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

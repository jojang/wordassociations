# Wordbook

**Play at [wordbook-seven.vercel.app](https://wordbook-seven.vercel.app)**

A suite of word games with AI-powered scoring, user accounts, and persistent stats.

## Games

### Word Associations
Guess words semantically associated with a given word before you run out of lives. Each round gives you 15 seconds and 3 lives. Scoring is based on semantic similarity — closer associations score higher.

## Stack

- **Frontend** — Next.js, TypeScript, Tailwind CSS, deployed on Vercel
- **Backend** — FastAPI (Python), deployed on Hugging Face Spaces
- **Scoring** — `sentence-transformers` (all-MiniLM-L6-v2) for semantic similarity via cosine distance
- **Word generation** — `wonderwords`
- **Auth & Database** — Supabase (Postgres + Auth + RLS)

## Features

- Light/dark mode
- Google OAuth and email/password sign in
- Username selection on signup with live availability check
- Persistent stats per game: high score, total games played, average score
- Semantic scoring — answers are judged by meaning, not exact match

## Local Development

```bash
# Frontend
cd web
npm install
npm run dev

# Backend
cd api
pip install -r requirements.txt
uvicorn main:app --reload
```

Set up `web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

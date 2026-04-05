# Wordbook

**Web — [wordbook-seven.vercel.app](https://wordbook-seven.vercel.app)**

**Mobile — open in [Expo Go](https://expo.dev/go):** `exp://u.expo.dev/201d656f-fd88-4bb7-87dc-bda9d9c2b058/group/6b51c18d-5e27-4f92-a317-6f34c9e86349`

A suite of word games with AI-powered scoring, user accounts, and persistent stats — available on web and iOS/Android.

## Games

### Word Associations
Guess words semantically associated with a given word before you run out of lives. Each round gives you 15 seconds and 3 lives. Scoring is based on semantic similarity — closer associations score higher. Post-game insights powered by Claude explain your guesses and suggest stronger alternatives (web only).

## Stack

- **Web** — Next.js, TypeScript, Tailwind CSS, deployed on Vercel
- **Mobile** — React Native (Expo), published via EAS Update
- **Backend** — FastAPI (Python), deployed on Hugging Face Spaces
- **Scoring** — `sentence-transformers` (all-MiniLM-L6-v2) for semantic similarity via cosine distance
- **Insights** — Claude Haiku (Anthropic API) for post-game analysis
- **Word generation** — `wonderwords`
- **Auth & Database** — Supabase (Postgres + Auth + RLS)

## Features

- Web and native mobile apps with shared backend and auth
- Light/dark mode (web)
- Google OAuth and email/password sign in
- Username selection on signup with live availability check
- Persistent stats per game: high score, total games played, average score
- Semantic scoring — answers are judged by meaning, not exact match
- Post-game Claude insights grouped by target word with definitions and stronger alternatives (web only)

## Monorepo Structure

```
web/      Next.js frontend
mobile/   React Native (Expo) app
api/      FastAPI backend
```

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

# Mobile
cd mobile
npm install
npx expo start --ios
```

Set up `web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Set up `mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

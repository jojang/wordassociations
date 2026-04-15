# Wordbook

**Web — [wordbook-seven.vercel.app](https://wordbook-seven.vercel.app)**

**Mobile — open in [Expo Go](https://expo.dev/go):** `exp://u.expo.dev/201d656f-fd88-4bb7-87dc-bda9d9c2b058/group/6b51c18d-5e27-4f92-a317-6f34c9e86349`

A suite of word games with AI-powered scoring, user accounts, and persistent stats — available on web and iOS/Android.

## Games

### Word Associations
Guess words semantically associated with a given word before you run out of lives. Each round gives you 15 seconds and 3 lives. Scoring is based on semantic similarity — closer associations score higher. Post-game insights powered by Claude explain your guesses and suggest stronger alternatives (web only).

Includes an ML calibration layer — see [ML Feedback System](#ml-feedback-system) below.

### Odd One Out
A daily puzzle — identify the odd word out across four sets of four words. One attempt per day.

### Chain Reaction
Build a chain of associated words where each guess must start with the last letter of the previous word.

## ML Feedback System

Word Associations uses a human-in-the-loop calibration model to improve scoring over time.

### The Problem
The base scoring model (`all-MiniLM-L6-v2`) measures semantic similarity via cosine distance and applies a fixed acceptance threshold. Some borderline guesses users consider valid are rejected — the threshold doesn't adapt to how players actually think about word associations.

### How It Works

```
User submits a guess
        │
        ▼
Base embedding model computes similarity score
        │
        ├── score ≥ 0.30 ──► accepted
        │
        └── score < 0.30
                │
                ├── score < 0.20 ──► rejected (too far off, skip calibrator)
                │
                └── 0.20 ≤ score < 0.30
                        │
                        ▼
                Calibration model
                (logistic regression trained on user feedback)
                        │
                        ├── P(accept) ≥ 0.50 ──► override → accepted
                        │
                        └── P(accept) < 0.50 ──► rejected
                                │
                                ▼
                        Shown in End Modal
                        User can thumb-up: "Close enough?"
                                │
                                ▼
                        Stored in word_feedback (Supabase)
```

### Accept Threshold
The calibrator uses the standard default of 0.50 — the model must consider a guess more likely valid than not before overriding the base rejection. Since false negatives (rejecting a valid guess) are more harmful to the player experience than false positives (accepting a weak one), the threshold should be tuned lower as labeled data grows, guided by the precision/recall tradeoff on the held-out validation set.

### Label Trust — Minimum Vote Threshold
A guess only becomes a positive training example once **3 distinct users** have independently thumbed it up. Single-user votes are recorded but not used for training — this prevents individual users from corrupting the model and follows standard human-labeling practices (inter-rater agreement).

### Training Data
- **Positives** — `(target, guess)` pairs confirmed by 3+ distinct users
- **Negatives** — pairs with similarity < 0.10 (objectively unrelated, safe to auto-label)
- **Class balancing** — negatives are downsampled to match positive count, preventing the model from collapsing to the majority class

### Retraining
```bash
cd api
PYTHONPATH=. python3 ml/train.py    # train and save model.pkl
PYTHONPATH=. python3 ml/evaluate.py # precision / recall / AUC on held-out val set
```
The API loads `ml/model.pkl` at startup if present. Without it, scoring falls back to the base threshold only — no breaking changes.

## Stack

- **Web** — Next.js, TypeScript, Tailwind CSS, deployed on Vercel
- **Mobile** — React Native (Expo), published via EAS Update
- **Backend** — FastAPI (Python), deployed on Hugging Face Spaces
- **Scoring** — `sentence-transformers` (all-MiniLM-L6-v2) for semantic similarity via cosine distance
- **ML calibration** — logistic regression (`scikit-learn`) trained on user feedback (Word Associations only)
- **Insights** — Claude Haiku (Anthropic API) for post-game analysis (Word Associations only)
- **Word generation** — `wonderwords`
- **Auth & Database** — Supabase (Postgres + Auth + RLS)

## Features

- Web and native mobile apps with shared backend and auth
- Light/dark mode (web)
- Google OAuth and email/password sign in
- Username selection on signup with live availability check
- Persistent stats per game: high score, total games played, average score
- Semantic scoring — answers are judged by meaning, not exact match
- ML calibration layer that learns from player feedback to improve borderline scoring decisions (Word Associations)
- Post-game Claude insights with definitions and stronger alternatives (Word Associations, web only)

## Monorepo Structure

```
web/      Next.js frontend
mobile/   React Native (Expo) app
api/      FastAPI backend
api/ml/   Training pipeline (data, features, train, evaluate)
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

Set up `api/.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

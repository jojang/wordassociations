import os
import json
import anthropic
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.supabase import get_supabase

router = APIRouter()


def get_today_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def generate_puzzles_with_claude() -> list:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    prompt = (
        "Generate 5 'odd one out' puzzles in the style of NYT Connections — the puzzle that famously rewards lateral thinking over trivia.\n\n"
        "Each puzzle: 4 words, 3 share a hidden connection, 1 does not. The connection should require thought, not just recall.\n\n"
        "Difficulty must increase across the 5 puzzles:\n"
        "1. Easy — direct but satisfying (e.g. STRIKE, SPARE, GUTTER, ALLEY — category: BOWLING TERMS, but ALLEY is the odd one out since it has other meanings)\n"
        "2. Medium — less obvious, rewards pattern recognition\n"
        "3. Medium-Hard — wordplay, double meanings, or a twist (e.g. words that can all precede or follow a specific word)\n"
        "4. Hard — deliberately misleading; the obvious grouping is a red herring\n"
        "5. Very Hard — requires a surprising or non-obvious insight; the connection is specific and unexpected\n\n"
        "Techniques to use (especially for harder puzzles):\n"
        "- '___ WORD' or 'WORD ___' patterns (e.g. FIRE___, ___HOUSE)\n"
        "- Words with double meanings where the less obvious meaning is the link\n"
        "- Red herrings — include words that seem related but aren't (makes the odd one out surprising)\n"
        "- Pop culture, idioms, or cultural references\n"
        "- Homophones or wordplay\n\n"
        "Rules:\n"
        "- All words UPPERCASE\n"
        "- 'category' is a short punchy label for what the 3 connected words share — like NYT category names\n"
        "- The odd one out must be clearly wrong once the category is known, but not obvious before\n"
        "- Avoid purely factual 'types of X' categories — aim for connections that make the solver go 'aha!'\n\n"
        "Return ONLY valid JSON, no markdown:\n"
        '{"sets": [{"words": ["A","B","C","D"], "odd_one_out": "D", "category": "LABEL"}, ...]}'
    )

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    data = json.loads(text)
    return data["sets"]


@router.get("/daily")
def get_daily_puzzle():
    today = get_today_utc()
    sb = get_supabase()

    result = (
        sb.from_("odd_one_out_puzzles")
        .select("sets")
        .eq("date", today)
        .maybe_single()
        .execute()
    )

    if result and result.data:
        return {"date": today, "sets": result.data["sets"]}

    sets = generate_puzzles_with_claude()

    sb.from_("odd_one_out_puzzles").upsert(
        {"date": today, "sets": sets}, on_conflict="date"
    ).execute()

    return {"date": today, "sets": sets}


@router.get("/stats/{user_id}")
def get_stats(user_id: str):
    sb = get_supabase()
    result = (
        sb.from_("odd_one_out_stats")
        .select("total_games, distribution, last_played_date, last_score")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    if not result or not result.data:
        return {"stats": None}
    return {"stats": result.data}


class CompleteRequest(BaseModel):
    user_id: str
    score: int
    date: str


@router.post("/complete")
def complete_game(body: CompleteRequest):
    if not 0 <= body.score <= 5:
        raise HTTPException(status_code=400, detail="Score must be 0–5")

    sb = get_supabase()
    existing = (
        sb.from_("odd_one_out_stats")
        .select("total_games, distribution")
        .eq("user_id", body.user_id)
        .maybe_single()
        .execute()
    )

    data = (existing.data if existing else None) or {}

    # Idempotent: don't double-count if already recorded for today
    if data.get("last_played_date") == body.date:
        return {"stats": data}

    total_games = (data.get("total_games") or 0) + 1
    distribution = data.get("distribution") or [0, 0, 0, 0, 0, 0]
    distribution[body.score] += 1

    sb.from_("odd_one_out_stats").upsert(
        {
            "user_id": body.user_id,
            "total_games": total_games,
            "distribution": distribution,
            "last_played_date": body.date,
            "last_score": body.score,
        },
        on_conflict="user_id",
    ).execute()

    return {
        "stats": {
            "total_games": total_games,
            "distribution": distribution,
            "last_played_date": body.date,
            "last_score": body.score,
        }
    }

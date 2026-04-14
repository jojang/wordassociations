from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from sentence_transformers import util
from wonderwords import RandomWord
from lib.supabase import get_supabase

router = APIRouter()

SIMILARITY_THRESHOLD = 0.30
_random_word = RandomWord()


class ChainScoreRequest(BaseModel):
    current_word: str
    guess: str


class CompleteRequest(BaseModel):
    user_id: str
    score: float
    chain_length: int


@router.get("/word")
def generate_word():
    word = _random_word.word(
        include_parts_of_speech=["nouns"],
        word_min_length=4,
        word_max_length=8,
    )
    return {"word": word}


@router.post("/score")
async def score_chain(request: Request, body: ChainScoreRequest):
    model = request.app.state.model
    current = body.current_word.strip().lower()
    guess = body.guess.strip().lower()

    if not guess or not current:
        return {"correct": False, "score": 0, "reason": "invalid"}

    # Letter chain check
    if guess[0] != current[-1]:
        return {"correct": False, "score": 0, "reason": "bad_letter"}

    # Association check
    embeddings = model.encode([current, guess])
    similarity = float(util.cos_sim(embeddings[0], embeddings[1]))
    correct = similarity >= SIMILARITY_THRESHOLD
    score = round(similarity * 10000) if correct else 0

    return {
        "correct": correct,
        "score": score,
        "similarity": round(similarity, 4),
        "reason": "correct" if correct else "not_associated",
    }


@router.get("/stats/{user_id}")
def get_stats(user_id: str):
    sb = get_supabase()
    result = (
        sb.from_("chain_reaction_stats")
        .select("high_score, total_games, avg_score, longest_chain")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not result or not result.data:
        return {"stats": None}
    return {"stats": result.data}


@router.post("/complete")
def complete_game(body: CompleteRequest):
    if body.score < 0 or body.chain_length < 0:
        raise HTTPException(status_code=400, detail="Invalid score or chain length")

    sb = get_supabase()
    existing = (
        sb.from_("chain_reaction_stats")
        .select("high_score, total_games, avg_score, longest_chain")
        .eq("user_id", body.user_id)
        .maybe_single()
        .execute()
    )

    data = (existing.data if existing else None) or {}
    total_games = (data.get("total_games") or 0) + 1
    high_score = max(data.get("high_score") or 0, body.score)
    longest_chain = max(data.get("longest_chain") or 0, body.chain_length)
    prev_avg = data.get("avg_score") or 0
    prev_total = (data.get("total_games") or 0)
    avg_score = round(((prev_avg * prev_total) + body.score) / total_games, 2)

    sb.from_("chain_reaction_stats").upsert(
        {
            "user_id": body.user_id,
            "high_score": high_score,
            "total_games": total_games,
            "avg_score": avg_score,
            "longest_chain": longest_chain,
        },
        on_conflict="user_id",
    ).execute()

    return {
        "stats": {
            "high_score": high_score,
            "total_games": total_games,
            "avg_score": avg_score,
            "longest_chain": longest_chain,
        }
    }

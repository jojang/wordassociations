from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.supabase import get_supabase

router = APIRouter()


class ProfileRequest(BaseModel):
    user_id: str
    display_name: str


class StatsRequest(BaseModel):
    user_id: str
    game: str
    score: int


@router.get("/profile/{user_id}")
def get_profile(user_id: str):
    sb = get_supabase()
    result = sb.from_("profiles").select("display_name").eq("id", user_id).maybe_single().execute()
    return {"display_name": result.data.get("display_name") if result and result.data else None}


@router.post("/profile")
def upsert_profile(body: ProfileRequest):
    sb = get_supabase()
    sb.from_("profiles").upsert({"id": body.user_id, "display_name": body.display_name}).execute()
    return {"ok": True}


@router.get("/username-available")
def username_available(username: str):
    sb = get_supabase()
    result = sb.from_("profiles").select("id").eq("display_name", username.strip()).maybe_single().execute()
    return {"available": result is None or result.data is None}


@router.get("/email")
def get_email_by_username(username: str):
    sb = get_supabase()
    result = sb.rpc("get_email_by_username", {"p_username": username}).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Username not found")
    return {"email": result.data}


@router.get("/stats/{user_id}")
def get_stats(user_id: str, game: str):
    sb = get_supabase()
    result = (
        sb.from_("user_stats")
        .select("total_games, high_score, avg_score")
        .eq("user_id", user_id)
        .eq("game", game)
        .maybe_single()
        .execute()
    )
    if not result or not result.data:
        return {"stats": None}
    return {"stats": result.data}


@router.post("/stats")
def save_stats(body: StatsRequest):
    sb = get_supabase()
    existing = (
        sb.from_("user_stats")
        .select("total_games, high_score, avg_score")
        .eq("user_id", body.user_id)
        .eq("game", body.game)
        .maybe_single()
        .execute()
    )
    data = (existing.data if existing else None) or {}
    total_games = (data.get("total_games") or 0) + 1
    high_score = max(data.get("high_score") or 0, body.score)
    avg_score = round(((data.get("avg_score") or 0) * (data.get("total_games") or 0) + body.score) / total_games)

    sb.from_("user_stats").upsert(
        {
            "user_id": body.user_id,
            "game": body.game,
            "total_games": total_games,
            "high_score": high_score,
            "avg_score": avg_score,
        },
        on_conflict="user_id,game",
    ).execute()

    return {"stats": {"total_games": total_games, "high_score": high_score, "avg_score": avg_score}}

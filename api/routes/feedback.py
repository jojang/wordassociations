from fastapi import APIRouter, Request
from pydantic import BaseModel
from lib.supabase import get_supabase

router = APIRouter()


class FeedbackBody(BaseModel):
    user_id: str
    target_word: str
    guess_word: str
    similarity_score: float
    model_decision: str   # 'accepted' or 'rejected'
    user_label: bool      # True = thumbs up (should have counted)
    model_version: str    # 'v0' until first trained model


@router.post("")
async def submit_feedback(body: FeedbackBody):
    """
    Store one piece of user feedback on a rejected word guess.
    user_label=True means the user thought the guess should have been accepted.
    This data becomes the positive training examples for the calibration model.
    """
    sb = get_supabase()
    sb.table("word_feedback").insert({
        "user_id": body.user_id,
        "target_word": body.target_word,
        "guess_word": body.guess_word,
        "similarity_score": body.similarity_score,
        "model_decision": body.model_decision,
        "user_label": body.user_label,
        "model_version": body.model_version,
        "model_confidence": None,  # populated once calibration model is trained
    }).execute()

    return {"status": "ok"}

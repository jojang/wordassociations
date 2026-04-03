from fastapi import APIRouter, Request
from pydantic import BaseModel
from sentence_transformers import util
from wonderwords import RandomWord

router = APIRouter()

SIMILARITY_THRESHOLD = 0.30

_random_word = RandomWord()


class ScoreRequest(BaseModel):
    word: str
    guess: str


@router.get("/generate")
def generate_word():
    word = _random_word.word(
        include_parts_of_speech=["nouns"],
        word_min_length=4,
        word_max_length=10,
    )
    return {"word": word}


@router.post("/score")
async def score_guess(request: Request, body: ScoreRequest):
    model = request.app.state.model
    word = body.word.strip().lower()
    guess = body.guess.strip().lower()

    embeddings = model.encode([word, guess])
    similarity = float(util.cos_sim(embeddings[0], embeddings[1]))
    correct = similarity >= SIMILARITY_THRESHOLD
    score = round(similarity * 10000) if correct else 0

    return {
        "correct": correct,
        "score": score,
        "similarity": round(similarity, 4),
    }

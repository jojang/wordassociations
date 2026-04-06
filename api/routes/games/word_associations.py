import os
import json
import anthropic
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


class FailedWord(BaseModel):
    word: str
    wrong_guesses: list[str]


class InsightRequest(BaseModel):
    failed_words: list[FailedWord]


@router.get("/word")
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


@router.post("/insights")
async def get_insights(body: InsightRequest):
    if not body.failed_words:
        return {"insights": []}

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    entries = []
    for fw in body.failed_words:
        if fw.wrong_guesses:
            entries.append(f'Word: "{fw.word}", wrong guesses: {", ".join(fw.wrong_guesses)}')

    if not entries:
        return {"insights": []}

    prompt = (
        "A player guessed words in a word association game but scored low on semantic similarity. "
        "Scoring favors direct, everyday associations. "
        "Use your knowledge of each target word's meaning when evaluating guesses and alternatives. "
        "If a target word is uncommon or technical, include a short definition (max 8 words) in the 'definition' field so the player understands what it means. Leave 'definition' as an empty string for common everyday words.\n\n"
        "Here are the target words and wrong guesses:\n"
        + "\n".join(entries)
        + "\n\nFor each target word, group all its guesses and:\n"
        "1. For each guess: one short phrase only (max 5 words). Use noun phrases only — no verbs "
        "like 'is' or 'this'. Vary the reasoning across guesses; avoid repeating the same label. "
        "Be specific and descriptive — avoid vague phrases like 'weak connection'. "
        "Prefer softer phrasing: e.g. 'loosely related', 'situational link', 'too broad', "
        "'indirect path', 'uncommon pairing'.\n"
        "2. Suggest 2–3 single words commonly and directly associated with the target in everyday usage.\n\n"
        "Reply as a JSON array only, one object per target word: "
        '[{"word": "target", "definition": "short definition or empty string", "guesses": [{"guess": "guess", "insight": "reason"}], "alternatives": ["word1", "word2"]}]'
    )

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    if not text:
        return {"insights": []}

    insights = json.loads(text)
    return {"insights": insights}

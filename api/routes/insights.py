import os
import json
import anthropic
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class FailedWord(BaseModel):
    word: str
    wrong_guesses: list[str]


class InsightRequest(BaseModel):
    failed_words: list[FailedWord]


@router.post("/")
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
        "A player was guessing words semantically associated with target words and failed on these:\n"
        + "\n".join(entries)
        + "\n\nFor each wrong guess, give one short sentence (max 12 words) explaining why it didn't score — "
        "focus on the semantic gap. Reply as a JSON array only: "
        '[{"word": "target", "guess": "guess", "insight": "reason"}]'
    )

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    if not text:
        return {"insights": []}

    insights = json.loads(text)
    return {"insights": insights}

import os
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = "twinword-word-associations-v1.p.rapidapi.com"


@router.get("/associations")
async def get_associations(entry: str):
    if not RAPIDAPI_KEY:
        raise HTTPException(status_code=500, detail="RAPIDAPI_KEY not configured")

    url = f"https://{RAPIDAPI_HOST}/associations/"
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params={"entry": entry})
        response.raise_for_status()
        return response.json()

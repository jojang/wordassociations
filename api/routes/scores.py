from fastapi import APIRouter

router = APIRouter()


# Placeholder — will be wired to Supabase when auth is added
@router.get("/")
async def get_scores():
    return {"scores": []}

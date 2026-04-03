from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import word_associations, scores

app = FastAPI(title="Word Games API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(word_associations.router, prefix="/api/word-associations", tags=["word-associations"])
app.include_router(scores.router, prefix="/api/scores", tags=["scores"])


@app.get("/")
def root():
    return {"status": "ok"}

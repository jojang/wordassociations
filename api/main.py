from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer

from routes import words, scores


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading embedding model...")
    app.state.model = SentenceTransformer("all-MiniLM-L6-v2")
    print("Model ready.")
    yield


app = FastAPI(title="Word Games API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(words.router, prefix="/api/words", tags=["words"])
app.include_router(scores.router, prefix="/api/scores", tags=["scores"])


@app.get("/")
def root():
    return {"status": "ok"}

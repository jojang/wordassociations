import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer

from routes.games import word_associations, odd_one_out, chain_reaction
from routes import users, feedback


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading embedding model...")
    app.state.model = SentenceTransformer("all-MiniLM-L6-v2")
    print("Model ready.")
    yield


app = FastAPI(title="Word Games API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", os.getenv("FRONTEND_URL", "")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(word_associations.router, prefix="/api/games/word-associations", tags=["word-associations"])
app.include_router(odd_one_out.router, prefix="/api/games/odd-one-out", tags=["odd-one-out"])
app.include_router(chain_reaction.router, prefix="/api/games/chain-reaction", tags=["chain-reaction"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["feedback"])


@app.get("/")
def root():
    return {"status": "ok"}

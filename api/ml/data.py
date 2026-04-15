"""
Pull labeled feedback from Supabase and build a training dataset.

Positives:  (target_word, guess_word) pairs that at least MIN_VOTES distinct
            users have thumbed up. Requiring multiple independent votes before
            trusting a label is standard practice — one user's opinion is a
            signal, N users agreeing is a label you can train on.

Negatives:  rows where similarity_score < 0.10 (objectively unrelated — safe
            to treat as automatic negatives regardless of missing user label)

We intentionally ignore rows where user_label is False/null and similarity
is above 0.10 — those are ambiguous due to selection bias (user may not have
bothered rating, not necessarily agreeing with the rejection).
"""

import random
from collections import defaultdict
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from lib.supabase import get_supabase

# Minimum number of distinct users who must thumb-up a (target, guess) pair
# before it's trusted as a positive training example.
MIN_VOTES = 1


def _aggregate_positives(rows: list[dict]) -> list[dict]:
    """
    Group thumbed-up rows by (target_word, guess_word).
    Return one representative row per pair that received MIN_VOTES+ distinct votes.
    The representative row uses the mean similarity score across all votes.
    """
    votes: dict[tuple, list[dict]] = defaultdict(list)
    for r in rows:
        if r.get("user_label") is True:
            key = (r["target_word"], r["guess_word"])
            votes[key].append(r)

    positives = []
    for (target, guess), vote_rows in votes.items():
        distinct_users = {r["user_id"] for r in vote_rows}
        if len(distinct_users) >= MIN_VOTES:
            avg_similarity = sum(r["similarity_score"] for r in vote_rows) / len(vote_rows)
            representative = {**vote_rows[0], "similarity_score": avg_similarity}
            positives.append(representative)

    return positives


def load_dataset(neg_similarity_cutoff: float = 0.10, random_seed: int = 42):
    """
    Returns (X, y) where:
      X — list of dicts with raw fields (target_word, guess_word, similarity_score, ...)
      y — list of int labels (1 = should be accepted, 0 = genuinely wrong)
    """
    sb = get_supabase()
    rows = sb.table("word_feedback").select("*").execute().data

    positives = _aggregate_positives(rows)
    negatives = [r for r in rows if r.get("similarity_score", 1.0) < neg_similarity_cutoff
                 and r.get("user_label") is not True]

    # Balance classes — sample negatives down to match positive count
    random.seed(random_seed)
    if len(negatives) > len(positives):
        negatives = random.sample(negatives, len(positives))

    X = positives + negatives
    y = [1] * len(positives) + [0] * len(negatives)

    return X, y


def train_val_split(X, y, val_fraction: float = 0.2, random_seed: int = 42):
    """Shuffle and split into train / val sets."""
    random.seed(random_seed)
    combined = list(zip(X, y))
    random.shuffle(combined)
    split = int(len(combined) * (1 - val_fraction))
    train = combined[:split]
    val = combined[split:]
    X_train, y_train = zip(*train) if train else ([], [])
    X_val, y_val = zip(*val) if val else ([], [])
    return list(X_train), list(y_train), list(X_val), list(y_val)


if __name__ == "__main__":
    X, y = load_dataset()
    print(f"Total samples: {len(X)}  |  Positives: {sum(y)}  |  Negatives: {len(y) - sum(y)}")
    X_train, y_train, X_val, y_val = train_val_split(X, y)
    print(f"Train: {len(X_train)}  |  Val: {len(X_val)}")

"""
Train a logistic regression calibrator on top of the base embedding similarity.

Run from the api/ directory:
    PYTHONPATH=. python3 ml/train.py

Saves the fitted model to ml/model.pkl.
At startup the API will load this file if it exists and use it to re-score
guesses that the base model would otherwise reject near the threshold.
"""

import pickle
from pathlib import Path

from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from ml.data import load_dataset, train_val_split
from ml.features import extract, FEATURE_NAMES

MODEL_PATH = Path(__file__).parent / "model.pkl"


def build_feature_matrix(rows):
    return [extract(r) for r in rows]


def train():
    X_raw, y = load_dataset()

    if len(X_raw) < 10:
        print(f"Only {len(X_raw)} samples — need more feedback before training. Exiting.")
        return

    X_train_raw, y_train, X_val_raw, y_val = train_val_split(X_raw, y)

    X_train = build_feature_matrix(X_train_raw)
    X_val = build_feature_matrix(X_val_raw)

    # StandardScaler normalises features so LR treats them equally.
    # Pipeline keeps scaler + model together so inference is one call.
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
    ])

    pipeline.fit(X_train, y_train)

    train_acc = pipeline.score(X_train, y_train)
    val_acc = pipeline.score(X_val, y_val) if X_val else float("nan")

    print(f"Train acc: {train_acc:.3f}  |  Val acc: {val_acc:.3f}")
    print(f"Features: {FEATURE_NAMES}")

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline, f)

    print(f"Model saved → {MODEL_PATH}")


if __name__ == "__main__":
    train()

"""
Evaluate the trained calibration model on the held-out validation set.

Run from the api/ directory:
    PYTHONPATH=. python3 ml/evaluate.py

Prints precision, recall, F1, and AUC-ROC.
Use this after retraining to confirm the new model is an improvement.
"""

import pickle
from pathlib import Path

from sklearn.metrics import classification_report, roc_auc_score

from ml.data import load_dataset, train_val_split
from ml.features import extract

MODEL_PATH = Path(__file__).parent / "model.pkl"


def evaluate():
    if not MODEL_PATH.exists():
        print("No model found. Run ml/train.py first.")
        return

    with open(MODEL_PATH, "rb") as f:
        pipeline = pickle.load(f)

    X_raw, y = load_dataset()
    _, _, X_val_raw, y_val = train_val_split(X_raw, y)

    if not X_val_raw:
        print("No validation samples available.")
        return

    X_val = [extract(r) for r in X_val_raw]
    y_pred = pipeline.predict(X_val)
    y_proba = pipeline.predict_proba(X_val)[:, 1]

    print(classification_report(y_val, y_pred, target_names=["negative", "positive"]))
    auc = roc_auc_score(y_val, y_proba)
    print(f"AUC-ROC: {auc:.3f}")


if __name__ == "__main__":
    evaluate()

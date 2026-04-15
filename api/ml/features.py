"""
Feature engineering for the calibration classifier.

Single feature: similarity_score from the base embedding model.
The calibrator's job is to learn the threshold that best matches
user acceptance patterns — similarity is the only signal needed for that.
"""


def extract(row: dict) -> list[float]:
    """
    Given a word_feedback row (or any dict with the same keys),
    return a feature vector as a list of floats.
    """
    return [float(row["similarity_score"])]


FEATURE_NAMES = ["similarity_score"]

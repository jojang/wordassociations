"""
Unit tests for the scoring logic in word_associations.py.

We test the route handler directly (no HTTP layer) by mocking:
  - request.app.state.model  — the sentence transformer
  - request.app.state.calibrator — the ML calibrator (present or None)
  - util.cos_sim             — returns a controlled similarity value

This keeps tests fast (no model loading) and focused on the decision logic:
threshold, gray zone, calibrator override, score calculation.
"""

import asyncio
from unittest.mock import MagicMock, patch

import pytest

from routes.games.word_associations import (
    ScoreRequest,
    score_guess,
    SIMILARITY_THRESHOLD,
    CALIBRATOR_FLOOR,
    CALIBRATOR_ACCEPT_THRESHOLD,
)


def make_request(calibrator=None):
    """Build a mock FastAPI Request with controllable app state."""
    mock_request = MagicMock()
    mock_request.app.state.model.encode.return_value = [MagicMock(), MagicMock()]
    mock_request.app.state.calibrator = calibrator
    return mock_request


def run_score(similarity: float, calibrator=None) -> dict:
    """Helper — patch cos_sim and run score_guess, return the response dict."""
    with patch("routes.games.word_associations.util.cos_sim", return_value=similarity):
        request = make_request(calibrator=calibrator)
        body = ScoreRequest(word="ocean", guess="tide")
        return asyncio.run(score_guess(request, body))


# ─── Base threshold ───────────────────────────────────────────────────────────

def test_above_threshold_accepted():
    result = run_score(SIMILARITY_THRESHOLD + 0.01)
    assert result["correct"] is True


def test_at_threshold_accepted():
    result = run_score(SIMILARITY_THRESHOLD)
    assert result["correct"] is True


def test_below_threshold_rejected():
    result = run_score(SIMILARITY_THRESHOLD - 0.01)
    assert result["correct"] is False


# ─── Calibrator floor ─────────────────────────────────────────────────────────

def test_below_floor_rejected_without_calibrator():
    result = run_score(CALIBRATOR_FLOOR - 0.01)
    assert result["correct"] is False


def test_below_floor_calibrator_never_called():
    mock_calibrator = MagicMock()
    run_score(CALIBRATOR_FLOOR - 0.01, calibrator=mock_calibrator)
    mock_calibrator.predict_proba.assert_not_called()


# ─── Gray zone — no calibrator ───────────────────────────────────────────────

def test_gray_zone_no_calibrator_rejected():
    similarity = (CALIBRATOR_FLOOR + SIMILARITY_THRESHOLD) / 2
    result = run_score(similarity, calibrator=None)
    assert result["correct"] is False


# ─── Gray zone — calibrator present ──────────────────────────────────────────

def test_gray_zone_calibrator_accepts():
    similarity = (CALIBRATOR_FLOOR + SIMILARITY_THRESHOLD) / 2
    mock_calibrator = MagicMock()
    mock_calibrator.predict_proba.return_value = [[1 - CALIBRATOR_ACCEPT_THRESHOLD - 0.1,
                                                    CALIBRATOR_ACCEPT_THRESHOLD + 0.1]]
    result = run_score(similarity, calibrator=mock_calibrator)
    assert result["correct"] is True


def test_gray_zone_calibrator_rejects():
    similarity = (CALIBRATOR_FLOOR + SIMILARITY_THRESHOLD) / 2
    mock_calibrator = MagicMock()
    mock_calibrator.predict_proba.return_value = [[1 - CALIBRATOR_ACCEPT_THRESHOLD + 0.1,
                                                    CALIBRATOR_ACCEPT_THRESHOLD - 0.1]]
    result = run_score(similarity, calibrator=mock_calibrator)
    assert result["correct"] is False


def test_gray_zone_calibrator_called_once():
    similarity = (CALIBRATOR_FLOOR + SIMILARITY_THRESHOLD) / 2
    mock_calibrator = MagicMock()
    mock_calibrator.predict_proba.return_value = [[0.6, 0.4]]
    run_score(similarity, calibrator=mock_calibrator)
    mock_calibrator.predict_proba.assert_called_once()


# ─── Score calculation ────────────────────────────────────────────────────────

def test_correct_score_is_similarity_times_10000():
    similarity = SIMILARITY_THRESHOLD + 0.05
    result = run_score(similarity)
    assert result["score"] == round(similarity * 10000)


def test_incorrect_score_is_zero():
    result = run_score(CALIBRATOR_FLOOR - 0.01)
    assert result["score"] == 0


def test_similarity_returned_rounded_to_4dp():
    result = run_score(0.123456789)
    assert result["similarity"] == round(0.123456789, 4)

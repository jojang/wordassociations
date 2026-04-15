import asyncio
from unittest.mock import patch, MagicMock
import pytest

from routes.games.chain_reaction import (
    score_chain,
    get_stats,
    complete_game,
    ChainScoreRequest,
    CompleteRequest,
    SIMILARITY_THRESHOLD,
)


def run_score(current_word, guess, similarity=None, mock_request=None):
    if mock_request is None:
        mock_request = MagicMock()
        mock_request.app.state.model.encode.return_value = [MagicMock(), MagicMock()]
    body = ChainScoreRequest(current_word=current_word, guess=guess)
    sim_value = similarity if similarity is not None else SIMILARITY_THRESHOLD + 0.05
    with patch("routes.games.chain_reaction.util.cos_sim", return_value=sim_value):
        return asyncio.run(score_chain(mock_request, body))


# ─── score_chain — letter rule ────────────────────────────────────────────────

def test_bad_letter_rejected():
    # "ocean" ends in "n", guess starts with "s" — bad letter
    result = run_score("ocean", "sea")
    assert result["correct"] is False
    assert result["reason"] == "bad_letter"


def test_correct_letter_passes_to_association_check():
    # "ocean" ends in "n", guess starts with "n" — correct letter, high similarity
    result = run_score("ocean", "nature", similarity=SIMILARITY_THRESHOLD + 0.05)
    assert result["reason"] in ("correct", "not_associated")


def test_empty_guess_invalid():
    result = run_score("ocean", "")
    assert result["correct"] is False
    assert result["reason"] == "invalid"


# ─── score_chain — association check ─────────────────────────────────────────

def test_associated_word_accepted():
    # ends in "n", starts with "n", high similarity
    result = run_score("ocean", "nature", similarity=SIMILARITY_THRESHOLD + 0.05)
    assert result["correct"] is True
    assert result["reason"] == "correct"


def test_not_associated_rejected():
    result = run_score("ocean", "night", similarity=SIMILARITY_THRESHOLD - 0.05)
    assert result["correct"] is False
    assert result["reason"] == "not_associated"


def test_score_is_zero_when_wrong():
    result = run_score("ocean", "night", similarity=SIMILARITY_THRESHOLD - 0.05)
    assert result["score"] == 0


def test_score_calculated_when_correct():
    sim = SIMILARITY_THRESHOLD + 0.05
    result = run_score("ocean", "nature", similarity=sim)
    assert result["score"] == round(sim * 10000)


# ─── get_stats ────────────────────────────────────────────────────────────────

def test_get_stats_returns_stats(mock_sb):
    stats = {"high_score": 500, "total_games": 3, "avg_score": 300, "longest_chain": 7}
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=stats)
    with patch("routes.games.chain_reaction.get_supabase", return_value=mock_sb):
        result = get_stats("user_1")
    assert result == {"stats": stats}


def test_get_stats_returns_null_when_no_data(mock_sb):
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=None)
    with patch("routes.games.chain_reaction.get_supabase", return_value=mock_sb):
        result = get_stats("user_1")
    assert result == {"stats": None}


# ─── complete_game ────────────────────────────────────────────────────────────

def test_complete_first_game(mock_sb):
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=None)
    with patch("routes.games.chain_reaction.get_supabase", return_value=mock_sb):
        result = complete_game(CompleteRequest(user_id="user_1", score=200, chain_length=5))
    stats = result["stats"]
    assert stats["total_games"] == 1
    assert stats["high_score"] == 200
    assert stats["longest_chain"] == 5


def test_complete_updates_high_score(mock_sb):
    existing = {"high_score": 100, "total_games": 1, "avg_score": 100, "longest_chain": 3}
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=existing)
    with patch("routes.games.chain_reaction.get_supabase", return_value=mock_sb):
        result = complete_game(CompleteRequest(user_id="user_1", score=300, chain_length=3))
    assert result["stats"]["high_score"] == 300


def test_complete_keeps_existing_high_score(mock_sb):
    existing = {"high_score": 500, "total_games": 1, "avg_score": 500, "longest_chain": 10}
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=existing)
    with patch("routes.games.chain_reaction.get_supabase", return_value=mock_sb):
        result = complete_game(CompleteRequest(user_id="user_1", score=100, chain_length=3))
    assert result["stats"]["high_score"] == 500


def test_complete_updates_longest_chain(mock_sb):
    existing = {"high_score": 100, "total_games": 1, "avg_score": 100, "longest_chain": 3}
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=existing)
    with patch("routes.games.chain_reaction.get_supabase", return_value=mock_sb):
        result = complete_game(CompleteRequest(user_id="user_1", score=100, chain_length=10))
    assert result["stats"]["longest_chain"] == 10


def test_complete_invalid_score_raises(mock_sb):
    from fastapi import HTTPException
    with patch("routes.games.chain_reaction.get_supabase", return_value=mock_sb):
        with pytest.raises(HTTPException):
            complete_game(CompleteRequest(user_id="user_1", score=-1, chain_length=3))

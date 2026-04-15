import pytest
from unittest.mock import patch, MagicMock

from routes.games.odd_one_out import (
    get_daily_puzzle,
    get_stats,
    complete_game,
    CompleteRequest,
)

SAMPLE_SETS = [
    {"words": ["A", "B", "C", "D"], "odd_one_out": "D", "category": "TEST"}
]


# ─── get_daily_puzzle ─────────────────────────────────────────────────────────

def test_daily_puzzle_returns_cached(mock_sb):
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(
        data={"sets": SAMPLE_SETS}
    )
    with patch("routes.games.odd_one_out.get_supabase", return_value=mock_sb):
        result = get_daily_puzzle()
    assert result["sets"] == SAMPLE_SETS


def test_daily_puzzle_generates_when_not_cached(mock_sb):
    # First call (cache miss), second call (upsert)
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=None)
    with patch("routes.games.odd_one_out.get_supabase", return_value=mock_sb):
        with patch("routes.games.odd_one_out.generate_puzzles_with_claude", return_value=SAMPLE_SETS):
            result = get_daily_puzzle()
    assert result["sets"] == SAMPLE_SETS


def test_daily_puzzle_upserts_when_generated(mock_sb):
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=None)
    with patch("routes.games.odd_one_out.get_supabase", return_value=mock_sb):
        with patch("routes.games.odd_one_out.generate_puzzles_with_claude", return_value=SAMPLE_SETS):
            get_daily_puzzle()
    mock_sb.from_().upsert.assert_called_once()


# ─── get_stats ────────────────────────────────────────────────────────────────

def test_get_stats_returns_stats(mock_sb):
    stats = {"total_games": 3, "distribution": [0, 1, 1, 1, 0, 0], "last_played_date": "2026-04-15", "last_score": 3}
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=stats)
    with patch("routes.games.odd_one_out.get_supabase", return_value=mock_sb):
        result = get_stats("user_1")
    assert result == {"stats": stats}


def test_get_stats_returns_null_when_no_data(mock_sb):
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=None)
    with patch("routes.games.odd_one_out.get_supabase", return_value=mock_sb):
        result = get_stats("user_1")
    assert result == {"stats": None}


# ─── complete_game ────────────────────────────────────────────────────────────

def test_complete_first_game(mock_sb):
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=None)
    with patch("routes.games.odd_one_out.get_supabase", return_value=mock_sb):
        result = complete_game(CompleteRequest(user_id="user_1", score=3, date="2026-04-15"))
    stats = result["stats"]
    assert stats["total_games"] == 1
    assert stats["last_score"] == 3
    assert stats["distribution"][3] == 1


def test_complete_idempotent_same_date(mock_sb):
    existing = {
        "total_games": 1,
        "distribution": [0, 0, 0, 1, 0, 0],
        "last_played_date": "2026-04-15",
        "last_score": 3,
    }
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=existing)
    with patch("routes.games.odd_one_out.get_supabase", return_value=mock_sb):
        result = complete_game(CompleteRequest(user_id="user_1", score=5, date="2026-04-15"))
    # should return existing data unchanged, not increment
    assert result["stats"]["total_games"] == 1


def test_complete_invalid_score_raises(mock_sb):
    from fastapi import HTTPException
    with patch("routes.games.odd_one_out.get_supabase", return_value=mock_sb):
        with pytest.raises(HTTPException):
            complete_game(CompleteRequest(user_id="user_1", score=6, date="2026-04-15"))


def test_complete_distribution_incremented(mock_sb):
    existing = {
        "total_games": 1,
        "distribution": [0, 0, 0, 1, 0, 0],
        "last_played_date": "2026-04-14",
        "last_score": 3,
    }
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=existing)
    with patch("routes.games.odd_one_out.get_supabase", return_value=mock_sb):
        result = complete_game(CompleteRequest(user_id="user_1", score=5, date="2026-04-15"))
    assert result["stats"]["distribution"][5] == 1
    assert result["stats"]["total_games"] == 2

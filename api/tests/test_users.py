import pytest
from unittest.mock import patch, MagicMock

from routes.users import (
    get_profile,
    upsert_profile,
    username_available,
    get_stats,
    save_stats,
    ProfileRequest,
    StatsRequest,
)


# ─── get_profile ──────────────────────────────────────────────────────────────

def test_get_profile_returns_display_name(mock_sb):
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data={"display_name": "jo"})
    with patch("routes.users.get_supabase", return_value=mock_sb):
        result = get_profile("user_1")
    assert result == {"display_name": "jo"}


def test_get_profile_returns_null_when_not_found(mock_sb):
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=None)
    with patch("routes.users.get_supabase", return_value=mock_sb):
        result = get_profile("user_1")
    assert result == {"display_name": None}


# ─── upsert_profile ───────────────────────────────────────────────────────────

def test_upsert_profile_returns_ok(mock_sb):
    with patch("routes.users.get_supabase", return_value=mock_sb):
        result = upsert_profile(ProfileRequest(user_id="user_1", display_name="jo"))
    assert result == {"ok": True}


def test_upsert_profile_calls_upsert(mock_sb):
    with patch("routes.users.get_supabase", return_value=mock_sb):
        upsert_profile(ProfileRequest(user_id="user_1", display_name="jo"))
    mock_sb.from_().upsert.assert_called_once()


# ─── username_available ───────────────────────────────────────────────────────

def test_username_available_when_not_taken(mock_sb):
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data=None)
    with patch("routes.users.get_supabase", return_value=mock_sb):
        result = username_available("jo")
    assert result == {"available": True}


def test_username_not_available_when_taken(mock_sb):
    mock_sb.from_().select().eq().maybe_single().execute.return_value = MagicMock(data={"id": "user_1"})
    with patch("routes.users.get_supabase", return_value=mock_sb):
        result = username_available("jo")
    assert result == {"available": False}


# ─── get_stats ────────────────────────────────────────────────────────────────

def test_get_stats_returns_stats(mock_sb):
    stats = {"total_games": 5, "high_score": 300, "avg_score": 200}
    mock_sb.from_().select().eq().eq().maybe_single().execute.return_value = MagicMock(data=stats)
    with patch("routes.users.get_supabase", return_value=mock_sb):
        result = get_stats("user_1", "word-associations")
    assert result == {"stats": stats}


def test_get_stats_returns_null_when_no_data(mock_sb):
    mock_sb.from_().select().eq().eq().maybe_single().execute.return_value = MagicMock(data=None)
    with patch("routes.users.get_supabase", return_value=mock_sb):
        result = get_stats("user_1", "word-associations")
    assert result == {"stats": None}


# ─── save_stats ───────────────────────────────────────────────────────────────

def test_save_stats_first_game(mock_sb):
    mock_sb.from_().select().eq().eq().maybe_single().execute.return_value = MagicMock(data=None)
    with patch("routes.users.get_supabase", return_value=mock_sb):
        result = save_stats(StatsRequest(user_id="user_1", game="word-associations", score=100))
    stats = result["stats"]
    assert stats["total_games"] == 1
    assert stats["high_score"] == 100
    assert stats["avg_score"] == 100


def test_save_stats_increments_total_games(mock_sb):
    existing = {"total_games": 4, "high_score": 200, "avg_score": 150}
    mock_sb.from_().select().eq().eq().maybe_single().execute.return_value = MagicMock(data=existing)
    with patch("routes.users.get_supabase", return_value=mock_sb):
        result = save_stats(StatsRequest(user_id="user_1", game="word-associations", score=100))
    assert result["stats"]["total_games"] == 5


def test_save_stats_updates_high_score(mock_sb):
    existing = {"total_games": 1, "high_score": 100, "avg_score": 100}
    mock_sb.from_().select().eq().eq().maybe_single().execute.return_value = MagicMock(data=existing)
    with patch("routes.users.get_supabase", return_value=mock_sb):
        result = save_stats(StatsRequest(user_id="user_1", game="word-associations", score=300))
    assert result["stats"]["high_score"] == 300


def test_save_stats_keeps_existing_high_score(mock_sb):
    existing = {"total_games": 1, "high_score": 300, "avg_score": 300}
    mock_sb.from_().select().eq().eq().maybe_single().execute.return_value = MagicMock(data=existing)
    with patch("routes.users.get_supabase", return_value=mock_sb):
        result = save_stats(StatsRequest(user_id="user_1", game="word-associations", score=100))
    assert result["stats"]["high_score"] == 300


def test_save_stats_avg_score_calculation(mock_sb):
    existing = {"total_games": 2, "high_score": 200, "avg_score": 100}
    mock_sb.from_().select().eq().eq().maybe_single().execute.return_value = MagicMock(data=existing)
    with patch("routes.users.get_supabase", return_value=mock_sb):
        result = save_stats(StatsRequest(user_id="user_1", game="word-associations", score=300))
    # (100*2 + 300) / 3 = 500/3 = 167
    assert result["stats"]["avg_score"] == 167

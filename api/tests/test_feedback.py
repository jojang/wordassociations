from unittest.mock import patch

from routes.feedback import submit_feedback, FeedbackBody


def make_body(**kwargs):
    defaults = dict(
        user_id="user_1",
        target_word="ocean",
        guess_word="tide",
        similarity_score=0.27,
        model_decision="rejected",
        user_label=True,
        model_version="v0",
    )
    return FeedbackBody(**{**defaults, **kwargs})


def test_submit_feedback_returns_ok(mock_sb):
    with patch("routes.feedback.get_supabase", return_value=mock_sb):
        import asyncio
        result = asyncio.run(submit_feedback(make_body()))
    assert result == {"status": "ok"}


def test_submit_feedback_inserts_row(mock_sb):
    with patch("routes.feedback.get_supabase", return_value=mock_sb):
        import asyncio
        asyncio.run(submit_feedback(make_body()))
    mock_sb.table("word_feedback").insert.assert_called_once()


def test_submit_feedback_row_contains_correct_fields(mock_sb):
    with patch("routes.feedback.get_supabase", return_value=mock_sb):
        import asyncio
        asyncio.run(submit_feedback(make_body(target_word="fire", guess_word="flame")))
    call_args = mock_sb.table("word_feedback").insert.call_args[0][0]
    assert call_args["target_word"] == "fire"
    assert call_args["guess_word"] == "flame"
    assert call_args["user_label"] is True
    assert call_args["model_decision"] == "rejected"

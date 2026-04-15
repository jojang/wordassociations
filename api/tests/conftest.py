"""
Shared fixtures for route tests.

We call route functions directly rather than through TestClient so we
avoid the lifespan (which loads SentenceTransformer) in tests that
don't need the embedding model.
"""

import pytest
from unittest.mock import MagicMock


@pytest.fixture
def mock_sb():
    """
    Chainable Supabase mock. MagicMock automatically returns a new MagicMock
    for any attribute access or call, so fluent chains like:
        sb.from_("table").select("*").eq("id", x).maybe_single().execute()
    work without any extra setup.
    """
    return MagicMock()


@pytest.fixture
def mock_request():
    """Mock FastAPI Request with a dummy embedding model on app.state."""
    req = MagicMock()
    req.app.state.model.encode.return_value = [MagicMock(), MagicMock()]
    req.app.state.calibrator = None
    return req

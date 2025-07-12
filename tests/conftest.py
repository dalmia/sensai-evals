import pytest
import asyncio
import tempfile
import os
from unittest.mock import patch


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
def patch_db_path():
    """Patch the sqlite_db_path for all tests in this session."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_file:
        db_path = tmp_file.name

    # Patch all possible locations where sqlite_db_path might be imported/used
    with patch("db.config.sqlite_db_path", db_path), patch(
        "src.db.config.sqlite_db_path", db_path
    ), patch("src.db.sqlite_db_path", db_path):
        yield

    if os.path.exists(db_path):
        os.unlink(db_path)


@pytest.fixture
async def mock_db():
    """Initialize the temp DB for each test."""
    # Import after patching to ensure we get the patched path
    from src.db import init_db

    await init_db()
    yield


@pytest.fixture
async def db_connection(mock_db):
    """Provide a database connection for tests."""
    # Import after patching to ensure we get the patched connection
    from src.db import get_new_db_connection

    async with get_new_db_connection() as conn:
        yield conn

import pytest
import asyncio
import tempfile
import os
import aiosqlite
from unittest.mock import patch
from src.db import init_db, create_tables, get_new_db_connection


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def mock_db():
    """Create a temporary database for testing."""
    # Create a temporary database file
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_file:
        db_path = tmp_file.name

    # Mock the database path
    with patch("db.config.sqlite_db_path", db_path):
        # Initialize the database
        await init_db()

        yield db_path

        # Clean up
        if os.path.exists(db_path):
            os.unlink(db_path)


@pytest.fixture
async def db_connection(mock_db):
    """Provide a database connection for tests."""
    async with get_new_db_connection() as conn:
        yield conn

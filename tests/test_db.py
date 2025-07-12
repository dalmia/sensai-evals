import pytest
import asyncio
from unittest.mock import patch
from src.db import (
    create_run,
    fetch_all_runs,
    bulk_insert_runs,
    create_user,
    create_queue,
    link_queue_to_run,
    get_all_queues,
    link_annotation_to_run,
)


class TestRunOperations:
    """Test run-related database operations."""

    @pytest.mark.asyncio
    async def test_create_run(self, mock_db):
        """Test creating a single run."""
        run_id = "test_run_123"
        start_time = "2024-01-01T10:00:00"
        end_time = "2024-01-01T10:05:00"
        messages = "Test messages"
        metadata = '{"test": "data"}'

        run_id_db = await create_run(
            run_id=run_id,
            start_time=start_time,
            end_time=end_time,
            messages=messages,
            metadata=metadata,
        )

        assert run_id_db is not None
        assert isinstance(run_id_db, int)

        # Verify the run was created
        runs = await fetch_all_runs()
        assert len(runs) == 1
        assert runs[0]["run_id"] == run_id
        assert runs[0]["start_time"] == start_time
        assert runs[0]["end_time"] == end_time
        assert runs[0]["messages"] == messages
        assert runs[0]["metadata"] == metadata

    @pytest.mark.asyncio
    async def test_create_run_minimal(self, mock_db):
        """Test creating a run with minimal data."""
        run_id = "minimal_run"

        run_id_db = await create_run(run_id=run_id)

        assert run_id_db is not None

        runs = await fetch_all_runs()
        assert len(runs) == 1
        assert runs[0]["run_id"] == run_id
        assert runs[0]["start_time"] is None
        assert runs[0]["end_time"] is None
        assert runs[0]["messages"] is None
        assert runs[0]["metadata"] is None

    @pytest.mark.asyncio
    async def test_fetch_all_runs_empty(self, mock_db):
        """Test fetching runs when database is empty."""
        runs = await fetch_all_runs()
        assert runs == []

    @pytest.mark.asyncio
    async def test_fetch_all_runs_multiple(self, mock_db):
        """Test fetching multiple runs."""
        # Create multiple runs
        run1_id = await create_run("run1", metadata='{"order": 1}')
        run2_id = await create_run("run2", metadata='{"order": 2}')
        run3_id = await create_run("run3", metadata='{"order": 3}')

        runs = await fetch_all_runs()

        assert len(runs) == 3
        # Should be ordered by created_at DESC (most recent first)
        assert runs[0]["run_id"] == "run3"
        assert runs[1]["run_id"] == "run2"
        assert runs[2]["run_id"] == "run1"

    @pytest.mark.asyncio
    async def test_bulk_insert_runs(self, mock_db):
        """Test bulk inserting runs."""
        runs_data = [
            (
                "run1",
                "2024-01-01T10:00:00",
                "2024-01-01T10:05:00",
                "msg1",
                '{"data": 1}',
            ),
            (
                "run2",
                "2024-01-01T11:00:00",
                "2024-01-01T11:05:00",
                "msg2",
                '{"data": 2}',
            ),
            (
                "run3",
                "2024-01-01T12:00:00",
                "2024-01-01T12:05:00",
                "msg3",
                '{"data": 3}',
            ),
        ]

        await bulk_insert_runs(runs_data)

        runs = await fetch_all_runs()
        assert len(runs) == 3
        assert runs[0]["run_id"] == "run3"
        assert runs[1]["run_id"] == "run2"
        assert runs[2]["run_id"] == "run1"


class TestUserOperations:
    """Test user-related database operations."""

    @pytest.mark.asyncio
    async def test_create_user(self, mock_db):
        """Test creating a user."""
        user_name = "test_user"

        user_id = await create_user(user_name)

        assert user_id is not None
        assert isinstance(user_id, int)

    @pytest.mark.asyncio
    async def test_create_user_unique_constraint(self, mock_db):
        """Test that user names must be unique."""
        user_name = "unique_user"

        # Create first user
        user_id1 = await create_user(user_name)
        assert user_id1 is not None

        # Try to create another user with same name
        with pytest.raises(Exception):  # Should raise unique constraint violation
            await create_user(user_name)


class TestQueueOperations:
    """Test queue-related database operations."""

    @pytest.mark.asyncio
    async def test_create_queue(self, mock_db):
        """Test creating a queue."""
        # First create a user
        user_id = await create_user("queue_owner")

        queue_name = "test_queue"
        description = "A test queue"

        queue_id = await create_queue(queue_name, description, user_id)

        assert queue_id is not None
        assert isinstance(queue_id, int)

    @pytest.mark.asyncio
    async def test_get_all_queues_empty(self, mock_db):
        """Test getting queues when none exist."""
        queues = await get_all_queues()
        assert queues == []

    @pytest.mark.asyncio
    async def test_get_all_queues_with_data(self, mock_db):
        """Test getting all queues with user information."""
        # Create users
        user1_id = await create_user("user1")
        user2_id = await create_user("user2")

        # Create queues
        queue1_id = await create_queue("queue1", "First queue", user1_id)
        queue2_id = await create_queue("queue2", "Second queue", user2_id)
        queue3_id = await create_queue("queue3", "Third queue", user1_id)

        queues = await get_all_queues()

        assert len(queues) == 3
        # Should be ordered by created_at DESC
        assert queues[0]["name"] == "queue3"
        assert queues[0]["user_name"] == "user1"
        assert queues[1]["name"] == "queue2"
        assert queues[1]["user_name"] == "user2"
        assert queues[2]["name"] == "queue1"
        assert queues[2]["user_name"] == "user1"

        # Check all fields are present
        for queue in queues:
            assert "id" in queue
            assert "name" in queue
            assert "description" in queue
            assert "user_id" in queue
            assert "user_name" in queue
            assert "created_at" in queue


class TestQueueRunLinking:
    """Test linking queues to runs."""

    @pytest.mark.asyncio
    async def test_link_queue_to_run(self, mock_db):
        """Test linking a queue to a run."""
        # Create user, queue, and run
        user_id = await create_user("link_test_user")
        queue_id = await create_queue("test_queue", "Test queue", user_id)
        run_id = await create_run("test_run")

        # Link them
        link_id = await link_queue_to_run(queue_id, run_id)

        assert link_id is not None
        assert isinstance(link_id, int)


class TestAnnotationOperations:
    """Test annotation-related database operations."""

    @pytest.mark.asyncio
    async def test_link_annotation_to_run(self, mock_db):
        """Test linking an annotation to a run."""
        # Create user and run
        user_id = await create_user("annotator")
        run_id = await create_run("annotated_run")

        judgement = "This is a good result"
        notes = "Additional notes about the annotation"

        annotation_id = await link_annotation_to_run(
            run_id=run_id, user_id=user_id, judgement=judgement, notes=notes
        )

        assert annotation_id is not None
        assert isinstance(annotation_id, int)

    @pytest.mark.asyncio
    async def test_link_annotation_to_run_no_notes(self, mock_db):
        """Test linking an annotation without notes."""
        # Create user and run
        user_id = await create_user("annotator2")
        run_id = await create_run("annotated_run2")

        judgement = "Simple judgement"

        annotation_id = await link_annotation_to_run(
            run_id=run_id, user_id=user_id, judgement=judgement
        )

        assert annotation_id is not None


class TestIntegration:
    """Integration tests for complex scenarios."""

    @pytest.mark.asyncio
    async def test_full_workflow(self, mock_db):
        """Test a complete workflow: user -> queue -> run -> annotation."""
        # Create user
        user_id = await create_user("workflow_user")

        # Create queue
        queue_id = await create_queue("workflow_queue", "Test workflow", user_id)

        # Create run
        run_id = await create_run("workflow_run", metadata='{"workflow": "test"}')

        # Link queue to run
        link_id = await link_queue_to_run(queue_id, run_id)

        # Create annotation
        annotation_id = await link_annotation_to_run(
            run_id=run_id,
            user_id=user_id,
            judgement="Workflow completed successfully",
            notes="Integration test passed",
        )

        # Verify all operations succeeded
        assert user_id > 0
        assert queue_id > 0
        assert run_id > 0
        assert link_id > 0
        assert annotation_id > 0

        # Verify data integrity
        runs = await fetch_all_runs()
        assert len(runs) == 1
        assert runs[0]["run_id"] == "workflow_run"

        queues = await get_all_queues()
        assert len(queues) == 1
        assert queues[0]["name"] == "workflow_queue"
        assert queues[0]["user_name"] == "workflow_user"

import sqlite3
import os
import json
from os.path import exists
from .config import (
    sqlite_db_path,
    runs_table_name,
    queues_table_name,
    annotations_table_name,
    queue_runs_table_name,
    users_table_name,
)
from contextlib import asynccontextmanager
import aiosqlite


@asynccontextmanager
async def get_new_db_connection():
    conn = None
    try:
        conn = await aiosqlite.connect(sqlite_db_path)
        await conn.execute("PRAGMA synchronous=NORMAL;")
        yield conn
    except Exception as e:
        if conn:
            await conn.rollback()  # Rollback on any exception
        raise  # Re-raise the exception to propagate the error
    finally:
        if conn:
            await conn.close()


def set_db_defaults():
    conn = sqlite3.connect(sqlite_db_path)

    current_mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]

    if current_mode.lower() != "wal":
        settings = "PRAGMA journal_mode = WAL;"

        conn.executescript(settings)
        print("Defaults set.")
    else:
        print("Defaults already set.")


async def create_tables(cursor):
    await cursor.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {runs_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT,
            start_time TEXT,
            end_time TEXT,
            messages TEXT,
            metadata TEXT,
            created_at NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    await cursor.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {queues_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            user_id INTEGER NOT NULL,
            created_at NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES {users_table_name} (id)
        )
    """
    )

    await cursor.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {queue_runs_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            queue_id INTEGER NOT NULL,
            run_id INTEGER NOT NULL,
            FOREIGN KEY (queue_id) REFERENCES {queues_table_name} (id),
            FOREIGN KEY (run_id) REFERENCES {runs_table_name} (id)
        )
    """
    )

    await cursor.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {annotations_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            judgement TEXT NOT NULL,
            notes TEXT,
            created_at NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES {runs_table_name} (id),
            FOREIGN KEY (user_id) REFERENCES {users_table_name} (id)
        )
    """
    )

    await cursor.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {users_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """
    )


async def init_db():
    # Ensure the database folder exists
    db_folder = os.path.dirname(sqlite_db_path)
    if not os.path.exists(db_folder):
        os.makedirs(db_folder)

    if not exists(sqlite_db_path):
        # only set the defaults the first time
        set_db_defaults()

    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        try:
            # Check if any table is missing and create tables if needed
            await create_tables(cursor)
            await conn.commit()

        except Exception as exception:
            # delete db
            os.remove(sqlite_db_path)
            raise exception


async def create_run(
    run_id: str,
    start_time: str = None,
    end_time: str = None,
    messages: str = None,
    metadata: str = None,
):
    """
    Create a new run record in the database.

    Args:
        run_id: Unique identifier for the run
        start_time: Start time of the run
        end_time: End time of the run
        messages: Messages associated with the run
        metadata: Additional metadata for the run

    Returns:
        The ID of the created run
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        await cursor.execute(
            f"""
            INSERT INTO {runs_table_name} 
            (run_id, start_time, end_time, messages, metadata)
            VALUES (?, ?, ?, ?, ?)
            """,
            (run_id, start_time, end_time, json.dumps(messages), json.dumps(metadata)),
        )

        await conn.commit()
        return cursor.lastrowid


async def bulk_insert_runs(runs: list[dict]):
    """
    Bulk insert runs into the database.
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.executemany(
            f"""
            INSERT INTO {runs_table_name}
            (run_id, start_time, end_time, messages, metadata)
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                (
                    run["run_id"],
                    run["start_time"],
                    run["end_time"],
                    json.dumps(run["messages"]),
                    json.dumps(run["metadata"]),
                )
                for run in runs
            ],
        )
        await conn.commit()


async def create_user(name: str):
    """
    Create a new user in the database.

    Args:
        name: Unique name for the user

    Returns:
        The ID of the created user
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        await cursor.execute(
            f"""
            INSERT INTO {users_table_name} (name)
            VALUES (?)
            """,
            (name,),
        )

        await conn.commit()
        return cursor.lastrowid


async def create_queue(name: str, description: str, user_id: int):
    """
    Create a new queue for a user.

    Args:
        name: Name of the queue
        description: Description of the queue
        user_id: ID of the user who owns the queue

    Returns:
        The ID of the created queue
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        await cursor.execute(
            f"""
            INSERT INTO {queues_table_name} (name, description, user_id)
            VALUES (?, ?, ?)
            """,
            (name, description, user_id),
        )

        await conn.commit()
        return cursor.lastrowid


async def bulk_insert_queues(values: list[tuple]):
    """
    Bulk insert queues into the database.
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.executemany(
            f"""
            INSERT INTO {queues_table_name} (name, description, user_id)
            VALUES (?, ?, ?)
            """,
            values,
        )
        await conn.commit()


async def link_queue_to_runs_by_span_id(queue_id: int, span_ids: list[str]):
    """
    Link a queue to a run.

    Args:
        queue_id: ID of the queue
        span_ids: IDs of the spans

    Returns:
        The ID of the created link
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        # Find all run ids in the runs table where run_id matches any in span_ids
        await cursor.execute(
            f"""
            SELECT id FROM {runs_table_name}
            WHERE run_id IN ({','.join(['?'] * len(span_ids))})
            """,
            span_ids,
        )
        rows = await cursor.fetchall()
        if not rows:
            raise ValueError(
                "No runs found in the runs table matching the given span_ids"
            )

        # Link the queue to all found runs
        values = [(queue_id, row[0]) for row in rows]
        await cursor.executemany(
            f"""
            INSERT INTO {queue_runs_table_name} (queue_id, run_id)
            VALUES (?, ?)
            """,
            values,
        )

        await conn.commit()


async def link_queue_to_run(queue_id: int, run_id: int):
    """
    Link a queue to a run.

    Args:
        queue_id: ID of the queue
        run_id: ID of the run

    Returns:
        The ID of the created link
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        await cursor.execute(
            f"""
            INSERT INTO {queue_runs_table_name} (queue_id, run_id)
            VALUES (?, ?)
            """,
            (queue_id, run_id),
        )

        await conn.commit()
        return cursor.lastrowid


async def create_annotation_by_span_id(
    span_id: str,
    user_id: int,
    judgement: str,
    notes: str = None,
    created_at: str = None,
):
    """
    Link an annotation to a run.

    Args:
        span_id: ID of the span
        user_id: ID of the user making the annotation
        judgement: The judgement/annotation text
        notes: Optional notes for the annotation
        created_at: Optional creation time for the annotation
    Returns:
        The ID of the created annotation
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        await cursor.execute(
            f"""
            SELECT id FROM {runs_table_name} WHERE run_id = ?
            """,
            (span_id,),
        )
        row = await cursor.fetchone()
        if not row:
            raise ValueError(f"No run found with span_id={span_id}")

        run_id = row[0]

        await cursor.execute(
            f"""
            INSERT INTO {annotations_table_name} (run_id, user_id, judgement, notes, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (run_id, user_id, judgement, notes, created_at),
        )

        await conn.commit()


async def create_annotation(
    run_id: int, user_id: int, judgement: str, notes: str = None, created_at: str = None
):
    """
    Link an annotation to a run.

    Args:
        run_id: ID of the run
        user_id: ID of the user making the annotation
        judgement: The judgement/annotation text
        notes: Optional notes for the annotation
        created_at: Optional creation time for the annotation
    Returns:
        The ID of the created annotation
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        await cursor.execute(
            f"""
            INSERT INTO {annotations_table_name} (run_id, user_id, judgement, notes, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (run_id, user_id, judgement, notes, created_at),
        )

        await conn.commit()
        return cursor.lastrowid


async def fetch_all_runs():
    """
    Fetch all runs from the database with their annotations.

    Returns:
        List of dictionaries containing run data with annotations
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        await cursor.execute(
            f"""
            SELECT r.id, r.run_id, r.start_time, r.end_time, r.messages, r.metadata, r.created_at,
                   a.judgement, a.notes, a.created_at as timestamp, u.name as username
            FROM {runs_table_name} r
            LEFT JOIN {annotations_table_name} a ON r.id = a.run_id
            LEFT JOIN {users_table_name} u ON a.user_id = u.id
            ORDER BY r.created_at DESC
            """
        )

        rows = await cursor.fetchall()

        # Convert rows to list of dictionaries with annotations
        runs = []
        current_run = None

        for row in rows:
            run_id = row[0]

            # If this is a new run, create a new run entry
            if current_run is None or current_run["id"] != run_id:
                if current_run is not None:
                    runs.append(current_run)

                current_run = {
                    "id": row[0],
                    "run_id": row[1],
                    "start_time": row[2],
                    "end_time": row[3],
                    "messages": json.loads(
                        row[4].replace("<", "&lt;").replace(">", "&gt;")
                    ),
                    "metadata": json.loads(
                        row[5].replace("<", "&lt;").replace(">", "&gt;")
                    ),
                    "created_at": row[6],
                    "annotations": {},
                }

            # Add annotation if it exists (username is not None)
            if row[10] is not None:  # username is not None
                current_run["annotations"][row[10]] = {
                    "judgement": row[7],
                    "notes": row[8],
                    "timestamp": row[9],
                }

        # Add the last run
        if current_run is not None:
            runs.append(current_run)

        return runs


async def get_all_queues():
    """
    Get all queues with their associated user information and runs with annotations.

    Returns:
        List of dictionaries containing queue data with runs and annotations
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        await cursor.execute(
            f"""
            SELECT q.id, q.name, q.description, q.user_id, u.name as user_name, q.created_at,
                   r.id as run_id, r.run_id as span_id, r.start_time, r.end_time, r.messages, r.metadata, r.created_at as run_created_at,
                   a.judgement, a.notes, a.created_at as annotation_timestamp, ann_user.name as annotation_username
            FROM {queues_table_name} q
            JOIN {users_table_name} u ON q.user_id = u.id
            LEFT JOIN {queue_runs_table_name} qr ON q.id = qr.queue_id
            LEFT JOIN {runs_table_name} r ON qr.run_id = r.id
            LEFT JOIN {annotations_table_name} a ON r.id = a.run_id
            LEFT JOIN {users_table_name} ann_user ON a.user_id = ann_user.id
            ORDER BY q.created_at DESC, r.created_at DESC
            """
        )

        rows = await cursor.fetchall()

        queues = []
        current_queue = None
        current_run = None

        for row in rows:
            queue_id = row[0]
            run_id = row[6]  # run_id from runs table

            # If this is a new queue, create a new queue entry
            if current_queue is None or current_queue["id"] != queue_id:
                if current_queue is not None:
                    # Add the last run to the current queue
                    if current_run is not None:
                        current_queue["runs"].append(current_run)
                    queues.append(current_queue)

                current_queue = {
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "user_id": row[3],
                    "user_name": row[4],
                    "created_at": row[5],
                    "runs": [],
                }
                current_run = None

            # If there's a run and it's a new run, create a new run entry
            if run_id is not None:
                if current_run is None or current_run["id"] != run_id:
                    # Add the previous run to the current queue
                    if current_run is not None:
                        current_queue["runs"].append(current_run)

                    current_run = {
                        "id": row[6],
                        "run_id": row[7],
                        "start_time": row[8],
                        "end_time": row[9],
                        "messages": json.loads(
                            row[10].replace("<", "&lt;").replace(">", "&gt;")
                        ),
                        "metadata": json.loads(
                            row[11].replace("<", "&lt;").replace(">", "&gt;")
                        ),
                        "created_at": row[12],
                        "annotations": {},
                    }

                # Add annotation if it exists (annotation_username is not None)
                if row[16] is not None:  # annotation_username is not None
                    current_run["annotations"][row[16]] = {
                        "judgement": row[13],
                        "notes": row[14],
                        "timestamp": row[15],
                    }

        # Add the last run to the last queue
        if current_queue is not None:
            if current_run is not None:
                current_queue["runs"].append(current_run)
            queues.append(current_queue)

        return queues

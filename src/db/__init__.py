import sqlite3
import os
from os.path import exists
from db.config import (
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
            (run_id, start_time, end_time, messages, metadata),
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
            runs,
        )
        await conn.commit()


async def fetch_all_runs():
    """
    Fetch all runs from the database.

    Returns:
        List of dictionaries containing run data
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        await cursor.execute(
            f"""
            SELECT id, run_id, start_time, end_time, messages, metadata, created_at
            FROM {runs_table_name}
            ORDER BY created_at DESC
            """
        )

        rows = await cursor.fetchall()

        # Convert rows to list of dictionaries
        runs = []
        for row in rows:
            runs.append(
                {
                    "id": row[0],
                    "run_id": row[1],
                    "start_time": row[2],
                    "end_time": row[3],
                    "messages": row[4],
                    "metadata": row[5],
                    "created_at": row[6],
                }
            )

        return runs


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


async def get_all_queues():
    """
    Get all queues with their associated user information.

    Returns:
        List of dictionaries containing queue data
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        await cursor.execute(
            f"""
            SELECT q.id, q.name, q.description, q.user_id, u.name as user_name, q.created_at
            FROM {queues_table_name} q
            JOIN {users_table_name} u ON q.user_id = u.id
            ORDER BY q.created_at DESC
            """
        )

        rows = await cursor.fetchall()

        queues = []
        for row in rows:
            queues.append(
                {
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "user_id": row[3],
                    "user_name": row[4],
                    "created_at": row[5],
                }
            )

        return queues


async def link_annotation_to_run(
    run_id: int, user_id: int, judgement: str, notes: str = None
):
    """
    Link an annotation to a run.

    Args:
        run_id: ID of the run
        user_id: ID of the user making the annotation
        judgement: The judgement/annotation text
        notes: Optional notes for the annotation

    Returns:
        The ID of the created annotation
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        await cursor.execute(
            f"""
            INSERT INTO {annotations_table_name} (run_id, user_id, judgement, notes)
            VALUES (?, ?, ?, ?)
            """,
            (run_id, user_id, judgement, notes),
        )

        await conn.commit()
        return cursor.lastrowid

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
import traceback
import numpy as np
from typing import Optional, List, Tuple
import asyncio
import functools


def log_exceptions(func):
    """
    Decorator that logs all exceptions to the terminal.
    Works with both sync and async functions.
    """

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            print(f"ERROR in {func.__name__}: {e}")
            traceback.print_exc()
            raise

    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            print(f"ERROR in {func.__name__}: {e}")
            traceback.print_exc()
            raise

    # Return the appropriate wrapper based on whether the function is async
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return wrapper


def build_run_filters(
    annotation_filter: str = None,
    annotation_filter_user_id: int = None,
    time_range: str = None,
    org_ids: list = None,
    course_ids: list = None,
    run_type: list = None,
    purpose: list = None,
    question_type: list = None,
    question_input_type: list = None,
    user_email: str = None,
    task_title: str = None,
    question_title: str = None,
    initial_params: list = None,
) -> Tuple[List[str], List]:
    """
    Build WHERE conditions and parameters for filtering runs.

    Args:
        annotation_filter: Filter by annotation status
        annotation_filter_user_id: User ID for annotation filtering (can be current user or specific annotator)
        time_range: Time range filter
        org_ids: List of organization IDs
        course_ids: List of course IDs
        run_type: List of run types
        purpose: List of purposes
        question_type: List of question types
        question_input_type: List of input types
        user_email: Email to filter by (from metadata)
        task_title: Task title to filter by (from metadata, substring match)
        question_title: Question title to filter by (from metadata, substring match)
        initial_params: Initial parameters list to start with

    Returns:
        Tuple of (where_conditions, params)
    """
    where_conditions = []
    params = initial_params or []

    # Annotation filter - filter by annotation status for specific user
    if annotation_filter and annotation_filter_user_id:
        if annotation_filter == "annotated" or annotation_filter == "has_annotations":
            where_conditions.append("a.id IS NOT NULL AND a.user_id = ?")
            params.append(annotation_filter_user_id)
        elif (
            annotation_filter == "unannotated" or annotation_filter == "no_annotations"
        ):
            where_conditions.append(
                f"""r.id NOT IN (
                SELECT DISTINCT run_id FROM {annotations_table_name} 
                WHERE user_id = ?
            )"""
            )
            params.append(annotation_filter_user_id)
        elif annotation_filter == "correct":
            where_conditions.append("a.judgement = 'correct' AND a.user_id = ?")
            params.append(annotation_filter_user_id)
        elif annotation_filter == "wrong":
            where_conditions.append("a.judgement = 'wrong' AND a.user_id = ?")
            params.append(annotation_filter_user_id)
    elif annotation_filter_user_id and not annotation_filter:
        # If only user_id is specified (for annotator filtering), show only runs with annotations by that user
        where_conditions.append("a.user_id = ?")
        params.append(annotation_filter_user_id)
    elif annotation_filter and not annotation_filter_user_id:
        # Original logic for any user annotations when no specific user is set
        if annotation_filter == "annotated" or annotation_filter == "has_annotations":
            where_conditions.append("a.id IS NOT NULL")
        elif (
            annotation_filter == "unannotated" or annotation_filter == "no_annotations"
        ):
            where_conditions.append("a.id IS NULL")
        elif annotation_filter == "correct":
            where_conditions.append("a.judgement = 'correct'")
        elif annotation_filter == "wrong":
            where_conditions.append("a.judgement = 'wrong'")

    # Time range filter
    if time_range:
        if time_range == "today":
            where_conditions.append("DATE(r.start_time) = DATE('now')")
        elif time_range == "yesterday":
            where_conditions.append("DATE(r.start_time) = DATE('now', '-1 day')")
        elif time_range == "last7" or time_range == "last_7_days":
            where_conditions.append("r.start_time >= DATE('now', '-7 days')")
        elif time_range == "last30" or time_range == "last_30_days":
            where_conditions.append("r.start_time >= DATE('now', '-30 days')")

    # Metadata filters (support multiple values)
    def add_multi_filter(field, values, json_path):
        if values:
            placeholders = ",".join(["?"] * len(values))
            where_conditions.append(
                f"JSON_EXTRACT(r.metadata, '{json_path}') IN ({placeholders})"
            )
            params.extend(values)

    add_multi_filter("org_id", org_ids, "$.org.id")
    add_multi_filter("course_id", course_ids, "$.course.id")
    add_multi_filter("run_type", run_type, "$.type")
    add_multi_filter("purpose", purpose, "$.question_purpose")
    add_multi_filter("question_type", question_type, "$.question_type")
    add_multi_filter(
        "question_input_type", question_input_type, "$.question_input_type"
    )

    # User email filter (single value)
    if user_email:
        where_conditions.append("JSON_EXTRACT(r.metadata, '$.user_email') = ?")
        params.append(user_email)

    # Task title filter (substring match)
    if task_title:
        where_conditions.append("JSON_EXTRACT(r.metadata, '$.task_title') LIKE ?")
        params.append(f"%{task_title}%")

    # Question title filter (substring match)
    if question_title:
        where_conditions.append("JSON_EXTRACT(r.metadata, '$.question_title') LIKE ?")
        params.append(f"%{question_title}%")

    return where_conditions, params


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
            FOREIGN KEY (user_id) REFERENCES {users_table_name} (id),
            UNIQUE(run_id, user_id)
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


async def bulk_insert_runs(runs: list[tuple]):
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


async def get_queue(
    queue_id: int,
    page: int = 1,
    page_size: int = 20,
    annotation_filter: str = None,
    annotation_filter_user_id: int = None,
    user_email: str = None,
    task_title: str = None,
    question_title: str = None,
):
    """
    Get a queue with its associated user information and runs with annotations, with pagination and annotation status filtering support.
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        # Get queue details
        queue_details = await cursor.execute(
            f"""
            SELECT q.id, q.name, q.user_id, u.name as user_name, q.created_at FROM {queues_table_name} q
            JOIN {users_table_name} u ON q.user_id = u.id
            WHERE q.id = ?
            """,
            (queue_id,),
        )
        queue_details = await cursor.fetchone()

        queue = {
            "id": queue_details[0],
            "name": queue_details[1],
            "user_id": queue_details[2],
            "user_name": queue_details[3],
            "created_at": queue_details[4],
        }

        # Build WHERE clause for filtering runs in this queue
        where_conditions = ["q.id = ?"]
        params = [queue_id]
        if annotation_filter or user_email or task_title or question_title:
            filter_conds, filter_params = build_run_filters(
                annotation_filter=annotation_filter,
                annotation_filter_user_id=annotation_filter_user_id,
                user_email=user_email,
                task_title=task_title,
                question_title=question_title,
            )
            where_conditions.extend(filter_conds)
            params.extend(filter_params)
        where_clause = " AND ".join(where_conditions)

        # Get total count of runs in this queue (with filter)
        await cursor.execute(
            f"""
            SELECT COUNT(DISTINCT r.id)
            FROM {queues_table_name} q
            LEFT JOIN {queue_runs_table_name} qr ON q.id = qr.queue_id
            LEFT JOIN {runs_table_name} r ON qr.run_id = r.id
            LEFT JOIN {annotations_table_name} a ON r.id = a.run_id
            WHERE {where_clause}
            """,
            params,
        )
        total_count = (await cursor.fetchone())[0]

        # Calculate offset for pagination
        offset = (page - 1) * page_size

        # Get paginated runs with annotations (with filter)
        await cursor.execute(
            f"""
                SELECT r.id as run_id, r.run_id as span_id, r.start_time, r.end_time, r.messages, r.metadata, r.created_at as run_created_at, a.judgement, a.notes, a.created_at as annotation_timestamp, ann_user.name as annotation_username
            FROM {queues_table_name} q
            LEFT JOIN {queue_runs_table_name} qr ON q.id = qr.queue_id
            LEFT JOIN {runs_table_name} r ON qr.run_id = r.id
            LEFT JOIN {annotations_table_name} a ON r.id = a.run_id
            LEFT JOIN {users_table_name} ann_user ON a.user_id = ann_user.id
            WHERE {where_clause}
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
            """,
            params + [page_size, offset],
        )

        rows = await cursor.fetchall()

        runs = []
        current_run = None

        for row in rows:
            run_id = row[0]

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

            if row[7] is not None:
                current_run["annotations"][row[10]] = {
                    "judgement": row[7],
                    "notes": row[8],
                    "timestamp": row[9],
                }

        if current_run is not None:
            runs.append(current_run)

        queue["runs"] = runs

        return queue, total_count


@log_exceptions
async def create_queue(
    name: str,
    description: str,
    user_id: int,
    runs: Optional[List[int]] = None,
    # Filter parameters for selecting all filtered runs
    annotation_filter: str = None,
    annotation_filter_user_id: int = None,
    time_range: str = None,
    org_ids: list = None,
    course_ids: list = None,
    run_type: list = None,
    purpose: list = None,
    question_type: list = None,
    question_input_type: list = None,
):
    """
    Create a new queue for a user.

    Args:
        name: Name of the queue
        description: Description of the queue
        user_id: ID of the user who owns the queue
        runs: Optional list of specific run IDs to include

        # Filter parameters - if provided, will select all runs matching these filters
        annotation_filter: Filter by annotation status
        annotation_filter_user_id: User ID for annotation filtering
        time_range: Time range filter
        org_ids: List of organization IDs
        course_ids: List of course IDs
        run_type: List of run types
        purpose: List of purposes
        question_type: List of question types
        question_input_type: List of input types

    Returns:
        The created queue data
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        # Create the queue first
        await cursor.execute(
            f"""
            INSERT INTO {queues_table_name} (name, description, user_id)
            VALUES (?, ?, ?)
            """,
            (name, description, user_id),
        )

        queue_id = cursor.lastrowid

        # Add runs to the queue
        if runs:
            # Use specific run IDs
            values = [(queue_id, run_id) for run_id in runs]
            await cursor.executemany(
                f"""
                INSERT INTO {queue_runs_table_name} (queue_id, run_id)
                VALUES (?, ?)
                """,
                values,
            )
        elif any(
            [
                annotation_filter,
                time_range,
                org_ids,
                course_ids,
                run_type,
                purpose,
                question_type,
                question_input_type,
            ]
        ):
            # Use filters to select runs directly in the database
            base_query = f"""
                INSERT INTO {queue_runs_table_name} (queue_id, run_id)
                SELECT ?, r.id
                FROM {runs_table_name} r
                LEFT JOIN {annotations_table_name} a ON r.id = a.run_id
                LEFT JOIN {users_table_name} u ON a.user_id = u.id
            """

            # Build WHERE clause based on filters (same logic as fetch_all_runs)
            where_conditions, params = build_run_filters(
                annotation_filter=annotation_filter,
                annotation_filter_user_id=annotation_filter_user_id,
                time_range=time_range,
                org_ids=org_ids,
                course_ids=course_ids,
                run_type=run_type,
                purpose=purpose,
                question_type=question_type,
                question_input_type=question_input_type,
                initial_params=[queue_id],  # Start with queue_id for the INSERT SELECT
            )

            # Add WHERE clause if there are conditions
            where_clause = ""
            if where_conditions:
                where_clause = " WHERE " + " AND ".join(where_conditions)

            # Execute the INSERT SELECT query
            query = (
                base_query + where_clause + " GROUP BY r.id"
            )  # GROUP BY to avoid duplicates from JOINs
            await cursor.execute(query, params)

        await conn.commit()
        return queue_id


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
    run_id: int, user_id: int, judgement: str, notes: str = None
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
            INSERT INTO {annotations_table_name} (run_id, user_id, judgement, notes)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(run_id, user_id) DO UPDATE SET
                judgement=excluded.judgement,
                notes=excluded.notes
            """,
            (run_id, user_id, judgement, notes),
        )

        await conn.commit()


async def fetch_all_runs(
    annotation_filter: str = None,
    annotation_filter_user_id: int = None,
    time_range: str = None,
    org_ids: list = None,
    course_ids: list = None,
    run_type: list = None,
    purpose: list = None,
    question_type: list = None,
    question_input_type: list = None,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "timestamp",
    sort_order: str = "desc",
    user_email: str = None,
    task_title: str = None,
    question_title: str = None,
):
    """
    Fetch runs from the database with their annotations, filtered by query parameters and paginated.
    Returns a tuple: (runs, total_count)
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        # Build the base query
        base_query = f"""
            SELECT r.id, r.run_id, r.start_time, r.end_time, r.messages, r.metadata, r.created_at,
                   a.judgement, a.notes, a.created_at as timestamp, u.name as username
            FROM {runs_table_name} r
            LEFT JOIN {annotations_table_name} a ON r.id = a.run_id
            LEFT JOIN {users_table_name} u ON a.user_id = u.id
        """
        count_query = f"SELECT COUNT(DISTINCT r.id) FROM {runs_table_name} r LEFT JOIN {annotations_table_name} a ON r.id = a.run_id LEFT JOIN {users_table_name} u ON a.user_id = u.id"

        # Build WHERE clause based on filters
        where_conditions, params = build_run_filters(
            annotation_filter=annotation_filter,
            annotation_filter_user_id=annotation_filter_user_id,
            time_range=time_range,
            org_ids=org_ids,
            course_ids=course_ids,
            run_type=run_type,
            purpose=purpose,
            question_type=question_type,
            question_input_type=question_input_type,
            user_email=user_email,
            task_title=task_title,
            question_title=question_title,
        )

        # Add WHERE clause if there are conditions
        where_clause = ""
        if where_conditions:
            where_clause = " WHERE " + " AND ".join(where_conditions)

        # Get total count for pagination
        await cursor.execute(count_query + where_clause, params)
        total_count = await cursor.fetchone()
        total_count = total_count[0] if total_count else 0

        # Build ORDER BY clause based on sort parameters
        order_by_clause = ""
        if sort_by == "timestamp":
            # Use start_time for timestamp sorting
            sort_column = "r.start_time"
        else:
            # Default to timestamp if unknown sort field
            sort_column = "r.start_time"

        # Ensure sort_order is either ASC or DESC
        sort_direction = "ASC" if sort_order.lower() == "asc" else "DESC"
        order_by_clause = f" ORDER BY {sort_column} {sort_direction}"

        # Add LIMIT, OFFSET for pagination
        offset = (page - 1) * page_size
        query = base_query + where_clause + order_by_clause + f" LIMIT ? OFFSET ?"
        page_params = params + [page_size, offset]

        # Execute query with parameters
        await cursor.execute(query, page_params)
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
        return runs, total_count


@log_exceptions
async def get_all_queues():
    """
    Get all queues with their basic information and run count.

    Returns:
        List of dictionaries containing queue data with num_runs count
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        # Get all queues with their basic info and run count
        await cursor.execute(
            f"""
            SELECT q.id, q.name, q.user_id, u.name as user_name, q.created_at,
                   COUNT(DISTINCT qr.run_id) as num_runs
            FROM {queues_table_name} q
            JOIN {users_table_name} u ON q.user_id = u.id
            LEFT JOIN {queue_runs_table_name} qr ON q.id = qr.queue_id
            GROUP BY q.id, q.name, q.user_id, u.name, q.created_at
            ORDER BY q.created_at DESC
            """,
        )
        queue_rows = await cursor.fetchall()

        queues = []
        for row in queue_rows:
            queue = {
                "id": row[0],
                "name": row[1],
                "user_id": row[2],
                "user_name": row[3],
                "created_at": row[4],
                "num_runs": row[5],
            }
            queues.append(queue)

        return queues


async def get_all_users():
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute(f"""SELECT id, name FROM {users_table_name}""")
        rows = await cursor.fetchall()
        return [{"id": row[0], "name": row[1]} for row in rows]


async def get_unique_orgs_and_courses():
    """
    Fetch unique organization and course names and ids from the metadata of all runs.
    Returns:
        {
            "orgs": [{"id": ..., "name": ...}, ...],
            "courses": [{"id": ..., "name": ...}, ...]
        }
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute(f"SELECT metadata FROM {runs_table_name}")
        rows = await cursor.fetchall()

        orgs_set = set()
        courses_set = set()

        for row in rows:
            metadata = row[0]
            if not metadata:
                continue
            try:
                # metadata may be a JSON string
                meta = json.loads(metadata)
            except Exception:
                continue

            org = meta.get("org")
            if org and isinstance(org, dict):
                org_id = org.get("id")
                org_name = org.get("name")
                if org_id is not None and org_name is not None:
                    orgs_set.add((org_id, org_name))

            course = meta.get("course")
            if course and isinstance(course, dict):
                course_id = course.get("id")
                course_name = course.get("name")
                if course_id is not None and course_name is not None:
                    courses_set.add((course_id, course_name))

        orgs = [
            {"id": oid, "name": oname}
            for oid, oname in sorted(orgs_set, key=lambda x: (str(x[1]).lower(), x[0]))
        ]
        courses = [
            {"id": cid, "name": cname}
            for cid, cname in sorted(
                courses_set, key=lambda x: (str(x[1]).lower(), x[0])
            )
        ]

        return {"orgs": orgs, "courses": courses}


async def create_user(name: str):
    """
    Create a new user in the database.
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute(
            f"INSERT INTO {users_table_name} (name) VALUES (?)", (name,)
        )
        await conn.commit()
        return cursor.lastrowid


async def get_last_run_time():
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute(f"SELECT MAX(start_time) FROM {runs_table_name}")
        row = await cursor.fetchone()
        return row[0]


@log_exceptions
async def update_queue(
    queue_id: int,
    runs: Optional[List[int]] = None,
    # Filter parameters for selecting all filtered runs
    annotation_filter: str = None,
    annotation_filter_user_id: int = None,
    time_range: str = None,
    org_ids: list = None,
    course_ids: list = None,
    run_type: list = None,
    purpose: list = None,
    question_type: list = None,
    question_input_type: list = None,
):
    """
    Update an existing queue by adding new runs that match the criteria.
    Only adds runs that are not already in the queue.

    Args:
        queue_id: ID of the queue to update
        runs: Optional list of specific run IDs to include

        # Filter parameters - if provided, will select all runs matching these filters
        annotation_filter: Filter by annotation status
        annotation_filter_user_id: User ID for annotation filtering
        time_range: Time range filter
        org_ids: List of organization IDs
        course_ids: List of course IDs
        run_type: List of run types
        purpose: List of purposes
        question_type: List of question types
        question_input_type: List of input types

    Returns:
        Dictionary with success status and number of runs added
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        # Verify queue exists
        await cursor.execute(
            f"SELECT id FROM {queues_table_name} WHERE id = ?",
            (queue_id,),
        )
        if not await cursor.fetchone():
            raise Exception("Queue not found")

        runs_added = 0

        # Add runs to the queue
        if runs:
            # Use specific run IDs - get existing runs first to avoid duplicates
            await cursor.execute(
                f"SELECT run_id FROM {queue_runs_table_name} WHERE queue_id = ?",
                (queue_id,),
            )
            existing_runs = {row[0] for row in await cursor.fetchall()}

            # Filter out runs that are already in the queue
            new_runs = [run_id for run_id in runs if run_id not in existing_runs]

            if new_runs:
                values = [(queue_id, run_id) for run_id in new_runs]
                await cursor.executemany(
                    f"""
                    INSERT INTO {queue_runs_table_name} (queue_id, run_id)
                    VALUES (?, ?)
                    """,
                    values,
                )
                runs_added = len(new_runs)

        elif any(
            [
                annotation_filter,
                time_range,
                org_ids,
                course_ids,
                run_type,
                purpose,
                question_type,
                question_input_type,
            ]
        ):
            # Use filters to select runs - only add ones not already in the queue
            base_query = f"""
                INSERT INTO {queue_runs_table_name} (queue_id, run_id)
                SELECT ?, r.id
                FROM {runs_table_name} r
                LEFT JOIN {annotations_table_name} a ON r.id = a.run_id
                LEFT JOIN {users_table_name} u ON a.user_id = u.id
                WHERE NOT EXISTS (
                    SELECT 1 FROM {queue_runs_table_name} qr 
                    WHERE qr.queue_id = ? AND qr.run_id = r.id
                )
            """

            # Build WHERE clause based on filters (same logic as create_queue)
            where_conditions, params = build_run_filters(
                annotation_filter=annotation_filter,
                annotation_filter_user_id=annotation_filter_user_id,
                time_range=time_range,
                org_ids=org_ids,
                course_ids=course_ids,
                run_type=run_type,
                purpose=purpose,
                question_type=question_type,
                question_input_type=question_input_type,
                initial_params=[
                    queue_id,
                    queue_id,
                ],  # For the INSERT SELECT and NOT EXISTS
            )

            # Add additional WHERE conditions if there are filters
            if where_conditions:
                base_query += " AND " + " AND ".join(where_conditions)

            # Execute the INSERT SELECT query
            query = (
                base_query + " GROUP BY r.id"
            )  # GROUP BY to avoid duplicates from JOINs
            result = await cursor.execute(query, params)
            runs_added = result.rowcount

        await conn.commit()
        return {"success": True, "runs_added": runs_added}


async def get_metrics():
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        # Number of runs
        await cursor.execute(f"SELECT COUNT(*) FROM {runs_table_name}")
        num_runs = (await cursor.fetchone())[0]

        # Number of unique users across all runs (from metadata->user_id)
        await cursor.execute(f"SELECT metadata FROM {runs_table_name}")
        rows = await cursor.fetchall()
        user_ids = set()

        for row in rows:
            metadata = row[0]
            if metadata:
                try:
                    meta = json.loads(metadata)
                    user_id = meta.get("user_id")
                    if user_id is not None:
                        user_ids.add(user_id)
                except Exception:
                    continue

        num_unique_users = len(user_ids)

        # Get annotator-level metrics (this will be our primary query)
        await cursor.execute(
            f"""
            SELECT user_id, judgement, COUNT(*) as count
            FROM {annotations_table_name}
            GROUP BY user_id, judgement
        """
        )

        annotator_rows = await cursor.fetchall()

        # Process annotator data and aggregate totals
        annotator_stats = {}
        num_annotations = 0
        num_correct = 0
        num_wrong = 0

        for user_id, judgement, count in annotator_rows:
            if user_id not in annotator_stats:
                annotator_stats[user_id] = {"correct": 0, "wrong": 0, "total": 0}

            # Aggregate totals while processing annotator data
            num_annotations += count

            if str(judgement).lower() == "correct":
                annotator_stats[user_id]["correct"] = count
                num_correct += count
            elif str(judgement).lower() == "wrong":
                annotator_stats[user_id]["wrong"] = count
                num_wrong += count

            annotator_stats[user_id]["total"] += count

        # Get user names from the users table
        await cursor.execute(f"SELECT id, name FROM {users_table_name}")
        user_name_rows = await cursor.fetchall()
        user_id_to_name = {user_id: name for user_id, name in user_name_rows}

        # Create leaderboard data with names and calculate accuracy
        leaderboard = []
        for user_id, stats in annotator_stats.items():
            if stats["total"] > 0:  # Only include users with annotations
                accuracy = (
                    (stats["correct"] / stats["total"]) * 100
                    if stats["total"] > 0
                    else 0
                )
                leaderboard.append(
                    {
                        "user_id": user_id,
                        "name": user_id_to_name.get(user_id, f"User {user_id}"),
                        "total_annotations": stats["total"],
                        "correct": stats["correct"],
                        "wrong": stats["wrong"],
                        "accuracy": round(accuracy, 1),
                    }
                )

        # Sort by total annotations descending, then by accuracy descending
        leaderboard.sort(
            key=lambda x: (x["total_annotations"], x["accuracy"]), reverse=True
        )

        return {
            "num_runs": num_runs,
            "num_unique_users": num_unique_users,
            "num_annotations": num_annotations,
            "num_correct": num_correct,
            "num_wrong": num_wrong,
            "accuracy": (
                np.round((num_correct / num_annotations) * 100, 2)
                if num_annotations > 0
                else 0
            ),
            "leaderboard": leaderboard,
        }

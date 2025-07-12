from .config import annotations_table_name
from . import get_new_db_connection


async def add_annotations_unique_constraint():
    """
    Migration to add unique constraint on (run_id, user_id) to annotations table.
    This ensures each user can only have one annotation per run.
    """
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()

        try:
            # Check if the unique constraint already exists
            await cursor.execute(
                """
                SELECT name FROM sqlite_master 
                WHERE type='index' 
                AND tbl_name=? 
                AND sql LIKE '%UNIQUE%run_id%user_id%'
                """,
                (annotations_table_name,),
            )

            existing_constraint = await cursor.fetchone()

            if existing_constraint:
                print(
                    f"Unique constraint on (run_id, user_id) already exists for {annotations_table_name} table"
                )
                return

            # Add the unique constraint
            await cursor.execute(
                f"""
                CREATE UNIQUE INDEX idx_annotations_run_user_unique 
                ON {annotations_table_name} (run_id, user_id)
                """
            )

            await conn.commit()
        except Exception as e:
            await conn.rollback()
            print(f"Error adding unique constraint: {e}")
            raise

from utils import download_file_from_s3_as_bytes
from dotenv import load_dotenv
import json
import asyncio
import os
from db import get_last_run_time, bulk_insert_runs
from utils import delete_file_from_s3

load_dotenv()


def transform_conversation_to_run(conversation):
    return (
        conversation["id"],
        conversation["start_time"],
        conversation["end_time"],
        json.dumps(conversation["messages"]),
        json.dumps(
            {
                **conversation["metadata"],
                "context": conversation["context"],
                "trace_id": conversation["trace_id"],
                "llm": conversation["llm"],
            }
        ),
    )


async def add_new_runs_from_s3():
    file_bytes = download_file_from_s3_as_bytes(os.getenv("S3_LLM_TRACES_KEY"))
    file_str = file_bytes.decode("utf-8")
    all_conversations = json.loads(file_str)

    last_run_time = await get_last_run_time()
    new_conversations = [
        conversation
        for conversation in all_conversations
        if conversation["start_time"] > last_run_time
    ]

    new_runs = [
        transform_conversation_to_run(conversation)
        for conversation in new_conversations
    ]

    await bulk_insert_runs(new_runs)

    print(f"Added {len(new_runs)} new runs")

    delete_file_from_s3(os.getenv("S3_LLM_TRACES_KEY"))


if __name__ == "__main__":
    asyncio.run(add_new_runs_from_s3())

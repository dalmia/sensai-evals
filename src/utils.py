from dotenv import load_dotenv
import boto3
import os
from os.path import join

if "S3_BUCKET_NAME" not in os.environ:
    root_dir = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(join(root_dir, ".env"))


def download_file_from_s3_as_bytes(key: str):
    """
    Download a file from S3 bucket
    """
    bucket_name = os.getenv("S3_BUCKET_NAME")
    session = boto3.Session()
    s3_client = session.client("s3")

    response = s3_client.get_object(Bucket=bucket_name, Key=key)
    return response["Body"].read()

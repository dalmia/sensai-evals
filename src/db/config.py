import os
from os.path import exists, dirname, abspath


if exists("/appdata"):
    data_root_dir = "/appdata"
else:
    root_dir = dirname(abspath(__file__))
    data_root_dir = f"{root_dir}"

if not exists(data_root_dir):
    os.makedirs(data_root_dir)


sqlite_db_path = f"{data_root_dir}/db.evals.sqlite"
users_json_path = f"{data_root_dir}/users.json"

runs_table_name = "runs"
queues_table_name = "queues"
annotations_table_name = "annotations"
users_table_name = "users"
queue_runs_table_name = "queue_runs"

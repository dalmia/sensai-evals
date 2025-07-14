# SensAI evals

## Setup

- Install virtualenv

```bash
python3 -m venv venv
source venv/bin/activate
```

- Install dependencies

```bash
pip install -r requirements.txt
```

- Run the server

```bash
cd src && python main.py
```

The app will be available at `http://localhost:5001`

## Data pipeline

(assumes that LLM traces are being stored in S3)

- Copy `.env.example` to `.env` and fill in the values

- Sync new runs from S3 

```bash
cd src && python cron.py
```
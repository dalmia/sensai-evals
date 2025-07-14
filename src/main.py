from fasthtml.common import *
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse
from starlette.requests import Request
from starlette.responses import JSONResponse
import json

# Import modularized components
from auth import VALID_USERS, get_current_user, require_auth
from pages.runs import runs_page
from pages.queues import queues_page
from pages.queue import individual_queue_page
from dotenv import load_dotenv
from db import (
    fetch_all_runs,
    get_all_queues,
    get_queue,
    create_queue,
    get_unique_orgs_and_courses,
)
from db.config import users_json_path
import json
import os

load_dotenv()

# Create FastHTML app with session middleware and Tailwind CSS
app, rt = fast_app(
    hdrs=(
        # Add Tailwind CSS via CDN
        Link(rel="stylesheet", href="https://cdn.tailwindcss.com"),
    ),
    static_path="public",  # This serves static files from the src/public directory
)
app.add_middleware(SessionMiddleware, secret_key="your-secret-key-here")


@app.get("/")
def home(request):
    """Home page route - redirects to /runs if user is logged in, otherwise to login"""
    from auth import require_auth, get_current_user

    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    # If user is logged in, redirect to /runs
    return RedirectResponse(url="/runs", status_code=302)


@app.get("/runs")
def runs(request):
    """Runs page route - delegates to runs page"""
    return runs_page(request)


@app.get("/queues")
def queues(request):
    """Queues page route - delegates to queues page"""
    return queues_page(request)


@app.get("/queues/{queue_id}")
def queue_detail(request, queue_id: str):
    """Individual queue page route - delegates to individual queue page"""
    return individual_queue_page(request, queue_id)


@app.get("/login")
def login_page(request):
    """Login page"""
    user = get_current_user(request)
    if user:
        return RedirectResponse(url="/runs", status_code=302)

    # Generate options from VALID_USERS dictionary
    options_html = ""
    for username in VALID_USERS.keys():
        options_html += f'<option value="{username}">{username}</option>'

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SensAI evals | Login</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
        <div class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
            <h1 class="text-2xl font-bold text-gray-800 mb-8 text-center">SensAI evals</h1>
            <form method="post" action="/login">
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <select name="username" id="username" required class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                        <option value="" disabled selected>Select username</option>
                        {options_html}
                    </select>
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input type="password" name="password" id="password" required placeholder="Enter password" class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200">Login</button>
            </form>
        </div>
    </body>
    </html>
    """


@app.post("/login")
async def login_post(request):
    """Handle login form submission"""
    form_data = await request.form()
    username = form_data.get("username")
    password = form_data.get("password")

    if username in VALID_USERS and VALID_USERS[username]["password"] == password:
        request.session["user"] = username
        return RedirectResponse(url="/runs", status_code=302)
    else:
        return Html(
            Head(Title("Login Failed - FastHTML Auth")),
            Body(
                Div(
                    H2("Login Failed", cls="text-2xl font-bold text-red-600 mb-4"),
                    P(
                        "Invalid username or password. Please try again.",
                        cls="text-gray-600 mb-6",
                    ),
                    A(
                        "Back to Login",
                        href="/login",
                        cls="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200",
                    ),
                    cls="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center",
                ),
                cls="bg-gray-100 min-h-screen flex items-center justify-center",
            ),
        )


@app.get("/logout")
def logout(request):
    """Logout and clear session"""
    request.session.clear()
    return RedirectResponse(url="/login", status_code=302)


@app.get("/api/runs")
async def get_runs_api(request: Request):
    """API endpoint to get filtered and paginated runs"""
    try:
        # Get query params
        params = request.query_params
        annotation_filter = params.get("annotation_filter")
        time_range = params.get("time_range")
        org_id = params.get("org_id")
        course_id = params.get("course_id")
        run_type = params.get("run_type")
        purpose = params.get("purpose")
        question_type = params.get("question_type")
        question_input_type = params.get("question_input_type")
        page = int(params.get("page", 1))
        page_size = int(params.get("page_size", 20))
        sort_by = params.get("sort_by", "timestamp")
        sort_order = params.get("sort_order", "desc")

        # Get current user ID for annotation filtering
        annotation_filter_user_id = None
        if annotation_filter:
            user = get_current_user(request)
            if user and user in VALID_USERS:
                annotation_filter_user_id = VALID_USERS[user]["id"]

        # Support multiple values for comma-separated filters
        def parse_multi(val):
            if val is None:
                return None
            return [v.strip() for v in val.split(",") if v.strip()]

        run_type = parse_multi(run_type)
        purpose = parse_multi(purpose)
        question_type = parse_multi(question_type)
        question_input_type = parse_multi(question_input_type)
        org_ids = parse_multi(org_id)
        course_ids = parse_multi(course_id)

        org_ids = [int(id) for id in org_ids] if org_ids else None
        course_ids = [int(id) for id in course_ids] if course_ids else None

        # Call fetch_all_runs with all filters, pagination, and sorting
        runs_data, total_count = await fetch_all_runs(
            annotation_filter=annotation_filter,
            time_range=time_range,
            org_ids=org_ids,
            course_ids=course_ids,
            run_type=run_type,
            purpose=purpose,
            question_type=question_type,
            question_input_type=question_input_type,
            page=page,
            page_size=page_size,
            annotation_filter_user_id=annotation_filter_user_id,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        total_pages = (total_count + page_size - 1) // page_size
        return JSONResponse(
            {
                "runs": runs_data,
                "total_count": total_count,
                "total_pages": total_pages,
                "current_page": page,
            }
        )
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/queues")
async def get_queues_api(request: Request):
    """API endpoint to get all queues"""
    # Check authentication
    auth_redirect = require_auth(request)
    if auth_redirect:
        return JSONResponse({"error": "Authentication required"}, status_code=401)

    try:
        queues_data = await get_all_queues()
        current_user = get_current_user(request)
        return JSONResponse({"queues": queues_data, "user": current_user})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/queues/{queue_id}")
async def get_queue_api(queue_id: str, request: Request):
    """API endpoint to get a specific queue with pagination support"""
    try:
        # Get pagination parameters from query string
        params = request.query_params
        page = int(params.get("page", 1))
        page_size = int(params.get("page_size", 20))

        queue_data, total_count = await get_queue(int(queue_id), page, page_size)
        total_pages = (total_count + page_size - 1) // page_size

        return JSONResponse(
            {
                "queue": queue_data,
                "total_count": total_count,
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size,
            }
        )
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/filter_data")
async def get_filter_data():
    """API endpoint to get the data required for the filters section"""
    try:
        data = await get_unique_orgs_and_courses()
        return JSONResponse(data)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/queues")
async def create_queue_api(request: Request):
    """API endpoint to create a new queue"""
    # Check authentication
    auth_redirect = require_auth(request)
    if auth_redirect:
        return JSONResponse({"error": "Authentication required"}, status_code=401)

    try:
        # Parse JSON body
        body = await request.json()
        name = body.get("name")
        description = body.get("description", "")
        run_ids = body.get("run_ids", [])
        select_all_filtered = body.get("select_all_filtered", False)
        filters = body.get("filters", {})

        if not name:
            return JSONResponse({"error": "Queue name is required"}, status_code=400)

        # Get current user
        user = get_current_user(request)
        user_id = VALID_USERS[user]["id"]

        # If select_all_filtered is True, pass filters to create_queue
        if select_all_filtered:
            # Parse the filters
            annotation_filter = filters.get("annotation_filter")
            time_range = filters.get("time_range")
            org_id = filters.get("org_id")
            course_id = filters.get("course_id")
            run_type = filters.get("run_type")
            purpose = filters.get("purpose")
            question_type = filters.get("question_type")
            question_input_type = filters.get("question_input_type")

            # Get current user ID for annotation filtering
            annotation_filter_user_id = None
            if annotation_filter:
                annotation_filter_user_id = user_id

            # Support multiple values for comma-separated filters
            def parse_multi(val):
                if val is None:
                    return None
                return [v.strip() for v in val.split(",") if v.strip()]

            run_type = parse_multi(run_type)
            purpose = parse_multi(purpose)
            question_type = parse_multi(question_type)
            question_input_type = parse_multi(question_input_type)
            org_ids = parse_multi(org_id)
            course_ids = parse_multi(course_id)

            org_ids = [int(id) for id in org_ids] if org_ids else None
            course_ids = [int(id) for id in course_ids] if course_ids else None

            # Create the queue with filters
            new_queue = await create_queue(
                name=name,
                description=description,
                user_id=user_id,
                annotation_filter=annotation_filter,
                annotation_filter_user_id=annotation_filter_user_id,
                time_range=time_range,
                org_ids=org_ids,
                course_ids=course_ids,
                run_type=run_type,
                purpose=purpose,
                question_type=question_type,
                question_input_type=question_input_type,
            )
        else:
            # Create the queue with specific run IDs
            new_queue = await create_queue(name, description, user_id, run_ids)

        return JSONResponse({"success": True, "queue_id": new_queue})

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/annotations")
async def create_annotation_api(request: Request):
    """API endpoint to create a new annotation"""
    # Check authentication
    auth_redirect = require_auth(request)
    if auth_redirect:
        return JSONResponse({"error": "Authentication required"}, status_code=401)

    try:
        # Parse JSON body
        body = await request.json()
        run_id = body.get("run_id")
        judgement = body.get("judgement")
        notes = body.get("notes", "")

        if not run_id or not judgement:
            return JSONResponse(
                {"error": "Run ID and judgement are required"}, status_code=400
            )

        # Get current user
        user = get_current_user(request)
        user_id = VALID_USERS[user]["id"]

        # Import create_annotation function
        from db import create_annotation

        # Create the annotation
        await create_annotation(
            run_id=run_id, user_id=user_id, judgement=judgement, notes=notes
        )

        return JSONResponse({"success": True})

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


serve()


@app.post("/api/users")
async def create_user_api(request: Request):
    """API endpoint to create a new user"""
    try:
        body = await request.json()
        name = body.get("name")
        if not name:
            return JSONResponse({"error": "Name is required"}, status_code=400)

        from db import create_user

        user_id = await create_user(name)

        users = json.load(open(users_json_path))
        users[name] = {"id": user_id, "password": "admin"}
        json.dump(users, open(users_json_path, "w"))

        return JSONResponse({"success": True, "user_id": user_id})

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

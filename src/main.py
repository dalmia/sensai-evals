from fasthtml.common import *
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse

# Import modularized components
from auth import VALID_USERS, get_current_user
from pages.runs import runs_page
from pages.queues import queues_page
from pages.queue import individual_queue_page
from dotenv import load_dotenv
from utils import download_file_from_s3_as_bytes
import json
import os

load_dotenv()

# Global variable to store app data
app_data = None

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
    """Home page route - shows spinner and loads data before delegating to runs page"""
    from auth import require_auth, get_current_user
    from components.header import create_header

    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    user = get_current_user(request)

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SensAI evals | Home</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        {create_header(user, "runs")}
        
        <!-- Loading Spinner -->
        <div id="loadingSpinner" class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p class="text-gray-600 text-lg">Loading data...</p>
            </div>
        </div>
        
        <script>
            // Load data on page load
            window.addEventListener('DOMContentLoaded', function() {{
                fetch('/api/data')
                    .then(response => response.json())
                    .then(data => {{
                        if (data.error) {{
                            console.error('Error loading data:', data.error);
                            document.getElementById('loadingSpinner').innerHTML = `
                                <div class="text-center">
                                    <div class="text-red-500 text-xl mb-4">⚠️</div>
                                    <p class="text-red-600 text-lg">Error loading data</p>
                                    <p class="text-gray-600">${{data.error}}</p>
                                </div>
                            `;
                            return;
                        }}
                        
                        // Data loaded successfully, now navigate to runs page
                        window.location.href = '/runs';
                    }})
                    .catch(error => {{
                        console.error('Error:', error);
                        document.getElementById('loadingSpinner').innerHTML = `
                            <div class="text-center">
                                <div class="text-red-500 text-xl mb-4">⚠️</div>
                                <p class="text-red-600 text-lg">Network error</p>
                                <p class="text-gray-600">Please check your connection and try again</p>
                            </div>
                        `;
                    }});
            }});
        </script>
    </body>
    </html>
    """


@app.get("/runs")
def runs(request):
    """Runs page route - delegates to runs page with server-side data"""
    global app_data
    if not app_data:
        print("No data loaded, redirecting to home")
        # If no data loaded, redirect to home to load data
        return RedirectResponse(url="/", status_code=302)

    return runs_page(request, app_data)


@app.get("/queues")
def queues(request):
    """Queues page route - delegates to queues page with server-side data"""
    global app_data
    if not app_data:
        print("No data loaded, redirecting to home")
        # If no data loaded, redirect to home to load data
        return RedirectResponse(url="/", status_code=302)
    return queues_page(request, app_data)


@app.get("/queues/{queue_id}")
def queue_detail(request, queue_id: str):
    """Individual queue page route - delegates to individual queue page with server-side data"""
    global app_data
    if not app_data:
        print("No data loaded, redirecting to home")
        # If no data loaded, redirect to home to load data
        return RedirectResponse(url="/", status_code=302)
    return individual_queue_page(request, queue_id, app_data)


@app.get("/login")
def login_page(request):
    """Login page"""
    user = get_current_user(request)
    if user:
        return RedirectResponse(url="/", status_code=302)

    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>SensAI evals | Login</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
        <div class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
            <h1 class="text-2xl font-bold text-gray-800 mb-8 text-center">Authentication Required</h1>
            <form method="post" action="/login">
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <select name="username" id="username" required class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                        <option value="" disabled selected>Select username</option>
                        <option value="Aman">Aman</option>
                        <option value="Piyush">Piyush</option>
                        <option value="Gayathri">Gayathri</option>
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

    if username in VALID_USERS and VALID_USERS[username] == password:
        request.session["user"] = username
        return RedirectResponse(url="/", status_code=302)
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


from fastcore.xtras import timed_cache


# @timed_cache(seconds=3600)
def get_app_data():
    """Fetch data from S3 - both queues and conversations"""
    env = os.getenv("ENV")
    if not env:
        return {"error": "ENV environment variable not set"}

    # Fetch queues data
    queues_key = f"{env}/evals/queues_dummy.json"
    queues_bytes = download_file_from_s3_as_bytes(queues_key)
    queues_data = json.loads(queues_bytes.decode("utf-8"))

    conversations_data = []

    # # Fetch conversations data
    conversations_key = f"{env}/evals/conversations_dummy.json"
    conversations_bytes = download_file_from_s3_as_bytes(conversations_key)
    conversations_data = json.loads(conversations_bytes.decode("utf-8"))

    # Store data globally on the server
    return {"queues": queues_data, "conversations": conversations_data}


@app.get("/api/data")
async def get_data():
    """Fetch data from S3 - both queues and conversations"""
    global app_data
    try:
        app_data = get_app_data()
        return app_data

    except Exception as e:
        return {"error": str(e)}


serve()

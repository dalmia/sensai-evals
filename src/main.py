from fasthtml.common import *
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse

# Import modularized components
from auth import VALID_USERS, get_current_user
from pages.runs import runs_page
from pages.queues import queues_page
from pages.queue import individual_queue_page

# Create FastHTML app with session middleware and Tailwind CSS
app = FastHTML(
    hdrs=(
        # Add Tailwind CSS via CDN
        Link(rel="stylesheet", href="https://cdn.tailwindcss.com"),
    )
)
app.add_middleware(SessionMiddleware, secret_key="your-secret-key-here")


@app.get("/")
def home(request):
    """Home page route - delegates to runs page"""
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


serve()

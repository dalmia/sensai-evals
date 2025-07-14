import json
from starlette.responses import RedirectResponse
from db.config import users_json_path

# Valid credentials
VALID_USERS = json.load(open(users_json_path))


def get_current_user(request):
    """Get current logged in user from session"""
    return request.session.get("user")


def require_auth(request):
    """Check if user is authenticated, redirect to login if not"""
    if not get_current_user(request):
        return RedirectResponse(url="/login", status_code=302)
    return None

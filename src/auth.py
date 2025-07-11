from starlette.responses import RedirectResponse

# Valid credentials
VALID_USERS = {"Aman": "admin", "Piyush": "admin", "Gayathri": "admin"}


def get_current_user(request):
    """Get current logged in user from session"""
    return request.session.get("user")


def require_auth(request):
    """Check if user is authenticated, redirect to login if not"""
    if not get_current_user(request):
        return RedirectResponse(url="/login", status_code=302)
    return None

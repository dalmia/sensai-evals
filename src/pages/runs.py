from auth import require_auth, get_current_user
from components.header import create_header
from components.filters import create_filters_sidebar
import json


def runs_page(request, app_data):
    """Protected home page - redirects to login if not authenticated"""
    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    user = get_current_user(request)

    runs = app_data.get("conversations", [])

    def extract_unique_organizations(runs):
        """Extract unique organizations from runs data"""
        orgs = {}
        for run in runs:
            metadata = run.get("metadata", {})
            org = metadata.get("org", {})
            if org and "id" in org and "name" in org:
                orgs[org["id"]] = {"id": org["id"], "name": org["name"]}
        return list(orgs.values())

    def extract_unique_courses(runs):
        """Extract unique courses from runs data"""
        courses = {}
        for run in runs:
            metadata = run.get("metadata", {})
            course = metadata.get("course", {})
            if course and "id" in course and "name" in course:
                courses[course["id"]] = {"id": course["id"], "name": course["name"]}
        return list(courses.values())

    # Extract unique organizations and courses
    organizations = extract_unique_organizations(runs)
    courses = extract_unique_courses(runs)

    # Calculate annotation statistics
    annotated_count = len(
        [r for r in runs if r.get("annotations") and r["annotations"]]
    )

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SensAI evals | Runs</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        {create_header(user, "runs")}
        
        <!-- Main Content -->
        <div class="flex">
            {create_filters_sidebar(organizations, courses)}
            
            <!-- Main Content Area -->
            <div class="flex-1 bg-gray-50">
                <!-- Header -->
                <div class="bg-white border-b border-t border-gray-200 px-6 py-4">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-4">
                            <h2 class="text-lg font-semibold text-gray-900">All runs ({len(runs)})</h2>
                            <span class="text-sm text-gray-500">Annotated {annotated_count}/{len(runs)}</span>
                        </div>
                        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                            Create annotation queue
                        </button>
                    </div>
                </div>
                
                <!-- Run Details Header -->
                <div class="bg-white border-b border-gray-200 px-6 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <input type="checkbox" id="selectAllCheckbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" onchange="toggleSelectAll()">
                            <span id="selectedCount" class="text-sm text-gray-500 hidden"></span>
                        </div>
                        <div class="flex items-center space-x-8">
                            <div class="flex items-center justify-center w-12">
                                <span class="text-sm text-gray-500">Status</span>
                            </div>
                            <div class="flex items-center" id="timestampHeader">
                                <button onclick="toggleTimestampSort()" class="flex items-center text-gray-500 hover:text-gray-700 p-1 rounded transition-colors">
                                    <span class="text-sm font-medium">Timestamp</span>
                                    <div class="ml-1" id="timestampArrow">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </div>
                                </button>
                            </div>
                            <div class="w-5 h-5"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Runs List -->
                <div class="bg-white" id="runsList">
                    
                </div>
            </div>
        </div>
        
        <script src="/js/runs.js"></script>
        <script>
            // Initialize runs data
            initializeRunsData({json.dumps(runs)});
        </script>
    </body>
    </html>
    """

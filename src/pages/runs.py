from auth import require_auth, get_current_user
from components.header import create_header
from components.filters import create_filters_sidebar
from fasthtml.common import Script, ScriptX
import json


def runs_page(request, app_data):
    """Protected home page - redirects to login if not authenticated"""
    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    user = get_current_user(request)

    runs = app_data.get("runs", [])

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

    # Import the runs.js file
    runs_script = ScriptX("js/runs.js")

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
        <div class="flex h-screen">
            {create_filters_sidebar(organizations, courses)}
            
            <!-- Main Content Area -->
            <div class="flex-1 bg-gray-50 flex flex-col">
                <!-- Header -->
                <div class="bg-white border-b border-t border-gray-200 px-6 py-4">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-4">
                            <h2 id="runsHeader" class="text-lg font-semibold text-gray-900">All runs ({len(runs)})</h2>
                            <span id="annotatedCount" class="text-sm text-gray-500">Annotated {annotated_count}/{len(runs)}</span>
                        </div>
                        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                            Create annotation queue
                        </button>
                    </div>
                </div>
                
                <!-- Pagination -->
                <div class="bg-white border-b border-gray-200 px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <span class="text-sm text-gray-700">Showing</span>
                            <span id="paginationInfo" class="text-sm font-medium text-gray-900">1-50</span>
                            <span class="text-sm text-gray-700">of</span>
                            <span id="totalRunsCount" class="text-sm font-medium text-gray-900">{len(runs)}</span>
                            <span class="text-sm text-gray-700">runs</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button id="prevPageBtn" onclick="previousPage()" class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                Previous
                            </button>
                            <div id="pageNumbers" class="flex items-center space-x-1">
                                <!-- Page numbers will be generated here -->
                            </div>
                            <button id="nextPageBtn" onclick="nextPage()" class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                Next
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Run Details Header -->
                <div class="bg-white border-b border-gray-200 px-6 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <input type="checkbox" id="selectAllCheckbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" onchange="toggleSelectAll()">
                            <span id="selectedCount" class="text-sm text-gray-500 hidden"></span>
                        </div>
                        <div class="flex items-center space-x-10">
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
                <div class="bg-white flex-1 overflow-y-auto" id="runsList">
                    <!-- Loading Spinner -->
                    <div id="loadingSpinner" class="flex items-center justify-center py-12">
                        <div class="flex items-center space-x-2">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {runs_script}
        <script>
            // Initialize runs data with pagination settings
            initializeRunsData({json.dumps(runs)}, 50);
        </script>
    </body>
    </html>
    """

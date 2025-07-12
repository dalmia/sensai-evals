from auth import require_auth, get_current_user
from components.header import create_header
from components.annotation_sidebar import create_annotation_sidebar
from components.metadata_sidebar import create_metadata_sidebar
from fasthtml.common import ScriptX
import json


def individual_queue_page(request, queue_id, app_data):
    """Protected individual queue page"""
    queue_id = int(queue_id)

    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    user = get_current_user(request)

    # Get runId from query parameters for state restoration
    run_id_param = request.query_params.get("runId", "")

    # Use queues data from session (fallback to empty list if not available)
    queues = app_data.get("queues", [])

    # Find the queue by ID
    queue = next((q for q in queues if q["id"] == queue_id), None)
    if not queue:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>SensAI evals | Queue Not Found</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 min-h-screen">
            {create_header(user, "queues")}
            <div class="flex items-center justify-center h-screen">
                <div class="text-center">
                    <h1 class="text-2xl font-bold text-gray-900 mb-4">Queue Not Found</h1>
                    <p class="text-gray-600 mb-6">The requested queue could not be found.</p>
                    <a href="/queues" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        Back to Queues
                    </a>
                </div>
            </div>
        </body>
        </html>
        """

    # Get runs directly from queue.runs (new data structure)
    runs = queue.get("runs", [])

    # Helper function to get annotation status from run data
    def get_annotation_status(run):
        if not run.get("annotations"):
            return None

        # Only check annotations from the logged-in user
        annotation_data = run["annotations"].get(user)
        if annotation_data and annotation_data.get("judgement"):
            judgement = annotation_data.get("judgement")
            if judgement in ["correct", "wrong"]:
                return judgement

        return None

    # Helper function to create run name from metadata
    def get_run_name(run):
        metadata = run.get("metadata", {})
        run_id = run.get("id", "unknown")
        course_name = metadata.get("course", {}).get("name", "")
        milestone_name = metadata.get("milestone", {}).get("name", "")
        org_name = metadata.get("org", {}).get("name", "")
        task_title = metadata.get("task_title", "")
        question_title = metadata.get("question_title", "")
        run_type = metadata.get("type", "")

        run_name = ""

        # Start with task title if available
        if task_title:
            run_name = task_title

        # For quiz types, add question title after task title
        if run_type == "quiz" and question_title:
            if run_name:
                run_name += f" - {question_title}"
            else:
                run_name = question_title

        # Add course and milestone information
        if course_name and milestone_name:
            if run_name:
                run_name += f" - {course_name} - {milestone_name}"
            else:
                run_name = f"{course_name} - {milestone_name}"
        elif course_name:
            if run_name:
                run_name += f" - {course_name}"
            else:
                run_name = course_name

        # If no meaningful name constructed, use run ID
        if not run_name:
            run_name = f"Run {run_id}"

        # Add organization name at the end
        if org_name:
            run_name = f"{run_name} ({org_name})"

        return run_name

    # Helper function to extract tags from run metadata
    def get_run_tags(run):
        """Extract tags from run metadata"""
        metadata = run.get("metadata", {})
        tags = []

        # Extract relevant tag fields
        relevant_keys = [
            "question_input_type",
            "question_type",
            "question_purpose",
            "type",
        ]
        for key in relevant_keys:
            value = metadata.get(key)
            if value:
                tags.append(value)

        return tags

    # Helper function to format timestamp
    def format_run_timestamp(run):
        """Format run timestamp for display"""
        timestamp = run.get("start_time", "")
        if timestamp:
            try:
                from datetime import datetime

                dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                return dt.strftime("%b %d, %Y at %I:%M %p")
            except:
                return timestamp
        return ""

    # Generate queue runs using the JavaScript function
    queue_runs_html = ""  # Will be populated by JavaScript

    # Import the JavaScript for individual queue functionality
    queue_script = ScriptX("js/queue.js")

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SensAI evals | {queue["name"]}</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        {create_header(user, "queues")}
        
        <!-- Main Content -->
        <div class="flex h-screen overflow-hidden">
            <!-- Runs Sidebar Card -->
            <div class="p-4 flex-shrink-0">
                <div class="w-96 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <!-- Queue Header -->
                    <div class="p-4 border-b border-gray-200">
                        <h2 class="text-lg font-semibold text-gray-900">{queue["name"]} ({len(runs)})</h2>
                        <p class="text-sm text-gray-500">Created by {queue["user_name"]}</p>
                    </div>
                    
                    <!-- Filters and Timestamp Header -->
                    <div class="bg-gray-50 border-b border-gray-200 px-4 py-3">
                        <div class="flex items-center justify-between space-x-3">
                            <div class="flex items-center space-x-3">
                                <!-- Annotator Filter -->
                                <div class="relative">
                                    <div class="text-xs text-gray-500 mb-1">Annotator</div>
                                    <button onclick="toggleAnnotatorFilter()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-300 flex items-center space-x-1">
                                        <span id="currentAnnotator">{user}</span>
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </button>
                                    <div id="annotatorFilterDropdown" class="absolute left-0 mt-1 w-28 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden">
                                        <div class="py-1">
                                            <button onclick="filterByAnnotator('Aman')" class="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">Aman</button>
                                            <button onclick="filterByAnnotator('Piyush')" class="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">Piyush</button>
                                            <button onclick="filterByAnnotator('Gayathri')" class="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">Gayathri</button>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Status Filter -->
                                <div class="relative">
                                    <div class="text-xs text-gray-500 mb-1">Status</div>
                                    <button onclick="toggleAnnotationFilter()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-300 flex items-center space-x-1">
                                        <span id="currentFilter">All</span>
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </button>
                                    <div id="annotationFilterDropdown" class="absolute left-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden">
                                        <div class="py-1">
                                            <button onclick="filterByAnnotation('all')" class="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">All</button>
                                            <button onclick="filterByAnnotation('empty')" class="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">Not Annotated</button>
                                            <button onclick="filterByAnnotation('correct')" class="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">Correct</button>
                                            <button onclick="filterByAnnotation('wrong')" class="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">Wrong</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Timestamp Sorting -->
                            <div class="flex items-center" id="timestampHeader">
                                <div class="relative">
                                    <div class="text-xs text-gray-500 mb-1">Sort by</div>
                                    <button onclick="toggleTimestampSort()" class="flex items-center text-gray-700 hover:text-gray-900 p-1 rounded transition-colors">
                                        <span class="text-xs font-medium">Created At</span>
                                        <div class="ml-1" id="timestampArrow">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Queue Runs List -->
                    <div id="runsList" class="overflow-y-auto" style="height: calc(100vh - 280px);">
                        
                    </div>
                </div>
            </div>
            
            <!-- Main Content Area -->
            <div class="flex-1 transition-all duration-300 relative p-4" id="mainContent">
                <div class="bg-white rounded-lg shadow-sm flex items-center justify-center" style="height: calc(100vh - 120px);">
                    <div class="text-center">
                        <div class="text-gray-400 mb-4">
                            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No run selected</h3>
                        <p class="text-sm text-gray-500">Select a run from the queue to view its details</p>
                    </div>
                </div>
            </div>
            
            {create_metadata_sidebar()}
            
            {create_annotation_sidebar()}
        </div>
        
        {queue_script}
        <script>
            // Initialize queue data
            initializeQueueData({json.dumps({"queue": queue, "runs": runs, "user": user, "selectedRunId": run_id_param})});
        </script>
    </body>
    </html>
    """

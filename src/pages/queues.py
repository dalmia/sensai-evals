from auth import require_auth, get_current_user
from components.header import create_header
from components.queue_item import create_queue_item
from components.queue_run_row import create_queue_run_row
from fasthtml.common import ScriptX
import json
from datetime import datetime


def queues_page(request, app_data):
    """Protected annotation queues page"""
    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    user = get_current_user(request)

    # Get queueId from query parameters for state restoration
    queue_id_param = request.query_params.get("queueId", "")
    run_id_param = request.query_params.get("runId", "")

    # Use queues data from session (fallback to empty list if not available)
    queues = app_data.get("queues", [])

    # For now, use empty queue_runs until we have that data structure from API
    queue_runs = {}

    # Sample annotators data (this should ideally come from the API too)
    annotators = [
        "Aman",
        "Piyush",
        "Gayathri",
        "Priya",
        "Rahul",
        "Sneha",
        "Vikram",
        "Ananya",
    ]

    # Helper function to format ISO timestamp to human readable format
    def format_timestamp(iso_timestamp):
        try:
            # Parse ISO timestamp
            dt = datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
            # Format to human readable format: "Jul 10, 2025 at 6:01 PM"
            return dt.strftime("%b %d, %Y at %I:%M %p")
        except:
            # Return original timestamp if parsing fails
            return iso_timestamp

    # Generate all queue items
    queues_html = "".join(
        [
            create_queue_item(
                queue["name"],
                len(queue["runs"]),
                format_timestamp(queue["created_at"]),
                queue["user_name"],
                queue["id"],
            )
            for queue in queues
        ]
    )

    # Convert queues and queue_runs to JSON for JavaScript
    queues_json = json.dumps(queues)
    queue_runs_json = json.dumps(queue_runs)

    # Create initialization data object
    init_data = {
        "queues": queues,
        "user": user,
        "selectedQueueId": queue_id_param,
        "selectedRunId": run_id_param,
    }
    init_data_json = json.dumps(init_data)

    # Import the queues.js file
    queues_script = ScriptX("js/queues.js")

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SensAI evals | Annotation Queues</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        {create_header(user, "queues")}
        
        <!-- Main Content -->
        <div class="flex h-screen">
            <!-- Queues Sidebar -->
            <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
                <!-- Annotator Filter -->
                <div class="p-4 border-b border-gray-200">
                    <div class="relative">
                        <div class="text-sm text-gray-500 mb-2">Annotator</div>
                        <button onclick="toggleAnnotatorFilter()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 flex items-center space-x-2">
                            <span id="currentAnnotator">{user}</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div id="annotatorFilterDropdown" class="absolute left-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden">
                            <div class="py-1">
                                <button onclick="filterByAnnotator('Aman')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Aman</button>
                                <button onclick="filterByAnnotator('Piyush')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Piyush</button>
                                <button onclick="filterByAnnotator('Gayathri')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Gayathri</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Queue Items -->
                <div class="flex-1 overflow-y-auto">
                    {queues_html}
                </div>
            </div>
            
            <!-- Main Content Area -->
            <div class="flex-1 bg-gray-50" id="mainContent">
                <div class="flex items-center justify-center h-full">
                    <div class="text-center">
                        <div class="text-gray-400 mb-4">
                            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No queue selected</h3>
                        <p class="text-sm text-gray-500">Select an annotation queue from the list to view and annotate its runs</p>
                    </div>
                </div>
            </div>
        </div>
        
        {queues_script}
        <script>
            // Initialize queues data
            initializeQueuesData({init_data_json});
        </script>
    </body>
    </html>
    """

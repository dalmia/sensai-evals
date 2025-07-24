from auth import require_auth, get_current_user, VALID_USERS
from components.header import create_header
from components.annotation_sidebar import create_annotation_sidebar
from components.metadata_sidebar import create_metadata_sidebar
from components.queue_runs_list import create_queue_runs_list
from fasthtml.common import ScriptX
import json


def individual_queue_page(request, queue_id):
    """Protected individual queue page"""
    queue_id = int(queue_id)

    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    user = get_current_user(request)

    # Get runId from query parameters for state restoration
    run_id_param = request.query_params.get("runId", "")
    page_param = int(request.query_params.get("page", 1))

    # Import the JavaScript for individual queue functionality
    chat_history_script = ScriptX("js/components/chat_history.js")
    annotation_sidebar_script = ScriptX("js/components/annotation_sidebar.js")
    metadata_sidebar_script = ScriptX("js/components/metadata_sidebar.js")
    selected_run_view_script = ScriptX("js/components/selected_run_view.js")
    queue_script = ScriptX("js/queue.js")
    queue_run_row_script = ScriptX("js/components/queue_run_row.js")

    # Get annotators from VALID_USERS
    annotators = list(VALID_USERS.keys())

    # Generate annotator filter dropdown HTML
    annotator_filter_html = ""
    for annotator in annotators:
        annotator_filter_html += f'<button onclick="filterByAnnotator(\'{annotator}\')" class="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">{annotator}</button>'

    # Prepare JavaScript variables
    js_queue_id = str(queue_id)
    js_user = user
    js_run_id_param = run_id_param
    js_page_param = str(page_param)

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SensAI evals | Annotate</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        {create_header(user, "queues")}
        
        <!-- Main Content -->
        <div class="flex h-screen overflow-hidden">
            <div class="flex flex-col">
                 <div class="p-4 px-6 pb-0">
                    <h1 id="queueHeader" class="text-xl font-semibold text-gray-900 mb-1">Loading queue...</h1>
                </div>
                
                <!-- Runs Sidebar Card -->
                <div class="p-4 flex-shrink-0">
                    {create_queue_runs_list(user, annotator_filter_html)}
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
                        <h3 class="text-lg font-medium text-gray-900 mb-2">Loading queue...</h3>
                    </div>
                </div>
            </div>
            
            {create_metadata_sidebar()}
            
            {create_annotation_sidebar()}
        </div>
        
        {chat_history_script}
        {annotation_sidebar_script}
        {metadata_sidebar_script}
        {selected_run_view_script}
        {queue_run_row_script}
        {queue_script}
        
        <script>
            // Load data from API when page loads
            window.addEventListener('DOMContentLoaded', function() {{
                loadQueueData({js_queue_id}, '{js_user}', '{js_run_id_param}', {js_page_param});
            }});
        </script>
    </body>
    </html>
    """

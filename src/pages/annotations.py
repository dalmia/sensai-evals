from auth import require_auth, get_current_user, VALID_USERS
from components.header import create_header
from components.annotation_sidebar import create_annotation_sidebar
from components.metadata_sidebar import create_metadata_sidebar
from components.filtered_runs_list import create_filtered_runs_list
from fasthtml.common import ScriptX
import json


def annotations_page(request):
    """Protected annotations page"""
    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    user = get_current_user(request)

    # Get runId from query parameters for state restoration
    run_id_param = request.query_params.get("runId", "")

    # Import the JavaScript for annotations functionality
    chat_history_script = ScriptX("js/components/chat_history.js")
    annotation_sidebar_script = ScriptX("js/components/annotation_sidebar.js")
    metadata_sidebar_script = ScriptX("js/components/metadata_sidebar.js")
    selected_run_view_script = ScriptX("js/components/selected_run_view.js")
    annotations_script = ScriptX("js/annotations.js")
    filtered_run_row_script = ScriptX("js/components/filtered_run_row.js")

    # Get annotators from VALID_USERS
    annotators = list(VALID_USERS.keys())

    # Generate annotator filter dropdown HTML
    annotator_filter_html = '<button onclick="filterByAnnotator(\'all\')" class="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">All</button>'
    for annotator in annotators:
        annotator_filter_html += f'<button onclick="filterByAnnotator(\'{annotator}\')" class="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">{annotator}</button>'

    # Prepare JavaScript variables
    js_user = user
    js_run_id_param = run_id_param

    # Use the existing filtered_runs_list component
    runs_list = create_filtered_runs_list(
        user, annotator_filter_html, show_not_annotated=False
    )

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SensAI evals | Annotations</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        {create_header(user, "annotations")}
        
        <!-- Main Content -->
        <div class="flex h-screen overflow-hidden">
            <div class="flex flex-col">
                 <div class="p-4 px-6 pb-0">
                    <h1 id="annotationsHeader" class="text-xl font-semibold text-gray-900 mb-1">Annotations</h1>
                </div>
                
                <!-- Runs Sidebar Card -->
                <div class="p-4 flex-shrink-0">
                    {runs_list}
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
                        <h3 class="text-lg font-medium text-gray-900 mb-2">Loading annotations...</h3>
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
        {filtered_run_row_script}
        {annotations_script}
        
        <script>
            // Load data from API when page loads
            window.addEventListener('DOMContentLoaded', function() {{
                loadAnnotationsData('{js_user}', '{js_run_id_param}');
            }});
        </script>
    </body>
    </html>
    """

from auth import require_auth, get_current_user, VALID_USERS
from components.header import create_header
from components.annotation_sidebar import create_annotation_sidebar
from components.metadata_sidebar import create_metadata_sidebar
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

    # Import the JavaScript for individual queue functionality
    queue_script = ScriptX("js/queue.js")

    # Get annotators from VALID_USERS
    annotators = list(VALID_USERS.keys())

    # Generate annotator filter dropdown HTML
    annotator_filter_html = ""
    for annotator in annotators:
        annotator_filter_html += f'<button onclick="filterByAnnotator(\'{annotator}\')" class="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">{annotator}</button>'

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
            <!-- Runs Sidebar Card -->
            <div class="p-4 flex-shrink-0">
                <div class="w-96 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <!-- Queue Header -->
                    <div class="p-4 border-b border-gray-200">
                        <h2 id="queueHeader" class="text-lg font-semibold text-gray-900">Loading queue...</h2>
                        <p id="queueCreator" class="text-sm text-gray-500">Loading...</p>
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
                                            {annotator_filter_html}
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
                        <!-- Loading Spinner -->
                        <div id="loadingSpinner" class="flex items-center justify-center py-12">
                            <div class="flex items-center space-x-2">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        </div>
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
                        <h3 class="text-lg font-medium text-gray-900 mb-2">Loading queue...</h3>
                    </div>
                </div>
            </div>
            
            {create_metadata_sidebar()}
            
            {create_annotation_sidebar()}
        </div>
        
        {queue_script}
        <script>
            // Load data from API when page loads
            window.addEventListener('DOMContentLoaded', function() {{
                loadQueueData({queue_id}, '{run_id_param}');
            }});
        </script>
    </body>
    </html>
    """

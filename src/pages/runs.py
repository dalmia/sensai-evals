from auth import require_auth, get_current_user
from components.header import create_header
from components.filters import create_filters_sidebar
from fasthtml.common import Script, ScriptX
import json


def runs_page(request):
    """Protected home page - redirects to login if not authenticated"""
    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    user = get_current_user(request)

    # Import the runs.js file
    runs_script = ScriptX("js/runs.js")

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SensAI evals | Runs</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">
        <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        {create_header(user, "runs")}
        
        <!-- Main Content -->
        <div class="flex h-screen">
            <!-- Filters Sidebar - will be populated after data loads -->
            <div id="filtersSidebar" class="w-64 bg-white border-r border-gray-200 overflow-y-auto">
                <!-- Loading placeholder for filters -->
                <div class="p-4">
                    <div class="animate-pulse">
                        <div class="h-4 bg-gray-200 rounded mb-4"></div>
                        <div class="h-4 bg-gray-200 rounded mb-4"></div>
                        <div class="h-4 bg-gray-200 rounded mb-4"></div>
                    </div>
                </div>
            </div>
            
            <!-- Main Content Area -->
            <div class="flex-1 bg-gray-50 flex flex-col">
                <!-- Header -->
                <div class="bg-white border-b border-t border-gray-200 px-6 py-4">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-4">
                            <h2 id="runsHeader" class="text-lg font-semibold text-gray-900">All runs</h2>
                        </div>
                        <button onclick="createAnnotationQueue()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                            Add to annotation queue
                        </button>
                    </div>
                </div>
                
                <!-- Pagination -->
                <div class="bg-white border-b border-gray-200 px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <span class="text-sm text-gray-700">Showing</span>
                            <span id="paginationInfo" class="text-sm font-medium text-gray-900">-</span>
                            <span class="text-sm text-gray-700">of</span>
                            <span id="totalRunsCount" class="text-sm font-medium text-gray-900">-</span>
                            <span class="text-sm text-gray-700">runs</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button id="prevPageBtn" onclick="previousPage()" class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                Previous
                            </button>
                            <div id="pageNumbers" class="flex items-center space-x-1">
                                <!-- Page numbers will be generated here -->
                            </div>
                            <button id="nextPageBtn" onclick="nextPage()" class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                Next
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Run Details Header -->
                <div class="bg-white border-b border-gray-200 px-6 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <input type="checkbox" id="selectAllCheckbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" onchange="toggleSelectAll()" disabled>
                            <span id="selectedCount" class="text-sm text-gray-500 hidden"></span>
                        </div>
                        <div class="flex items-center space-x-10">
                            <div class="flex items-center justify-center w-12">
                                <span class="text-sm text-gray-500">Status</span>
                            </div>
                            <div class="flex items-center" id="timestampHeader">
                                <button onclick="toggleTimestampSort()" class="flex items-center text-gray-500 hover:text-gray-700 p-1 rounded transition-colors" disabled>
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
            // Set current user for annotation display
            currentUser = '{user}';
            
            // Load data from API when page loads
            window.addEventListener('DOMContentLoaded', function() {{
                loadRunsData();
            }});
        </script>
    </body>
    </html>
    """

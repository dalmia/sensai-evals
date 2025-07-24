def create_filtered_runs_list(user, annotator_filter_html, show_not_annotated=True):
    """Create reusable queue runs list component with filters and pagination

    Args:
        user: Current user name
        annotator_filter_html: HTML for annotator filter dropdown options
        show_not_annotated: Whether to show "Not Annotated" option in status filter (default: True)
    """

    # Generate status filter options based on configuration
    status_filter_options = "<button onclick=\"filterByAnnotation('all', '{user}')\" class=\"block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100\">All</button>".format(
        user=user
    )

    if show_not_annotated:
        status_filter_options += "<button onclick=\"filterByAnnotation('empty', '{user}')\" class=\"block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100\">Not Annotated</button>".format(
            user=user
        )

    status_filter_options += "<button onclick=\"filterByAnnotation('correct', '{user}')\" class=\"block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100\">Correct</button>".format(
        user=user
    )
    status_filter_options += "<button onclick=\"filterByAnnotation('wrong', '{user}')\" class=\"block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100\">Wrong</button>".format(
        user=user
    )

    return f"""
    <div class="w-96 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
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
                                {status_filter_options}
                            </div>
                        </div>
                    </div>  
                </div>  
                <!-- Add Filter Button -->
                <div class="flex items-center ml-auto h-full relative">
                    <button id="userEmailFilterBtn" onclick="toggleUserEmailFilterDialog()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-300 flex items-center space-x-1 ml-4 h-full w-full" style="height:100%">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 01-8 0 4 4 0 018 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 16v2m0 4h.01" /></svg>
                        <span>Filter</span>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Pagination -->
        <div class="bg-gray-50 border-b border-gray-200 px-4 py-2">
            <div class="flex items-center justify-between">
                <button id="prevPageBtn" onclick="previousPage()" class="px-3 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    Previous
                </button>
                <div class="text-xs text-gray-600">
                    Page <span id="currentPageDisplay">1</span> / <span id="totalPagesDisplay">1</span>
                </div>
                <button id="nextPageBtn" onclick="nextPage()" class="px-3 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    Next
                </button>
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
    
    <!-- User Email Filter Dialog - positioned outside runs container -->
    <div id="userEmailFilterDialog" class="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden" style="width: 288px;">
        <div class="p-4">
            <div class="mb-2">
                <label for="userEmailFilterInput" class="block text-xs font-medium text-gray-700 mb-1">User Email</label>
                <input type="email" id="userEmailFilterInput" placeholder="Enter user email" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-1" oninput="validateUserEmailFilterInput()">
                <div id="userEmailFilterError" class="text-xs text-red-500 hidden">Please enter a valid email address</div>
            </div>
            <button id="applyUserEmailFilterBtn" class="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mt-2" onclick="applyUserEmailFilter()">Apply Filter</button>
            <button id="removeUserEmailFilterBtn" class="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mt-2" onclick="removeUserEmailFilter()" style="display: none;">Remove Filter</button>
        </div>
    </div>
    """

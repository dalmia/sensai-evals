def create_filtered_runs_list(
    user, annotator_filter_html, show_not_annotated=True, default_annotator=None
):
    """Create reusable queue runs list component with filters and pagination

    Args:
        user: Current user name
        annotator_filter_html: HTML for annotator filter dropdown options
        show_not_annotated: Whether to show "Not Annotated" option in status filter (default: True)
        default_annotator: Default annotator to display (default: user)
    """

    # Set default annotator display value
    initial_annotator_display = (
        "All" if default_annotator == "all" else (default_annotator or user)
    )

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
                            <span id="currentAnnotator">{initial_annotator_display}</span>
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
                    <button id="textFiltersBtn" onclick="toggleTextFiltersDialog()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-300 flex items-center space-x-1 ml-4 h-full w-full" style="height:100%">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586l-4-4V9.414a1 1 0 00-.293-.707L3.293 6.707A1 1 0 013 6V4z" /></svg>
                        <span>Filters</span>
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
    
    <!-- Text Filters Dialog - positioned outside runs container -->
    <div id="textFiltersDialog" class="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden" style="width: 320px;">
        <div class="p-4">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Text Filters</h3>
            
            <div class="mb-3">
                <label for="userEmailFilterInput" class="block text-xs font-medium text-gray-700 mb-1">User email</label>
                <input type="email" id="userEmailFilterInput" placeholder="Enter user email" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" oninput="validateTextFilterInputs()">
            </div>
            
            <div class="mb-3">
                <label for="taskTitleFilterInput" class="block text-xs font-medium text-gray-700 mb-1">Task title</label>
                <input type="text" id="taskTitleFilterInput" placeholder="Enter task title" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" oninput="validateTextFilterInputs()">
            </div>
            
            <div class="mb-3">
                <label for="questionTitleFilterInput" class="block text-xs font-medium text-gray-700 mb-1">Question title</label>
                <input type="text" id="questionTitleFilterInput" placeholder="Enter question title" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" oninput="validateTextFilterInputs()">
            </div>
            
            <div id="textFiltersError" class="text-xs text-red-500 hidden mb-2">Please enter a valid email address</div>
            
            <button id="applyTextFiltersBtn" class="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mt-2" onclick="applyTextFilters()">Apply Filters</button>
            <button id="removeTextFiltersBtn" class="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mt-2" onclick="removeTextFilters()" style="display: none;">Remove Filters</button>
        </div>
    </div>
    """

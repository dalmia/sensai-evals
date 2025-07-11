from auth import require_auth, get_current_user
from components.header import create_header
from components.queue_run_row import create_simple_queue_run_row
from data import queues, queue_runs
import json


def individual_queue_page(request, queue_id):
    """Protected individual queue page"""
    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    user = get_current_user(request)

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

    # Get runs for this queue
    runs = queue_runs.get(queue_id, [])

    # Generate queue runs using simplified component
    queue_runs_html = "".join(
        [
            create_simple_queue_run_row(
                run["name"],
                run.get("annotation", None),
            )
            for run in runs
        ]
    )

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
        <div class="flex">
            <!-- Runs Sidebar -->
            <div class="w-96 bg-white border-r border-gray-200 h-screen overflow-y-auto">
                <!-- Queue Header -->
                <div class="p-4 border-b border-gray-200">
                    <h2 class="text-lg font-semibold text-gray-900">{queue["name"]} ({len(runs)})</h2>
                    <p class="text-sm text-gray-500">Created by {queue["created_by"]}</p>
                </div>
                
                <!-- Annotator Filter -->
                <div class="p-4 border-b border-gray-200">
                    <div class="flex items-center justify-between space-x-4">
                        <div class="relative">
                            <div class="text-sm text-gray-500 mb-2">Annotator</div>
                            <button onclick="toggleAnnotatorFilter()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 flex items-center space-x-2">
                                <span id="currentAnnotator">Aman</span>
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
                        
                        <!-- Annotation Status Filter -->
                        <div class="relative">
                            <div class="text-sm text-gray-500 mb-2">Status</div>
                            <button onclick="toggleAnnotationFilter()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 flex items-center space-x-2">
                                <span id="currentFilter">All</span>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            <div id="annotationFilterDropdown" class="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden">
                                <div class="py-1">
                                    <button onclick="filterByAnnotation('all')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">All</button>
                                    <button onclick="filterByAnnotation('empty')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Not Annotated</button>
                                    <button onclick="filterByAnnotation('correct')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Correct</button>
                                    <button onclick="filterByAnnotation('wrong')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Wrong</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Table Header -->
                <div class="bg-gray-50 border-b border-gray-200 px-4 py-3">
                    <div class="flex items-center ">
                        <div class="flex items-center" id="timestampHeader">
                            <button onclick="toggleTimestampSort()" class="flex items-center text-gray-700 hover:text-gray-900 p-1 rounded transition-colors">
                                <span class="text-sm font-medium">Timestamp</span>
                                <div class="ml-1" id="timestampArrow">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Queue Runs List -->
                <div id="runsList">
                    {queue_runs_html}
                </div>
            </div>
            
            <!-- Main Content Area -->
            <div class="flex-1 bg-gray-50">
                <div class="flex items-center justify-center h-full">
                    <div class="text-center">
                        <div class="text-gray-400 mb-4">
                            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No task selected</h3>
                        <p class="text-sm text-gray-500">Select a task from the queue to view its details</p>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            // Queue runs data
            const runs = {json.dumps(runs)};
            let currentSort = {{'by': 'timestamp', 'order': 'desc'}};
            let currentFilter = 'all';
            
            console.log('Runs data:', runs);
            console.log('Initial sort:', currentSort);
            
            // Function to filter runs by annotation status
            function filterRuns(runs, filter) {{
                console.log('Filtering runs by:', filter);
                if (filter === 'all') return runs;
                if (filter === 'empty') return runs.filter(function(run) {{ return run.annotation === null || run.annotation === undefined; }});
                if (filter === 'correct') return runs.filter(function(run) {{ return run.annotation === 'correct'; }});
                if (filter === 'wrong') return runs.filter(function(run) {{ return run.annotation === 'wrong'; }});
                return runs;
            }}
            
            // Function to get filtered and sorted runs
            function getFilteredAndSortedRuns() {{
                let filteredRuns = filterRuns(runs, currentFilter);
                console.log('Filtered runs:', filteredRuns);
                let sortedRuns = sortRuns(filteredRuns, currentSort.by, currentSort.order);
                console.log('Sorted runs:', sortedRuns);
                return sortedRuns;
            }}
            
            // Function to update the runs display and queue count
            function updateRunsDisplay() {{
                console.log('Updating runs display');
                const displayRuns = getFilteredAndSortedRuns();
                document.getElementById('runsList').innerHTML = generateRunsHTML(displayRuns);
                
                // Update queue count in header
                const queueHeader = document.querySelector('h2');
                const queueName = queueHeader.textContent.split(' (')[0];
                const countText = displayRuns.length !== runs.length ? 
                    displayRuns.length + ' of ' + runs.length : 
                    displayRuns.length;
                queueHeader.textContent = queueName + ' (' + countText + ')';
                console.log('Updated header to:', queueHeader.textContent);
            }}
            
            // Generate runs HTML
            function generateRunsHTML(sortedRuns) {{
                console.log('Generating HTML for runs:', sortedRuns);
                let runsHtml = '';
                for (let i = 0; i < sortedRuns.length; i++) {{
                    const run = sortedRuns[i];
                    
                    // Annotation icon
                    let annotationIcon = '';
                    if (run.annotation === 'correct') {{
                        annotationIcon = '<div class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">' +
                          '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />' +
                          '</svg>' +
                        '</div>';
                    }} else if (run.annotation === 'wrong') {{
                        annotationIcon = '<div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">' +
                          '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />' +
                          '</svg>' +
                        '</div>';
                    }} else {{
                        annotationIcon = '<div class="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex-shrink-0"></div>';
                    }}
                    
                    runsHtml += '<div class="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">' +
                        '<div class="flex items-center justify-between">' +
                            '<div class="flex items-center space-x-3 flex-1">' +
                                annotationIcon +
                                '<div class="flex-1">' +
                                    '<div class="text-sm font-medium text-gray-900">' + run.name + '</div>' +
                                    '<div class="text-xs text-gray-500 mt-1">' + run.timestamp + '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                }}
                console.log('Generated HTML length:', runsHtml.length);
                return runsHtml;
            }}
            
            // Sorting function
            function sortRuns(runs, sortBy, sortOrder) {{
                console.log('Sorting runs by:', sortBy, sortOrder);
                return runs.slice().sort(function(a, b) {{
                    let aValue, bValue;
                    
                    if (sortBy === 'timestamp') {{
                        // Parse timestamp format: "06/21/2025, 20:58"
                        aValue = new Date(a.timestamp.replace(',', ''));
                        bValue = new Date(b.timestamp.replace(',', ''));
                        console.log('Comparing timestamps:', a.timestamp, 'vs', b.timestamp);
                    }}
                    
                    if (sortOrder === 'asc') {{
                        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                    }} else {{
                        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                    }}
                }});
            }}
            
            // Update arrow based on sort direction
            function updateArrow() {{
                const arrowElement = document.getElementById('timestampArrow');
                if (currentSort.order === 'asc') {{
                    arrowElement.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>' +
                    '</svg>';
                }} else {{
                    arrowElement.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>' +
                    '</svg>';
                }}
            }}
            
            // Toggle timestamp sort
            function toggleTimestampSort() {{
                console.log('Toggling timestamp sort');
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
                updateRunsDisplay();
                updateArrow();
            }}
            
            // Toggle annotation filter dropdown
            function toggleAnnotationFilter() {{
                console.log('Toggling annotation filter');
                const dropdown = document.getElementById('annotationFilterDropdown');
                dropdown.classList.toggle('hidden');
            }}
            
            // Toggle annotator filter dropdown
            function toggleAnnotatorFilter() {{
                console.log('Toggling annotator filter');
                const dropdown = document.getElementById('annotatorFilterDropdown');
                dropdown.classList.toggle('hidden');
            }}
            
            // Filter by annotation status
            function filterByAnnotation(filter) {{
                console.log('Filtering by annotation:', filter);
                currentFilter = filter;
                const filterLabels = {{
                    'all': 'All',
                    'empty': 'Not Annotated',
                    'correct': 'Correct',
                    'wrong': 'Wrong'
                }};
                document.getElementById('currentFilter').textContent = filterLabels[filter];
                document.getElementById('annotationFilterDropdown').classList.add('hidden');
                updateRunsDisplay();
            }}
            
            // Filter by annotator
            function filterByAnnotator(annotator) {{
                console.log('Filtering by annotator:', annotator);
                document.getElementById('currentAnnotator').textContent = annotator;
                document.getElementById('annotatorFilterDropdown').classList.add('hidden');
                // Add annotator filtering logic here if needed
            }}
            
            // Initialize with sorted and filtered runs
            document.addEventListener('DOMContentLoaded', function() {{
                console.log('DOM loaded, initializing...');
                updateRunsDisplay();
            }});
            
            function toggleDropdown() {{
                const dropdown = document.getElementById('dropdown');
                dropdown.classList.toggle('hidden');
            }}
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(event) {{
                const dropdown = document.getElementById('dropdown');
                const button = event.target.closest('button');
                
                if (!button || button.getAttribute('onclick') !== 'toggleDropdown()') {{
                    dropdown.classList.add('hidden');
                }}
                
                // Close annotation filter dropdown when clicking outside
                const annotationFilterDropdown = document.getElementById('annotationFilterDropdown');
                if (annotationFilterDropdown && !event.target.closest('#annotationFilterDropdown')) {{
                    const toggleButton = event.target.closest('button[onclick="toggleAnnotationFilter()"]');
                    if (!toggleButton) {{
                        annotationFilterDropdown.classList.add('hidden');
                    }}
                }}
                
                // Close annotator filter dropdown when clicking outside
                const annotatorFilterDropdown = document.getElementById('annotatorFilterDropdown');
                if (annotatorFilterDropdown && !event.target.closest('#annotatorFilterDropdown')) {{
                    const toggleButton = event.target.closest('button[onclick="toggleAnnotatorFilter()"]');
                    if (!toggleButton) {{
                        annotatorFilterDropdown.classList.add('hidden');
                    }}
                }}
            }});
        </script>
    </body>
    </html>
    """

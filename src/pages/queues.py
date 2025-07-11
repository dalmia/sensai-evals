from auth import require_auth, get_current_user
from components.header import create_header
from components.queue_item import create_queue_item
from components.queue_run_row import create_queue_run_row
from data import queues, queue_runs, annotators
import json


def queues_page(request):
    """Protected annotation queues page"""
    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    user = get_current_user(request)

    # Generate all queue items
    queues_html = "".join(
        [
            create_queue_item(
                queue["name"],
                queue["count"],
                queue["created_date"],
                queue["created_by"],
                queue["id"],
            )
            for queue in queues
        ]
    )

    # Convert queues and queue_runs to JSON for JavaScript
    queues_json = json.dumps(queues)
    queue_runs_json = json.dumps(queue_runs)

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
        <div class="flex">
            <!-- Queues Sidebar -->
            <div class="w-80 bg-white border-r border-gray-200 h-screen overflow-y-auto">
                <!-- Queue Items -->
                <div>
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
                        <p class="text-sm text-gray-500">Select an annotation queue from the list to view and annotate its tasks</p>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            const queuesData = {queues_json};
            const queueRunsData = {queue_runs_json};
            
            function showQueueDetails(queueId) {{
                const queue = queuesData.find(q => q.id === queueId);
                const runs = queueRunsData[queueId] || [];
                
                if (!queue) return;
                
                // Generate runs HTML with sorting functionality
                function generateRunsHTML(sortedRuns) {{
                    let runsHtml = '';
                    sortedRuns.forEach(run => {{
                        // Annotation icon
                        let annotationIcon = '';
                        if (run.annotation === 'correct') {{
                            annotationIcon = `<div class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>`;
                        }} else if (run.annotation === 'wrong') {{
                            annotationIcon = `<div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>`;
                        }} else {{
                            annotationIcon = '<div class="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex-shrink-0"></div>';
                        }}
                        
                        runsHtml += `
                            <div class="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-3 flex-1">
                                        ${{annotationIcon}}
                                        <div class="flex-1">
                                            <div class="text-sm font-medium text-gray-900">${{run.name}}</div>
                                        </div>
                                    </div>
                                    <div class="text-sm text-gray-600 ml-4">
                                        ${{run.timestamp}}
                                    </div>
                                </div>
                            </div>
                        `;
                    }});
                    return runsHtml;
                }}
                
                // Sorting functions
                function sortRuns(runs, sortBy, sortOrder) {{
                    return [...runs].sort((a, b) => {{
                        let aValue, bValue;
                        
                        if (sortBy === 'timestamp') {{
                            aValue = new Date(a.timestamp);
                            bValue = new Date(b.timestamp);
                        }} else if (sortBy === 'name') {{
                            aValue = a.name.toLowerCase();
                            bValue = b.name.toLowerCase();
                        }}
                        
                        if (sortOrder === 'asc') {{
                            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                        }} else {{
                            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                        }}
                    }});
                }}
                
                // Initial sort by timestamp descending
                let currentSort = {{ by: 'timestamp', order: 'desc' }};
                let sortedRuns = sortRuns(runs, currentSort.by, currentSort.order);
                let currentFilter = 'all';
                
                // Function to filter runs by annotation status
                function filterRuns(runs, filter) {{
                    if (filter === 'all') return runs;
                    if (filter === 'empty') return runs.filter(run => !run.annotation);
                    if (filter === 'correct') return runs.filter(run => run.annotation === 'correct');
                    if (filter === 'wrong') return runs.filter(run => run.annotation === 'wrong');
                    return runs;
                }}
                
                // Function to get filtered and sorted runs
                function getFilteredAndSortedRuns() {{
                    let filteredRuns = filterRuns(runs, currentFilter);
                    return sortRuns(filteredRuns, currentSort.by, currentSort.order);
                }}
                
                // Function to update the runs display
                function updateRunsDisplay() {{
                    const displayRuns = getFilteredAndSortedRuns();
                    document.getElementById(`runsList-${{queueId}}`).innerHTML = generateRunsHTML(displayRuns);
                    
                    // Update queue count in header
                    const queueHeader = document.querySelector('h2');
                    queueHeader.textContent = `${{queue.name}} (${{displayRuns.length}}${{displayRuns.length !== runs.length ? ` of ${{runs.length}}` : ''}})`;
                }}
                
                // Function to get arrow based on current sort
                function getTimestampArrow(currentOrder) {{
                    if (currentOrder === 'asc') {{
                        return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                        </svg>`;
                    }} else {{
                        return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>`;
                    }}
                }}
                
                function updateHeader() {{
                    const arrow = getTimestampArrow(currentSort.order);
                    document.getElementById(`timestampHeader-${{queueId}}`).innerHTML = `
                        <button onclick="toggleTimestampSort()" class="flex items-center text-gray-700 hover:text-gray-900 p-1 rounded transition-colors">
                            <span class="text-sm font-medium">Timestamp</span>
                            <div class="ml-1">
                                ${{arrow}}
                            </div>
                        </button>
                    `;
                }}
                
                const content = `
                    <div>
                        <!-- Header -->
                        <div class="bg-white border-b border-t border-gray-200 px-6 py-4">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center space-x-4">
                                    <h2 class="text-lg font-semibold text-gray-900">${{queue.name}} (${{runs.length}})</h2>
                                    <span class="text-sm text-gray-500">Created by ${{queue.created_by}}</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <!-- Filter Dropdown -->
                                    <div class="relative">
                                        <button onclick="toggleAnnotationFilter()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 flex items-center space-x-2">
                                            <span id="currentFilter-${{queueId}}">All</span>
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </button>
                                        <div id="annotationFilterDropdown-${{queueId}}" class="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden">
                                            <div class="py-1">
                                                <button onclick="filterByAnnotation('all')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">All</button>
                                                <button onclick="filterByAnnotation('empty')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Not annotated</button>
                                                <button onclick="filterByAnnotation('correct')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Correct</button>
                                                <button onclick="filterByAnnotation('wrong')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Wrong</button>
                                            </div>
                                        </div>
                                    </div>
                                    <button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium" onclick="window.location.href='/queues/${{queueId}}'">
                                        Start Annotation
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Table Header -->
                        <div class="bg-gray-50 border-b border-gray-200 px-6 py-3">
                            <div class="flex items-center justify-between">
                                <div class="flex-1">
                                </div>
                                <div class="flex items-center ml-4" id="timestampHeader-${{queueId}}">
                                    <button onclick="toggleTimestampSort()" class="flex items-center text-gray-700 hover:text-gray-900 p-1 rounded transition-colors">
                                        <span class="text-sm font-medium">Timestamp</span>
                                        <div class="ml-1">
                                            ${{getTimestampArrow(currentSort.order)}}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Queue Runs List -->
                        <div class="bg-white" id="runsList-${{queueId}}">
                            ${{generateRunsHTML(sortedRuns)}}
                        </div>
                    </div>
                `;
                
                document.getElementById('mainContent').innerHTML = content;
                
                // Add global sorting functions
                window.toggleTimestampSort = function() {{
                    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
                    sortedRuns = sortRuns(runs, currentSort.by, currentSort.order);
                    updateRunsDisplay();
                    updateHeader();
                }};
                
                // Add global filter functions
                window.toggleAnnotationFilter = function() {{
                    const dropdown = document.getElementById(`annotationFilterDropdown-${{queueId}}`);
                    dropdown.classList.toggle('hidden');
                }};
                
                window.filterByAnnotation = function(filter) {{
                    currentFilter = filter;
                    const filterLabels = {{
                        'all': 'All',
                        'empty': 'Not annotated',
                        'correct': 'Correct',
                        'wrong': 'Wrong'
                    }};
                    document.getElementById(`currentFilter-${{queueId}}`).textContent = filterLabels[filter];
                    document.getElementById(`annotationFilterDropdown-${{queueId}}`).classList.add('hidden');
                    updateRunsDisplay();
                }};
            }}
            
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
                const annotationFilterDropdowns = document.querySelectorAll('[id^="annotationFilterDropdown-"]');
                annotationFilterDropdowns.forEach(dropdown => {{
                    if (!event.target.closest(`#${{dropdown.id}}`)) {{
                        const toggleButton = event.target.closest('button[onclick="toggleAnnotationFilter()"]');
                        if (!toggleButton) {{
                            dropdown.classList.add('hidden');
                        }}
                    }}
                }});
            }});
        </script>
    </body>
    </html>
    """

from auth import require_auth, get_current_user
from components.header import create_header
from components.run_row import create_run_row
from components.filters import create_filters_sidebar
from data import runs
import json


def runs_page(request):
    """Protected home page - redirects to login if not authenticated"""
    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    user = get_current_user(request)

    # Generate all run rows
    runs_html = "".join(
        [
            create_run_row(
                run["name"],
                run["tags"],
                run["timestamp"],
                run.get("annotation", None),
                index,
            )
            for index, run in enumerate(runs)
        ]
    )

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SensAI evals | Home</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        {create_header(user, "runs")}
        
        <!-- Main Content -->
        <div class="flex">
            {create_filters_sidebar()}
            
            <!-- Main Content Area -->
            <div class="flex-1 bg-gray-50">
                <!-- Header -->
                <div class="bg-white border-b border-t border-gray-200 px-6 py-4">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-4">
                            <h2 class="text-lg font-semibold text-gray-900">All runs (13974)</h2>
                            <span class="text-sm text-gray-500">Annotated 13/13974</span>
                        </div>
                        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                            Create annotation queue
                        </button>
                    </div>
                </div>
                
                <!-- Run Details Header -->
                <div class="bg-white border-b border-gray-200 px-6 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <input type="checkbox" id="selectAllCheckbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" onchange="toggleSelectAll()">
                            <span id="selectedCount" class="text-sm text-gray-500 hidden"></span>
                        </div>
                        <div class="flex items-center space-x-8">
                            <div class="flex items-center justify-center w-12">
                                <span class="text-sm text-gray-500">Status</span>
                            </div>
                            <div class="flex items-center" id="timestampHeader">
                                <button onclick="toggleTimestampSort()" class="flex items-center text-gray-500 hover:text-gray-700 p-1 rounded transition-colors">
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
                <div class="bg-white" id="runsList">
                    {runs_html}
                </div>
            </div>
        </div>
        
        <script>
            // Runs data for sorting
            const runsData = {json.dumps(runs)};
            let currentSort = {{'by': 'timestamp', 'order': 'desc'}};
            
            function toggleDropdown() {{
                const dropdown = document.getElementById('dropdown');
                dropdown.classList.toggle('hidden');
            }}
            
            // Sorting function
            function sortRuns(runs, sortBy, sortOrder) {{
                return runs.slice().sort(function(a, b) {{
                    let aValue, bValue;
                    
                    if (sortBy === 'timestamp') {{
                        // Parse timestamp format: "07/11/2025, 03:06"
                        aValue = new Date(a.timestamp.replace(',', ''));
                        bValue = new Date(b.timestamp.replace(',', ''));
                    }}
                    
                    if (sortOrder === 'asc') {{
                        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                    }} else {{
                        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                    }}
                }});
            }}
            
            // Generate runs HTML
            function generateRunsHTML(sortedRuns) {{
                let runsHtml = '';
                for (let i = 0; i < sortedRuns.length; i++) {{
                    const run = sortedRuns[i];
                    
                    // Create tag badges
                    let tagBadges = '';
                    if (run.tags && run.tags.length > 0) {{
                        const tagColorMap = {{
                            'feedback': 'bg-blue-100 text-blue-800',
                            'quiz': 'bg-purple-100 text-purple-800',
                            'learning_material': 'bg-indigo-100 text-indigo-800',
                            'text': 'bg-gray-100 text-gray-800',
                            'code': 'bg-gray-100 text-gray-800',
                            'audio': 'bg-gray-100 text-gray-800',
                            'subjective': 'bg-green-100 text-green-800',
                            'objective': 'bg-green-100 text-green-800',
                            'practice': 'bg-orange-100 text-orange-800',
                            'exam': 'bg-yellow-100 text-yellow-800'
                        }};
                        
                        run.tags.forEach(tag => {{
                            const tagColor = tagColorMap[tag] || 'bg-gray-100 text-gray-800';
                            tagBadges += `<span class="px-2 py-1 text-xs ${{tagColor}} rounded">${{tag}}</span>`;
                        }});
                    }}
                    
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
                        <div class="border-b border-gray-100 px-6 py-4 hover:bg-gray-50 cursor-pointer">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <input type="checkbox" id="rowCheckbox_${{i}}" class="row-checkbox w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" onchange="updateSelectedCount()">
                                    <div>
                                        <div class="text-sm font-medium text-gray-900">${{run.name}}</div>
                                        <div class="flex items-center space-x-2 mt-1">
                                            ${{tagBadges}}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center space-x-8">
                                    <div class="flex items-center justify-center w-12">
                                        ${{annotationIcon}}
                                    </div>
                                    <span class="text-sm text-gray-500">${{run.timestamp}}</span>
                                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    `;
                }}
                return runsHtml;
            }}
            
            // Update runs display
            function updateRunsDisplay() {{
                const sortedRuns = sortRuns(runsData, currentSort.by, currentSort.order);
                const runsListElement = document.getElementById('runsList');
                if (runsListElement) {{
                    runsListElement.innerHTML = generateRunsHTML(sortedRuns);
                }}
            }}
            
            // Update arrow based on sort direction
            function updateArrow() {{
                const arrowElement = document.getElementById('timestampArrow');
                if (currentSort.order === 'asc') {{
                    arrowElement.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                    </svg>`;
                }} else {{
                    arrowElement.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>`;
                }}
            }}
            
            // Toggle timestamp sort
            function toggleTimestampSort() {{
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
                updateRunsDisplay();
                updateArrow();
            }}
            
            // Initialize on page load
            document.addEventListener('DOMContentLoaded', function() {{
                updateRunsDisplay();
                updateArrow();
            }});
            
            // Select/Deselect all functionality
            function toggleSelectAll() {{
                const selectAllCheckbox = document.getElementById('selectAllCheckbox');
                const rowCheckboxes = document.querySelectorAll('.row-checkbox');
                
                rowCheckboxes.forEach(function(checkbox) {{
                    checkbox.checked = selectAllCheckbox.checked;
                }});
                
                updateSelectedCount();
            }}
            
            // Update selected count display
            function updateSelectedCount() {{
                const rowCheckboxes = document.querySelectorAll('.row-checkbox');
                const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
                const selectAllCheckbox = document.getElementById('selectAllCheckbox');
                const selectedCountElement = document.getElementById('selectedCount');
                
                const selectedCount = selectedCheckboxes.length;
                const totalCount = rowCheckboxes.length;
                
                // Update select all checkbox state
                if (selectedCount === 0) {{
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = false;
                }} else if (selectedCount === totalCount) {{
                    selectAllCheckbox.checked = true;
                    selectAllCheckbox.indeterminate = false;
                }} else {{
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = true;
                }}
                
                // Update count display
                if (selectedCount > 0) {{
                    selectedCountElement.textContent = selectedCount + ' selected';
                    selectedCountElement.classList.remove('hidden');
                }} else {{
                    selectedCountElement.classList.add('hidden');
                }}
            }}
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(event) {{
                const dropdown = document.getElementById('dropdown');
                const button = event.target.closest('button');
                
                if (!button || button.getAttribute('onclick') !== 'toggleDropdown()') {{
                    dropdown.classList.add('hidden');
                }}
            }});
        </script>
    </body>
    </html>
    """

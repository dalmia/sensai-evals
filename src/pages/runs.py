from auth import require_auth, get_current_user
from components.header import create_header
from components.run_row import create_run_row
from components.filters import create_filters_sidebar
from data import runs


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
                            <span class="text-sm text-gray-500">Timestamp ↓</span>
                        </div>
                    </div>
                </div>
                
                <!-- Runs List -->
                <div class="bg-white">
                    {runs_html}
                </div>
            </div>
        </div>
        
        <script>
            function toggleDropdown() {{
                const dropdown = document.getElementById('dropdown');
                dropdown.classList.toggle('hidden');
            }}
            
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

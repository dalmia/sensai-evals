from auth import require_auth, get_current_user
from components.header import create_header
from components.queue_item import create_queue_item
from data import queues


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
            )
            for queue in queues
        ]
    )

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
                <div class="p-4 border-b border-gray-200">
                    <h2 class="text-lg font-semibold text-gray-900">Annotation Queues (10)</h2>
                </div>
                
                <!-- Queue Items -->
                <div>
                    {queues_html}
                </div>
            </div>
            
            <!-- Main Content Area -->
            <div class="flex-1 bg-gray-50 flex items-center justify-center">
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
        
        <script>
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
            }});
        </script>
    </body>
    </html>
    """

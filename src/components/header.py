def create_header(user, active_tab="overview"):
    """Create reusable header component"""
    overview_class = (
        "text-blue-600 font-medium border-b-2 border-blue-600 pb-2"
        if active_tab == "overview"
        else "text-gray-500 hover:text-gray-700 pb-2"
    )
    runs_class = (
        "text-blue-600 font-medium border-b-2 border-blue-600 pb-2"
        if active_tab == "runs"
        else "text-gray-500 hover:text-gray-700 pb-2"
    )
    queues_class = (
        "text-blue-600 font-medium border-b-2 border-blue-600 pb-2"
        if active_tab == "queues"
        else "text-gray-500 hover:text-gray-700 pb-2"
    )

    return f"""
    <!-- Top Navigation with Profile -->
    <div class="bg-white shadow-sm">
        <div class="w-full px-1">
            <div class="flex justify-between items-center py-4 mx-4">
                <div class="flex items-center space-x-8">
                    <h1 class="text-xl font-semibold text-gray-900">SensAI evals</h1>
                    
                    <!-- Navigation Tabs -->
                    <div class="flex space-x-8">
                        <a href="/" class="{overview_class}">Overview</a>
                        <a href="/runs" class="{runs_class}">Runs</a>
                        <a href="/queues" class="{queues_class}">Annotation Queues</a>
                    </div>
                </div>
                
                <!-- Profile Dropdown -->
                <div class="relative">
                    <button onclick="toggleDropdown()" class="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        <span class="text-sm font-medium">{user[0].upper()}</span>
                    </button>
                    
                    <!-- Dropdown Menu -->
                    <div id="dropdown" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div class="py-1">
                            <div class="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                                <div class="font-medium">{user}</div>
                            </div>
                            <a href="/logout" class="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200">
                                Logout
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    """

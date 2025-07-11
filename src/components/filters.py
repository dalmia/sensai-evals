def create_filters_sidebar():
    """Create reusable filters sidebar component"""
    return """
    <!-- Filters Sidebar -->
    <div class="w-80 bg-white border-r border-gray-200 p-6 h-screen overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-semibold text-gray-900">Filters</h2>
            <button class="text-blue-600 hover:text-blue-700 text-sm font-medium">Clear All</button>
        </div>
        
        <!-- Annotation Filter -->
        <div class="mb-8">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Annotation</h3>
            <div class="space-y-2">
                <label class="flex items-center">
                    <input type="radio" name="annotation" value="all" checked class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">All</span>
                </label>
                <label class="flex items-center">
                    <input type="radio" name="annotation" value="annotated" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Annotated</span>
                </label>
                <label class="flex items-center">
                    <input type="radio" name="annotation" value="unannotated" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Unannotated</span>
                </label>
                <label class="flex items-center">
                    <input type="radio" name="annotation" value="correct" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Correct</span>
                </label>
                <label class="flex items-center">
                    <input type="radio" name="annotation" value="wrong" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Wrong</span>
                </label>
            </div>
        </div>
        
        <!-- Time Range Filter -->
        <div class="mb-8">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Time Range</h3>
            <div class="space-y-2">
                <label class="flex items-center">
                    <input type="radio" name="timerange" value="all" checked class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">All Time</span>
                </label>
                <label class="flex items-center">
                    <input type="radio" name="timerange" value="today" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Today</span>
                </label>
                <label class="flex items-center">
                    <input type="radio" name="timerange" value="yesterday" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Yesterday</span>
                </label>
                <label class="flex items-center">
                    <input type="radio" name="timerange" value="last7" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Last 7 Days</span>
                </label>
                <label class="flex items-center">
                    <input type="radio" name="timerange" value="last30" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Last 30 Days</span>
                </label>
                <label class="flex items-center">
                    <input type="radio" name="timerange" value="custom" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Custom Range</span>
                </label>
            </div>
        </div>
        
        <!-- Type and Question Type -->
        <div class="grid grid-cols-2 gap-6 mb-8">
            <div>
                <h3 class="text-sm font-medium text-gray-700 mb-3">Type</h3>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="ml-2 text-sm text-gray-700">quiz</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="ml-2 text-sm text-gray-700">learning_material</span>
                    </label>
                </div>
            </div>
            <div>
                <h3 class="text-sm font-medium text-gray-700 mb-3">Question type</h3>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="ml-2 text-sm text-gray-700">objective</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="ml-2 text-sm text-gray-700">subjective</span>
                    </label>
                </div>
            </div>
        </div>
        
        <!-- Input Types and Purpose -->
        <div class="grid grid-cols-2 gap-6 mb-8">
            <div>
                <h3 class="text-sm font-medium text-gray-700 mb-3">Input types</h3>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="ml-2 text-sm text-gray-700">text</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="ml-2 text-sm text-gray-700">code</span>
                    </label>
                </div>
            </div>
            <div>
                <h3 class="text-sm font-medium text-gray-700 mb-3">Purpose</h3>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="ml-2 text-sm text-gray-700">exam</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="ml-2 text-sm text-gray-700">practice</span>
                    </label>
                </div>
            </div>
        </div>
        
        <!-- Organizations -->
        <div class="mb-8">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Organizations (All)</h3>
            <input type="text" placeholder="Search organizations" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mb-3">
            <div class="space-y-2">
                <label class="flex items-center">
                    <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">HyperVerge Academy</span>
                </label>
                <label class="flex items-center">
                    <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">MSDF_ZUVY</span>
                </label>
                <label class="flex items-center">
                    <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Karka Academy</span>
                </label>
            </div>
        </div>
        
        <!-- Courses -->
        <div class="mb-8">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Courses (All)</h3>
            <input type="text" placeholder="Search courses" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mb-3">
            <div class="space-y-2">
                <label class="flex items-center">
                    <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Tech C9</span>
                </label>
            </div>
        </div>
    </div>
    """

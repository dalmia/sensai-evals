def create_filters_sidebar(organizations=None, courses=None):
    """Create reusable filters sidebar component"""

    # Default to empty lists if no data provided
    if organizations is None:
        organizations = []
    if courses is None:
        courses = []

    # Generate organization checkboxes
    org_checkboxes = ""
    for org in organizations:
        org_checkboxes += f"""
                <label class="flex items-center">
                    <input type="checkbox" class="org-filter w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" value="{org['id']}" onchange="applyFilters()">
                    <span class="ml-2 text-sm text-gray-700">{org['name']}</span>
                </label>"""

    # Generate course checkboxes
    course_checkboxes = ""
    for course in courses:
        course_checkboxes += f"""
                <label class="flex items-center">
                    <input type="checkbox" class="course-filter w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" value="{course['id']}" onchange="applyFilters()">
                    <span class="ml-2 text-sm text-gray-700">{course['name']}</span>
                </label>"""

    return f"""
    <!-- Filters Sidebar -->
    <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div class="p-6 flex-shrink-0">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-lg font-semibold text-gray-900">Filters</h2>
                <button class="text-blue-600 hover:text-blue-700 text-sm font-medium" onclick="clearAllFilters()">Clear All</button>
            </div>
        </div>
        
        <div class="flex-1 overflow-y-auto px-6 pb-6">
            <!-- Annotation Filter -->
            <div class="mb-8">
                <h3 class="text-sm font-medium text-gray-700 mb-3">Annotation</h3>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="radio" name="annotation" value="all" checked class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" onchange="applyFilters()">
                        <span class="ml-2 text-sm text-gray-700">All</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="annotation" value="annotated" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" onchange="applyFilters()">
                        <span class="ml-2 text-sm text-gray-700">Annotated</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="annotation" value="unannotated" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" onchange="applyFilters()">
                        <span class="ml-2 text-sm text-gray-700">Unannotated</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="annotation" value="correct" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" onchange="applyFilters()">
                        <span class="ml-2 text-sm text-gray-700">Correct</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="annotation" value="wrong" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" onchange="applyFilters()">
                        <span class="ml-2 text-sm text-gray-700">Wrong</span>
                    </label>
                </div>
            </div>
            
            <!-- Time Range Filter -->
            <div class="mb-8">
                <h3 class="text-sm font-medium text-gray-700 mb-3">Time Range</h3>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="radio" name="timerange" value="all" checked class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" onchange="applyFilters()">
                        <span class="ml-2 text-sm text-gray-700">All Time</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="timerange" value="today" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" onchange="applyFilters()">
                        <span class="ml-2 text-sm text-gray-700">Today</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="timerange" value="yesterday" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" onchange="applyFilters()">
                        <span class="ml-2 text-sm text-gray-700">Yesterday</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="timerange" value="last7" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" onchange="applyFilters()">
                        <span class="ml-2 text-sm text-gray-700">Last 7 Days</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="timerange" value="last30" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" onchange="applyFilters()">
                        <span class="ml-2 text-sm text-gray-700">Last 30 Days</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="timerange" value="custom" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" onchange="applyFilters()">
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
                            <input type="checkbox" class="type-filter w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" value="quiz" onchange="applyFilters()">
                            <span class="ml-2 text-sm text-gray-700">quiz</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="type-filter w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" value="learning_material" onchange="applyFilters()">
                            <span class="ml-2 text-sm text-gray-700">learning_material</span>
                        </label>
                    </div>
                </div>
                <div>
                    <h3 class="text-sm font-medium text-gray-700 mb-3">Question type</h3>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input type="checkbox" class="question-type-filter w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" value="objective" onchange="applyFilters()">
                            <span class="ml-2 text-sm text-gray-700">objective</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="question-type-filter w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" value="subjective" onchange="applyFilters()">
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
                            <input type="checkbox" class="input-type-filter w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" value="text" onchange="applyFilters()">
                            <span class="ml-2 text-sm text-gray-700">text</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="input-type-filter w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" value="code" onchange="applyFilters()">
                            <span class="ml-2 text-sm text-gray-700">code</span>
                        </label>
                    </div>
                </div>
                <div>
                    <h3 class="text-sm font-medium text-gray-700 mb-3">Purpose</h3>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input type="checkbox" class="purpose-filter w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" value="exam" onchange="applyFilters()">
                            <span class="ml-2 text-sm text-gray-700">exam</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="purpose-filter w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" value="practice" onchange="applyFilters()">
                            <span class="ml-2 text-sm text-gray-700">practice</span>
                        </label>
                    </div>
                </div>
            </div>
            
            <!-- Organizations -->
            <div class="mb-8">
                <h3 class="text-sm font-medium text-gray-700 mb-3">Organizations ({len(organizations)})</h3>
                <input type="text" id="orgSearch" placeholder="Search organizations" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mb-3" onkeyup="filterOrganizations()">
                <div class="space-y-2" id="orgList">
                    {org_checkboxes}
                </div>
            </div>
            
            <!-- Courses -->
            <div class="mb-8">
                <h3 class="text-sm font-medium text-gray-700 mb-3">Courses ({len(courses)})</h3>
                <input type="text" id="courseSearch" placeholder="Search courses" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mb-3" onkeyup="filterCourses()">
                <div class="space-y-2" id="courseList">
                    {course_checkboxes}
                </div>
            </div>
        </div>
    </div>
    """

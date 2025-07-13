// Runs data for sorting and filtering - will be set by the server
let runsData = [];
let currentSort = {'by': 'timestamp', 'order': 'desc'};
let filteredRuns = [];
let currentUser = ''; // Current logged-in user

// Pagination variables
let currentPage = 1;
let pageSize = 50;
let totalPages = 1;

// Selection variables
let allRunsSelected = false;
let selectedRunIds = new Set();

// Load runs data from API
async function loadRunsData() {    
    try {
        const response = await fetch('/api/runs');
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        runsData = data.runs || [];
        filteredRuns = runsData;
        totalPages = Math.ceil(filteredRuns.length / pageSize);
        currentPage = 1;
        
        // Update the UI
        updateRunsDisplay();
        updatePagination();
        updateRunsCount();
        updateFiltersSidebar();
        
        // Hide loading spinner
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        
        // Enable all disabled elements
        enableUIElements();
        
    } catch (error) {
        console.error('Error loading runs data:', error);
        
        // Show error message
        const runsList = document.getElementById('runsList');
        if (runsList) {
            runsList.innerHTML = `
                <div class="flex items-center justify-center py-12">
                    <div class="text-center">
                        <div class="text-red-500 text-xl mb-4">⚠️</div>
                        <p class="text-red-600 text-lg">Error loading runs</p>
                        <p class="text-gray-600">${error.message}</p>
                        <button onclick="loadRunsData('${user}')" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Update filters sidebar with data
function updateFiltersSidebar() {
    const filtersSidebar = document.getElementById('filtersSidebar');
    if (!filtersSidebar) return;
    
    // Extract unique organizations and courses
    const organizations = extractUniqueOrganizations(runsData);
    const courses = extractUniqueCourses(runsData);
    
    // Generate filters HTML
    const filtersHTML = generateFiltersHTML(organizations, courses);
    filtersSidebar.innerHTML = filtersHTML;
}

// Extract unique organizations from runs data
function extractUniqueOrganizations(runs) {
    const orgs = {};
    for (const run of runs) {
        const metadata = run.metadata || {};
        const org = metadata.org || {};
        if (org.id && org.name) {
            orgs[org.id] = { id: org.id, name: org.name };
        }
    }
    return Object.values(orgs);
}

// Extract unique courses from runs data
function extractUniqueCourses(runs) {
    const courses = {};
    for (const run of runs) {
        const metadata = run.metadata || {};
        const course = metadata.course || {};
        if (course.id && course.name) {
            courses[course.id] = { id: course.id, name: course.name };
        }
    }
    return Object.values(courses);
}

// Generate filters HTML
function generateFiltersHTML(organizations, courses) {
    return `
        <div class="p-4">
            <div class="mb-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Filters</h3>
                <button onclick="clearAllFilters()" class="text-sm text-blue-600 hover:text-blue-800 mb-4">
                    Clear all filters
                </button>
            </div>
            
            <!-- Annotation Status Filter -->
            <div class="mb-6">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Annotation Status</h4>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="radio" name="annotation" value="all" checked class="mr-2" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">All</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="annotation" value="annotated" class="mr-2" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Annotated</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="annotation" value="unannotated" class="mr-2" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Unannotated</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="annotation" value="correct" class="mr-2" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Correct</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="annotation" value="wrong" class="mr-2" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Wrong</span>
                    </label>
                </div>
            </div>
            
            <!-- Time Range Filter -->
            <div class="mb-6">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Time Range</h4>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="radio" name="timerange" value="all" checked class="mr-2" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">All time</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="timerange" value="today" class="mr-2" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Today</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="timerange" value="yesterday" class="mr-2" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Yesterday</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="timerange" value="last7" class="mr-2" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Last 7 days</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="timerange" value="last30" class="mr-2" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Last 30 days</span>
                    </label>
                </div>
            </div>
            
            <!-- Type Filter -->
            <div class="mb-6">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Type</h4>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" class="type-filter mr-2" value="quiz" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Quiz</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="type-filter mr-2" value="learning_material" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Learning Material</span>
                    </label>
                </div>
            </div>
            
            <!-- Question Type Filter -->
            <div class="mb-6">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Question Type</h4>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" class="question-type-filter mr-2" value="subjective" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Subjective</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="question-type-filter mr-2" value="objective" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Objective</span>
                    </label>
                </div>
            </div>
            
            <!-- Input Type Filter -->
            <div class="mb-6">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Input Type</h4>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" class="input-type-filter mr-2" value="text" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">text</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="input-type-filter mr-2" value="code" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">code</span>
                    </label>
                </div>
            </div>
            
            <!-- Purpose Filter -->
            <div class="mb-6">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Purpose</h4>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" class="purpose-filter mr-2" value="practice" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Practice</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="purpose-filter mr-2" value="exam" onchange="applyFilters()">
                        <span class="text-sm text-gray-700">Exam</span>
                    </label>
                </div>
            </div>
            
            <!-- Organization Filter -->
            <div class="mb-6">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Organization</h4>
                <input type="text" id="orgSearch" placeholder="Search organizations..." class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-3" onkeyup="filterOrganizations()">
                <div id="orgList" class="space-y-2 max-h-40 overflow-y-auto">
                    ${organizations.map(org => `
                        <label class="flex items-center">
                            <input type="checkbox" class="org-filter mr-2" value="${org.id}" onchange="applyFilters()">
                            <span class="text-sm text-gray-700">${org.name}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <!-- Course Filter -->
            <div class="mb-6">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Course</h4>
                <input type="text" id="courseSearch" placeholder="Search courses..." class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-3" onkeyup="filterCourses()">
                <div id="courseList" class="space-y-2 max-h-40 overflow-y-auto">
                    ${courses.map(course => `
                        <label class="flex items-center">
                            <input type="checkbox" class="course-filter mr-2" value="${course.id}" onchange="applyFilters()">
                            <span class="text-sm text-gray-700">${course.name}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Enable UI elements after data loads
function enableUIElements() {
    // Enable pagination buttons
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    if (prevPageBtn) prevPageBtn.disabled = false;
    if (nextPageBtn) nextPageBtn.disabled = false;
    
    // Enable select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) selectAllCheckbox.disabled = false;
    
    // Enable timestamp sort button
    const timestampSortBtn = document.querySelector('button[onclick="toggleTimestampSort()"]');
    if (timestampSortBtn) timestampSortBtn.disabled = false;
}

// Initialize runs data
function initializeRunsData(data, itemsPerPage = 50, user = '') {
    runsData = data;
    pageSize = itemsPerPage;
    currentUser = user; // Set the current user
    filteredRuns = runsData;
    totalPages = Math.ceil(filteredRuns.length / pageSize);
    currentPage = 1;
    updateRunsDisplay();
    updatePagination();
    updateRunsCount(); // This will also call updateAnnotatedCount
    
    // Hide loading spinner after data is loaded
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

function toggleDropdown() {
    const dropdown = document.getElementById('dropdown');
    dropdown.classList.toggle('hidden');
}

// Apply all filters
function applyFilters() {
    filteredRuns = runsData.filter(run => {
        // Get annotation filter
        const annotationFilter = document.querySelector('input[name="annotation"]:checked').value;
        if (!passesAnnotationFilter(run, annotationFilter)) {
            return false;
        }

        // Get time range filter
        const timeRangeFilter = document.querySelector('input[name="timerange"]:checked').value;
        if (!passesTimeRangeFilter(run, timeRangeFilter)) {
            return false;
        }

        // Get type filters
        const typeFilters = Array.from(document.querySelectorAll('.type-filter:checked')).map(cb => cb.value);
        if (typeFilters.length > 0 && !passesTypeFilter(run, typeFilters)) {
            return false;
        }

        // Get question type filters
        const questionTypeFilters = Array.from(document.querySelectorAll('.question-type-filter:checked')).map(cb => cb.value);
        if (questionTypeFilters.length > 0 && !passesQuestionTypeFilter(run, questionTypeFilters)) {
            return false;
        }

        // Get input type filters
        const inputTypeFilters = Array.from(document.querySelectorAll('.input-type-filter:checked')).map(cb => cb.value);
        if (inputTypeFilters.length > 0 && !passesInputTypeFilter(run, inputTypeFilters)) {
            return false;
        }

        // Get purpose filters
        const purposeFilters = Array.from(document.querySelectorAll('.purpose-filter:checked')).map(cb => cb.value);
        if (purposeFilters.length > 0 && !passesPurposeFilter(run, purposeFilters)) {
            return false;
        }

        // Get organization filters
        const orgFilters = Array.from(document.querySelectorAll('.org-filter:checked')).map(cb => parseInt(cb.value));
        if (orgFilters.length > 0 && !passesOrganizationFilter(run, orgFilters)) {
            return false;
        }

        // Get course filters
        const courseFilters = Array.from(document.querySelectorAll('.course-filter:checked')).map(cb => parseInt(cb.value));
        if (courseFilters.length > 0 && !passesCourseFilter(run, courseFilters)) {
            return false;
        }

        return true;
    });

    // Reset pagination when filters are applied
    totalPages = Math.ceil(filteredRuns.length / pageSize);
    currentPage = 1;
    
    // Reset selection state when filters are applied
    allRunsSelected = false;
    selectedRunIds.clear();
    
    updateRunsDisplay();
    updateRunsCount();
    updateAnnotatedCount();
    updatePagination();
}

// Individual filter functions
function passesAnnotationFilter(run, filter) {
    const annotationStatus = getAnnotationStatus(run);
    
    switch (filter) {
        case 'all':
            return true;
        case 'annotated':
            return annotationStatus !== null;
        case 'unannotated':
            return annotationStatus === null;
        case 'correct':
            return annotationStatus === 'correct';
        case 'wrong':
            return annotationStatus === 'wrong';
        default:
            return true;
    }
}

function passesTimeRangeFilter(run, filter) {
    if (filter === 'all') return true;
    
    const runDate = new Date(run.start_time);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
        case 'today':
            return runDate >= today;
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return runDate >= yesterday && runDate < today;
        case 'last7':
            const last7 = new Date(today);
            last7.setDate(last7.getDate() - 7);
            return runDate >= last7;
        case 'last30':
            const last30 = new Date(today);
            last30.setDate(last30.getDate() - 30);
            return runDate >= last30;
        default:
            return true;
    }
}

function passesTypeFilter(run, filters) {
    const runType = run.metadata?.type;
    return filters.includes(runType);
}

function passesQuestionTypeFilter(run, filters) {
    const questionType = run.metadata?.question_type;
    return filters.includes(questionType);
}

function passesInputTypeFilter(run, filters) {
    const inputType = run.metadata?.question_input_type;
    return filters.includes(inputType);
}

function passesPurposeFilter(run, filters) {
    const purpose = run.metadata?.question_purpose;
    return filters.includes(purpose);
}

function passesOrganizationFilter(run, filters) {
    const orgId = run.metadata?.org?.id;
    return filters.includes(orgId);
}

function passesCourseFilter(run, filters) {
    const courseId = run.metadata?.course?.id;
    return filters.includes(courseId);
}

// Get annotation status from run data
function getAnnotationStatus(run) {
    if (!run.annotations || !currentUser) return null;
    
    // Only check annotations from the current logged-in user
    const userAnnotation = run.annotations[currentUser];
    if (userAnnotation && userAnnotation.judgement) {
        const judgement = userAnnotation.judgement;
        if (judgement === 'correct' || judgement === 'wrong') {
            return judgement;
        }
    }
    return null;
}

// Update runs count in header
function updateRunsCount() {
    const headerElement = document.getElementById('runsHeader');
    if (headerElement) {
        const totalRuns = runsData.length;
        const filteredCount = filteredRuns.length;
        
        if (filteredCount === totalRuns) {
            headerElement.textContent = `All runs (${totalRuns})`;
        } else {
            headerElement.textContent = `All runs (${filteredCount} of ${totalRuns})`;
        }
    }
    
    // Also update annotated count to keep both labels in sync
    updateAnnotatedCount();
}

// Calculate annotated count for filtered runs
function getAnnotatedCount(runs) {
    return runs.filter(run => {
        if (!run.annotations || !currentUser) return false;
        
        // Only check annotations from the current logged-in user
        const userAnnotation = run.annotations[currentUser];
        if (userAnnotation && userAnnotation.judgement) {
            const judgement = userAnnotation.judgement;
            if (judgement === 'correct' || judgement === 'wrong') {
                return true;
            }
        }
        return false;
    }).length;
}

// Update annotated count display
function updateAnnotatedCount() {
    const annotatedCountElement = document.getElementById('annotatedCount');
    if (annotatedCountElement) {
        const filteredAnnotatedCount = getAnnotatedCount(filteredRuns);
        const totalRuns = runsData.length;
        
        if (filteredRuns.length === totalRuns) {
            // No filters applied, show total counts
            annotatedCountElement.textContent = `Annotated ${filteredAnnotatedCount}/${totalRuns}`;
        } else {
            // Filters applied, show filtered counts
            annotatedCountElement.textContent = `Annotated ${filteredAnnotatedCount}/${filteredRuns.length}`;
        }
    }
}

// Clear all filters
function clearAllFilters() {
    // Reset annotation filter
    document.querySelector('input[name="annotation"][value="all"]').checked = true;
    
    // Reset time range filter
    document.querySelector('input[name="timerange"][value="all"]').checked = true;
    
    // Reset all checkboxes
    document.querySelectorAll('.type-filter, .question-type-filter, .input-type-filter, .purpose-filter, .org-filter, .course-filter').forEach(cb => {
        cb.checked = false;
    });
    
    // Clear search boxes
    document.getElementById('orgSearch').value = '';
    document.getElementById('courseSearch').value = '';
    
    // Show all organizations and courses
    filterOrganizations();
    filterCourses();
    
    // Apply filters (which will show all runs and reset pagination)
    applyFilters();
}

// Filter organizations based on search
function filterOrganizations() {
    const searchTerm = document.getElementById('orgSearch').value.toLowerCase();
    const orgList = document.getElementById('orgList');
    const labels = orgList.querySelectorAll('label');
    
    labels.forEach(label => {
        const text = label.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            label.style.display = 'flex';
        } else {
            label.style.display = 'none';
        }
    });
}

// Filter courses based on search
function filterCourses() {
    const searchTerm = document.getElementById('courseSearch').value.toLowerCase();
    const courseList = document.getElementById('courseList');
    const labels = courseList.querySelectorAll('label');
    
    labels.forEach(label => {
        const text = label.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            label.style.display = 'flex';
        } else {
            label.style.display = 'none';
        }
    });
}

// Sorting function
function sortRuns(runs, sortBy, sortOrder) {
    return runs.slice().sort(function(a, b) {
        let aValue, bValue;
        
        if (sortBy === 'timestamp') {
            // Parse ISO timestamp format: "2025-07-08T13:03:11.683944+00:00"
            aValue = new Date(a.start_time);
            bValue = new Date(b.start_time);
        }
        
        if (sortOrder === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
    });
}

// Generate runs HTML
function generateRunsHTML(sortedRuns, startIndex) {
    let runsHtml = '';
    for (let i = 0; i < sortedRuns.length; i++) {
        const run = sortedRuns[i];
        const metadata = run.metadata || {};
        
        // Extract relevant metadata keys (excluding "type")
        const relevantKeys = ['question_input_type', 'question_type', 'question_purpose', 'type'];
        
        // Create tag badges from metadata
        let tagBadges = '';
        const tagColorMap = {
            'feedback': 'bg-blue-100 text-blue-800',
            'text': 'bg-gray-100 text-gray-800',
            'code': 'bg-emerald-100 text-emerald-800',
            'audio': 'bg-cyan-100 text-cyan-800',
            'subjective': 'bg-green-100 text-green-800',
            'objective': 'bg-teal-100 text-teal-800',
            'practice': 'bg-orange-100 text-orange-800',
            'exam': 'bg-yellow-100 text-yellow-800'
        };
        
        relevantKeys.forEach(key => {
            const value = metadata[key];
            if (value) {
                const tagColor = tagColorMap[value] || 'bg-gray-100 text-gray-800';
                tagBadges += `<span class="px-2 py-1 text-xs ${tagColor} rounded">${value}</span>`;
            }
        });
        
        // Get annotation status
        const annotationStatus = getAnnotationStatus(run);
        
        // Annotation icon
        let annotationIcon = '';
        if (annotationStatus === 'correct') {
            annotationIcon = `<div class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>`;
        } else if (annotationStatus === 'wrong') {
            annotationIcon = `<div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>`;
        } else {
            annotationIcon = '<div class="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex-shrink-0"></div>';
        }
        
        // Create run name
        const runId = run.id || 'unknown';
        const courseName = metadata.course?.name || '';
        const milestoneName = metadata.milestone?.name || '';
        const orgName = metadata.org?.name || '';
        const taskTitle = metadata.task_title || '';
        const questionTitle = metadata.question_title || '';
        const runType = metadata.type || '';
        
        let runName = '';
        
        // Start with task title if available
        if (taskTitle) {
            runName = taskTitle;
        }
        
        // For quiz types, add question title after task title
        if (runType === 'quiz' && questionTitle) {
            if (runName) {
                runName += ` - ${questionTitle}`;
            } else {
                runName = questionTitle;
            }
        }
        
        // Add course and milestone information
        if (courseName && milestoneName) {
            if (runName) {
                runName += ` - ${courseName} - ${milestoneName}`;
            } else {
                runName = `${courseName} - ${milestoneName}`;
            }
        } else if (courseName) {
            if (runName) {
                runName += ` - ${courseName}`;
            } else {
                runName = courseName;
            }
        }
        
        // If no meaningful name constructed, use run ID
        if (!runName) {
            runName = `Run ${runId}`;
        }
        
        // Add organization name at the end
        if (orgName) {
            runName = `${runName} (${orgName})`;
        }
        
        // Format timestamp
        let formattedTimestamp = '';
        if (run.start_time) {
            try {
                let cleanTimestamp = run.start_time;
                if (run.start_time.includes('+')) {
                    cleanTimestamp = run.start_time.split('+')[0];
                } else if (run.start_time.includes('Z')) {
                    cleanTimestamp = run.start_time.replace('Z', '');
                }
                
                const dt = new Date(cleanTimestamp);
                formattedTimestamp = dt.toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                });
            } catch (e) {
                formattedTimestamp = run.start_time;
            }
        }
        
        runsHtml += `
            <div class="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <input type="checkbox" id="rowCheckbox_${runId}" class="row-checkbox w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" onchange="updateSelectedCount()">
                        <div>
                            <div class="text-sm font-medium text-gray-900">${runName}</div>
                            <div class="flex items-center space-x-2 mt-1">
                                ${tagBadges}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-8">
                        <div class="flex items-center justify-center w-12">
                            ${annotationIcon}
                        </div>
                        <span class="text-sm text-gray-500">${formattedTimestamp}</span>
                        <div class="invisible">
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    return runsHtml;
}

// Update runs display
function updateRunsDisplay() {
    const sortedRuns = sortRuns(filteredRuns, currentSort.by, currentSort.order);
    
    // Calculate pagination slice
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageRuns = sortedRuns.slice(startIndex, endIndex);
    
    const runsListElement = document.getElementById('runsList');
    if (runsListElement) {
        runsListElement.innerHTML = generateRunsHTML(currentPageRuns, startIndex);
        
        // Restore selection state for current page
        const rowCheckboxes = document.querySelectorAll('.row-checkbox');
        rowCheckboxes.forEach(function(checkbox) {
            const runId = checkbox.id.replace('rowCheckbox_', '');
            if (allRunsSelected || selectedRunIds.has(runId)) {
                checkbox.checked = true;
            } else {
                checkbox.checked = false;
            }
        });
        
        // Update selection count display
        updateSelectedCount();
    }
}

// Update arrow based on sort direction
function updateArrow() {
    const arrowElement = document.getElementById('timestampArrow');
    if (currentSort.order === 'asc') {
        arrowElement.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
        </svg>`;
    } else {
        arrowElement.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>`;
    }
}

// Toggle timestamp sort
function toggleTimestampSort() {
    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    currentPage = 1; // Reset to first page when sorting changes
    updateRunsDisplay();
    updateArrow();
    updatePagination();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateRunsDisplay();
    updateArrow();
    updatePagination();
});

// Select/Deselect all functionality
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    const selectedCountElement = document.getElementById('selectedCount');
    
    if (selectAllCheckbox.checked) {
        // If there are multiple pages and not all runs are selected yet, show "Select All" button
        if (totalPages > 1 && !allRunsSelected) {
            // Show "Select All" button
            selectedCountElement.innerHTML = `
                <span class="text-sm text-gray-500">${rowCheckboxes.length} selected on this page</span>
                <button onclick="selectAllRuns()" class="ml-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                    Select All ${filteredRuns.length} Runs
                </button>
            `;
            selectedCountElement.classList.remove('hidden');
            
            // Check all checkboxes on current page
            rowCheckboxes.forEach(function(checkbox) {
                checkbox.checked = true;
                const runId = checkbox.id.replace('rowCheckbox_', '');
                selectedRunIds.add(runId);
            });
        } else {
            // Single page or already all selected, just select current page
            rowCheckboxes.forEach(function(checkbox) {
                checkbox.checked = true;
                const runId = checkbox.id.replace('rowCheckbox_', '');
                selectedRunIds.add(runId);
            });
            updateSelectedCount();
        }
    } else {
        // Deselect all
        allRunsSelected = false;
        selectedRunIds.clear();
        rowCheckboxes.forEach(function(checkbox) {
            checkbox.checked = false;
        });
        updateSelectedCount();
    }
}

// Select all runs across all pages
function selectAllRuns() {
    allRunsSelected = true;
    
    // Add all filtered run IDs to selected set
    const sortedRuns = sortRuns(filteredRuns, currentSort.by, currentSort.order);
    sortedRuns.forEach((run, index) => {
        selectedRunIds.add(index.toString());
    });
    
    // Check all checkboxes on current page
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    rowCheckboxes.forEach(function(checkbox) {
        checkbox.checked = true;
    });
    
    // Update the select all checkbox to be checked
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
    
    // Update count display
    const selectedCountElement = document.getElementById('selectedCount');
    selectedCountElement.textContent = `${filteredRuns.length} selected`;
    selectedCountElement.classList.remove('hidden');
}

// Update selected count display
function updateSelectedCount() {
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const selectedCountElement = document.getElementById('selectedCount');
    
    const selectedCount = selectedCheckboxes.length;
    const totalCount = rowCheckboxes.length;
    
    // Update selectedRunIds set based on current page selections
    selectedCheckboxes.forEach(function(checkbox) {
        const runId = checkbox.id.replace('rowCheckbox_', '');
        selectedRunIds.add(runId);
    });
    
    // Remove unchecked items from selectedRunIds
    rowCheckboxes.forEach(function(checkbox) {
        if (!checkbox.checked) {
            const runId = checkbox.id.replace('rowCheckbox_', '');
            selectedRunIds.delete(runId);
        }
    });
    
    // Update select all checkbox state
    if (allRunsSelected) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (selectedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (selectedCount === totalCount) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
    
    // Update count display
    if (allRunsSelected) {
        selectedCountElement.textContent = `${filteredRuns.length} selected`;
        selectedCountElement.classList.remove('hidden');
    } else if (selectedCount > 0) {
        selectedCountElement.textContent = selectedCount + ' selected';
        selectedCountElement.classList.remove('hidden');
    } else {
        selectedCountElement.classList.add('hidden');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('dropdown');
    const button = event.target.closest('button');
    
    if (!button || button.getAttribute('onclick') !== 'toggleDropdown()') {
        dropdown.classList.add('hidden');
    }
});

// Pagination functions
function updatePagination() {
    const paginationInfo = document.getElementById('paginationInfo');
    const totalRunsCount = document.getElementById('totalRunsCount');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (!paginationInfo || !totalRunsCount || !prevPageBtn || !nextPageBtn || !pageNumbers) {
        return;
    }
    
    // Update pagination info
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, filteredRuns.length);
    paginationInfo.textContent = `${startIndex}-${endIndex}`;
    totalRunsCount.textContent = filteredRuns.length;
    
    // Update navigation buttons
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    
    // Generate page numbers
    generatePageNumbers(pageNumbers);
}

function generatePageNumbers(container) {
    container.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Add first page and ellipsis if needed
    if (startPage > 1) {
        addPageButton(container, 1, false);
        if (startPage > 2) {
            addEllipsis(container);
        }
    }
    
    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
        addPageButton(container, i, i === currentPage);
    }
    
    // Add last page and ellipsis if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsis(container);
        }
        addPageButton(container, totalPages, false);
    }
}

function addPageButton(container, pageNum, isActive) {
    const button = document.createElement('button');
    button.textContent = pageNum;
    button.onclick = () => goToPage(pageNum);
    button.className = `px-3 py-2 text-sm font-medium rounded-md ${
        isActive 
            ? 'bg-blue-600 text-white' 
            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
    }`;
    container.appendChild(button);
}

function addEllipsis(container) {
    const span = document.createElement('span');
    span.textContent = '...';
    span.className = 'px-3 py-2 text-sm text-gray-500';
    container.appendChild(span);
}

function goToPage(pageNum) {
    if (pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
        currentPage = pageNum;
        updateRunsDisplay();
        updatePagination();
    }
}

function previousPage() {
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

// Function to handle create annotation queue button click
function createAnnotationQueue() {
    // Check if any rows are selected
    const selectedCount = selectedRunIds.size;
    
    if (selectedCount === 0) {
        // Show toast notification that no rows are selected
        Toastify({
            text: "Please select at least one run to create an annotation queue",
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "#ef4444",
            stopOnFocus: true,
            close: true
        }).showToast();
        return;
    }
    
    // Show modal for queue name input
    showCreateQueueModal(selectedCount);
}

// Function to show the create queue modal
function showCreateQueueModal(selectedCount) {
    // Create modal HTML
    const modalHTML = `
        <div id="createQueueModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="mt-2 text-center">
                        <div class="mt-2 px-7">
                            <p class="text-sm text-gray-500">
                                Creating queue with ${selectedCount} selected run${selectedCount > 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <div class="mt-4">
                        <label for="queueName" class="text-sm font-medium text-gray-700 mb-2 hidden">
                            Queue Name
                        </label>
                        <input 
                            type="text" 
                            id="queueName" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter queue name"
                            autofocus
                        >
                    </div>
                    <div class="mt-6">
                        <button 
                            onclick="submitCreateQueue()" 
                            class="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Create
                        </button>
                    </div>
                    <div class="mt-3">
                        <button 
                            onclick="closeCreateQueueModal()" 
                            class="w-full px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Focus on input field
    setTimeout(() => {
        const input = document.getElementById('queueName');
        if (input) {
            input.focus();
        }
    }, 100);
    
    // Add event listener for Enter key
    const input = document.getElementById('queueName');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitCreateQueue();
            }
        });
    }
}

// Function to submit the create queue form
async function submitCreateQueue() {
    const queueName = document.getElementById('queueName').value.trim();
    
    if (!queueName) {
        // Show error toast
        Toastify({
            text: "Please enter a queue name",
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "#ef4444",
            stopOnFocus: true,
            close: true
        }).showToast();
        return;
    }
    
    // Get the Create button and show spinner
    const createButton = document.querySelector('button[onclick="submitCreateQueue()"]');
    const originalButtonText = createButton.innerHTML;
    createButton.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;
    createButton.disabled = true;
    
    try {
        // Convert selectedRunIds Set to Array of integers
        const runIds = Array.from(selectedRunIds).map(id => parseInt(id));
        
        // Call the API to create the queue
        const response = await fetch('/api/queues', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: queueName,
                description: `Queue created from ${runIds.length} selected runs`,
                run_ids: runIds
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to create queue');
        }
        
        // Show success toast
        Toastify({
            text: `Queue "${queueName}" created successfully!`,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "#10b981",
            stopOnFocus: true,
            close: true
        }).showToast();
        
        // Clear selection
        selectedRunIds.clear();
        allRunsSelected = false;
        updateSelectedCount();
        
        // Close modal
        closeCreateQueueModal();
        
        // Redirect to the new queue page
        if (result.queue && result.queue.id) {
            window.location.href = `/queues/${result.queue.id}`;
        }
        
    } catch (error) {
        console.error('Error creating queue:', error);
        
        // Reset button to original state
        createButton.innerHTML = originalButtonText;
        createButton.disabled = false;
        
        // Show error toast
        Toastify({
            text: `Failed to create queue: ${error.message}`,
            duration: 5000,
            gravity: "top",
            position: "right",
            backgroundColor: "#ef4444",
            stopOnFocus: true,
            close: true
        }).showToast();
    }
}

// Function to close the create queue modal
function closeCreateQueueModal() {
    const modal = document.getElementById('createQueueModal');
    if (modal) {
        modal.remove();
    }
} 
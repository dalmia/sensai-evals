// Runs data for sorting and filtering - will be set by the server
let runsData = [];
let currentSort = {'by': 'timestamp', 'order': 'desc'};
let filteredRuns = [];
let currentUser = ''; // Current logged-in user

// Filter data - will be fetched from API
let filterData = { orgs: [], courses: [] };

// Pagination variables
let currentPage = 1;
let pageSize = 20;
let totalPages = 1;
let totalCount = 0; // Total count from backend

// Selection variables
let allRunsSelected = false;
let selectedRunIds = new Set();

// Load runs data from API
async function loadRunsData() {    
    try {
        // Check if filter data needs to be fetched (only on first load)
        const needsFilterData = !filterData.orgs || filterData.orgs.length === 0;
        
        if (needsFilterData) {
            // Fetch filter data and runs data in parallel (first time only)
            const urlParams = new URLSearchParams(window.location.search);
            const page = parseInt(urlParams.get('page')) || 1;
            
            const [filterResponse, runsResponse] = await Promise.all([
                fetch('/api/filter_data'),
                applyFilters(page, false)
            ]);
            
            // Handle filter data response and update sidebar immediately
            if (filterResponse.ok) {
                filterData = await filterResponse.json();
                if (filterData.error) {
                    console.error('Error fetching filter data:', filterData.error);
                    // Use empty arrays as fallback
                    filterData = { orgs: [], courses: [] };
                } else {
                    // Update sidebar as soon as filter data is available
                    updateFiltersSidebar();
                }
            } else {
                console.error('Failed to fetch filter data');
                filterData = { orgs: [], courses: [] };
            }
        } else {
            // Filter data already available, just fetch runs
            const urlParams = new URLSearchParams(window.location.search);
            const page = parseInt(urlParams.get('page')) || 1;
            await applyFilters(page, false);
        }
        
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
                        <button onclick="loadRunsData()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
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
    
    // Use the fetched filter data instead of extracting from runs
    const organizations = filterData.orgs || [];
    const courses = filterData.courses || [];
    
    // Generate filters HTML
    const filtersHTML = generateFiltersHTML(organizations, courses);
    filtersSidebar.innerHTML = filtersHTML;
    
    // Restore filter state from URL after generating the HTML
    // Note: This will be called again to ensure filters are properly set after HTML regeneration
    restoreFiltersFromURL();
}

// Generate filters HTML
function generateFiltersHTML(organizations, courses) {
    return `
        <div class="h-full flex flex-col">
            <!-- Sticky Top: Title, Clear, Apply Filter -->
            <div class="sticky top-0 z-10 bg-white p-4 pb-2 border-b border-gray-100">
                <div class="mb-4 flex items-center justify-between">
                    <h3 class="text-lg font-medium text-gray-900">Filters</h3>
                    <button onclick="clearAllFilters()" class="text-sm text-blue-600 hover:text-blue-800">
                        Clear
                    </button>
                </div>
                <div class="mb-2">
                    <button id="applyFiltersBtn" class="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onclick="applyFilters()">Apply Filter</button>
                </div>
            </div>
            <!-- Scrollable Filters -->
            <div class="flex-1 overflow-y-auto p-4 pt-2">
                <!-- User Email Filter -->
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">User Email</h4>
                    <input type="email" id="userEmailFilter" placeholder="Enter user email" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-1" oninput="validateUserEmail()">
                    <div id="userEmailError" class="text-xs text-red-500 hidden">Please enter a valid email address</div>
                </div>
                <!-- Annotation Status Filter -->
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">Annotation Status</h4>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input type="radio" name="annotation" value="all" checked class="mr-2">
                            <span class="text-sm text-gray-700">All</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="annotation" value="annotated" class="mr-2">
                            <span class="text-sm text-gray-700">Annotated</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="annotation" value="unannotated" class="mr-2">
                            <span class="text-sm text-gray-700">Unannotated</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="annotation" value="correct" class="mr-2">
                            <span class="text-sm text-gray-700">Correct</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="annotation" value="wrong" class="mr-2">
                            <span class="text-sm text-gray-700">Wrong</span>
                        </label>
                    </div>
                </div>
                <!-- Time Range Filter -->
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">Time Range</h4>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input type="radio" name="timerange" value="all" checked class="mr-2">
                            <span class="text-sm text-gray-700">All time</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="timerange" value="yesterday" class="mr-2">
                            <span class="text-sm text-gray-700">Yesterday</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="timerange" value="last7" class="mr-2">
                            <span class="text-sm text-gray-700">Last 7 days</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="timerange" value="last30" class="mr-2">
                            <span class="text-sm text-gray-700">Last 30 days</span>
                        </label>
                    </div>
                </div>
                <!-- Type Filter -->
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">Type</h4>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input type="checkbox" class="type-filter mr-2" value="quiz">
                            <span class="text-sm text-gray-700">Quiz</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="type-filter mr-2" value="learning_material">
                            <span class="text-sm text-gray-700">Learning Material</span>
                        </label>
                    </div>
                </div>
                <!-- Question Type Filter -->
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">Question Type</h4>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input type="checkbox" class="question-type-filter mr-2" value="subjective">
                            <span class="text-sm text-gray-700">Subjective</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="question-type-filter mr-2" value="objective">
                            <span class="text-sm text-gray-700">Objective</span>
                        </label>
                    </div>
                </div>
                <!-- Input Type Filter -->
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">Input Type</h4>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input type="checkbox" class="input-type-filter mr-2" value="text">
                            <span class="text-sm text-gray-700">text</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="input-type-filter mr-2" value="code">
                            <span class="text-sm text-gray-700">code</span>
                        </label>
                    </div>
                </div>
                <!-- Purpose Filter -->
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">Purpose</h4>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input type="checkbox" class="purpose-filter mr-2" value="practice">
                            <span class="text-sm text-gray-700">Practice</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="purpose-filter mr-2" value="exam">
                            <span class="text-sm text-gray-700">Exam</span>
                        </label>
                    </div>
                </div>
                <!-- Organization Filter -->
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">Organization</h4>
                    <input type="text" id="orgSearch" placeholder="Search organizations" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-3" onkeyup="filterOrganizations()">
                    <div id="orgList" class="space-y-2 max-h-40 overflow-y-auto">
                        ${organizations.map(org => `
                            <label class="flex items-center">
                                <input type="checkbox" class="org-filter mr-2" value="${org.id}">
                                <span class="text-sm text-gray-700">${org.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <!-- Course Filter -->
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">Course</h4>
                    <input type="text" id="courseSearch" placeholder="Search courses" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-3" onkeyup="filterCourses()">
                    <div id="courseList" class="space-y-2 max-h-40 overflow-y-auto">
                        ${courses.map(course => `
                            <label class="flex items-center">
                                <input type="checkbox" class="course-filter mr-2" value="${course.id}">
                                <span class="text-sm text-gray-700">${course.name}</span>
                            </label>
                        `).join('')}
                    </div>
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

// Restore filter state from URL
function restoreFiltersFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Restore annotation filter
    const annotationFilter = urlParams.get('annotation_filter') || 'all';
    const annotationRadio = document.querySelector(`input[name="annotation"][value="${annotationFilter}"]`);
    if (annotationRadio) annotationRadio.checked = true;
    
    // Restore time range filter
    const timeRange = urlParams.get('time_range') || 'all';
    const timeRangeRadio = document.querySelector(`input[name="timerange"][value="${timeRange}"]`);
    if (timeRangeRadio) timeRangeRadio.checked = true;
    
    // Restore checkbox filters
    const restoreCheckboxes = (paramName, className) => {
        const values = urlParams.get(paramName);
        if (values) {
            const valueArray = values.split(',');
            valueArray.forEach(value => {
                const checkbox = document.querySelector(`.${className}[value="${value}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    };
    
    restoreCheckboxes('run_type', 'type-filter');
    restoreCheckboxes('question_type', 'question-type-filter');
    restoreCheckboxes('question_input_type', 'input-type-filter');
    restoreCheckboxes('purpose', 'purpose-filter');
    restoreCheckboxes('org_id', 'org-filter');
    restoreCheckboxes('course_id', 'course-filter');
}

// Save filter state to URL
function saveFiltersToURL(page = 1) {
    const params = new URLSearchParams();
    
    // Add page
    if (page > 1) params.set('page', page);
    
    // Add filters
    const annotationFilter = document.querySelector('input[name="annotation"]:checked')?.value;
    if (annotationFilter && annotationFilter !== 'all') {
        params.set('annotation_filter', annotationFilter);
    }
    
    const timeRangeFilter = document.querySelector('input[name="timerange"]:checked')?.value;
    if (timeRangeFilter && timeRangeFilter !== 'all') {
        params.set('time_range', timeRangeFilter);
    }
    
    // Add checkbox filters
    const addCheckboxFilter = (paramName, className) => {
        const values = Array.from(document.querySelectorAll(`.${className}:checked`)).map(cb => cb.value);
        if (values.length > 0) {
            params.set(paramName, values.join(','));
        }
    };
    
    addCheckboxFilter('run_type', 'type-filter');
    addCheckboxFilter('question_type', 'question-type-filter');
    addCheckboxFilter('question_input_type', 'input-type-filter');
    addCheckboxFilter('purpose', 'purpose-filter');
    addCheckboxFilter('org_id', 'org-filter');
    addCheckboxFilter('course_id', 'course-filter');
    
    // Update URL without page reload
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.pushState({}, '', newUrl);
}

// Apply all filters (now fetches from backend)
async function applyFilters(page = 1, saveToUrl = true) {
    console.log("applyFilters")
    // Helper function to get filter values from DOM or URL fallback
    function getFilterValue(domSelector, urlParam, defaultValue = null) {
        const element = document.querySelector(domSelector);
        if (element) {
            return element.value;
        }
        // Fallback to URL if DOM element doesn't exist yet
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(urlParam) || defaultValue;
    }
    
    function getCheckboxValues(domSelector, urlParam) {
        const elements = document.querySelectorAll(domSelector);
        if (elements.length > 0) {
            return Array.from(elements).filter(cb => cb.checked).map(cb => cb.value);
        }
        // Fallback to URL if DOM elements don't exist yet
        const urlParams = new URLSearchParams(window.location.search);
        const urlValue = urlParams.get(urlParam);
        return urlValue ? urlValue.split(',') : [];
    }

    // Gather filter values (from DOM if available, otherwise from URL)
    const annotationFilter = getFilterValue('input[name="annotation"]:checked', 'annotation_filter', 'all');
    const timeRangeFilter = getFilterValue('input[name="timerange"]:checked', 'time_range', 'all');
    const typeFilters = getCheckboxValues('.type-filter', 'run_type');
    const questionTypeFilters = getCheckboxValues('.question-type-filter', 'question_type');
    const inputTypeFilters = getCheckboxValues('.input-type-filter', 'question_input_type');
    const purposeFilters = getCheckboxValues('.purpose-filter', 'purpose');
    const orgFilters = getCheckboxValues('.org-filter', 'org_id');
    const courseFilters = getCheckboxValues('.course-filter', 'course_id');

    console.log(orgFilters)
    console.log(courseFilters)

    // Only save filter state to URL if this is a user-triggered change
    if (saveToUrl) {
        saveFiltersToURL(page);
    }

    // Build query params for API
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('page_size', pageSize);
    params.append('sort_by', currentSort.by);
    params.append('sort_order', currentSort.order);
    if (annotationFilter && annotationFilter !== 'all') params.append('annotation_filter', annotationFilter);
    if (timeRangeFilter && timeRangeFilter !== 'all') params.append('time_range', timeRangeFilter);
    if (typeFilters.length > 0) params.append('run_type', typeFilters.join(','));
    if (questionTypeFilters.length > 0) params.append('question_type', questionTypeFilters.join(','));
    if (inputTypeFilters.length > 0) params.append('question_input_type', inputTypeFilters.join(','));
    if (purposeFilters.length > 0) params.append('purpose', purposeFilters.join(','));
    if (orgFilters.length > 0) params.append('org_id', orgFilters.join(','));
    if (courseFilters.length > 0) params.append('course_id', courseFilters.join(','));

    // Fetch filtered/paginated data from backend
    try {
        const response = await fetch(`/api/runs?${params.toString()}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        runsData = data.runs || [];
        filteredRuns = runsData; // For compatibility with existing code
        totalPages = data.total_pages || 1;
        totalCount = data.total_count || 0;
        currentPage = data.current_page || 1;
    
    // Reset selection state when filters are applied
    allRunsSelected = false;
    selectedRunIds.clear();

    console.log(params.toString())
    
    updateRunsDisplay();
    updatePagination();
    updateRunsCount();
        
    } catch (error) {
        console.error('Error applying filters:', error);
        // Show error message
        const runsList = document.getElementById('runsList');
        if (runsList) {
            runsList.innerHTML = `<div class="flex items-center justify-center py-12"><div class="text-center"><div class="text-red-500 text-xl mb-4">⚠️</div><p class="text-red-600 text-lg">Error loading runs</p><p class="text-gray-600">${error.message}</p></div></div>`;
        }
    }
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
        // No filters applied or all results fit on current view
        headerElement.textContent = `All runs (${totalCount})`;
    }
    
    // Also update annotated count to keep both labels in sync
    updateAnnotatedCount();
}

// Calculate annotated count for current page runs
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
        const currentPageAnnotatedCount = getAnnotatedCount(runsData);
        // Since we only have current page data, show count for current page
        annotatedCountElement.textContent = `Annotated ${currentPageAnnotatedCount}/${runsData.length} (page ${currentPage})`;
    }
}

// Clear all filters
function clearAllFilters() {
    // Reset annotation filter
    const allAnnotationRadio = document.querySelector('input[name="annotation"][value="all"]');
    if (allAnnotationRadio) allAnnotationRadio.checked = true;
    
    // Reset time range filter
    const allTimeRangeRadio = document.querySelector('input[name="timerange"][value="all"]');
    if (allTimeRangeRadio) allTimeRangeRadio.checked = true;
    
    // Reset all checkboxes
    document.querySelectorAll('.type-filter, .question-type-filter, .input-type-filter, .purpose-filter, .org-filter, .course-filter').forEach(cb => {
        cb.checked = false;
    });
    
    // Clear search boxes
    const orgSearch = document.getElementById('orgSearch');
    const courseSearch = document.getElementById('courseSearch');
    if (orgSearch) orgSearch.value = '';
    if (courseSearch) courseSearch.value = '';
    
    // Show all organizations and courses
    filterOrganizations();
    filterCourses();
    
    // Clear URL and apply filters
    window.history.pushState({}, '', window.location.pathname);
    applyFilters(1, true);
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

// Generate runs HTML
function generateRunsHTML(runs, startIndex) {
    let runsHtml = '';
    for (let i = 0; i < runs.length; i++) {
        const run = runs[i];
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
                <div class="flex items-start justify-between">
                    <div class="flex items-start space-x-3 pr-8">
                        <div class="flex-shrink-0 mt-1">
                            <input type="checkbox" id="rowCheckbox_${runId}" class="row-checkbox w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" onchange="updateSelectedCount()">
                        </div>
                        <div>
                            <div class="text-sm font-medium text-gray-900 leading-5">${runName}</div>
                            <div class="flex items-center space-x-2 mt-1">
                                ${tagBadges}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-8 flex-shrink-0">
                        <div class="flex items-center justify-center w-12">
                            ${annotationIcon}
                        </div>
                        <div class="w-32 text-right">
                            <span class="text-sm text-gray-500">${formattedTimestamp}</span>
                        </div>
                        <div class="w-5 h-5 invisible">
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
    // Data is already sorted server-side, no need to sort again
    const runsListElement = document.getElementById('runsList');
    if (runsListElement) {
        runsListElement.innerHTML = generateRunsHTML(runsData, 0);
        
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
    updateArrow();
    // Trigger new API call with updated sort order
    applyFilters(1, true);
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
                    Select All ${totalCount} Runs
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
    
    // Since we're selecting all runs, we don't need to add individual IDs
    // The backend will handle the selection based on current filters
    
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
    selectedCountElement.textContent = `${totalCount} selected`;
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
        selectedCountElement.textContent = `${totalCount} selected`;
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
    const endIndex = Math.min(currentPage * pageSize, totalCount);
    paginationInfo.textContent = `${startIndex}-${endIndex}`;
    totalRunsCount.textContent = totalCount;
    
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
        applyFilters(pageNum, true);
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
    let selectedCount;
    
    if (allRunsSelected) {
        selectedCount = totalCount;
    } else {
        selectedCount = selectedRunIds.size;
    }
    
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
        let requestBody;
        
        if (allRunsSelected) {
            // When all runs are selected, send the current filter parameters instead of specific run IDs
            // This allows the backend to get all filtered runs
            const urlParams = new URLSearchParams(window.location.search);
            
            requestBody = {
                name: queueName,
                description: `Queue created from ${totalCount} selected runs`,
                select_all_filtered: true,
                filters: {
                    annotation_filter: urlParams.get('annotation_filter'),
                    time_range: urlParams.get('time_range'),
                    run_type: urlParams.get('run_type'),
                    question_type: urlParams.get('question_type'),
                    question_input_type: urlParams.get('question_input_type'),
                    purpose: urlParams.get('purpose'),
                    org_id: urlParams.get('org_id'),
                    course_id: urlParams.get('course_id')
                }
            };
        } else {
            // Convert selectedRunIds Set to Array of integers
            const runIds = Array.from(selectedRunIds).map(id => parseInt(id));
            
            requestBody = {
                name: queueName,
                description: `Queue created from ${runIds.length} selected runs`,
                run_ids: runIds
            };
        }
        
        // Call the API to create the queue
        const response = await fetch('/api/queues', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
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
        if (result.queue_id != null) {
            window.location.href = `/queues/${result.queue_id}`;
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

// Add this at the end of the file to ensure global scope for the HTML oninput handler
function validateUserEmail() {
    const emailInput = document.getElementById('userEmailFilter');
    const errorDiv = document.getElementById('userEmailError');
    if (!emailInput) return;
    const value = emailInput.value.trim();
    // Simple email regex for validation
    const isValid = value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (isValid) {
        errorDiv.classList.add('hidden');
    } else {
        errorDiv.classList.remove('hidden');
    }
} 
// Runs data for sorting and filtering - will be set by the server
let runsData = [];
let currentSort = {'by': 'timestamp', 'order': 'desc'};
let filteredRuns = [];

// Initialize runs data
function initializeRunsData(data) {
    runsData = data;
    filteredRuns = runsData;
    updateRunsDisplay();
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

    updateRunsDisplay();
    updateRunsCount();
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
    if (!run.annotations) return null;
    
    for (const [annotator, annotationData] of Object.entries(run.annotations)) {
        const judgement = annotationData.judgement;
        if (judgement === 'correct' || judgement === 'wrong') {
            return judgement;
        }
    }
    return null;
}

// Update runs count in header
function updateRunsCount() {
    const headerElement = document.querySelector('h2');
    if (headerElement) {
        const totalRuns = runsData.length;
        const filteredCount = filteredRuns.length;
        
        if (filteredCount === totalRuns) {
            headerElement.textContent = `All runs (${totalRuns})`;
        } else {
            headerElement.textContent = `All runs (${filteredCount} of ${totalRuns})`;
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
    
    // Apply filters (which will show all runs)
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
    console.log("sortRuns");
    console.log(runs);
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
function generateRunsHTML(sortedRuns) {
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
        
        let runName;
        if (courseName && milestoneName) {
            runName = `${courseName} - ${milestoneName}`;
        } else if (courseName) {
            runName = courseName;
        } else {
            runName = `Run ${runId}`;
        }
        
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
            <div class="border-b border-gray-100 px-6 py-4 hover:bg-gray-50 cursor-pointer">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <input type="checkbox" id="rowCheckbox_${i}" class="row-checkbox w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" onchange="updateSelectedCount()">
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
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
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
    const runsListElement = document.getElementById('runsList');
    if (runsListElement) {
        runsListElement.innerHTML = generateRunsHTML(sortedRuns);
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
    updateRunsDisplay();
    updateArrow();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateRunsDisplay();
    updateArrow();
});

// Select/Deselect all functionality
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    
    rowCheckboxes.forEach(function(checkbox) {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateSelectedCount();
}

// Update selected count display
function updateSelectedCount() {
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const selectedCountElement = document.getElementById('selectedCount');
    
    const selectedCount = selectedCheckboxes.length;
    const totalCount = rowCheckboxes.length;
    
    // Update select all checkbox state
    if (selectedCount === 0) {
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
    if (selectedCount > 0) {
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
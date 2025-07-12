let queuesData = [];
let currentUser = '';

// Helper function to format ISO timestamp to human readable format
function formatTimestamp(isoTimestamp) {
    try {
        const date = new Date(isoTimestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return isoTimestamp;
    }
}

// Helper function to create a readable name from run data
function getRunName(run) {
    const metadata = run.metadata || {};
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
    
    return runName;
}

// Helper function to create tag badges from metadata
function createTagBadges(metadata) {
    const relevantKeys = ['question_input_type', 'question_type', 'question_purpose', 'type'];
    
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
    
    return tagBadges;
}

// Helper function to determine annotation status from run data
function getAnnotationStatus(run) {
    // Check if annotations key exists
    if (!run.annotations) {
        return null; // No annotation
    }
    
    // Only check annotations from the currently selected annotator
    const annotation_data = run.annotations[currentUser];
    if (annotation_data && annotation_data.judgement) {
        const judgement = annotation_data.judgement;
        if (judgement === 'correct' || judgement === 'wrong') {
            return judgement;
        }
    }
    
    return null; // No valid annotation found
}

function showQueueDetails(queueId) {
    // Update URL with queue ID as query parameter
    const url = new URL(window.location);
    url.searchParams.set('queueId', queueId);
    window.history.pushState({}, '', url);
    
    // Add visual selection state to queue items
    document.querySelectorAll('[onclick*="showQueueDetails"]').forEach(item => {
        item.classList.remove('bg-blue-50', 'border-l-blue-500');
        item.classList.add('border-l-transparent');
    });
    const selectedItem = document.querySelector(`[onclick="showQueueDetails('${queueId}')"]`);
    if (selectedItem) {
        selectedItem.classList.add('bg-blue-50', 'border-l-blue-500');
        selectedItem.classList.remove('border-l-transparent');
    }
    
    const queue = queuesData.find(q => q.id === queueId);
    
    if (!queue) return;
    
    // Get runs directly from queue.runs
    const runs = queue.runs || [];
    
    // Generate runs HTML with sorting functionality
    function generateRunsHTML(sortedRuns) {
        let runsHtml = '';
        sortedRuns.forEach(run => {
            const annotation = getAnnotationStatus(run);
            const runName = getRunName(run);
            const timestamp = formatTimestamp(run.start_time);
            const tagBadges = createTagBadges(run.metadata || {});
            
            // Annotation icon
            let annotationIcon = '';
            if (annotation === 'correct') {
                annotationIcon = `<div class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>`;
            } else if (annotation === 'wrong') {
                annotationIcon = `<div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>`;
            } else {
                annotationIcon = '<div class="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex-shrink-0"></div>';
            }
            
            runsHtml += `
                <div class="border-b border-l-4 border-l-transparent border-gray-100 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors" onclick="selectTask('${queueId}', '${run.id}')">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3 flex-1">
                            ${annotationIcon}
                            <div class="flex-1">
                                <div class="text-sm font-medium text-gray-900">${runName}</div>
                                <div class="flex items-center space-x-2 mt-1">
                                    ${tagBadges}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <div class="text-sm text-gray-600">
                                ${timestamp}
                            </div>
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </div>
            `;
        });
        return runsHtml;
    }
    
    // Sorting functions
    function sortRuns(runs, sortBy, sortOrder) {
        return [...runs].sort((a, b) => {
            let aValue, bValue;
            
            if (sortBy === 'timestamp') {
                aValue = new Date(a.start_time);
                bValue = new Date(b.start_time);
            } else if (sortBy === 'name') {
                aValue = getRunName(a).toLowerCase();
                bValue = getRunName(b).toLowerCase();
            }
            
            if (sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
    }
    
    // Initial sort by timestamp descending
    let currentSort = { by: 'timestamp', order: 'desc' };
    let sortedRuns = sortRuns(runs, currentSort.by, currentSort.order);
    let currentFilter = 'all';
    
    // Function to filter runs by annotation status
    function filterRuns(runs, filter) {
        if (filter === 'all') return runs;
        if (filter === 'empty') return runs.filter(run => getAnnotationStatus(run) === null);
        if (filter === 'correct') return runs.filter(run => getAnnotationStatus(run) === 'correct');
        if (filter === 'wrong') return runs.filter(run => getAnnotationStatus(run) === 'wrong');
        return runs;
    }
    
    // Function to get filtered and sorted runs
    function getFilteredAndSortedRuns() {
        let filteredRuns = filterRuns(runs, currentFilter);
        return sortRuns(filteredRuns, currentSort.by, currentSort.order);
    }
    
    // Function to update the runs display
    function updateRunsDisplay() {
        const displayRuns = getFilteredAndSortedRuns();
        document.getElementById(`runsList-${queueId}`).innerHTML = generateRunsHTML(displayRuns);
        
        // Update queue count in header
        const queueHeader = document.querySelector('h2');
        queueHeader.textContent = `${queue.name} (${displayRuns.length}${displayRuns.length !== runs.length ? ` of ${runs.length}` : ''})`;
        
        // Restore task selection if one was selected
        const urlParams = new URLSearchParams(window.location.search);
        const urlTaskId = urlParams.get('taskId');
        if (urlTaskId) {
            setTimeout(() => {
                const taskElement = document.querySelector(`[onclick="selectTask('${queueId}', '${urlTaskId}')"]`);
                if (taskElement) {
                    taskElement.classList.add('bg-blue-50', 'border-l-blue-500');
                    taskElement.classList.remove('border-l-transparent');
                }
            }, 10);
        }
    }
    
    // Function to get arrow based on current sort
    function getTimestampArrow(currentOrder) {
        if (currentOrder === 'asc') {
            return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
            </svg>`;
        } else {
            return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>`;
        }
    }
    
    function updateHeader() {
        const arrow = getTimestampArrow(currentSort.order);
        document.getElementById(`timestampHeader-${queueId}`).innerHTML = `
            <button onclick="toggleTimestampSort()" class="flex items-center text-gray-700 hover:text-gray-900 p-1 rounded transition-colors">
                <span class="text-sm font-medium">Timestamp</span>
                <div class="ml-1">
                    ${arrow}
                </div>
            </button>
        `;
    }
    
    const content = `
        <div>
            <!-- Header -->
            <div class="bg-white border-b border-t border-gray-200 px-6 py-4">
                <div class="flex justify-between items-center">
                    <div class="flex flex-col">
                        <h2 class="text-lg font-semibold text-gray-900">${queue.name} (${runs.length})</h2>
                        <span class="text-sm text-gray-500">Created by ${queue.created_by}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <!-- Filter Dropdown -->
                        <div class="relative">
                            <button onclick="toggleAnnotationFilter()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 flex items-center space-x-2">
                                <span id="currentFilter-${queueId}">All</span>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            <div id="annotationFilterDropdown-${queueId}" class="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden">
                                <div class="py-1">
                                    <button onclick="filterByAnnotation('all')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">All</button>
                                    <button onclick="filterByAnnotation('empty')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Not annotated</button>
                                    <button onclick="filterByAnnotation('correct')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Correct</button>
                                    <button onclick="filterByAnnotation('wrong')" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Wrong</button>
                                </div>
                            </div>
                        </div>
                        <button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium" onclick="window.location.href='/queues/${queueId}'">
                            Start annotation
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Table Header -->
            <div class="bg-gray-50 border-b border-gray-200 px-6 py-3">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                    </div>
                    <div class="flex items-center ml-4" id="timestampHeader-${queueId}">
                        <button onclick="toggleTimestampSort()" class="flex items-center text-gray-700 hover:text-gray-900 p-1 rounded transition-colors">
                            <span class="text-sm font-medium">Timestamp</span>
                            <div class="ml-1">
                                ${getTimestampArrow(currentSort.order)}
                            </div>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Queue Runs List -->
            <div class="bg-white" id="runsList-${queueId}">
                ${generateRunsHTML(sortedRuns)}
            </div>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = content;
    
    // Check if there's a task to restore from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlTaskId = urlParams.get('taskId');
    if (urlTaskId) {
        // Wait a bit for the DOM to be updated, then select the task
        setTimeout(() => {
            const taskElement = document.querySelector(`[onclick="selectTask('${queueId}', '${urlTaskId}')"]`);
            if (taskElement) {
                selectTask(queueId, urlTaskId);
            }
        }, 100);
    }
    
    // Add global sorting functions
    window.toggleTimestampSort = function() {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
        sortedRuns = sortRuns(runs, currentSort.by, currentSort.order);
        updateRunsDisplay();
        updateHeader();
    };
    
    // Add global filter functions
    window.toggleAnnotationFilter = function() {
        const dropdown = document.getElementById(`annotationFilterDropdown-${queueId}`);
        dropdown.classList.toggle('hidden');
    };
    
    window.filterByAnnotation = function(filter) {
        currentFilter = filter;
        const filterLabels = {
            'all': 'All',
            'empty': 'Not annotated',
            'correct': 'Correct',
            'wrong': 'Wrong'
        };
        document.getElementById(`currentFilter-${queueId}`).textContent = filterLabels[filter];
        document.getElementById(`annotationFilterDropdown-${queueId}`).classList.add('hidden');
        updateRunsDisplay();
    };
}

// Function to select a task and navigate to annotation page
function selectTask(queueId, taskId) {
    // Navigate to the queue annotation page with task ID
    window.location.href = `/queues/${queueId}?taskId=${taskId}`;
}

function toggleDropdown() {
    const dropdown = document.getElementById('dropdown');
    dropdown.classList.toggle('hidden');
}

// Auto-restore queue selection when data is initialized
function initializeQueuesData(data) {
    let selectedQueueId = '';
    let selectedTaskId = '';
    
    // Handle both old format (array) and new format (object with queues and user)
    if (Array.isArray(data)) {
        queuesData = data;
    } else {
        queuesData = data.queues || [];
        currentUser = data.user || '';
        selectedQueueId = data.selectedQueueId || '';
        selectedTaskId = data.selectedTaskId || '';
    }
    
    // First try to restore from URL, then fall back to server-provided selectedQueueId
    const urlParams = new URLSearchParams(window.location.search);
    const urlQueueId = urlParams.get('queueId');
    const urlTaskId = urlParams.get('taskId');
    
    if (urlQueueId && queuesData.length > 0) {
        const queue = queuesData.find(q => q.id === urlQueueId);
        if (queue) {
            showQueueDetails(urlQueueId);
            // Also restore task selection if taskId is present
            if (urlTaskId) {
                // Wait a bit for the DOM to be updated, then select the task
                setTimeout(() => {
                    const taskElement = document.querySelector(`[onclick="selectTask('${urlQueueId}', '${urlTaskId}')"]`);
                    if (taskElement) {
                        selectTask(urlQueueId, urlTaskId);
                    }
                }, 100);
            }
        }
    } else if (selectedQueueId && queuesData.length > 0) {
        const queue = queuesData.find(q => q.id === selectedQueueId);
        if (queue) {
            showQueueDetails(selectedQueueId);
            // Also restore task selection if taskId is present
            if (selectedTaskId) {
                // Wait a bit for the DOM to be updated, then select the task
                setTimeout(() => {
                    const taskElement = document.querySelector(`[onclick="selectTask('${selectedQueueId}', '${selectedTaskId}')"]`);
                    if (taskElement) {
                        selectTask(selectedQueueId, selectedTaskId);
                    }
                }, 100);
            }
        }
    }
}

// Annotator filter functions
function toggleAnnotatorFilter() {
    const dropdown = document.getElementById('annotatorFilterDropdown');
    dropdown.classList.toggle('hidden');
}

function filterByAnnotator(annotator) {
    currentUser = annotator;
    document.getElementById('currentAnnotator').textContent = annotator;
    document.getElementById('annotatorFilterDropdown').classList.add('hidden');
    
    // Re-render the current queue details if one is selected
    const mainContent = document.getElementById('mainContent');
    if (mainContent.innerHTML.includes('runsList-')) {
        // Extract queue ID from the current display
        const runsListElement = document.querySelector('[id^="runsList-"]');
        if (runsListElement) {
            const queueId = runsListElement.id.replace('runsList-', '');
            showQueueDetails(queueId);
        }
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('dropdown');
    if (dropdown) {
        const button = event.target.closest('button');
        
        if (!button || button.getAttribute('onclick') !== 'toggleDropdown()') {
            dropdown.classList.add('hidden');
        }
    }
    
    // Close annotation filter dropdown when clicking outside
    const annotationFilterDropdowns = document.querySelectorAll('[id^="annotationFilterDropdown-"]');
    annotationFilterDropdowns.forEach(dropdown => {
        if (!event.target.closest(`#${dropdown.id}`)) {
            const toggleButton = event.target.closest('button[onclick="toggleAnnotationFilter()"]');
            if (!toggleButton) {
                dropdown.classList.add('hidden');
            }
        }
    });
    
    // Close annotator filter dropdown when clicking outside
    const annotatorFilterDropdown = document.getElementById('annotatorFilterDropdown');
    if (annotatorFilterDropdown) {
        if (!event.target.closest('#annotatorFilterDropdown')) {
            const toggleButton = event.target.closest('button[onclick="toggleAnnotatorFilter()"]');
            if (!toggleButton) {
                annotatorFilterDropdown.classList.add('hidden');
            }
        }
    }
}); 
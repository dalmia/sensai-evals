let queuesData = [];
let selectedAnnotator = ''; // Track which annotator's annotations to display

// Pagination variables for queue details
let currentPage = 1;
let pageSize = 20;
let totalPages = 1;
let currentQueueRuns = [];

// Function to scroll to a specific queue element
function scrollToQueue(queueId) {
    if (!queueId) return;
    
    // Wait for DOM to be updated, then scroll
    setTimeout(() => {
        // Find the queue element by its onclick attribute
        const queueElements = document.querySelectorAll('[onclick*="showQueueDetails"]');
        let targetElement = null;
        
        // Find the element that calls showQueueDetails with the specific queueId
        queueElements.forEach(element => {
            const onclickAttr = element.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`showQueueDetails('${queueId}')`)) {
                targetElement = element;
            }
        });
        
        if (targetElement) {
            // Get the scrollable container (the queues list)
            const queuesListContainer = document.getElementById('queuesList');
            if (queuesListContainer) {
                // Calculate the position to scroll to
                const containerRect = queuesListContainer.getBoundingClientRect();
                const elementRect = targetElement.getBoundingClientRect();
                
                // Calculate the scroll position to center the element in the container
                const scrollTop = queuesListContainer.scrollTop + 
                    (elementRect.top - containerRect.top) - 
                    (containerRect.height / 2) + 
                    (elementRect.height / 2);
                
                // Scroll smoothly to the target element
                queuesListContainer.scrollTo({
                    top: Math.max(0, scrollTop),
                    behavior: 'smooth'
                });
                
                // Optional: Add a brief highlight effect
                targetElement.style.transition = 'background-color 0.3s ease';
                targetElement.style.backgroundColor = '#dbeafe'; // Light blue highlight
                setTimeout(() => {
                    targetElement.style.backgroundColor = '';
                    setTimeout(() => {
                        targetElement.style.transition = '';
                    }, 300);
                }, 1000);
            }
        }
    }, 100); // Small delay to ensure DOM is updated
}

// Load queues data from API
async function loadQueuesData(selectedQueueId = '') {    
    try {
        const response = await fetch('/api/queues');
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        queuesData = data.queues || [];
        selectedAnnotator = data.user || ''; // Initialize selectedAnnotator to current user
        
        // Update the UI
        updateQueuesList();
        
        // Restore queue selection if provided
        if (selectedQueueId && queuesData.length > 0) {
            const queue = queuesData.find(q => q.id === Number(selectedQueueId));
            if (queue) {
                // Get queue page from URL if present
                const urlParams = new URLSearchParams(window.location.search);
                const queuePage = parseInt(urlParams.get('queuePage')) || 1;
                
                setTimeout(() => {
                    showQueueDetails(selectedQueueId, queuePage);
                    // Scroll to the selected queue
                    scrollToQueue(selectedQueueId);
                })
            }
        }
        
        // Update main content to show "No queue selected" message
        updateMainContent();
        
    } catch (error) {
        console.error('Error loading queues data:', error);
        
        // Show error message
        const queuesList = document.getElementById('queuesList');
        if (queuesList) {
            queuesList.innerHTML = `
                <div class="p-4">
                    <div class="text-center">
                        <div class="text-red-500 text-xl mb-4">⚠️</div>
                        <p class="text-red-600 text-lg">Error loading queues</p>
                        <p class="text-gray-600">${error.message}</p>
                        <button onclick="loadQueuesData('${selectedQueueId}')" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Update queues list with data
function updateQueuesList() {
    const queuesList = document.getElementById('queuesList');
    if (!queuesList) return;
    
    if (queuesData.length === 0) {
        queuesList.innerHTML = `
            <div class="p-4">
                <div class="text-center">
                    <div class="text-gray-400 mb-4">
                        <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No queues found</h3>
                    <p class="text-sm text-gray-500">No annotation queues have been created yet</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Generate queues HTML
    const queuesHTML = queuesData.map(queue => {
        const formattedTimestamp = formatTimestamp(queue.created_at);
        return createQueueItem(
            queue.name,
            queue.num_runs || 0,  // Use num_runs instead of queue.runs.length
            formattedTimestamp,
            queue.user_name,
            queue.id
        );
    }).join('');
    
    queuesList.innerHTML = queuesHTML;
}

// Update main content to show "No queue selected" message
function updateMainContent() {
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <div class="text-gray-400 mb-4">
                        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No queue selected</h3>
                    <p class="text-sm text-gray-500">Select an annotation queue from the list to view and annotate its runs</p>
                </div>
            </div>
        `;
    }
}

// Helper function to create queue item HTML
function createQueueItem(name, runCount, formattedTimestamp, userName, queueId) {
    return `
        <div onclick="showQueueDetails('${queueId}')" class="border-l-4 border-l-transparent border-b border-gray-100 px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="text-sm font-medium text-gray-900">${name}</h3>
                    <p class="text-xs text-gray-500 mt-1">${runCount} runs</p>
                    <p class="text-xs text-gray-500">Created by ${userName}</p>
                    <p class="text-xs text-gray-500">${formattedTimestamp}</p>
                </div>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </div>
        </div>
    `;
}

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
    const annotation_data = run.annotations[selectedAnnotator];
    if (annotation_data && annotation_data.judgement) {
        const judgement = annotation_data.judgement;
        if (judgement === 'correct' || judgement === 'wrong') {
            return judgement;
        }
    }
    
    return null; // No valid annotation found
}

function showQueueDetails(queueId, page = 1) {
    // Update URL with queue ID as query parameter
    const url = new URL(window.location);
    url.searchParams.set('queueId', queueId);
    if (page > 1) {
        url.searchParams.set('queuePage', page);
    } else {
        url.searchParams.delete('queuePage');
    }
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

    const queue = queuesData.find(q => q.id === Number(queueId));

    if (!queue) return;
    
    // Reset pagination variables
    currentPage = page;
    totalPages = 1;
    currentQueueRuns = [];
    
    // Load queue runs data from API with pagination
    loadQueueRuns(queueId, queue, page);
}

// New function to load queue runs with pagination
async function loadQueueRuns(queueId, queueBasicInfo, page = 1) {
    try {
        // Build URL with pagination parameters
        const params = new URLSearchParams({
            page: page,
            page_size: pageSize
        });
        
        const response = await fetch(`/api/queues/${queueId}?${params.toString()}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update pagination variables
        currentQueueRuns = data.queue.runs || [];
        totalPages = data.total_pages || 1;
        currentPage = data.current_page || 1;
        const totalCount = data.total_count || 0;
        
        // Generate runs HTML with sorting functionality
        function generateRunsHTML(sortedRuns, startIndex) {
            let runsHtml = '';
            for (let i = 0; i < sortedRuns.length; i++) {
                const run = sortedRuns[i];
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
                    <div class="border-b border-l-4 border-l-transparent border-gray-100 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors" onclick="selectRun('${queueId}', '${run.id}')">
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
            }
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
        let sortedRuns = sortRuns(currentQueueRuns, currentSort.by, currentSort.order);
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
            let filteredRuns = filterRuns(currentQueueRuns, currentFilter);
            return sortRuns(filteredRuns, currentSort.by, currentSort.order);
        }
        
        // Function to update the runs display with pagination
        function updateRunsDisplay() {
            const allFilteredRuns = getFilteredAndSortedRuns();
            
            document.getElementById(`runsList-${queueId}`).innerHTML = generateRunsHTML(allFilteredRuns, 0);
            
            // Update queue count in header
            const queueHeader = document.querySelector('h2');
            queueHeader.textContent = `${queueBasicInfo.name} (${totalCount})`;
            
            // Update pagination
            updatePagination();
            
            // Restore run selection if one was selected
            const urlParams = new URLSearchParams(window.location.search);
            const urlRunId = urlParams.get('runId');
            if (urlRunId) {
                setTimeout(() => {
                    const runElement = document.querySelector(`[onclick="selectRun('${queueId}', '${urlRunId}')"]`);
                    if (runElement) {
                        runElement.classList.add('bg-blue-50', 'border-l-blue-500');
                        runElement.classList.remove('border-l-transparent');
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
        
        // Pagination functions - updated to work with API calls
        function updatePagination() {
            const paginationInfo = document.getElementById(`paginationInfo-${queueId}`);
            const totalRunsCount = document.getElementById(`totalRunsCount-${queueId}`);
            const prevPageBtn = document.getElementById(`prevPageBtn-${queueId}`);
            const nextPageBtn = document.getElementById(`nextPageBtn-${queueId}`);
            const pageNumbers = document.getElementById(`pageNumbers-${queueId}`);
            
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
                // Update URL with page parameter
                const url = new URL(window.location);
                if (pageNum > 1) {
                    url.searchParams.set('queuePage', pageNum);
                } else {
                    url.searchParams.delete('queuePage');
                }
                window.history.pushState({}, '', url);
                
                // Load new page data from API
                loadQueueRuns(queueId, queueBasicInfo, pageNum);
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
        
        const content = `
            <div class="flex flex-col h-full">
                <!-- Header -->
                <div class="bg-white border-b border-t border-gray-200 px-6 py-4">
                    <div class="flex justify-between items-center">
                        <div class="flex flex-col">
                            <h2 class="text-lg font-semibold text-gray-900">${queueBasicInfo.name} (${totalCount})</h2>
                            <span class="text-sm text-gray-500">Created by ${queueBasicInfo.user_name}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <!-- Filter Dropdown 
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
                            </div> -->
                            <button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium" onclick="window.location.href='/queues/${queueId}'">
                                Start annotation
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Pagination -->
                <div class="bg-white border-b border-gray-200 px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <span class="text-sm text-gray-700">Showing</span>
                            <span id="paginationInfo-${queueId}" class="text-sm font-medium text-gray-900">1-${Math.min(pageSize, totalCount)}</span>
                            <span class="text-sm text-gray-700">of</span>
                            <span id="totalRunsCount-${queueId}" class="text-sm font-medium text-gray-900">${totalCount}</span>
                            <span class="text-sm text-gray-700">runs</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button id="prevPageBtn-${queueId}" onclick="previousPage()" class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                Previous
                            </button>
                            <div id="pageNumbers-${queueId}" class="flex items-center space-x-1">
                                <!-- Page numbers will be generated here -->
                            </div>
                            <button id="nextPageBtn-${queueId}" onclick="nextPage()" class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                Next
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
                <div class="bg-white flex-1 overflow-y-auto" id="runsList-${queueId}">
                    ${generateRunsHTML(sortedRuns, 0)}
                </div>
            </div>
        `;
        
        document.getElementById('mainContent').innerHTML = content;
        
        // Initialize pagination
        updatePagination();
        
        // Check if there's a run to restore from URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlRunId = urlParams.get('runId');
        if (urlRunId) {
            // Wait a bit for the DOM to be updated, then select the run
            setTimeout(() => {
                const runElement = document.querySelector(`[onclick="selectRun('${queueId}', '${urlRunId}')"]`);
                if (runElement) {
                    selectRun(queueId, urlRunId);
                }
            }, 100);
        }
        
        // Add global sorting functions
        window.toggleTimestampSort = function() {
            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
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
        
        // Add global pagination functions
        window.previousPage = previousPage;
        window.nextPage = nextPage;
        
    } catch (error) {
        console.error('Error loading queue runs:', error);
        
        // Show error in main content
        document.getElementById('mainContent').innerHTML = `
            <div class="flex flex-col h-full">
                <div class="bg-white border-b border-t border-gray-200 px-6 py-4">
                    <h2 class="text-lg font-semibold text-gray-900">${queueBasicInfo.name}</h2>
                    <span class="text-sm text-gray-500">Created by ${queueBasicInfo.user_name}</span>
                </div>
                <div class="flex-1 flex items-center justify-center">
                    <div class="text-center">
                        <div class="text-red-500 text-xl mb-4">⚠️</div>
                        <p class="text-red-600 text-lg">Error loading runs for queue "${queueBasicInfo.name}"</p>
                        <p class="text-gray-600">${error.message}</p>
                        <button onclick="loadQueueRuns('${queueId}', queueBasicInfo, 1)" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Function to select a run and navigate to annotation page
function selectRun(queueId, runId) {
    // Navigate to the queue annotation page with run ID and page number
    window.location.href = `/queues/${queueId}?runId=${runId}&page=${currentPage}`;
}

function toggleDropdown() {
    const dropdown = document.getElementById('dropdown');
    dropdown.classList.toggle('hidden');
}

// Auto-restore queue selection when data is initialized
function initializeQueuesData(data) {
    let selectedQueueId = '';
    let selectedRunId = '';
    
    // Handle both old format (array) and new format (object with queues and user)
    if (Array.isArray(data)) {
        queuesData = data;
    } else {
        queuesData = data.queues || [];
        selectedAnnotator = data.user || ''; // Initialize selectedAnnotator to current user
        selectedQueueId = data.selectedQueueId || '';
        selectedRunId = data.selectedRunId || '';
    }
    
    // Reset pagination variables
    currentPage = 1;
    totalPages = 1;
    currentQueueRuns = [];
    
    // First try to restore from URL, then fall back to server-provided selectedQueueId
    const urlParams = new URLSearchParams(window.location.search);
    const urlQueueId = urlParams.get('queueId');
    const urlRunId = urlParams.get('runId');
    const queuePage = parseInt(urlParams.get('queuePage')) || 1;
    
    if (urlQueueId && queuesData.length > 0) {
        const queue = queuesData.find(q => q.id === urlQueueId);
        if (queue) {
            showQueueDetails(urlQueueId, queuePage);
            // Scroll to the selected queue
            scrollToQueue(urlQueueId);
            // Run selection will be handled by loadQueueRuns function
        }
    } else if (selectedQueueId && queuesData.length > 0) {
        const queue = queuesData.find(q => q.id === selectedQueueId);
        if (queue) {
            showQueueDetails(selectedQueueId, 1);
            // Scroll to the selected queue
            scrollToQueue(selectedQueueId);
            // Run selection will be handled by loadQueueRuns function
        }
    }
}

// Annotator filter functions
function toggleAnnotatorFilter() {
    const dropdown = document.getElementById('annotatorFilterDropdown');
    dropdown.classList.toggle('hidden');
}

function filterByAnnotator(annotator) {
    selectedAnnotator = annotator;
    document.getElementById('currentAnnotator').textContent = annotator;
    document.getElementById('annotatorFilterDropdown').classList.add('hidden');
    
    // Reset pagination when switching annotators
    currentPage = 1;
    
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
// Queue-specific functionality for individual queue pages
// Uses shared functionality from filtered_runs_list.js

// Load queue data from API with pagination support
async function loadQueueData(queueId, user, selectedRunId = '', page = 1, annotationFilter = currentFilter, annotator = selectedAnnotator, userEmail = '', taskTitle = '', questionTitle = '') {
    currentUser = user; // Set current user
    selectedAnnotator = annotator || user; // Set default annotator to logged-in user if not provided
    
    try {
        // Build URL with pagination, annotation filter, annotator filter, and text filter parameters
        const params = new URLSearchParams({
            page: page,
            page_size: pageSize
        });
        if (annotationFilter && annotationFilter !== 'all') {
            params.append('annotation_filter', annotationFilter === 'empty' ? 'unannotated' : annotationFilter);
        }
        if (annotator && annotator !== '') {
            params.append('annotator_filter_user', annotator);
        }
        if (userEmail && userEmail !== '') {
            params.append('user_email', userEmail);
        }
        if (taskTitle && taskTitle !== '') {
            params.append('task_title', taskTitle);
        }
        if (questionTitle && questionTitle !== '') {
            params.append('question_title', questionTitle);
        }
        
        const response = await fetch(`/api/queues/${queueId}?${params.toString()}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        const queueData = data.queue || {};
        runsData = queueData.runs || [];
        totalCount = data.total_count || 0;
        totalPages = data.total_pages || 1;
        currentPage = data.current_page || 1;
        
        // Update the UI
        updateQueueHeader(queueData);
        updateRunsDisplay();
        updatePagination();
        
        // Check if there's a runId in URL to restore
        const urlParams = new URLSearchParams(window.location.search);
        const urlRunId = urlParams.get('runId');
        
        if (urlRunId && runsData.length > 0) {
            // Find the run with matching runId
            const runIndex = runsData.findIndex(run => run.id === Number(urlRunId));
            if (runIndex !== -1) {
                selectRun(runIndex);
                // Scroll to the run after selection
                scrollToRun(runIndex);
                return;
            }
        } else if (selectedRunId && runsData.length > 0) {
            // Find the run with matching selectedRunId from server
            const runIndex = runsData.findIndex(run => run.id === selectedRunId);
            if (runIndex !== -1) {
                selectRun(runIndex);
                // Scroll to the run after selection
                scrollToRun(runIndex);
                return;
            }
        }
        
        // Automatically select the first run as displayed if available and no URL run was found
        if (runsData.length > 0) {
            // Get the first run as displayed (sorted/filtered)
            if (typeof getFilteredAndSortedRuns === 'function') {
                const displayRuns = getFilteredAndSortedRuns();
                if (displayRuns.length > 0) {
                    const firstDisplayedRunId = displayRuns[0].id;
                    const runIndex = runsData.findIndex(run => run.id === firstDisplayedRunId);
                    if (runIndex !== -1) {
                        selectRun(runIndex);
                    } else {
                        selectRun(0); // fallback
                    }
                } else {
                    selectRun(0); // fallback
                }
            } else {
                selectRun(0);
            }
        }
        
        // Hide loading spinner after data is loaded
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error loading queue data:', error);
        
        // Show error message using the component function
        const retryFunction = `loadQueueData(${queueId}, '${user}', '${selectedRunId}', ${page}, '${annotationFilter}', '${annotator}', '${userEmail}', '${taskTitle}', '${questionTitle}')`;
        if (typeof window.showErrorState === 'function') {
            window.showErrorState(error.message, retryFunction);
        } else {
            // Fallback error display
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="bg-white rounded-lg shadow-sm flex items-center justify-center" style="height: calc(100vh - 120px);">
                        <div class="text-center">
                            <div class="text-red-500 text-xl mb-4">⚠️</div>
                            <h3 class="text-lg font-medium text-red-600 mb-2">Error loading queue</h3>
                            <p class="text-sm text-gray-600 mb-4">${error.message}</p>
                            <button onclick="${retryFunction}" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                Retry
                            </button>
                        </div>
                    </div>
                `;
            }
        }
        
        // Also update the queue header to show error
        const queueHeader = document.getElementById('queueHeader');
        const queueCreator = document.getElementById('queueCreator');
        if (queueHeader) queueHeader.textContent = 'Error loading queue';
        if (queueCreator) queueCreator.textContent = 'Please try again';
    }
}

// Update queue header with data
function updateQueueHeader(queueData) {
    const queueHeader = document.getElementById('queueHeader');
    const queueCreator = document.getElementById('queueCreator');
    
    if (queueHeader && queueData.name) {
        queueHeader.textContent = `${queueData.name} (${totalCount})`;
    }
    
    if (queueCreator && queueData.user_name) {
        queueCreator.textContent = `Created by ${queueData.user_name}`;
    }
}

// Initialize queue data
function initializeQueueData(data) {
    const queueData = data.queue;
    runsData = data.runs;
    currentUser = data.user; // Set current user
    selectedAnnotator = data.user; // Set default annotator to logged-in user
    updateRunsDisplay();
    
    // Check if there's a runId in URL to restore
    const urlParams = new URLSearchParams(window.location.search);
    const urlRunId = urlParams.get('runId');
    const selectedRunId = data.selectedRunId || '';
    
    if (urlRunId && runsData.length > 0) {
        // Find the run with matching runId
        const runIndex = runsData.findIndex(run => run.id === Number(urlRunId));
        if (runIndex !== -1) {
            selectRun(runIndex);
            return;
        }
    } else if (selectedRunId && runsData.length > 0) {
        // Find the run with matching selectedRunId from server
        const runIndex = runsData.findIndex(run => run.id === selectedRunId);
        if (runIndex !== -1) {
            selectRun(runIndex);
            return;
        }
    }
    
    // Automatically select the first run if available and no URL run was found
    if (runsData.length > 0) {
        selectRun(0);
    }
    
    // Hide loading spinner after data is loaded
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

// Page-specific reload function called by shared filter functions
window.reloadDataWithFilters = function() {
    const pathParts = window.location.pathname.split('/');
    const queueId = pathParts[pathParts.length - 1];
    loadQueueData(queueId, currentUser, '', currentPage, currentFilter, selectedAnnotator, currentUserEmailFilter, currentTaskTitleFilter, currentQuestionTitleFilter);
}; 
// Annotations-specific functionality for annotations page
// Uses shared functionality from filtered_runs_list.js

// Override the getAnnotationStatus function to work with transformed annotations
const originalGetAnnotationStatus = getAnnotationStatus;
getAnnotationStatus = function(run) {
    // In annotations page, each "run" is actually a transformed annotation
    // The annotation data is directly available in run.annotation
    if (run.annotation && run.annotation.judgement) {
        const judgement = run.annotation.judgement;
        if (judgement === 'correct' || judgement === 'wrong') {
            return judgement;
        }
    }
    return null;
};

// Set page size for annotations page
pageSize = 25;

// Function to update URL with current filter state
function updateURLWithFilters() {
    const url = new URL(window.location);
    
    // Update annotator filter
    if (selectedAnnotator && selectedAnnotator !== 'all') {
        url.searchParams.set('annotator', selectedAnnotator);
    } else {
        url.searchParams.delete('annotator');
    }
    
    // Update annotation status filter
    if (currentFilter && currentFilter !== 'all') {
        url.searchParams.set('status', currentFilter);
    } else {
        url.searchParams.delete('status');
    }
    
    // Update email filter
    if (currentUserEmailFilter) {
        url.searchParams.set('email', currentUserEmailFilter);
    } else {
        url.searchParams.delete('email');
    }
    
    // Update task title filter
    if (currentTaskTitleFilter) {
        url.searchParams.set('task_title', currentTaskTitleFilter);
    } else {
        url.searchParams.delete('task_title');
    }
    
    // Update question title filter
    if (currentQuestionTitleFilter) {
        url.searchParams.set('question_title', currentQuestionTitleFilter);
    } else {
        url.searchParams.delete('question_title');
    }
    
    // Don't handle page parameter here - let existing pagination system handle it
    
    // Update URL without reloading the page
    window.history.pushState({}, '', url);
}

// Function to read filters from URL parameters
function readFiltersFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Read annotator filter
    const annotatorParam = urlParams.get('annotator');
    if (annotatorParam) {
        selectedAnnotator = annotatorParam;
    } else {
        selectedAnnotator = 'all';
    }
    
    // Read annotation status filter
    const statusParam = urlParams.get('status');
    if (statusParam) {
        currentFilter = statusParam;
    } else {
        currentFilter = 'all';
    }
    
    // Read email filter
    const emailParam = urlParams.get('email');
    if (emailParam) {
        currentUserEmailFilter = emailParam;
    } else {
        currentUserEmailFilter = '';
    }
    
    // Read task title filter
    const taskTitleParam = urlParams.get('task_title');
    if (taskTitleParam) {
        currentTaskTitleFilter = taskTitleParam;
    } else {
        currentTaskTitleFilter = '';
    }
    
    // Read question title filter
    const questionTitleParam = urlParams.get('question_title');
    if (questionTitleParam) {
        currentQuestionTitleFilter = questionTitleParam;
    } else {
        currentQuestionTitleFilter = '';
    }
}

// Override filterByAnnotator to update URL
window.filterByAnnotator = function(annotator) {
    selectedAnnotator = annotator;
    updateURLWithFilters();
    
    // Update UI
    const currentAnnotatorElement = document.getElementById('currentAnnotator');
    if (currentAnnotatorElement) {
        currentAnnotatorElement.textContent = annotator === 'all' ? 'All' : annotator;
    }
    
    // Reload data with new filters
    loadAnnotationsData(currentUser);
};

// Override filter functions to update URL (if they exist globally)
const originalSetAnnotationFilter = window.setAnnotationFilter;
if (originalSetAnnotationFilter) {
    window.setAnnotationFilter = function(filter) {
        originalSetAnnotationFilter(filter);
        updateURLWithFilters();
    };
}

const originalSetUserEmailFilter = window.setUserEmailFilter;
if (originalSetUserEmailFilter) {
    window.setUserEmailFilter = function(email) {
        originalSetUserEmailFilter(email);
        updateURLWithFilters();
    };
}

const originalSetTaskTitleFilter = window.setTaskTitleFilter;
if (originalSetTaskTitleFilter) {
    window.setTaskTitleFilter = function(title) {
        originalSetTaskTitleFilter(title);
        updateURLWithFilters();
    };
}

const originalSetQuestionTitleFilter = window.setQuestionTitleFilter;
if (originalSetQuestionTitleFilter) {
    window.setQuestionTitleFilter = function(title) {
        originalSetQuestionTitleFilter(title);
        updateURLWithFilters();
    };
}

// Load annotations data from API
async function loadAnnotationsData(user, selectedRunId = '') {
    currentUser = user;
    
    // Read filters from URL first
    readFiltersFromURL();
    
    // Update the UI to show the current annotator selection
    const currentAnnotatorElement = document.getElementById('currentAnnotator');
    if (currentAnnotatorElement) {
        currentAnnotatorElement.textContent = selectedAnnotator === 'all' ? 'All' : selectedAnnotator;
    }
    
    try {
        // Build URL with annotation filters - call /api/runs instead of /api/queues
        const params = new URLSearchParams({
            page: 1,
            page_size: 1000, // Get all annotations
            // When currentFilter is 'all', send 'annotated' to show all annotations
            // When selectedAnnotator is 'all', we want all annotations from all annotators
            annotation_filter: currentFilter === 'all' ? 'annotated' : currentFilter
        });
        
        // Add annotator filter if specific annotator is selected
        if (selectedAnnotator !== 'all') {
            params.append('annotator_user', selectedAnnotator);
        }
        
        // Add user email filter if set
        if (currentUserEmailFilter) {
            params.append('user_email', currentUserEmailFilter);
        }
        
        // Add task title filter if set
        if (currentTaskTitleFilter) {
            params.append('task_title', currentTaskTitleFilter);
        }
        
        // Add question title filter if set
        if (currentQuestionTitleFilter) {
            params.append('question_title', currentQuestionTitleFilter);
        }
        
        const response = await fetch(`/api/runs?${params.toString()}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Transform runs data to show individual annotations instead of runs
        runsData = transformRunsToAnnotations(data.runs || []);
        
        // Update pagination for annotations (now paginated)
        totalCount = runsData.length;
        totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
        // Try to get currentPage from URL, else reset to 1
        const pageParams = new URLSearchParams(window.location.search);
        const urlPage = parseInt(pageParams.get('page'), 10);
        currentPage = (!isNaN(urlPage) && urlPage >= 1 && urlPage <= totalPages) ? urlPage : 1;
        
        // Update the UI using existing functions
        updateAnnotationsHeader();
        updateRunsDisplay();
        updatePagination();
        
        // Handle run selection (same logic as queue.js)
        const urlParams = new URLSearchParams(window.location.search);
        const urlRunId = urlParams.get('runId');
        
        if (urlRunId && runsData.length > 0) {
            const runIndex = runsData.findIndex(annotation => annotation.id === Number(urlRunId));
            if (runIndex !== -1) {
                selectRun(runIndex);
                return;
            }
        } else if (selectedRunId && runsData.length > 0) {
            const runIndex = runsData.findIndex(annotation => annotation.id === selectedRunId);
            if (runIndex !== -1) {
                selectRun(runIndex);
                return;
            }
        }
        
        if (runsData.length > 0) {
            selectRun(0);
        }
        
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error loading annotations data:', error);
        
        // Update header to show error state
        const annotationsHeader = document.getElementById('annotationsHeader');
        if (annotationsHeader) {
            annotationsHeader.textContent = 'Error loading annotations';
        }
        
        // Use existing error handling if available
        if (typeof window.showErrorState === 'function') {
            window.showErrorState(error.message, `loadAnnotationsData('${user}', '${selectedRunId}')`);
        }
    }
}

// Transform runs to show individual annotations (each annotation becomes a "run")
function transformRunsToAnnotations(runs) {
    const annotations = [];
    
    runs.forEach(run => {
        if (run.annotations) {
            Object.keys(run.annotations).forEach(annotator => {
                const annotationData = run.annotations[annotator];
                if (annotationData && annotationData.judgement) {
                    // Only include annotations from the selected annotator (or all if 'all' is selected)
                    if (selectedAnnotator === 'all' || annotator === selectedAnnotator) {
                        // Create a "run" object for each annotation
                        annotations.push({
                            ...run, // Copy all run data
                            id: run.id, // Keep original run ID for selection
                            annotator: annotator,
                            annotation: annotationData,
                            // Override start_time with annotation timestamp for proper sorting
                            start_time: annotationData.created_at || run.start_time,
                            // Modify metadata to show annotation info
                            metadata: {
                                ...run.metadata,
                                annotator: annotator,
                                annotation_notes: annotationData.notes
                            }
                        });
                    }
                }
            });
        }
    });
    
    // Sort by annotation timestamp descending
    annotations.sort((a, b) => {
        const aTime = a.annotation?.created_at || a.start_time;
        const bTime = b.annotation?.created_at || b.start_time;
        return new Date(bTime) - new Date(aTime);
    });
    
    return annotations;
}

// Override the generateRunsHTML function to include annotator info
function generateAnnotationsRunsHTML(sortedRuns) {
    let runsHtml = '';
    for (let i = 0; i < sortedRuns.length; i++) {
        const run = sortedRuns[i];
        const annotation = run.annotation?.judgement || null;
        
        // Create enhanced run name with annotator info
        const baseRunName = window.generateRunName(run);
        const runName = `${baseRunName} (by ${run.annotator})`;
        
        const timestamp = formatTimestamp(run.annotation?.created_at || run.start_time);
        const isSelected = i === currentRunIndex;
        
        // Use existing createQueueRunRow function from filtered_run_row.js
        runsHtml += createQueueRunRow(run, annotation, runName, timestamp, i, isSelected);
    }
    return runsHtml;
}

// Override updateRunsDisplay to use annotations-specific HTML generation
const originalUpdateRunsDisplay = updateRunsDisplay;
updateRunsDisplay = function() {
    const displayRuns = getFilteredAndSortedRuns();
    
    // Check if filtered runs are empty
    if (displayRuns.length === 0) {
        // Reset current selection
        currentRunIndex = null;
        
        // Clear the runs list with annotations-specific message
        document.getElementById('runsList').innerHTML = '<div class="flex items-center justify-center py-8"><div class="text-center"><div class="text-gray-400 mb-2"><svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M7 8h10m-10 4h6m-6 4h10M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"></path></svg></div><p class="text-sm text-gray-600">No annotations match the current filters</p></div></div>';
        
        // Clear main content
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = '<div class="bg-white rounded-lg shadow-sm flex items-center justify-center" style="height: calc(100vh - 120px);"><div class="text-center"><div class="text-gray-400 mb-4"><svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M7 8h10m-10 4h6m-6 4h10M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"></path></svg></div><h3 class="text-lg font-medium text-gray-900 mb-2">No annotations found</h3><p class="text-sm text-gray-600">Try adjusting your filters to see more annotations</p></div></div>';
        }
        
        // Hide sidebars
        const metadataSidebar = document.getElementById('metadataSidebar');
        const annotationSidebar = document.getElementById('annotationSidebar');
        if (metadataSidebar) metadataSidebar.classList.add('hidden');
        if (annotationSidebar) annotationSidebar.classList.add('hidden');
        
        // Remove runId from URL
        const url = new URL(window.location);
        url.searchParams.delete('runId');
        window.history.pushState({}, '', url);
        
        // Update annotations header to show zero count
        updateAnnotationsHeader();
        
        return;
    }
    
    document.getElementById('runsList').innerHTML = generateAnnotationsRunsHTML(displayRuns);
    
    // Restore run selection if one was selected from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlRunId = urlParams.get('runId');
    if (urlRunId) {
        // Find the run with matching runId and ensure it's visually selected
        const runIndex = runsData.findIndex(run => run.id === urlRunId);
        if (runIndex !== -1) {
            currentRunIndex = runIndex;
        }
    }
    updatePagination();
};

// Override getFilteredAndSortedRuns to paginate annotations
const originalGetFilteredAndSortedRuns = getFilteredAndSortedRuns;
getFilteredAndSortedRuns = function() {
    let filteredSorted = originalGetFilteredAndSortedRuns();
    // Paginate for current page
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    return filteredSorted.slice(startIdx, endIdx);
};

// Update annotations header with count
function updateAnnotationsHeader() {
    const annotationsHeader = document.getElementById('annotationsHeader');
    
    if (annotationsHeader) {
        const filteredRuns = getFilteredAndSortedRuns();
        annotationsHeader.textContent = `Annotations (${filteredRuns.length})`;
    }
}

// Override updateAnnotation function to work with transformed annotations
const originalUpdateAnnotation = updateAnnotation;
updateAnnotation = async function() {
    const correctBtn = document.getElementById('correctBtn');
    const wrongBtn = document.getElementById('wrongBtn');
    const notes = document.getElementById('annotationNotes').value;
    const updateBtn = document.getElementById('updateAnnotationBtn2');
    
    let judgement = null;
    if (correctBtn && correctBtn.className.includes('bg-green-500')) {
        judgement = 'correct';
    } else if (wrongBtn && wrongBtn.className.includes('bg-red-500')) {
        judgement = 'wrong';
    }
    
    if (!judgement) {
        console.error('No judgement selected');
        return;
    }
    
    // Get current run data
    const currentRun = runsData[currentRunIndex];
    if (!currentRun) {
        console.error('No current run found');
        return;
    }
    
    try {
        // Call the API to create annotation
        const response = await fetch('/api/annotations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                run_id: currentRun.id,
                judgement: judgement,
                notes: notes
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to create annotation');
        }
        
        // Update the transformed annotation structure used in annotations page
        if (currentRun.annotation) {
            currentRun.annotation.judgement = judgement;
            currentRun.annotation.notes = notes;
            currentRun.annotation.created_at = new Date().toISOString();
        }
        
        // Also update the original annotations structure if it exists
        if (!currentRun.annotations) {
            currentRun.annotations = {};
        }
        currentRun.annotations[currentRun.annotator] = {
            judgement: judgement,
            notes: notes,
            created_at: new Date().toISOString()
        };
        
        // Update original annotation state to reflect the new state
        originalAnnotationState = {
            judgement: judgement,
            notes: notes
        };
        
        // Update the runs display to show the new annotation status
        updateRunsDisplay();
        
        // Show success message on the button
        const originalText = 'Update annotation';
        if (updateBtn) {
            updateBtn.textContent = 'Updated';
            updateBtn.className = 'w-full py-3 px-4 rounded-lg font-medium text-white mb-6 transition-colors duration-200 bg-green-600';
            updateBtn.disabled = true;
        }
        
        // Reset button state after 2 seconds
        setTimeout(() => {
            if (updateBtn) {
                updateBtn.textContent = originalText;
            }
            updateAnnotationState();
        }, 2000);
        
        console.log('Annotation updated successfully:', result);
        
    } catch (error) {
        console.error('Error updating annotation:', error);
        
        // Show error message
        if (updateBtn) {
            updateBtn.textContent = 'Error';
            updateBtn.className = 'w-full py-3 px-4 rounded-lg font-medium text-white mb-6 transition-colors duration-200 bg-red-600';
            updateBtn.disabled = true;
        }
        
        // Reset button state after 2 seconds
        setTimeout(() => {
            if (updateBtn) {
                updateBtn.textContent = 'Update annotation';
            }
            updateAnnotationState();
        }, 2000);
    }
};

// Page-specific reload function called by shared filter functions
window.reloadDataWithFilters = function() {
    updateURLWithFilters();
    loadAnnotationsData(currentUser);
}; 
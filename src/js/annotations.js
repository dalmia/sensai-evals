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

// Load annotations data from API
async function loadAnnotationsData(user, selectedRunId = '') {
    currentUser = user;
    // Set selectedAnnotator to 'all' by default if it hasn't been set yet (first load)
    if (selectedAnnotator === '') {
        selectedAnnotator = 'all'; 
    }
    
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
        
        const response = await fetch(`/api/runs?${params.toString()}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Transform runs data to show individual annotations instead of runs
        runsData = transformRunsToAnnotations(data.runs || []);
        
        // Update pagination for annotations (no real pagination needed)
        totalCount = runsData.length;
        totalPages = 1;
        currentPage = 1;
        
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
}

// Update annotations header with count
function updateAnnotationsHeader() {
    const annotationsHeader = document.getElementById('annotationsHeader');
    
    if (annotationsHeader) {
        const filteredRuns = getFilteredAndSortedRuns();
        annotationsHeader.textContent = `Annotations (${filteredRuns.length})`;
    }
}

// Page-specific reload function called by shared filter functions
window.reloadDataWithFilters = function() {
    loadAnnotationsData(currentUser);
}; 
// Annotations-specific functionality for annotations page
// Uses shared functionality from filtered_runs_list.js

// Load annotations data from API
async function loadAnnotationsData(user, selectedRunId = '') {
    currentUser = user;
    // Only set selectedAnnotator to current user if it hasn't been set yet (first load)
    if (selectedAnnotator === '') {
        selectedAnnotator = user; 
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
            annotation_filter: currentFilter === 'all' ? '' : currentFilter
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

// Page-specific reload function called by shared filter functions
window.reloadDataWithFilters = function() {
    loadAnnotationsData(currentUser);
}; 
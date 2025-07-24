let queueData = {}; // Keep same variable names for compatibility
let runsData = [];
let currentSort = {'by': 'timestamp', 'order': 'desc'};
let currentFilter = 'all';
let selectedAnnotator = '';
let currentUser = '';
let currentRunIndex = null;
let navigatingFromSidebar = false;
let currentUserEmailFilter = ''; // Track current user email filter

// Load annotations data from API (similar to loadQueueData in queue.js)
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
        
        // Update the UI using existing functions
        updateRunsDisplay();
        
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

// Use existing updateRunsDisplay function pattern
function updateRunsDisplay() {
    const displayRuns = runsData; // No additional filtering needed
    document.getElementById('runsList').innerHTML = generateRunsHTML(displayRuns);
}

// Generate runs HTML using existing createQueueRunRow function
function generateRunsHTML(runs) {
    let runsHtml = '';
    for (let i = 0; i < runs.length; i++) {
        const run = runs[i];
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

// Use existing selectRun function pattern
function selectRun(runIndex) {
    // Same logic as queue.js selectRun function
    if (runsData[runIndex]) {
        const runId = runsData[runIndex].id;
        const url = new URL(window.location);
        url.searchParams.set('runId', runId);
        window.history.pushState({}, '', url);
    }
    
    const metadataSidebar = document.getElementById('metadataSidebar');
    const annotationSidebar = document.getElementById('annotationSidebar');
    
    const metadataSidebarWasOpen = metadataSidebar && !metadataSidebar.classList.contains('hidden');
    const annotationSidebarWasOpen = annotationSidebar && !annotationSidebar.classList.contains('hidden');
    
    let finalMetadataSidebarOpen = metadataSidebarWasOpen;
    let finalAnnotationSidebarOpen = annotationSidebarWasOpen;
    
    if (!navigatingFromSidebar) {
        if (metadataSidebarWasOpen) {
            finalMetadataSidebarOpen = true;
            finalAnnotationSidebarOpen = false;
        } else {
            finalMetadataSidebarOpen = false;
            finalAnnotationSidebarOpen = true;
        }
    }
    
    navigatingFromSidebar = false;
    currentRunIndex = runIndex;
    const selectedRun = runsData[runIndex];
    
    if (!selectedRun) return;
    
    // Use existing component functions
    if (typeof window.populateSelectedRunView === 'function') {
        window.populateSelectedRunView(selectedRun, finalMetadataSidebarOpen, finalAnnotationSidebarOpen);
    }
    
    populateMetadataContent(selectedRun);
    
    if (finalMetadataSidebarOpen && metadataSidebar) {
        metadataSidebar.classList.remove('hidden');
    }
    
    if (finalAnnotationSidebarOpen && annotationSidebar) {
        annotationSidebar.classList.remove('hidden');
        populateAnnotationContent(selectedRun);
    }
    
    updateRunsDisplay();
}

// Use existing filter function names
function filterByAnnotator(annotator) {
    selectedAnnotator = annotator;
    document.getElementById('currentAnnotator').textContent = annotator === 'all' ? 'All' : annotator;
    document.getElementById('annotatorFilterDropdown').classList.add('hidden');
    loadAnnotationsData(currentUser);
}

function filterByAnnotation(filter, user) {
    currentFilter = filter;
    document.getElementById('currentFilter').textContent = filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1);
    document.getElementById('annotationFilterDropdown').classList.add('hidden');
    loadAnnotationsData(currentUser);
}

// Use existing navigation functions
function goToPrevious() {
    if (currentRunIndex > 0) {
        navigatingFromSidebar = true;
        selectRun(currentRunIndex - 1);
    }
}

function goToNext() {
    if (currentRunIndex < runsData.length - 1) {
        navigatingFromSidebar = true;
        selectRun(currentRunIndex + 1);
    }
}

// Helper function
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

// Use existing dropdown functions
function toggleAnnotatorFilter() {
    const dropdown = document.getElementById('annotatorFilterDropdown');
    dropdown.classList.toggle('hidden');
}

function toggleAnnotationFilter() {
    const dropdown = document.getElementById('annotationFilterDropdown');
    dropdown.classList.toggle('hidden');
}

function toggleDropdown() {
    const dropdown = document.getElementById('dropdown');
    dropdown.classList.toggle('hidden');
}

// No-op pagination functions since we load all annotations
function previousPage() {}
function nextPage() {}

// --- User Email Filter Dialog Logic ---
function toggleUserEmailFilterDialog() {
    const dialog = document.getElementById('userEmailFilterDialog');
    const btn = document.getElementById('userEmailFilterBtn');
    if (dialog && btn) {
        dialog.classList.toggle('hidden');
        // Focus input if opening
        if (!dialog.classList.contains('hidden')) {
            // Position dialog below the button
            const btnRect = btn.getBoundingClientRect();
            dialog.style.left = btnRect.left + 'px';
            dialog.style.top = (btnRect.bottom + 8) + 'px'; // 8px gap below button
            
            // Show current email value in input
            const emailInput = document.getElementById('userEmailFilterInput');
            if (emailInput) {
                emailInput.value = currentUserEmailFilter;
            }
            
            // Show/hide remove button based on whether email filter is active
            const removeBtn = document.getElementById('removeUserEmailFilterBtn');
            if (removeBtn) {
                if (currentUserEmailFilter) {
                    removeBtn.style.display = 'block';
                } else {
                    removeBtn.style.display = 'none';
                }
            }
            
            setTimeout(() => {
                if (emailInput) emailInput.focus();
            }, 100);
        }
    }
}

function validateUserEmailFilterInput() {
    const emailInput = document.getElementById('userEmailFilterInput');
    const errorDiv = document.getElementById('userEmailFilterError');
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

function applyUserEmailFilter() {
    const emailInput = document.getElementById('userEmailFilterInput');
    const errorDiv = document.getElementById('userEmailFilterError');
    
    if (!emailInput) return;
    
    const email = emailInput.value.trim();
    
    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorDiv.classList.remove('hidden');
        return;
    }
    
    // Hide error if validation passes
    errorDiv.classList.add('hidden');
    
    // Store the current email filter
    currentUserEmailFilter = email;
    
    // Close the dialog
    const dialog = document.getElementById('userEmailFilterDialog');
    if (dialog) {
        dialog.classList.add('hidden');
    }
    
    // Reload annotations data with email filter
    loadAnnotationsData(currentUser);
}

function removeUserEmailFilter() {
    currentUserEmailFilter = ''; // Clear the filter
    document.getElementById('userEmailFilterInput').value = ''; // Clear the input
    document.getElementById('userEmailFilterDialog').classList.add('hidden'); // Hide dialog

    // Reload annotations data with no user email filter
    loadAnnotationsData(currentUser);
}

// Use existing click handler
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('dropdown');
    const button = event.target.closest('button');
    
    if (!button || button.getAttribute('onclick') !== 'toggleDropdown()') {
        dropdown.classList.add('hidden');
    }
    
    const annotatorFilterDropdown = document.getElementById('annotatorFilterDropdown');
    if (annotatorFilterDropdown && !event.target.closest('#annotatorFilterDropdown')) {
        const toggleButton = event.target.closest('button[onclick="toggleAnnotatorFilter()"]');
        if (!toggleButton) {
            annotatorFilterDropdown.classList.add('hidden');
        }
    }
    
    const annotationFilterDropdown = document.getElementById('annotationFilterDropdown');
    if (annotationFilterDropdown && !event.target.closest('#annotationFilterDropdown')) {
        const toggleButton = event.target.closest('button[onclick="toggleAnnotationFilter()"]');
        if (!toggleButton) {
            annotationFilterDropdown.classList.add('hidden');
        }
    }
    
    // Close user email filter dialog when clicking outside
    const dialog = document.getElementById('userEmailFilterDialog');
    const btn = document.getElementById('userEmailFilterBtn');
    if (dialog && btn && !dialog.classList.contains('hidden')) {
        if (!dialog.contains(event.target) && event.target !== btn && !btn.contains(event.target)) {
            dialog.classList.add('hidden');
        }
    }
}); 
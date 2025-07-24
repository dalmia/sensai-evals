// Shared functionality for filtered runs lists
// Used by both queue.js and annotations.js

// Global state variables
let runsData = [];
let currentSort = {'by': 'timestamp', 'order': 'desc'};
let currentFilter = 'all';
let selectedAnnotator = '';
let currentUser = '';
let currentRunIndex = null;
let navigatingFromSidebar = false;
let currentUserEmailFilter = '';

// Pagination variables
let currentPage = 1;
let pageSize = 20;
let totalPages = 1;
let totalCount = 0;

// Helper function to format timestamp
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

// Helper function to get annotation status from run data for selected annotator
function getAnnotationStatus(run) {
    if (!run.annotations || !selectedAnnotator) {
        return null;
    }
    
    // Only check annotations from the selected annotator
    const annotationData = run.annotations[selectedAnnotator];
    if (annotationData && annotationData.judgement) {
        const judgement = annotationData.judgement;
        if (judgement === 'correct' || judgement === 'wrong') {
            return judgement;
        }
    }
    
    return null;
}

// Function to filter runs by annotation status
function filterRuns(runs, filter) {
    if (filter === 'all') return runs;
    if (filter === 'empty') return runs.filter(run => getAnnotationStatus(run) === null);
    if (filter === 'correct') return runs.filter(run => getAnnotationStatus(run) === 'correct');
    if (filter === 'wrong') return runs.filter(run => getAnnotationStatus(run) === 'wrong');
    return runs;
}

// Sorting function
function sortRuns(runs, sortBy, sortOrder) {
    return runs.slice().sort(function(a, b) {
        let aValue, bValue;
        
        if (sortBy === 'timestamp') {
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

// Function to get filtered and sorted runs
function getFilteredAndSortedRuns() {
    let filteredRuns = filterRuns(runsData, currentFilter);
    let sortedRuns = sortRuns(filteredRuns, currentSort.by, currentSort.order);
    return sortedRuns;
}

// Generate runs HTML
function generateRunsHTML(sortedRuns) {
    let runsHtml = '';
    for (let i = 0; i < sortedRuns.length; i++) {
        const run = sortedRuns[i];
        const annotation = getAnnotationStatus(run);
        const runName = window.generateRunName(run);
        const timestamp = formatTimestamp(run.start_time);
        
        // Find the original index of this run in the runsData array
        const originalIndex = runsData.findIndex(r => r.id === run.id);
        
        // Determine if this is the selected run
        const isSelected = originalIndex === currentRunIndex;
        
        // Use the component to create the run row
        runsHtml += createQueueRunRow(run, annotation, runName, timestamp, originalIndex, isSelected);
    }
    return runsHtml;
}

// Function to update the runs display
function updateRunsDisplay() {
    const displayRuns = getFilteredAndSortedRuns();
    document.getElementById('runsList').innerHTML = generateRunsHTML(displayRuns);
    
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

// Function to scroll to a specific run element
function scrollToRun(runIndex) {
    if (runIndex === -1 || !runsData[runIndex]) return;
    
    // Wait for DOM to be updated, then scroll
    setTimeout(() => {
        // Find the run element by its onclick attribute
        const runElements = document.querySelectorAll('[onclick*="selectRun"]');
        let targetElement = null;
        
        // Find the element that calls selectRun with the specific runIndex
        runElements.forEach(element => {
            const onclickAttr = element.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`selectRun(${runIndex})`)) {
                targetElement = element;
            }
        });
        
        if (targetElement) {
            // Get the scrollable container (the runs list)
            const runsListContainer = document.getElementById('runsList');
            if (runsListContainer) {
                // Calculate the position to scroll to
                const containerRect = runsListContainer.getBoundingClientRect();
                const elementRect = targetElement.getBoundingClientRect();
                
                // Calculate the scroll position to center the element in the container
                const scrollTop = runsListContainer.scrollTop + 
                    (elementRect.top - containerRect.top) - 
                    (containerRect.height / 2) + 
                    (elementRect.height / 2);
                
                // Scroll smoothly to the target element
                runsListContainer.scrollTo({
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

// Function to select and display a run
function selectRun(runIndex) {
    // Update URL with run ID as query parameter
    if (runsData[runIndex]) {
        const runId = runsData[runIndex].id;
        const url = new URL(window.location);
        url.searchParams.set('runId', runId);
        window.history.pushState({}, '', url);
    }
    
    // Store current sidebar and button states before changing runs
    const metadataSidebar = document.getElementById('metadataSidebar');
    const annotationSidebar = document.getElementById('annotationSidebar');
    
    // Remember which sidebars were open, but ensure only one can be open at a time
    const metadataSidebarWasOpen = metadataSidebar && !metadataSidebar.classList.contains('hidden');
    const annotationSidebarWasOpen = annotationSidebar && !annotationSidebar.classList.contains('hidden');
    
    // Determine which sidebar should be open after navigation
    let finalMetadataSidebarOpen = metadataSidebarWasOpen;
    let finalAnnotationSidebarOpen = annotationSidebarWasOpen;
    
    // If navigating from sidebar, preserve current state
    if (navigatingFromSidebar) {
        // Keep current sidebar states as they are
    } else {
        // If metadata sidebar is open, keep it open and close annotation sidebar
        if (metadataSidebarWasOpen) {
            finalMetadataSidebarOpen = true;
            finalAnnotationSidebarOpen = false;
        } else {
            // Default to opening annotation sidebar if no sidebar was open
            finalMetadataSidebarOpen = false;
            finalAnnotationSidebarOpen = true;
        }
    }
    
    // Reset the navigating flag
    navigatingFromSidebar = false;
    
    currentRunIndex = runIndex; // Track the selected run
    const selectedRun = runsData[runIndex];
    
    if (!selectedRun) return;
    
    // Use the new component function to populate the selected run view
    if (typeof window.populateSelectedRunView === 'function') {
        window.populateSelectedRunView(selectedRun, finalMetadataSidebarOpen, finalAnnotationSidebarOpen);
    } else {
        console.error('populateSelectedRunView function not available');
        // Fallback to show error
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = '<div class="bg-white rounded-lg shadow-sm flex items-center justify-center" style="height: calc(100vh - 120px);"><div class="text-center"><h3 class="text-lg font-medium text-red-600 mb-2">Component loading error</h3><p class="text-sm text-gray-600">Please refresh the page</p></div></div>';
        }
    }
    
    // Populate metadata content using the component function
    populateMetadataContent(selectedRun);
    
    // Restore sidebar states after updating content
    if (finalMetadataSidebarOpen && metadataSidebar) {
        metadataSidebar.classList.remove('hidden');
    }
    
    if (finalAnnotationSidebarOpen && annotationSidebar) {
        annotationSidebar.classList.remove('hidden');
        // Refresh annotation content using the component function
        populateAnnotationContent(selectedRun);
    }
    
    // Update the runs display to show the new selection state
    updateRunsDisplay();
}

// Navigation functions
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

// Update arrow based on sort direction
function updateArrow() {
    const arrowElement = document.getElementById('timestampArrow');
    if (currentSort.order === 'asc') {
        arrowElement.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>' +
        '</svg>';
    } else {
        arrowElement.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>' +
        '</svg>';
    }
}

// Toggle timestamp sort
function toggleTimestampSort() {
    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    updateRunsDisplay();
    updateArrow();
}

// Toggle annotation filter dropdown
function toggleAnnotationFilter() {
    const dropdown = document.getElementById('annotationFilterDropdown');
    dropdown.classList.toggle('hidden');
}

// Toggle annotator filter dropdown
function toggleAnnotatorFilter() {
    const dropdown = document.getElementById('annotatorFilterDropdown');
    dropdown.classList.toggle('hidden');
}

// Filter by annotation status
function filterByAnnotation(filter) {
    currentFilter = filter;
    const filterLabels = {
        'all': 'All',
        'empty': 'Not Annotated',
        'correct': 'Correct',
        'wrong': 'Wrong'
    };
    document.getElementById('currentFilter').textContent = filterLabels[filter];
    document.getElementById('annotationFilterDropdown').classList.add('hidden');
    
    // Call the page-specific reload function if it exists
    if (typeof window.reloadDataWithFilters === 'function') {
        window.reloadDataWithFilters();
    }
}

// Filter by annotator
function filterByAnnotator(annotator) {
    selectedAnnotator = annotator; // Update selectedAnnotator
    document.getElementById('currentAnnotator').textContent = annotator === 'all' ? 'All' : annotator;
    document.getElementById('annotatorFilterDropdown').classList.add('hidden');
    
    // Call the page-specific reload function if it exists
    if (typeof window.reloadDataWithFilters === 'function') {
        window.reloadDataWithFilters();
    }
    
    // If annotation sidebar is open and a run is selected, refresh its content
    const annotationSidebar = document.getElementById('annotationSidebar');
    if (annotationSidebar && !annotationSidebar.classList.contains('hidden') && currentRunIndex !== null && runsData[currentRunIndex]) {
        populateAnnotationContent(runsData[currentRunIndex]);
    }
}

// Pagination functions
function updatePagination() {
    const currentPageDisplay = document.getElementById('currentPageDisplay');
    const totalPagesDisplay = document.getElementById('totalPagesDisplay');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    if (!currentPageDisplay || !totalPagesDisplay || !prevPageBtn || !nextPageBtn) {
        return;
    }
    
    // Update page display
    currentPageDisplay.textContent = currentPage;
    totalPagesDisplay.textContent = totalPages;
    
    // Update navigation buttons
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

function goToPage(pageNum) {
    if (pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
        // Update URL with page parameter
        const url = new URL(window.location);
        if (pageNum > 1) {
            url.searchParams.set('page', pageNum);
        } else {
            url.searchParams.delete('page');
        }
        window.history.pushState({}, '', url);
        
        currentPage = pageNum;
        
        // Call the page-specific reload function if it exists
        if (typeof window.reloadDataWithFilters === 'function') {
            window.reloadDataWithFilters();
        }
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

// User Email Filter Dialog Logic
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
    
    // Call the page-specific reload function if it exists
    if (typeof window.reloadDataWithFilters === 'function') {
        window.reloadDataWithFilters();
    }
}

function removeUserEmailFilter() {
    currentUserEmailFilter = ''; // Clear the filter
    document.getElementById('userEmailFilterInput').value = ''; // Clear the input
    document.getElementById('userEmailFilterDialog').classList.add('hidden'); // Hide dialog

    // Call the page-specific reload function if it exists
    if (typeof window.reloadDataWithFilters === 'function') {
        window.reloadDataWithFilters();
    }
}

function toggleDropdown() {
    const dropdown = document.getElementById('dropdown');
    dropdown.classList.toggle('hidden');
}

// Initialize with sorted and filtered runs
document.addEventListener('DOMContentLoaded', function() {
    if (runsData.length > 0) {
        updateRunsDisplay();
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('dropdown');
    const button = event.target.closest('button');
    
    if (!button || button.getAttribute('onclick') !== 'toggleDropdown()') {
        if (dropdown) dropdown.classList.add('hidden');
    }
    
    // Close annotation filter dropdown when clicking outside
    const annotationFilterDropdown = document.getElementById('annotationFilterDropdown');
    if (annotationFilterDropdown && !event.target.closest('#annotationFilterDropdown')) {
        const toggleButton = event.target.closest('button[onclick="toggleAnnotationFilter()"]');
        if (!toggleButton) {
            annotationFilterDropdown.classList.add('hidden');
        }
    }
    
    // Close annotator filter dropdown when clicking outside
    const annotatorFilterDropdown = document.getElementById('annotatorFilterDropdown');
    if (annotatorFilterDropdown && !event.target.closest('#annotatorFilterDropdown')) {
        const toggleButton = event.target.closest('button[onclick="toggleAnnotatorFilter()"]');
        if (!toggleButton) {
            annotatorFilterDropdown.classList.add('hidden');
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
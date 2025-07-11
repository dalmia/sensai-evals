let queueData = {};
let runsData = [];
let currentSort = {'by': 'timestamp', 'order': 'desc'};
let currentFilter = 'all';
let selectedAnnotator = '';

// Initialize queue data
function initializeQueueData(data) {
    queueData = data.queue;
    runsData = data.runs;
    selectedAnnotator = data.user; // Set default annotator to logged-in user
    console.log('Queue data:', queueData);
    console.log('Runs data:', runsData);
    console.log('Selected annotator:', selectedAnnotator);
    updateRunsDisplay();
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

// Helper function to create run name from metadata
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

// Function to filter runs by annotation status
function filterRuns(runs, filter) {
    console.log('Filtering runs by:', filter);
    if (filter === 'all') return runs;
    if (filter === 'empty') return runs.filter(run => getAnnotationStatus(run) === null);
    if (filter === 'correct') return runs.filter(run => getAnnotationStatus(run) === 'correct');
    if (filter === 'wrong') return runs.filter(run => getAnnotationStatus(run) === 'wrong');
    return runs;
}

// Function to get filtered and sorted runs
function getFilteredAndSortedRuns() {
    let filteredRuns = filterRuns(runsData, currentFilter);
    console.log('Filtered runs:', filteredRuns);
    let sortedRuns = sortRuns(filteredRuns, currentSort.by, currentSort.order);
    console.log('Sorted runs:', sortedRuns);
    return sortedRuns;
}

// Function to update the runs display and queue count
function updateRunsDisplay() {
    console.log('Updating runs display');
    const displayRuns = getFilteredAndSortedRuns();
    document.getElementById('runsList').innerHTML = generateRunsHTML(displayRuns);
    
    // Update queue count in header
    const queueHeader = document.querySelector('h2');
    const queueName = queueHeader.textContent.split(' (')[0];
    const countText = displayRuns.length !== runsData.length ? 
        displayRuns.length + ' of ' + runsData.length : 
        displayRuns.length;
    queueHeader.textContent = queueName + ' (' + countText + ')';
    console.log('Updated header to:', queueHeader.textContent);
}

// Generate runs HTML
function generateRunsHTML(sortedRuns) {
    console.log('Generating HTML for runs:', sortedRuns);
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
            annotationIcon = '<div class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">' +
              '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />' +
              '</svg>' +
            '</div>';
        } else if (annotation === 'wrong') {
            annotationIcon = '<div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">' +
              '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />' +
              '</svg>' +
            '</div>';
        } else {
            annotationIcon = '<div class="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex-shrink-0"></div>';
        }
        
        runsHtml += '<div class="border-b border-gray-100 px-6 py-4 hover:bg-gray-50 cursor-pointer">' +
            '<div class="flex items-center justify-between">' +
                '<div class="flex items-center space-x-3 flex-1">' +
                    annotationIcon +
                    '<div class="flex-1">' +
                        '<div class="text-sm font-medium text-gray-900">' + runName + '</div>' +
                        '<div class="flex items-center space-x-2 mt-1">' +
                            tagBadges +
                        '</div>' +
                        '<div class="text-xs text-gray-500 mt-1">' + timestamp + '</div>' +
                    '</div>' +
                '</div>' +
                '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />' +
                '</svg>' +
            '</div>' +
        '</div>';
    }
    console.log('Generated HTML length:', runsHtml.length);
    return runsHtml;
}

// Sorting function
function sortRuns(runs, sortBy, sortOrder) {
    console.log('Sorting runs by:', sortBy, sortOrder);
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
    console.log('Toggling timestamp sort');
    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    updateRunsDisplay();
    updateArrow();
}

// Toggle annotation filter dropdown
function toggleAnnotationFilter() {
    console.log('Toggling annotation filter');
    const dropdown = document.getElementById('annotationFilterDropdown');
    dropdown.classList.toggle('hidden');
}

// Toggle annotator filter dropdown
function toggleAnnotatorFilter() {
    console.log('Toggling annotator filter');
    const dropdown = document.getElementById('annotatorFilterDropdown');
    dropdown.classList.toggle('hidden');
}

// Filter by annotation status
function filterByAnnotation(filter) {
    console.log('Filtering by annotation:', filter);
    currentFilter = filter;
    const filterLabels = {
        'all': 'All',
        'empty': 'Not Annotated',
        'correct': 'Correct',
        'wrong': 'Wrong'
    };
    document.getElementById('currentFilter').textContent = filterLabels[filter];
    document.getElementById('annotationFilterDropdown').classList.add('hidden');
    updateRunsDisplay();
}

// Filter by annotator
function filterByAnnotator(annotator) {
    console.log('Filtering by annotator:', annotator);
    selectedAnnotator = annotator; // Update selectedAnnotator
    document.getElementById('currentAnnotator').textContent = annotator;
    document.getElementById('annotatorFilterDropdown').classList.add('hidden');
    // Refresh the display since annotation status depends on selected annotator
    updateRunsDisplay();
}

// Initialize with sorted and filtered runs
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    if (runsData.length > 0) {
        updateRunsDisplay();
    }
});

function toggleDropdown() {
    const dropdown = document.getElementById('dropdown');
    dropdown.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('dropdown');
    const button = event.target.closest('button');
    
    if (!button || button.getAttribute('onclick') !== 'toggleDropdown()') {
        dropdown.classList.add('hidden');
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
}); 
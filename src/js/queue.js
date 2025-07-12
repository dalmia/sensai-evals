let queueData = {};
let runsData = [];
let currentSort = {'by': 'timestamp', 'order': 'desc'};
let currentFilter = 'all';
let selectedAnnotator = '';
let currentRunIndex = null; // Track currently selected run
let navigatingFromSidebar = false; // Track if navigation is from within a sidebar

// Initialize queue data
function initializeQueueData(data) {
    queueData = data.queue;
    runsData = data.runs;
    selectedAnnotator = data.user; // Set default annotator to logged-in user
    console.log('Queue data:', queueData);
    console.log('Runs data:', runsData);
    console.log('Selected annotator:', selectedAnnotator);
    updateRunsDisplay();
    
    // Check if there's a taskId in URL to restore
    const urlParams = new URLSearchParams(window.location.search);
    const urlTaskId = urlParams.get('taskId');
    const selectedTaskId = data.selectedTaskId || '';
    
    if (urlTaskId && runsData.length > 0) {
        // Find the run with matching taskId
        const runIndex = runsData.findIndex(run => run.id === urlTaskId);
        if (runIndex !== -1) {
            selectRun(runIndex);
            return;
        }
    } else if (selectedTaskId && runsData.length > 0) {
        // Find the run with matching selectedTaskId from server
        const runIndex = runsData.findIndex(run => run.id === selectedTaskId);
        if (runIndex !== -1) {
            selectRun(runIndex);
            return;
        }
    }
    
    // Automatically select the first task if available and no URL task was found
    if (runsData.length > 0) {
        selectRun(0);
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
    
    // Restore task selection if one was selected from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlTaskId = urlParams.get('taskId');
    if (urlTaskId) {
        // Find the run with matching taskId and ensure it's visually selected
        const runIndex = runsData.findIndex(run => run.id === urlTaskId);
        if (runIndex !== -1) {
            currentRunIndex = runIndex;
        }
    }
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
        
        // Find the original index of this run in the runsData array
        const originalIndex = runsData.findIndex(r => r.id === run.id);
        
        // Determine if this is the selected task
        const isSelected = originalIndex === currentRunIndex;
        const selectedClasses = isSelected ? 'border-l-4 border-l-blue-500 bg-blue-50' : '';
        
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
        
        runsHtml += '<div class="border-b border-gray-100 px-6 py-4 hover:bg-gray-50 cursor-pointer ' + selectedClasses + '" onclick="selectRun(' + originalIndex + ')">' +
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

// Function to select and display a run
function selectRun(runIndex) {
    // Update URL with task ID as query parameter
    if (runsData[runIndex]) {
        const taskId = runsData[runIndex].id;
        const url = new URL(window.location);
        url.searchParams.set('taskId', taskId);
        window.history.pushState({}, '', url);
    }
    
    // Store current sidebar and button states before changing runs
    const metadataSidebar = document.getElementById('metadataSidebar');
    const annotationSidebar = document.getElementById('annotationSidebar');
    const metadataButton = document.querySelector('button[onclick="toggleMetadataSidebar()"]');
    const annotationButton = document.querySelector('button[onclick="toggleAnnotationSidebar()"]');
    
    // Remember which sidebars were open
    const metadataSidebarWasOpen = metadataSidebar && !metadataSidebar.classList.contains('hidden');
    const annotationSidebarWasOpen = annotationSidebar && !annotationSidebar.classList.contains('hidden');
    
    // Reset the navigating flag
    navigatingFromSidebar = false;
    
    currentRunIndex = runIndex; // Track the selected run
    const selectedRun = runsData[runIndex];
    
    if (!selectedRun) return;
    
    // Create run name
    const metadata = selectedRun.metadata || {};
    const runId = selectedRun.id || 'unknown';
    const courseName = metadata.course?.name || '';
    const milestoneName = metadata.milestone?.name || '';
    const orgName = metadata.org?.name || '';
    const questionType = metadata.question_type || '';
    
    let runName;
    if (courseName && milestoneName) {
        runName = courseName + ' - ' + milestoneName;
    } else if (courseName) {
        runName = courseName;
    } else {
        runName = 'Run ' + runId;
    }
    
    if (orgName) {
        runName = runName + ' (' + orgName + ')';
    }
    
    // Extract context and messages
    const context = selectedRun.context;
    const messages = selectedRun.messages;
    
    // Generate messages HTML
    let messagesHtml = '';
    messages.forEach((message, index) => {
        const role = message.role || 'user';
        const content = message.content || '';
        
        if (role === 'user') {
            messagesHtml += '<div class="mb-6">' +
                '<div class="bg-blue-50 border border-blue-200 p-4 rounded-lg max-w-2xl">' +
                '<div class="text-sm font-medium text-blue-800 mb-2">User</div>' +
                '<div class="text-sm text-blue-900 whitespace-pre-wrap">' + content + '</div>' +
                '</div>' +
                '</div>';
        } else if (role === 'assistant') {
            // Check if this is an objective question (has scorecard structure)
            if (typeof content === 'object' && content !== null && 
                (content.feedback || content.scorecard || content.is_correct !== undefined)) {
                
                // Handle objective questions with tabbed interface
                let feedback = content.feedback || '';
                let scorecard = content.scorecard || {};
                let isCorrect = content.is_correct;
                
                // Status indicator
                let indicatorHtml = '';
                if (isCorrect === true) {
                    indicatorHtml = '<div class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">' +
                        '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>' +
                        '</svg>' +
                        '</div>';
                } else if (isCorrect === false) {
                    indicatorHtml = '<div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">' +
                        '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>' +
                        '</svg>' +
                        '</div>';
                }
                
                // Generate scorecard HTML
                let scorecardHtml = '';
                if (scorecard && typeof scorecard === 'object') {
                    for (const [key, value] of Object.entries(scorecard)) {
                        if (key && value !== undefined) {
                            let displayValue = value;
                            if (typeof value === 'boolean') {
                                displayValue = value ? 'Yes' : 'No';
                            } else if (typeof value === 'number') {
                                displayValue = value.toString();
                            }
                            
                            scorecardHtml += '<div class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">' +
                                '<span class="text-sm font-medium text-gray-600">' + key + '</span>' +
                                '<span class="text-sm text-gray-900">' + displayValue + '</span>' +
                                '</div>';
                        }
                    }
                }
                
                messagesHtml += '<div class="mb-6">' +
                    '<div class="bg-gray-50 border border-gray-200 p-4 rounded-lg w-full">' +
                    '<div class="flex items-center gap-2 mb-2">' +
                    '<span class="text-sm font-medium text-gray-700">Assistant</span>' +
                    indicatorHtml +
                    '</div>' +
                    '<div class="mb-4">' +
                    '<div class="flex space-x-4 border-b border-gray-200">' +
                    '<button class="pb-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600 tab-button" onclick="showTab(\'feedback-' + index + '\', this)">' +
                    'Feedback' +
                    '</button>' +
                    '<button class="pb-2 text-sm font-medium text-gray-500 tab-button" onclick="showTab(\'scorecard-' + index + '\', this)">' +
                    'Scorecard' +
                    '</button>' +
                    '</div>' +
                    '</div>' +
                    '<div id="feedback-' + index + '" class="tab-content">' +
                    '<div class="whitespace-pre-wrap text-sm">' + feedback + '</div>' +
                    '</div>' +
                    '<div id="scorecard-' + index + '" class="tab-content hidden">' +
                    '<div class="space-y-4">' + scorecardHtml + '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            } else {
                // Handle simple text responses
                messagesHtml += '<div class="mb-6">' +
                    '<div class="bg-gray-50 border border-gray-200 p-4 rounded-lg w-full">' +
                    '<div class="text-sm font-medium text-gray-700 mb-2">Assistant</div>' +
                    '<div class="text-sm text-gray-900 whitespace-pre-wrap">' + content + '</div>' +
                    '</div>' +
                    '</div>';
            }
        }
    });
    
    // Get the main content area
    const mainContent = document.getElementById('mainContent');
    
    // Create button classes based on sidebar states
    const annotationButtonClasses = annotationSidebarWasOpen 
        ? 'flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium border border-blue-600 transition-colors'
        : 'flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 transition-colors';
    
    const metadataButtonClasses = metadataSidebarWasOpen 
        ? 'flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium border border-blue-600 transition-colors'
        : 'flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 transition-colors';
    
    // Create span visibility based on sidebar states
    const anySidebarOpen = annotationSidebarWasOpen || metadataSidebarWasOpen;
    const annotationSpanStyle = anySidebarOpen ? 'style="display: none;"' : '';
    const metadataSpanStyle = anySidebarOpen ? 'style="display: none;"' : '';
    
    mainContent.innerHTML = '<div class="flex-1 bg-white flex flex-col relative h-full">' +
        '<div class="border-b border-gray-200 px-6 py-4 flex-shrink-0">' +
        '<div class="flex justify-between items-center">' +
        '<h1 class="text-lg font-semibold text-gray-900">' + runName + '</h1>' +
        '<div class="flex space-x-2">' +
        '<button class="' + annotationButtonClasses + '" onclick="toggleAnnotationSidebar()">' +
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
        '<span ' + annotationSpanStyle + '>Annotation</span>' +
        '</button>' +
        '<button class="' + metadataButtonClasses + '" onclick="toggleMetadataSidebar()">' +
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' +
        '<span ' + metadataSpanStyle + '>Metadata</span>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="flex-1 overflow-y-auto p-6">' +
        '<div class="mb-8">' +
        '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">' +
        '<div class="text-sm font-medium text-yellow-800 mb-2">Task:</div>' +
        '<div class="text-sm text-yellow-700 whitespace-pre-wrap">' + context + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="space-y-6">' + messagesHtml + '</div>' +
        '</div>' +
        '</div>';
    
    // Populate metadata content using the component function
    populateMetadataContent(selectedRun);
    
    // Restore sidebar states after updating content
    if (metadataSidebarWasOpen && metadataSidebar) {
        metadataSidebar.classList.remove('hidden');
    }
    
    if (annotationSidebarWasOpen && annotationSidebar) {
        annotationSidebar.classList.remove('hidden');
        // Refresh annotation content using the component function
        populateAnnotationContent(selectedRun);
    }
    
    // Update the runs display to show the new selection state
    updateRunsDisplay();
}

// Function to show tab content (for objective questions)
function showTab(tabId, buttonElement) {
    // Hide all tab contents in the same message
    const messageContainer = buttonElement.closest('.bg-gray-50');
    const tabContents = messageContainer.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.add('hidden'));
    
    // Remove active state from all tab buttons in the same message
    const tabButtons = messageContainer.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        button.classList.add('text-gray-500');
    });
    
    // Show selected tab content
    document.getElementById(tabId).classList.remove('hidden');
    
    // Add active state to clicked button
    buttonElement.classList.remove('text-gray-500');
    buttonElement.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
}

// Function to populate metadata content
function populateMetadataContent(run) {
    const metadataContent = document.getElementById('metadataContent');
    if (!metadataContent || !run) return;
    
    const metadata = run.metadata || {};
    
    // Helper function to create metadata row
    function createMetadataRow(label, value) {
        if (value === null || value === undefined || value === '') {
            value = 'N/A';
        }
        return '<div class="mb-4">' +
            '<div class="text-sm font-medium text-gray-700 mb-1">' + label + '</div>' +
            '<div class="text-sm text-gray-900">' + value + '</div>' +
            '</div>';
    }
    
    let metadataHtml = '';
    
    // Add each metadata field
    metadataHtml += createMetadataRow('Stage', metadata.stage || '');
    metadataHtml += createMetadataRow('Type', metadata.type || '');
    metadataHtml += createMetadataRow('Trace ID', run.trace_id || '');
    metadataHtml += createMetadataRow('Span Kind', run.span_kind || '');
    metadataHtml += createMetadataRow('Span Name', run.span_name || '');
    metadataHtml += createMetadataRow('User ID', String(metadata.user_id || ''));
    metadataHtml += createMetadataRow('Question ID', String(metadata.question_id || ''));
    metadataHtml += createMetadataRow('Question Type', metadata.question_type || '');
    metadataHtml += createMetadataRow('Purpose', metadata.question_purpose || '');
    metadataHtml += createMetadataRow('Input Type', metadata.question_input_type || '');
    metadataHtml += createMetadataRow('Has Context', metadata.question_has_context ? 'Yes' : 'No');
    
    // Organization, Course, Milestone
    const org = metadata.org || {};
    const course = metadata.course || {};
    const milestone = metadata.milestone || {};
    
    metadataHtml += createMetadataRow('Organization', org.name || '');
    metadataHtml += createMetadataRow('Course', course.name || '');
    metadataHtml += createMetadataRow('Milestone', milestone.name || '');
    
    // Timing information
    metadataHtml += createMetadataRow('Start Time', formatTimestamp(run.start_time || ''));
    metadataHtml += createMetadataRow('End Time', formatTimestamp(run.end_time || ''));
    metadataHtml += createMetadataRow('Uploaded by', run.uploaded_by || '');
    
    metadataContent.innerHTML = metadataHtml;
}

// Function to show tab content (for objective questions)
function showTab(tabId, buttonElement) {
    // Hide all tab contents in the same message
    const messageContainer = buttonElement.closest('.bg-gray-50');
    const tabContents = messageContainer.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.add('hidden'));
    
    // Remove active state from all tab buttons in the same message
    const tabButtons = messageContainer.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        button.classList.add('text-gray-500');
    });
    
    // Show selected tab content
    document.getElementById(tabId).classList.remove('hidden');
    
    // Add active state to clicked button
    buttonElement.classList.remove('text-gray-500');
    buttonElement.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
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
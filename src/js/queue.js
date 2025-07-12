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
        
        // Find the original index of this run in the runsData array
        const originalIndex = runsData.findIndex(r => r.id === run.id);
        
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
        
        runsHtml += '<div class="border-b border-gray-100 px-6 py-4 hover:bg-gray-50 cursor-pointer" onclick="selectRun(' + originalIndex + ')">' +
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
            // User message - full width
            messagesHtml += '<div class="mb-6">' +
                '<div class="bg-blue-500 text-white p-4 rounded-lg w-full">' +
                '<div class="text-sm font-medium mb-2">User</div>' +
                '<div class="text-sm font-medium mb-2">Student\'s Response:</div>' +
                '<div class="whitespace-pre-wrap">' + content + '</div>' +
                '</div>' +
                '</div>';
        } else {
            // AI/Assistant message - handle differently based on question type
            if (questionType === 'objective' && typeof content === 'object') {
                // For objective questions, content is an object with feedback, analysis, and is_correct
                const feedback = content.feedback || '';
                const analysis = content.analysis || '';
                const isCorrect = content.is_correct || false;
                
                // Generate correct/incorrect indicator
                let indicatorHtml = '';
                if (isCorrect) {
                    indicatorHtml = '<div class="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">' +
                        '<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />' +
                        '</svg>' +
                        '</div>';
                } else {
                    indicatorHtml = '<div class="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">' +
                        '<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />' +
                        '</svg>' +
                        '</div>';
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
                    '<button class="pb-2 text-sm font-medium text-gray-500 tab-button" onclick="showTab(\'analysis-' + index + '\', this)">' +
                    'Analysis' +
                    '</button>' +
                    '</div>' +
                    '</div>' +
                    '<div id="feedback-' + index + '" class="tab-content">' +
                    '<div class="whitespace-pre-wrap text-sm">' + feedback + '</div>' +
                    '</div>' +
                    '<div id="analysis-' + index + '" class="tab-content hidden">' +
                    '<div class="whitespace-pre-wrap text-sm">' + analysis + '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            } else if (questionType === 'subjective' && typeof content === 'object') {
                // For subjective questions, content is an object with feedback and scorecard
                const feedback = content.feedback || '';
                const scorecard = content.scorecard || [];
                
                // Check if all criteria passed
                let allPassed = true;
                for (let criterion of scorecard) {
                    const score = criterion.score || 0;
                    const passScore = criterion.pass_score || 0;
                    if (score < passScore) {
                        allPassed = false;
                        break;
                    }
                }
                
                // Generate correct/incorrect indicator based on all criteria passing
                let indicatorHtml = '';
                if (allPassed) {
                    indicatorHtml = '<div class="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">' +
                        '<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />' +
                        '</svg>' +
                        '</div>';
                } else {
                    indicatorHtml = '<div class="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">' +
                        '<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />' +
                        '</svg>' +
                        '</div>';
                }
                
                // Generate scorecard HTML
                let scorecardHtml = '';
                for (let criterion of scorecard) {
                    const category = criterion.category || '';
                    const score = criterion.score || 0;
                    const maxScore = criterion.max_score || 0;
                    const passScore = criterion.pass_score || 0;
                    const criterionFeedback = criterion.feedback || {};
                    
                    // Determine if this criterion passed
                    const criterionPassed = score >= passScore;
                    let criterionIcon = '';
                    if (criterionPassed) {
                        criterionIcon = '<div class="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">' +
                            '<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />' +
                            '</svg>' +
                            '</div>';
                    } else {
                        criterionIcon = '<div class="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">' +
                            '<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />' +
                            '</svg>' +
                            '</div>';
                    }
                    
                    scorecardHtml += '<div class="mb-6 p-4 border border-gray-200 rounded-lg bg-white">' +
                        '<div class="flex items-center justify-between mb-3">' +
                        '<div class="flex items-center gap-3">' +
                        criterionIcon +
                        '<h3 class="text-lg font-medium text-gray-900">' + category + '</h3>' +
                        '</div>' +
                        '<div class="text-sm text-gray-600">' +
                        score + '/' + maxScore + ' (Pass: ' + passScore + ')' +
                        '</div>' +
                        '</div>' +
                        '<div class="text-sm text-gray-700">' +
                        '<span class="text-green-600 font-medium">✓ Correct:</span> ' + (criterionFeedback.correct || '') +
                        '</div>' +
                        (criterionFeedback.wrong ? '<div class="text-sm text-gray-700 mt-2"><span class="text-gray-600 font-medium">Wrong:</span> ' + criterionFeedback.wrong + '</div>' : '') +
                        '</div>';
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
                // For other cases or string content, use the original format
                const contentText = typeof content === 'string' ? content : JSON.stringify(content);
                messagesHtml += '<div class="mb-6">' +
                    '<div class="bg-gray-50 border border-gray-200 p-4 rounded-lg w-full">' +
                    '<div class="flex items-center mb-2">' +
                    '<span class="text-sm font-medium text-gray-700">Assistant</span>' +
                    '<div class="ml-2 w-3 h-3 bg-green-500 rounded-full"></div>' +
                    '</div>' +
                    '<div class="whitespace-pre-wrap text-sm">' + contentText + '</div>' +
                    '</div>' +
                    '</div>';
            }
        }
    });
    
    // Update main content area
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '<div class="flex-1 bg-white overflow-y-auto">' +
        '<div class="border-b border-gray-200 px-6 py-4">' +
        '<div class="flex justify-between items-center">' +
        '<h1 class="text-lg font-semibold text-gray-900">' + runName + '</h1>' +
        '<div class="flex space-x-2">' +
        '<button class="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300">' +
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
        '<span>Annotation</span>' +
        '</button>' +
        '<button class="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300">' +
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' +
        '<span>Metadata</span>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="p-6">' +
        '<div class="mb-8">' +
        '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">' +
        '<div class="text-sm font-medium text-yellow-800 mb-2">Task:</div>' +
        '<div class="text-sm text-yellow-700 whitespace-pre-wrap">' + context + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="space-y-6">' + messagesHtml + '</div>' +
        '</div>' +
        '</div>';
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
// Selected run view specific functions - make them global

// Function to generate run name from metadata
window.generateRunName = function(run) {
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
};

// Function to generate context HTML
window.generateContextHTML = function(context) {
    if (!context) return '';
    
    return '<div class="mb-8">' +
        '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">' +
        '<div class="text-sm text-yellow-700 whitespace-pre-wrap">' + context + '</div>' +
        '</div>' +
        '</div>';
};

// Function to generate button classes based on sidebar states
window.generateButtonClasses = function(isActive) {
    return isActive 
        ? 'flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium border border-blue-600 transition-colors'
        : 'flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 transition-colors';
};

// Function to create the selected run view HTML
window.createSelectedRunViewHTML = function(selectedRun, metadataSidebarOpen, annotationSidebarOpen) {
    if (!selectedRun) return '';
    
    const runName = generateRunName(selectedRun);
    const context = selectedRun.metadata?.context || '';
    const messages = selectedRun.messages || [];
    const questionType = selectedRun.metadata?.question_type || '';
    
    // Generate button classes
    const annotationButtonClasses = generateButtonClasses(annotationSidebarOpen);
    const metadataButtonClasses = generateButtonClasses(metadataSidebarOpen);
    
    // Create span visibility based on sidebar states
    const anySidebarOpen = metadataSidebarOpen || annotationSidebarOpen;
    const annotationSpanStyle = anySidebarOpen ? 'style="display: none;"' : '';
    const metadataSpanStyle = anySidebarOpen ? 'style="display: none;"' : '';
    
    // Generate context and messages HTML with defensive checks
    const contextHtml = generateContextHTML(context);
    let messagesHtml = '';
    
    // Generate messages HTML using the chat history component
    console.log(window.generateMessagesHTML)
    messagesHtml = window.generateMessagesHTML(messages, context, questionType);
    
    return '<div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col" style="height: calc(100vh - 120px);">' +
        '<div class="border-b border-gray-200 px-6 py-4 flex-shrink-0">' +
        '<div class="flex justify-between items-center">' +
        '<h1 class="text-lg font-semibold text-gray-900 mr-2">' + runName + '</h1>' +
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
        '<div class="flex-1 overflow-y-auto p-6 min-h-0">' +
        contextHtml +
        '<div class="space-y-6">' + messagesHtml + '</div>' +
        '</div>' +
        '</div>';
};

// Function to populate the selected run view
window.populateSelectedRunView = function(selectedRun, metadataSidebarOpen, annotationSidebarOpen) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    const runViewHtml = createSelectedRunViewHTML(selectedRun, metadataSidebarOpen, annotationSidebarOpen);
    mainContent.innerHTML = runViewHtml;
};

// Function to show default loading state
window.showLoadingState = function() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm flex items-center justify-center" style="height: calc(100vh - 120px);">
            <div class="text-center">
                <div class="text-gray-400 mb-4">
                    <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Loading queue...</h3>
            </div>
        </div>
    `;
};

// Function to show error state
window.showErrorState = function(error, retryFunction) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm flex items-center justify-center" style="height: calc(100vh - 120px);">
            <div class="text-center">
                <div class="text-red-500 text-xl mb-4">⚠️</div>
                <h3 class="text-lg font-medium text-red-600 mb-2">Error loading queue</h3>
                <p class="text-sm text-gray-600 mb-4">${error}</p>
                <button onclick="${retryFunction}" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Retry
                </button>
            </div>
        </div>
    `;
}; 
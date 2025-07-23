/**
 * Queue Run Row Component
 * Generates HTML for individual run rows in the queue page
 */

// Helper function to get annotation icon HTML
function getAnnotationIcon(annotation) {
    if (annotation === 'correct') {
        return '<div class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">' +
            '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />' +
            '</svg>' +
        '</div>';
    } else if (annotation === 'wrong') {
        return '<div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">' +
            '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />' +
            '</svg>' +
        '</div>';
    } else {
        return '<div class="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex-shrink-0"></div>';
    }
}

// Helper function to create tag badges from metadata
function createTagBadgesForRow(metadata) {
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

/**
 * Creates HTML for a single queue run row
 * @param {Object} run - The run object
 * @param {string|null} annotation - The annotation status ('correct', 'wrong', or null)
 * @param {string} runName - The formatted run name
 * @param {string} timestamp - The formatted timestamp
 * @param {number} originalIndex - The original index in the runsData array
 * @param {boolean} isSelected - Whether this run is currently selected
 * @returns {string} HTML string for the run row
 */
function createQueueRunRow(run, annotation, runName, timestamp, originalIndex, isSelected) {
    const selectedClasses = isSelected ? 'border-l-4 border-l-blue-500 bg-blue-50' : '';
    const annotationIcon = getAnnotationIcon(annotation);
    const tagBadges = createTagBadgesForRow(run.metadata || {});
    
    return '<div class="border-b border-gray-100 px-6 py-4 hover:bg-gray-50 cursor-pointer ' + selectedClasses + '" onclick="selectRun(' + originalIndex + ')">' +
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
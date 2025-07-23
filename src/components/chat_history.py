def create_chat_history():
    """Create the chat history component with all HTML and JavaScript"""
    return """
    <script>
        // Chat history specific functions - make them global
        
        // Function to generate messages HTML
        window.generateMessagesHTML = function(messages, context, questionType) {
            let messagesHtml = '';
            
            messages.forEach((message, index) => {
                const role = message.role || 'user';
                const content = message.content || '';
                
                if (role === 'user') {
                    messagesHtml += '<div class="mb-6">' +
                        '<div class="bg-blue-500 text-white p-4 rounded-lg w-full">' +
                        '<div class="text-sm font-medium mb-2">User</div>' +
                        '<div class="whitespace-pre-wrap">' + content + '</div>' +
                        '</div>' +
                        '</div>';
                } else if (role === 'assistant') {
                    // Handle assistant messages based on question type and content structure
                    if (questionType === 'objective' && typeof content === 'object' && content !== null) {
                        // For objective questions, show feedback and analysis tabs
                        const feedback = content.feedback || '';
                        const analysis = content.analysis || '';
                        const isCorrect = content.is_correct;
                        
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
                    } else if (questionType === 'subjective' && typeof content === 'object' && content !== null) {
                        // For subjective questions, show feedback and scorecard tabs
                        const feedback = content.feedback || '';
                        const scorecard = content.scorecard || [];
                        
                        // Check if all criteria passed
                        let allPassed = true;
                        for (let i = 0; i < scorecard.length; i++) {
                            const criterion = scorecard[i];
                            const score = criterion.score || 0;
                            const passScore = criterion.pass_score || 0;
                            if (score < passScore) {
                                allPassed = false;
                                break;
                            }
                        }
                        
                        // Status indicator based on all criteria passing
                        let indicatorHtml = '';
                        if (allPassed) {
                            indicatorHtml = '<div class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">' +
                                '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>' +
                                '</svg>' +
                                '</div>';
                        } else {
                            indicatorHtml = '<div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">' +
                                '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>' +
                                '</svg>' +
                                '</div>';
                        }
                        
                        // Generate scorecard HTML
                        let scorecardHtml = '';
                        scorecard.forEach(criterion => {
                            const category = criterion.category || '';
                            const score = criterion.score || 0;
                            const maxScore = criterion.max_score || 0;
                            const passScore = criterion.pass_score || 0;
                            const criterionFeedback = criterion.feedback || {};
                            
                            // Determine if this criterion passed
                            const criterionPassed = score >= passScore;
                            const criterionIcon = criterionPassed ? 
                                '<div class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">' +
                                '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>' +
                                '</svg>' +
                                '</div>' :
                                '<div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">' +
                                '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>' +
                                '</svg>' +
                                '</div>';
                            
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
                                '</div>';
                            
                            if (criterionFeedback.wrong) {
                                scorecardHtml += '<div class="text-sm text-gray-700 mt-2">' +
                                    '<span class="text-red-600 font-medium">✗ Wrong:</span> ' + criterionFeedback.wrong +
                                    '</div>';
                            }
                            
                            scorecardHtml += '</div>';
                        });
                        
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
                        // Handle simple text responses or other cases
                        const contentText = typeof content === 'string' ? content : JSON.stringify(content);
                        messagesHtml += '<div class="mb-6">' +
                            '<div class="bg-gray-50 border border-gray-200 p-4 rounded-lg w-full">' +
                            '<div class="text-sm font-medium text-gray-700 mb-2">Assistant</div>' +
                            '<div class="text-sm text-gray-900 whitespace-pre-wrap">' + contentText + '</div>' +
                            '</div>' +
                            '</div>';
                    }
                }
            });
            
            return messagesHtml;
        };
        
        // Function to show tab content (for objective and subjective questions) - make it global
        window.showTab = function(tabId, buttonElement) {
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
        };
    </script>
    """

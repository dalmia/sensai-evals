def create_annotation_sidebar():
    """Create the annotation sidebar component with all HTML and JavaScript"""
    return """
    <!-- Annotation Sidebar -->
    <div id="annotationSidebar" class="w-96 bg-white border-l border-gray-200 flex-shrink-0 overflow-y-auto transition-all duration-300 hidden flex flex-col h-screen">
        <div class="p-4 flex-1 flex flex-col">
            <div id="annotationContent" class="flex-1 flex flex-col">
                <!-- Annotation content will be populated by JavaScript -->
                <div class="flex items-center justify-center h-full">
                    <div class="text-center text-gray-500">
                        <p>Select a run to view its annotations</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <style>
        /* Update annotation button enabled state */
        #updateAnnotationBtn.enabled {
            background-color: #3b82f6 !important;
            cursor: pointer !important;
        }
        
        /* Previous button enabled state */
        #prevAnnotationBtn.enabled {
            color: #374151 !important;
            background-color: #f3f4f6 !important;
            cursor: pointer !important;
        }
        
        /* Previous button hover state when enabled */
        #prevAnnotationBtn.enabled:hover {
            background-color: #e5e7eb !important;
        }
        
        /* Previous button disabled state - very clear styling */
        #prevAnnotationBtn:disabled,
        #prevAnnotationBtn.disabled {
            color: #9ca3af !important;
            background-color: #f3f4f6 !important;
            cursor: not-allowed !important;
            opacity: 0.6 !important;
        }
        
        /* Next button enabled state */
        #nextAnnotationBtn.enabled {
            color: #374151 !important;
            background-color: #f3f4f6 !important;
        }
        
        /* Next button hover state when enabled */
        #nextAnnotationBtn.enabled:hover {
            background-color: #e5e7eb !important;
        }
        
        /* Next button disabled state - very clear styling */
        #nextAnnotationBtn:disabled,
        #nextAnnotationBtn.disabled {
            color: #9ca3af !important;
            background-color: #f3f4f6 !important;
            cursor: not-allowed !important;
            opacity: 0.6 !important;
        }
        
        /* Make sure disabled buttons don't have hover effects */
        #prevAnnotationBtn:disabled:hover,
        #prevAnnotationBtn.disabled:hover,
        #nextAnnotationBtn:disabled:hover,
        #nextAnnotationBtn.disabled:hover {
            background-color: #f3f4f6 !important;
            color: #9ca3af !important;
        }
    </style>
    
    <script>
        // Annotation sidebar specific functions
        
        // Store original annotation state for comparison
        let originalAnnotationState = null;
        
        // Function to populate annotation content
        function populateAnnotationContent(run) {
            const annotationContent = document.getElementById('annotationContent');
            if (!annotationContent || !run) return;
            
            const annotations = run.annotations || {};
            const currentUserAnnotation = annotations[selectedAnnotator] || {};
            
            // Store original annotation state for comparison
            originalAnnotationState = {
                judgement: currentUserAnnotation.judgement || null,
                notes: currentUserAnnotation.notes || ''
            };
            
            // Determine current annotation state
            const hasCorrect = currentUserAnnotation.judgement === 'correct';
            const hasWrong = currentUserAnnotation.judgement === 'wrong';
            const hasNotes = currentUserAnnotation.notes && currentUserAnnotation.notes.trim().length > 0;
            
            // Determine navigation button states
            const canGoPrevious = currentRunIndex > 0;
            const canGoNext = currentRunIndex < runsData.length - 1;
            
            // Generate annotation form HTML matching the exact UI from the image
            const annotationHtml = `
                <div class="flex flex-col h-full">
                    <!-- Judgement Section -->
                    <div class="mb-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Judgement</h3>
                        <div class="flex space-x-4">
                            <button onclick="selectJudgement('correct')" 
                                    class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${hasCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
                                    id="correctBtn">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span>Correct</span>
                            </button>
                            <button onclick="selectJudgement('wrong')" 
                                    class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${hasWrong ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
                                    id="wrongBtn">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                                <span>Wrong</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Notes Section -->
                    <div class="mb-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                        <textarea id="annotationNotes" 
                                  rows="6" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                  placeholder="Add details about the annotation"
                                  onchange="updateAnnotationState()"
                                  oninput="updateAnnotationState()">${currentUserAnnotation.notes || ''}</textarea>
                    </div>
                    
                    <!-- Bottom Update Button -->
                    <button onclick="updateAnnotation()" 
                            class="w-full py-3 px-4 rounded-lg font-medium text-white mb-6 transition-colors duration-200 bg-gray-300 cursor-not-allowed"
                            id="updateAnnotationBtn2"
                            disabled>
                        Update annotation
                    </button>
                    
                    <!-- Navigation Section -->
                    <div class="flex items-center justify-between mb-4">
                        <button onclick="goToPrevious()" 
                                class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${canGoPrevious ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' : 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-60'}"
                                id="prevAnnotationBtn"
                                ${canGoPrevious ? '' : 'disabled'}>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                            <span>Previous</span>
                        </button>
                        
                        <button onclick="goToNext()" 
                                class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${canGoNext ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' : 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-60'}"
                                id="nextAnnotationBtn"
                                ${canGoNext ? '' : 'disabled'}>
                            <span>Next</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Page indicator -->
                    <div class="text-center text-gray-500 text-sm">
                        <span id="annotationCounter">${(currentRunIndex + 1)} of ${runsData.length}</span>
                    </div>
                </div>
            `;
            
            annotationContent.innerHTML = annotationHtml;
            
            // Update button state after populating content
            updateAnnotationState();
        }
        
        // Function to update annotation state (called when notes change)
        function updateAnnotationState() {
            const correctBtn = document.getElementById('correctBtn');
            const wrongBtn = document.getElementById('wrongBtn');
            const notes = document.getElementById('annotationNotes')?.value || '';
            const updateBtn = document.getElementById('updateAnnotationBtn2');
            
            // Get current judgement state
            const currentJudgement = correctBtn && correctBtn.className.includes('bg-green-500') ? 'correct' :
                                   wrongBtn && wrongBtn.className.includes('bg-red-500') ? 'wrong' : null;
            
            // Determine if changes warrant enabling the button
            let shouldEnable = false;
            
            if (originalAnnotationState) {
                // If no original judgement existed, only enable when a judgement is made
                if (!originalAnnotationState.judgement) {
                    shouldEnable = currentJudgement !== null;
                } else {
                    // If original judgement existed, enable when judgement changed OR notes changed
                    const judgementChanged = currentJudgement !== originalAnnotationState.judgement;
                    const notesChanged = notes !== originalAnnotationState.notes;
                    shouldEnable = judgementChanged || notesChanged;
                }
            }
            
            // Update button state
            if (updateBtn) {
                if (shouldEnable) {
                    updateBtn.className = 'w-full py-3 px-4 rounded-lg font-medium text-white mb-6 transition-colors duration-200 bg-blue-600 hover:bg-blue-700';
                    updateBtn.disabled = false;
                } else {
                    updateBtn.className = 'w-full py-3 px-4 rounded-lg font-medium text-white mb-6 transition-colors duration-200 bg-gray-300 cursor-not-allowed';
                    updateBtn.disabled = true;
                }
            }
        }
        
        // Function to select judgement (correct/wrong)
        function selectJudgement(judgement) {
            const correctBtn = document.getElementById('correctBtn');
            const wrongBtn = document.getElementById('wrongBtn');
            
            // Reset both buttons
            correctBtn.className = 'flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200';
            wrongBtn.className = 'flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200';
            
            // Highlight selected button
            if (judgement === 'correct') {
                correctBtn.className = 'flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-green-500 text-white';
            } else if (judgement === 'wrong') {
                wrongBtn.className = 'flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-red-500 text-white';
            }
            
            // Update button state
            updateAnnotationState();
        }
        
        // Function to go to previous run
        function goToPrevious() {
            if (currentRunIndex > 0) {
                navigatingFromSidebar = true;
                selectRun(currentRunIndex - 1);
                
                // If annotation sidebar is open, refresh its content
                const annotationSidebar = document.getElementById('annotationSidebar');
                if (annotationSidebar && !annotationSidebar.classList.contains('hidden')) {
                    populateAnnotationContent(runsData[currentRunIndex]);
                }
            }
        }
        
        // Function to go to next run
        function goToNext() {
            if (currentRunIndex < runsData.length - 1) {
                navigatingFromSidebar = true;
                selectRun(currentRunIndex + 1);
                
                // If annotation sidebar is open, refresh its content
                const annotationSidebar = document.getElementById('annotationSidebar');
                if (annotationSidebar && !annotationSidebar.classList.contains('hidden')) {
                    populateAnnotationContent(runsData[currentRunIndex]);
                }
            }
        }
        
        // Function to update annotation (placeholder for now)
        async function updateAnnotation() {
            const correctBtn = document.getElementById('correctBtn');
            const wrongBtn = document.getElementById('wrongBtn');
            const notes = document.getElementById('annotationNotes').value;
            const updateBtn = document.getElementById('updateAnnotationBtn2');
            
            let judgement = null;
            if (correctBtn && correctBtn.className.includes('bg-green-500')) {
                judgement = 'correct';
            } else if (wrongBtn && wrongBtn.className.includes('bg-red-500')) {
                judgement = 'wrong';
            }
            
            if (!judgement) {
                console.error('No judgement selected');
                return;
            }
            
            // Get current run data
            const currentRun = runsData[currentRunIndex];
            if (!currentRun) {
                console.error('No current run found');
                return;
            }
            
            try {
                // Call the API to create annotation
                const response = await fetch('/api/annotations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        run_id: currentRun.id,
                        judgement: judgement,
                        notes: notes
                    })
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to create annotation');
                }
                
                // Update local data structures
                if (!currentRun.annotations) {
                    currentRun.annotations = {};
                }
                currentRun.annotations[selectedAnnotator] = {
                    judgement: judgement,
                    notes: notes,
                    timestamp: new Date().toISOString()
                };
                
                // Update original annotation state to reflect the new state
                originalAnnotationState = {
                    judgement: judgement,
                    notes: notes
                };
                
                // Update the runs display to show the new annotation status
                updateRunsDisplay();
                
                // Show success message on the button
                const originalText = 'Update annotation';
                if (updateBtn) {
                    updateBtn.textContent = 'Updated';
                    updateBtn.className = 'w-full py-3 px-4 rounded-lg font-medium text-white mb-6 transition-colors duration-200 bg-green-600';
                    updateBtn.disabled = true;
                }
                
                // Reset button state after 2 seconds
                setTimeout(() => {
                    if (updateBtn) {
                        updateBtn.textContent = originalText;
                    }
                    updateAnnotationState();
                }, 2000);
                
                console.log('Annotation updated successfully:', result);
                
            } catch (error) {
                console.error('Error updating annotation:', error);
                
                // Show error message
                if (updateBtn) {
                    updateBtn.textContent = 'Error';
                    updateBtn.className = 'w-full py-3 px-4 rounded-lg font-medium text-white mb-6 transition-colors duration-200 bg-red-600';
                    updateBtn.disabled = true;
                }
                
                // Reset button state after 2 seconds
                setTimeout(() => {
                    if (updateBtn) {
                        updateBtn.textContent = 'Update annotation';
                    }
                    updateAnnotationState();
                }, 2000);
            }
        }
        
        // Function to toggle annotation sidebar
        function toggleAnnotationSidebar() {
            const annotationSidebar = document.getElementById('annotationSidebar');
            const metadataSidebar = document.getElementById('metadataSidebar');
            const annotationButton = document.querySelector('button[onclick="toggleAnnotationSidebar()"]');
            const metadataButton = document.querySelector('button[onclick="toggleMetadataSidebar()"]');
            
            if (annotationSidebar) {
                // Close metadata sidebar if it's open
                if (metadataSidebar && !metadataSidebar.classList.contains('hidden')) {
                    metadataSidebar.classList.add('hidden');
                    // Reset metadata button to OFF state
                    if (metadataButton) {
                        metadataButton.classList.remove('bg-blue-600', 'text-white');
                        metadataButton.classList.add('bg-gray-100', 'text-gray-700');
                    }
                }
                
                // Toggle annotation sidebar
                if (annotationSidebar.classList.contains('hidden')) {
                    // Show annotation sidebar - set button to ON state
                    annotationSidebar.classList.remove('hidden');
                    if (annotationButton) {
                        annotationButton.classList.remove('bg-gray-100', 'text-gray-700');
                        annotationButton.classList.add('bg-blue-600', 'text-white');
                    }
                    
                    // Hide text in both buttons since a sidebar is now open
                    if (annotationButton) {
                        const annotationText = annotationButton.querySelector('span');
                        if (annotationText) annotationText.style.display = 'none';
                    }
                    if (metadataButton) {
                        const metadataText = metadataButton.querySelector('span');
                        if (metadataText) metadataText.style.display = 'none';
                    }
                    
                    // Populate annotation content if a run is selected
                    if (currentRunIndex !== null) {
                        populateAnnotationContent(runsData[currentRunIndex]);
                    }
                } else {
                    // Hide annotation sidebar - set button to OFF state
                    annotationSidebar.classList.add('hidden');
                    if (annotationButton) {
                        annotationButton.classList.remove('bg-blue-600', 'text-white');
                        annotationButton.classList.add('bg-gray-100', 'text-gray-700');
                    }
                    
                    // Show text in both buttons since no sidebar is open
                    if (annotationButton) {
                        const annotationText = annotationButton.querySelector('span');
                        if (annotationText) annotationText.style.display = '';
                    }
                    if (metadataButton) {
                        const metadataText = metadataButton.querySelector('span');
                        if (metadataText) metadataText.style.display = '';
                    }
                }
            }
        }
    </script>
    """

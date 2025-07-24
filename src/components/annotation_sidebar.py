def create_annotation_sidebar():
    """Create the annotation sidebar component with HTML and CSS - JavaScript functionality moved to js/components/annotation_sidebar.js"""
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
    """

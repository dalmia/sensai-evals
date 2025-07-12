def create_metadata_sidebar():
    """Create the metadata sidebar component with all HTML and JavaScript"""
    return """
    <!-- Metadata Sidebar -->
    <div id="metadataSidebar" class="w-96 bg-white border-l border-gray-200 flex-shrink-0 overflow-y-auto transition-all duration-300 hidden">
        <div class="p-4">
            <div id="metadataContent">
                <!-- Metadata will be populated by JavaScript -->
                <div class="text-center text-gray-500 py-8">
                    <p>Select a run to view its metadata</p>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Metadata sidebar specific functions
        
        // Helper function to format timestamp
        function formatTimestampForMetadata(timestamp) {
            if (!timestamp) return "N/A";
            try {
                const date = new Date(timestamp);
                return date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            } catch (e) {
                return timestamp;
            }
        }
        
        // Generate metadata HTML
        function generateMetadataHTML(runData) {
            const metadata = runData.metadata || {};
            
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
            metadataHtml += createMetadataRow('Trace ID', runData.trace_id || '');
            metadataHtml += createMetadataRow('Span Kind', runData.span_kind || '');
            metadataHtml += createMetadataRow('Span Name', runData.span_name || '');
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
            metadataHtml += createMetadataRow('Start Time', formatTimestampForMetadata(runData.start_time || ''));
            metadataHtml += createMetadataRow('End Time', formatTimestampForMetadata(runData.end_time || ''));
            metadataHtml += createMetadataRow('Uploaded by', runData.uploaded_by || '');
            
            return metadataHtml;
        }
        
        // Function to populate metadata content
        function populateMetadataContent(runData) {
            const metadataContent = document.getElementById('metadataContent');
            if (metadataContent && runData) {
                const metadataHtml = generateMetadataHTML(runData);
                metadataContent.innerHTML = metadataHtml;
            }
        }
        
        // Function to toggle metadata sidebar (now a third column)
        function toggleMetadataSidebar() {
            const metadataSidebar = document.getElementById('metadataSidebar');
            const annotationSidebar = document.getElementById('annotationSidebar');
            const metadataButton = document.querySelector('button[onclick="toggleMetadataSidebar()"]');
            const annotationButton = document.querySelector('button[onclick="toggleAnnotationSidebar()"]');
            
            if (metadataSidebar) {
                // Close annotation sidebar if it's open
                if (annotationSidebar && !annotationSidebar.classList.contains('hidden')) {
                    annotationSidebar.classList.add('hidden');
                    // Reset annotation button to OFF state
                    if (annotationButton) {
                        annotationButton.classList.remove('bg-blue-600', 'text-white');
                        annotationButton.classList.add('bg-gray-100', 'text-gray-700');
                    }
                }
                
                // Toggle metadata sidebar
                if (metadataSidebar.classList.contains('hidden')) {
                    // Show metadata sidebar - set button to ON state
                    metadataSidebar.classList.remove('hidden');
                    if (metadataButton) {
                        metadataButton.classList.remove('bg-gray-100', 'text-gray-700');
                        metadataButton.classList.add('bg-blue-600', 'text-white');
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
                } else {
                    // Hide metadata sidebar - set button to OFF state
                    metadataSidebar.classList.add('hidden');
                    if (metadataButton) {
                        metadataButton.classList.remove('bg-blue-600', 'text-white');
                        metadataButton.classList.add('bg-gray-100', 'text-gray-700');
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

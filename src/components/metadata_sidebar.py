def create_metadata_sidebar():
    """Create the metadata sidebar component with HTML - JavaScript functionality moved to js/components/metadata_sidebar.js"""
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
    """

def create_queue_item(queue_name, count, created_date, created_by, queue_id):
    """Create a reusable queue item component"""
    return f"""
    <div class="border-b border-l-4 border-l-transparent border-gray-100 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors" onclick="showQueueDetails({queue_id})">
        <div class="flex items-center justify-between">
            <div class="flex-1">
                <div class="text-sm font-medium text-gray-900">{queue_name} ({count})</div>
                <div class="text-xs text-gray-500 mt-1">
                    <div>Created: {created_date}</div>
                    <div>Created by: {created_by}</div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                
                <button class="text-gray-400 hover:text-gray-600 p-1" onclick="event.stopPropagation()">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        </div>
    </div>
    """

def create_queue_item(queue_name, count, created_date, created_by, queue_id):
    """Create a reusable queue item component"""
    return f"""
    <div class="border-b border-gray-100 px-6 py-4 hover:bg-gray-50 cursor-pointer" onclick="showQueueDetails('{queue_id}')">
        <div class="flex items-center justify-between">
            <div class="flex-1">
                <div class="text-sm font-medium text-gray-900">{queue_name} ({count})</div>
                <div class="text-xs text-gray-500 mt-1">
                    <div>Created: {created_date}</div>
                    <div>Created by: {created_by}</div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button class="text-red-400 hover:text-red-600 p-1" onclick="event.stopPropagation()">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                </button>
                <button class="text-gray-400 hover:text-gray-600 p-1" onclick="event.stopPropagation()">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        </div>
    </div>
    """

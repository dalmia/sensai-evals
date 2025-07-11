def create_run_row(run_name, tags, uploaded_by, timestamp):
    """Create a reusable run row component"""
    # Create tag badges
    tag_badges = []
    for tag in tags:
        tag_color_map = {
            "feedback": "bg-blue-100 text-blue-800",
            "quiz": "bg-purple-100 text-purple-800",
            "learning_material": "bg-indigo-100 text-indigo-800",
            "text": "bg-gray-100 text-gray-800",
            "code": "bg-gray-100 text-gray-800",
            "audio": "bg-gray-100 text-gray-800",
            "subjective": "bg-green-100 text-green-800",
            "objective": "bg-green-100 text-green-800",
            "practice": "bg-orange-100 text-orange-800",
            "exam": "bg-yellow-100 text-yellow-800",
        }
        tag_color = tag_color_map.get(tag, "bg-gray-100 text-gray-800")
        tag_badges.append(
            f'<span class="px-2 py-1 text-xs {tag_color} rounded">{tag}</span>'
        )

    tags_html = " ".join(tag_badges)

    return f"""
    <div class="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <div>
                    <div class="text-sm font-medium text-gray-900">{run_name}</div>
                    <div class="flex items-center space-x-2 mt-1">
                        {tags_html}
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-8">
                <span class="text-sm text-gray-500">{uploaded_by}</span>
                <span class="text-sm text-gray-500">{timestamp}</span>
            </div>
        </div>
    </div>
    """

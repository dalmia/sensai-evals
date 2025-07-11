def create_run_row(run_name, tags, timestamp, annotation=None, run_index=0):
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

    # Create annotation icon
    annotation_icon = ""
    if annotation == "correct":
        annotation_icon = """<div class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
        </div>"""
    elif annotation == "wrong":
        annotation_icon = """<div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </div>"""
    else:
        annotation_icon = '<div class="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex-shrink-0"></div>'

    return f"""
    <div class="border-b border-gray-100 px-6 py-4 hover:bg-gray-50 cursor-pointer">
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <input type="checkbox" id="rowCheckbox_{run_index}" class="row-checkbox w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" onchange="updateSelectedCount()">
                <div>
                    <div class="text-sm font-medium text-gray-900">{run_name}</div>
                    <div class="flex items-center space-x-2 mt-1">
                        {tags_html}
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-8">
                <div class="flex items-center justify-center w-12">
                    {annotation_icon}
                </div>
                <span class="text-sm text-gray-500">{timestamp}</span>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
    </div>
    """

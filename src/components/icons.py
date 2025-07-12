def create_correct_icon(size="w-4 h-4"):
    """Create a green checkmark icon for correct answers"""
    return f"""
    <div class="{size} rounded-full bg-green-500 flex items-center justify-center">
        <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
    </div>
    """


def create_incorrect_icon(size="w-4 h-4"):
    """Create a red X icon for incorrect answers"""
    return f"""
    <div class="{size} rounded-full bg-red-500 flex items-center justify-center">
        <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    </div>
    """


def create_status_icon(is_correct, size="w-4 h-4"):
    """Create a status icon based on correctness"""
    if is_correct:
        return create_correct_icon(size)
    else:
        return create_incorrect_icon(size)

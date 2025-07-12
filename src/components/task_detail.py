from components.icons import create_status_icon


def create_task_detail(run_data, run_name):
    """Create a task detail component showing the task context and conversation"""

    # Extract task context (this will be the task description)
    context = run_data.get("context", "")

    # Extract metadata to determine question type
    metadata = run_data.get("metadata", {})
    question_type = metadata.get("question_type", "")

    # Extract conversation messages from the run data
    # This assumes the run has a "messages" or "conversation" field
    messages = run_data.get("messages", [])

    # If no messages, try to extract from other possible fields
    if not messages:
        # Look for conversation in other possible locations
        conversation = run_data.get("conversation", [])
        if conversation:
            messages = conversation

    # Generate message HTML
    def generate_messages_html(messages):
        messages_html = ""
        for i, message in enumerate(messages):
            role = message.get("role", "user")
            content = message.get("content", "")

            if role == "user":
                # User message - full width
                messages_html += f"""
                <div class="mb-6">
                    <div class="bg-blue-500 text-white p-4 rounded-lg w-full">
                        <div class="text-sm font-medium mb-2">User</div>
                        <div class="text-sm font-medium mb-2">Student's Response:</div>
                        <div class="whitespace-pre-wrap">{content}</div>
                    </div>
                </div>
                """
            else:
                # AI/Assistant message - handle differently based on question type
                if question_type == "objective" and isinstance(content, dict):
                    # For objective questions, content is an object with feedback, analysis, and is_correct
                    feedback = content.get("feedback", "")
                    analysis = content.get("analysis", "")
                    is_correct = content.get("is_correct", False)

                    # Generate correct/incorrect indicator using the icon component
                    indicator_html = create_status_icon(is_correct)

                    messages_html += f"""
                    <div class="mb-6">
                        <div class="bg-gray-50 border border-gray-200 p-4 rounded-lg w-full">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-sm font-medium text-gray-700">Assistant</span>
                                {indicator_html}
                            </div>
                            <div class="mb-4">
                                <div class="flex space-x-4 border-b border-gray-200">
                                    <button class="pb-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600 tab-button" onclick="showTab('feedback-{i}', this)">
                                        Feedback
                                    </button>
                                    <button class="pb-2 text-sm font-medium text-gray-500 tab-button" onclick="showTab('analysis-{i}', this)">
                                        Analysis
                                    </button>
                                </div>
                            </div>
                            <div id="feedback-{i}" class="tab-content">
                                <div class="whitespace-pre-wrap text-sm">{feedback}</div>
                            </div>
                            <div id="analysis-{i}" class="tab-content hidden">
                                <div class="whitespace-pre-wrap text-sm">{analysis}</div>
                            </div>
                        </div>
                    </div>
                    """
                elif question_type == "subjective" and isinstance(content, dict):
                    # For subjective questions, content is an object with feedback and scorecard
                    feedback = content.get("feedback", "")
                    scorecard = content.get("scorecard", [])

                    # Check if all criteria passed
                    all_passed = True
                    for criterion in scorecard:
                        score = criterion.get("score", 0)
                        pass_score = criterion.get("pass_score", 0)
                        if score < pass_score:
                            all_passed = False
                            break

                    # Generate correct/incorrect indicator based on all criteria passing
                    indicator_html = create_status_icon(all_passed)

                    # Generate scorecard HTML
                    scorecard_html = ""
                    for criterion in scorecard:
                        category = criterion.get("category", "")
                        score = criterion.get("score", 0)
                        max_score = criterion.get("max_score", 0)
                        pass_score = criterion.get("pass_score", 0)
                        criterion_feedback = criterion.get("feedback", {})

                        # Determine if this criterion passed
                        criterion_passed = score >= pass_score
                        criterion_icon = create_status_icon(criterion_passed)

                        # Get the appropriate feedback text
                        feedback_text = (
                            criterion_feedback.get("correct", "")
                            if criterion_passed
                            else criterion_feedback.get("wrong", "")
                        )

                        scorecard_html += f"""
                        <div class="mb-6 p-4 border border-gray-200 rounded-lg bg-white">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center gap-3">
                                    {criterion_icon}
                                    <h3 class="text-lg font-medium text-gray-900">{category}</h3>
                                </div>
                                <div class="text-sm text-gray-600">
                                    {score}/{max_score} (Pass: {pass_score})
                                </div>
                            </div>
                            <div class="text-sm text-gray-700">
                                <span class="text-green-600 font-medium">✓ Correct:</span> {criterion_feedback.get("correct", "")}
                            </div>
                            {f'<div class="text-sm text-gray-700 mt-2"><span class="text-gray-600 font-medium">Wrong:</span> {criterion_feedback.get("wrong", "")}</div>' if criterion_feedback.get("wrong") else ""}
                        </div>
                        """

                    messages_html += f"""
                    <div class="mb-6">
                        <div class="bg-gray-50 border border-gray-200 p-4 rounded-lg w-full">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-sm font-medium text-gray-700">Assistant</span>
                                {indicator_html}
                            </div>
                            <div class="mb-4">
                                <div class="flex space-x-4 border-b border-gray-200">
                                    <button class="pb-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600 tab-button" onclick="showTab('feedback-{i}', this)">
                                        Feedback
                                    </button>
                                    <button class="pb-2 text-sm font-medium text-gray-500 tab-button" onclick="showTab('scorecard-{i}', this)">
                                        Scorecard
                                    </button>
                                </div>
                            </div>
                            <div id="feedback-{i}" class="tab-content">
                                <div class="whitespace-pre-wrap text-sm">{feedback}</div>
                            </div>
                            <div id="scorecard-{i}" class="tab-content hidden">
                                <div class="space-y-4">
                                    {scorecard_html}
                                </div>
                            </div>
                        </div>
                    </div>
                    """
                else:
                    # For other cases or string content, use the original format
                    content_text = content if isinstance(content, str) else str(content)
                    messages_html += f"""
                    <div class="mb-6">
                        <div class="bg-gray-50 border border-gray-200 p-4 rounded-lg w-full">
                            <div class="flex items-center mb-2">
                                <span class="text-sm font-medium text-gray-700">Assistant</span>
                                <div class="ml-2 w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <div class="whitespace-pre-wrap text-sm">{content_text}</div>
                        </div>
                    </div>
                    """
        return messages_html

    messages_html = generate_messages_html(messages)

    return f"""
    <div class="flex-1 bg-white overflow-y-auto relative">
        <!-- Header -->
        <div class="border-b border-gray-200 px-6 py-4">
            <div class="flex justify-between items-center">
                <h1 class="text-lg font-semibold text-gray-900">{run_name}</h1>
                <div class="flex space-x-2">
                    <button class="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300" onclick="toggleAnnotationSidebar()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        <span>Annotation</span>
                    </button>
                    <button onclick="toggleMetadataSidebar()" class="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>Metadata</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Content -->
        <div class="p-6">
            <!-- Task Section -->
            <div class="mb-8">
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div class="text-sm font-medium text-yellow-800 mb-2">Task:</div>
                    <div class="text-sm text-yellow-700 whitespace-pre-wrap">{context}</div>
                </div>
            </div>

            <!-- Messages Section -->
            <div class="space-y-6">
                {messages_html}
            </div>
        </div>

        <!-- Metadata sidebar will be populated by JavaScript -->

        <!-- Tab switching script -->
        <script>
            function showTab(tabId, buttonElement) {{
                // Hide all tab contents in the same message
                const messageContainer = buttonElement.closest('.bg-gray-50');
                const tabContents = messageContainer.querySelectorAll('.tab-content');
                tabContents.forEach(content => content.classList.add('hidden'));

                // Remove active state from all tab buttons in the same message
                const tabButtons = messageContainer.querySelectorAll('.tab-button');
                tabButtons.forEach(button => {{
                    button.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
                    button.classList.add('text-gray-500');
                }});

                // Show selected tab content
                document.getElementById(tabId).classList.remove('hidden');

                // Add active state to clicked button
                buttonElement.classList.remove('text-gray-500');
                buttonElement.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
            }}

            // Metadata sidebar functionality handled by queue.js
            function toggleMetadataSidebar() {{
                // This will be overridden by queue.js when a run is selected
                console.log('Metadata sidebar not yet initialized');
            }}
        </script>
    </div>
    """

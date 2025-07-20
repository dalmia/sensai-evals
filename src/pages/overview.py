from fasthtml.common import *
from auth import get_current_user, require_auth
from components.header import create_header


def overview_page(request):
    """Overview page with metrics dashboard"""
    # Check authentication
    auth_redirect = require_auth(request)
    if auth_redirect:
        return auth_redirect

    user = get_current_user(request)

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SensAI evals | Overview</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 min-h-screen">
        {create_header(user, "overview")}

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Metrics Grid -->
            <div id="metricsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <!-- Loading Spinner -->
                <div id="loadingSpinner" class="col-span-full flex items-center justify-center py-12">
                    <div class="flex items-center space-x-2">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                </div>
            </div>

            <!-- Annotation Leaderboard -->
            <div class="bg-white rounded-lg shadow p-6 mb-8">
                <h3 class="text-lg font-medium text-gray-900 mb-6">Annotation Leaderboard</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rank
                                </th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Annotations
                                </th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Correct
                                </th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Incorrect
                                </th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Accuracy
                                </th>
                            </tr>
                        </thead>
                        <tbody id="leaderboardBody" class="bg-white divide-y divide-gray-200">
                            <!-- Loading state -->
                            <tr>
                                <td colspan="6" class="px-6 py-12 text-center">
                                    <div class="flex items-center justify-center">
                                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <script>
            function toggleDropdown() {{
                const dropdown = document.getElementById('dropdown');
                dropdown.classList.toggle('hidden');
            }}
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(event) {{
                const dropdown = document.getElementById('dropdown');
                const button = event.target.closest('button');
                
                if (!button || button.getAttribute('onclick') !== 'toggleDropdown()') {{
                    dropdown.classList.add('hidden');
                }}
            }});

            // Load metrics data
            async function loadMetrics() {{
                try {{
                    const response = await fetch('/api/metrics');
                    const data = await response.json();
                    
                    if (response.ok) {{
                        updateMetricsDisplay(data);
                    }} else {{
                        console.error('Error loading metrics:', data.error);
                        showMetricsError(data.error);
                    }}
                }} catch (error) {{
                    console.error('Error loading metrics:', error);
                    showMetricsError('Failed to load metrics');
                }}
            }}

            function updateMetricsDisplay(metrics) {{
                const metricsGrid = document.getElementById('metricsGrid');
                
                metricsGrid.innerHTML = `
                    <!-- Accuracy Rate -->
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Accuracy Rate</p>
                                <p class="text-2xl font-semibold text-gray-900">${{metrics.accuracy}}%</p>
                            </div>
                        </div>
                    </div>

                    <!-- Total Runs -->
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Total Runs</p>
                                <p class="text-2xl font-semibold text-gray-900">${{metrics.num_runs.toLocaleString()}}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Unique Users -->
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Unique Users</p>
                                <p class="text-2xl font-semibold text-gray-900">${{metrics.num_unique_users.toLocaleString()}}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Correct Annotations -->
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Correct Annotations</p>
                                <p class="text-2xl font-semibold text-gray-900">${{metrics.num_correct.toLocaleString()}}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Incorrect Annotations -->
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Incorrect Annotations</p>
                                <p class="text-2xl font-semibold text-gray-900">${{metrics.num_wrong.toLocaleString()}}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Total Annotations -->
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Total Annotations</p>
                                <p class="text-2xl font-semibold text-gray-900">${{metrics.num_annotations.toLocaleString()}}</p>
                            </div>
                        </div>
                    </div>
                `;
                
                // Update leaderboard
                updateLeaderboard(metrics.leaderboard || []);
            }}

            function showMetricsError(errorMessage) {{
                const metricsGrid = document.getElementById('metricsGrid');
                metricsGrid.innerHTML = `
                    <div class="col-span-full flex items-center justify-center py-12">
                        <div class="text-center">
                            <div class="text-red-500 text-xl mb-4">⚠️</div>
                            <p class="text-red-600 text-lg">Error loading metrics</p>
                            <p class="text-gray-600">${{errorMessage}}</p>
                            <button onclick="loadMetrics()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                Retry
                            </button>
                        </div>
                    </div>
                `;
            }}

            function updateLeaderboard(leaderboard) {{
                const leaderboardBody = document.getElementById('leaderboardBody');
                
                if (leaderboard.length === 0) {{
                    leaderboardBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                                No annotation data available yet
                            </td>
                        </tr>
                    `;
                    return;
                }}

                let rows = '';
                leaderboard.forEach((annotator, index) => {{
                    const rank = index + 1;
                    let rankDisplay = '';
                    
                    // Show medals for top 3, numbers for others
                    if (rank === 1) {{
                        rankDisplay = `<img src="/images/leaderboard_1.svg" alt="Gold Medal" class="w-8 h-8">`;
                    }} else if (rank === 2) {{
                        rankDisplay = `<img src="/images/leaderboard_2.svg" alt="Silver Medal" class="w-8 h-8">`;
                    }} else if (rank === 3) {{
                        rankDisplay = `<img src="/images/leaderboard_3.svg" alt="Bronze Medal" class="w-8 h-8">`;
                    }} else {{
                        rankDisplay = `
                            <div class="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                                <span class="text-sm font-medium text-gray-700">${{rank}}</span>
                            </div>
                        `;
                    }}

                    rows += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    ${{rankDisplay}}
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-gray-900">${{annotator.name}}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${{annotator.total_annotations.toLocaleString()}}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">${{annotator.correct.toLocaleString()}}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">${{annotator.wrong.toLocaleString()}}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">${{annotator.accuracy}}%</td>
                        </tr>
                    `;
                }});

                leaderboardBody.innerHTML = rows;
            }}

            // Load metrics when page loads
            window.addEventListener('DOMContentLoaded', function() {{
                loadMetrics();
            }});
        </script>
    </body>
    </html>
    """

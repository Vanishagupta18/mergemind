from openai_client import analyze_diff

diff = """
function add(a, b) {
    return a - b;
}
"""

print(analyze_diff(diff, "Test PR", "test.js"))
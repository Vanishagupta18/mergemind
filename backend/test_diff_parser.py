from diff_parser import parse_diff

sample = """
diff --git a/app.py b/app.py
@@
print("hello")

diff --git a/test.js b/test.js
@@
function add(a,b){
 return a-b;
}
"""

files = parse_diff(sample)

for f in files:
    print("=" * 50)
    print(f["filename"])
    print(f["diff_text"])
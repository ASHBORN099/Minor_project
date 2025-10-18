import requests
import json

def test_priority(task_description, keywords="", effort_hours=1, is_urgent=False):
    url = "http://localhost:5000/predict"
    data = {
        "text": task_description,
        "keywords": keywords,
        "effort_hours": effort_hours,
        "is_urgent": is_urgent
    }
    response = requests.post(url, json=data)
    result = response.json()
    print(f"\nTask: {task_description}")
    print(f"Priority: {result['priority'].upper()}")
    print(f"Confidence: {result['confidence']}%")
    print(f"Urgency Score: {result['urgency_score']}")
    print("-" * 50)
    return result

# Test cases
test_cases = [
    # Critical cases
    ("URGENT: Production server is down, immediate action required", "server,emergency", 2, True),
    ("Security breach detected in main database", "security,database", 3, True),
    
    # High priority cases
    ("Client meeting scheduled for today", "client,meeting", 1, True),
    ("Fix customer-reported bug in login system", "bug,customer", 2, True),
    
    # Medium priority cases
    ("Homework submission due this week", "homework", 1, False),
    ("Update documentation for next week's release", "documentation,update", 3, False),
    
    # Low priority cases
    ("Organize old files whenever convenient", "organization", 1, False),
    ("Review documentation when you have time", "documentation", 2, False)
]

print("Testing Priority Prediction System\n")
print("=" * 50)

for desc, keywords, hours, urgent in test_cases:
    test_priority(desc, keywords, hours, urgent)
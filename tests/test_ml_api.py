import requests
import json

def test_prediction(text):
    try:
        response = requests.post(
            'http://localhost:5000/predict',
            json={'text': text},
            headers={'Content-Type': 'application/json'}
        )
        result = response.json()
        print(f"\nInput: {text}")
        print(f"Priority: {result.get('priority', 'error')}")
        print(f"Confidence: {result.get('confidence', 'error')}%")
        print("-" * 50)
    except Exception as e:
        print(f"Error testing '{text}': {str(e)}")

# Test cases
test_cases = [
    # High priority cases
    "Urgent: Client meeting tomorrow morning",
    "ASAP: Submit project proposal by EOD",
    "Critical deadline: Finish presentation",
    "Important: Call the client immediately",
    
    # Medium priority cases
    "Review weekly reports",
    "Update team documentation",
    "Schedule team meeting next week",
    "Prepare monthly analytics",
    
    # Low priority cases
    "Maybe clean up old files someday",
    "Organize desk whenever possible",
    "Consider updating profile picture",
    "Read article when free",
    
    # Mixed/ambiguous cases
    "Meeting with team about urgent project next week",
    "Update documentation for critical system when possible",
    "Schedule routine maintenance ASAP",
    "Maybe review important files tomorrow"
]

print("Starting ML API Tests...")
print("=" * 50)

for test in test_cases:
    test_prediction(test)
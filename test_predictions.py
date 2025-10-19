import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

# Load the model
pipeline = joblib.load('models/priority_tf_model.keras')

# Test cases
test_cases = [
    {
        "description": "homework submission today",
        "keywords": "deadline, urgent, homework",
        "effort_hours": 4,
        "is_urgent": True
    },
    {
        "description": "submit final project report",
        "keywords": "due, submission",
        "effort_hours": 5,
        "is_urgent": True
    },
    {
        "description": "organizing photo albums",
        "keywords": "organizing",
        "effort_hours": 0.5,
        "is_urgent": True
    }
]

# Make predictions
for case in test_cases:
    features = [
        case["description"],
        case["keywords"],
        case["effort_hours"],
        1 if case["is_urgent"] else 0
    ]
    print(f"\nTest Case: {case['description']}")
    print(f"Features: {features}")
    try:
        prediction = pipeline.predict([features])
        print(f"Predicted Priority: {prediction}")
    except Exception as e:
        print(f"Error: {str(e)}")
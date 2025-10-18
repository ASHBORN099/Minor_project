from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import re
import pandas as pd
import nltk
from nltk.stem import WordNetLemmatizer
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

app = Flask(__name__)
CORS(app)

# Initialize the Lemmatizer for text processing
lemmatizer = WordNetLemmatizer()

# --- Configuration for Urgency Signals (Easy to Tune) ---
URGENCY_RULES = {
    # Critical priority signals
    "critical": [
        (r"security.*?(issue|breach|vulnerability)", 3.0),
        (r"production.*?(down|offline|broken)", 3.0),
        (r"urgent.*?customer.*?(blocked|impacted)", 3.0),
        (r"critical.*?(bug|issue|error)", 3.0),
        (r"emergency", 3.0),
        (r"\bASAP\b", 3.0),
    ],
    # High priority signals
    "high": [
        (r"\b(urgent|important)\b", 2.0),
        (r"deadline.*?(today|tomorrow)", 2.0),
        (r"customer.*?(bug|issue|problem)", 2.0),
        (r"(fix|solve).*?(bug|issue)", 2.0),
        (r"today", 2.0),
        (r"meeting.*?(client|customer)", 2.0),
    ],
    # Medium priority signals
    "medium": [
        (r"\b(needed|required)\b", 1.0),
        (r"soon|next week", 1.0),
        (r"this week", 1.0),
        (r"update.*?(needed|required)", 1.0),
        (r"submission", 1.0),
        (r"homework|assignment", 1.0),
    ],
    # Low priority signals (negative weights reduce priority)
    "low": [
        (r"\b(whenever convenient|when possible|if time)\b", -2.0),
        (r"\b(low priority|no rush|not urgent)\b", -2.0),
        (r"\b(someday|eventually|sometime)\b", -1.5),
        (r"\b(documentation|nice to have|optional)\b", -1.0),
        (r"\bcan wait\b", -1.5),
        (r"whenever.*?time", -2.0),
    ]
}

# --- Utility Functions ---

def preprocess_text(text):
    """
    Cleans text, converts to lowercase, tokenizes, and lemmatizes words 
    to improve model generalization.
    """
    # Convert to lowercase
    text = text.lower()
    
    # Tokenize text (break into words)
    words = nltk.word_tokenize(text)
    
    # Lemmatize each word (reduce to root form: organizing -> organize)
    lemmas = [lemmatizer.lemmatize(w) for w in words]
    
    # Rejoin into a single string
    text = " ".join(lemmas)
    
    # Remove extra whitespace
    text = " ".join(text.split())
    
    return text

def extract_urgency_signals(text):
    """Extract urgency signals from text using tiered rules."""
    text_lower = text.lower()
    urgency_score = 0
    detected_patterns = []
    
    # Process each priority level
    for level, patterns in URGENCY_RULES.items():
        for pattern, weight in patterns:
            if re.search(pattern, text_lower):
                urgency_score += weight
                detected_patterns.append((level, pattern, weight))
    
    # Debug print
    if detected_patterns:
        print("\nDetected urgency patterns:")
        for level, pattern, weight in detected_patterns:
            print(f"- {level}: {pattern} ({weight:+.1f})")
    
    return max(-2, min(urgency_score, 5))

# --- Model Loading and Training (with 70/20/10 Split) ---

print("Loading the scikit-learn model...")
model = None 
try:
    # Load the trained pipeline
    model = joblib.load("models/priority_pipeline.joblib")
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    print("Training new model with ColumnTransformer...")
    try:
        # Load and prepare data
        df = pd.read_csv('../public/data.csv')
        df = df.dropna(subset=['task_description', 'keywords', 'effort_hours', 'is_urgent', 'priority'])
        
        # --- NEW DATA PREP: Keep features separate ---
        X = df[['task_description', 'keywords', 'effort_hours', 'is_urgent']].copy()
        # Convert boolean to numeric (0 or 1) for the model
        X['is_urgent'] = X['is_urgent'].astype(int) 
        y = df['priority']
        
        # Split (70/20/10)
        X_temp, X_val, y_temp, y_val = train_test_split(X, y, test_size=0.1, random_state=42, stratify=y)
        X_train, X_test, y_train, y_test = train_test_split(X_temp, y_temp, test_size=(0.2/0.9), random_state=42, stratify=y_temp)
        
        # --- NEW ML STEP: ColumnTransformer ---
        
        # Combine all preprocessors
        preprocessor = ColumnTransformer(
            transformers=[
                ('text_proc', TfidfVectorizer(preprocessor=preprocess_text), 'task_description'),
                ('keyword_proc', TfidfVectorizer(preprocessor=preprocess_text), 'keywords'),
                ('num_proc', StandardScaler(), ['effort_hours']),
                ('urgent_proc', 'passthrough', ['is_urgent']) # is_urgent is already 0/1
            ],
            remainder='drop' # Drop any other columns
        )

        # Final Pipeline: Preprocessor + Classifier
        model = Pipeline([
            ('preprocessor', preprocessor),
            ('clf', LogisticRegression(max_iter=200))
        ])
        
        # Fit the model
        model.fit(X_train, y_train)
        joblib.dump(model, 'priority_pipeline.joblib')
        print("New model trained and saved successfully with ColumnTransformer!")
            
        # Print some statistics about the dataset
        print("\nDataset Statistics:")
        print(f"Total samples: {len(df)}")
        print("\nPriority distribution:")
        print(y.value_counts(normalize=True).round(3) * 100)
        
        # --- DATA SPLIT (70% Train, 20% Test, 10% Validation) ---
        
        # 1. Split off 10% for Validation
        X_temp, X_val, y_temp, y_val = train_test_split(
            X, y, test_size=0.1, random_state=42, stratify=y
        )
        
        # 2. Split the remaining 90% (X_temp) into 70% Train and 20% Test
        # test_size = 0.2 / 0.9 ≈ 0.2222... of the remaining data
        X_train, X_test, y_train, y_test = train_test_split(
            X_temp, y_temp, test_size=(0.2/0.9), random_state=42, stratify=y_temp
        )
        
        print(f"Dataset split: Train={len(X_train)}, Test={len(X_test)}, Validation={len(X_val)}")

        # --- Training ---

        # Create and train pipeline on the TRAINING set only
        model = Pipeline([
            ('tfidf', TfidfVectorizer()),
            ('clf', LogisticRegression(max_iter=200))
        ])
        
        model.fit(X_train, y_train)
        joblib.dump(model, 'priority_pipeline.joblib')
        print("New model trained and saved successfully!")
    except Exception as train_error:
        print(f"Error training model: {train_error}")
        model = None

def get_priority_level(prediction, confidence, urgency_score):
    """
    Enhanced priority determination with refined rules and better handling of mixed signals
    """
    prediction = prediction.lower()
    print(f"\nInitial state: prediction={prediction}, confidence={confidence:.1f}, urgency_score={urgency_score:.1f}")
    
    # Strong negative signals override - force low priority
    if urgency_score <= -2.0:
        print("Strong negative signals detected - forcing low priority")
        return "low", max(60, min(confidence - 10, 80))
        
    # Handle critical priorities
    if urgency_score >= 3.0 or (("bug" in prediction or "error" in prediction) and "customer" in prediction):
        print("Critical priority criteria met")
        return "critical", min(confidence + 15, 98)
    
    # Handle high priorities
    if urgency_score >= 1.5 or ("bug" in prediction and urgency_score > 0):
        print("High priority criteria met")
        return "high", min(confidence + 10, 90)
    
    # Handle medium priorities
    if urgency_score > 0 or prediction == "medium":
        print("Medium priority criteria met")
        if prediction != "critical" and prediction != "high":
            return "medium", min(confidence + 5, 85)
    
    # Handle low priorities
    if urgency_score <= -1.0 or "documentation" in prediction or prediction == "low":
        print("Low priority criteria met")
        if prediction != "critical" and prediction != "high":
            return "low", min(confidence + 5, 85)
    
    # Document updates with convenience terms should be low priority
    if "update" in prediction and "documentation" in prediction and "whenev" in prediction.lower():
        print("Documentation update with convenience terms detected")
        return "low", min(confidence + 10, 85)
    
    # Default behavior - keep original prediction with slightly lower confidence
    print("Using default prediction")
    return prediction, min(confidence, 75)

# --- Prediction Endpoint (FIXED INPUT) ---

@app.route("/predict", methods=["POST"])
def predict():
    try:
        print("\n" + "="*50)
        print("Received prediction request")
        if model is None:
            print("Error: Model not loaded")
            return jsonify({
                "priority": "medium", "confidence": 60, "urgency_score": 0,
                "base_prediction": "medium", "base_confidence": 60, "fallback": True
            })

        data = request.json
        task_description = data.get("text", "")
        keywords = data.get("keywords", "")
        effort_hours = float(data.get("effort_hours", 0))
        is_urgent_raw = data.get("is_urgent", False)
        
        if not task_description.strip():
            return jsonify({"error": "Empty text provided in 'text' field"}), 400

        # Ensure is_urgent is an integer (0 or 1) for prediction
        is_urgent = 1 if (is_urgent_raw is True or (isinstance(is_urgent_raw, str) and is_urgent_raw.lower() == 'true')) else 0

        # Create a DataFrame for prediction (MUST match training structure)
        input_df = pd.DataFrame({
            'task_description': [task_description],
            'keywords': [keywords],
            'effort_hours': [effort_hours],
            'is_urgent': [is_urgent]
        })
        
        # Get ML model prediction
        prediction = model.predict(input_df)[0]
        prediction_proba = model.predict_proba(input_df)[0]
        base_confidence = float(max(prediction_proba)) * 100
        
        # Get urgency signals from the original task text
        urgency_score = extract_urgency_signals(task_description)
        
        # Determine final priority and confidence
        priority, confidence = get_priority_level(prediction, base_confidence, urgency_score)
        
        # Prepare response
        response = {
            "priority": priority,
            "confidence": round(confidence, 1),
            "urgency_score": round(urgency_score, 1),
            "base_prediction": prediction,
            "base_confidence": round(base_confidence, 1),
            "aiPredicted": True
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({
            "error": str(e),
            "priority": "medium",
            "confidence": 60,
            "urgency_score": 0,
            "base_prediction": "medium", 
            "base_confidence": 60,
            "aiPredicted": False
        }), 500
        
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        # Fallback uses urgency logic on the main text field
        text_lower = data.get("text", "").lower()
        urgency = extract_urgency_signals(text_lower)
        
        if urgency >= 2.5:
            return jsonify({"priority": "critical", "confidence": 75, "urgency_score": urgency, "fallback": True})
        elif urgency >= 1.5:
            return jsonify({"priority": "high", "confidence": 70, "urgency_score": urgency, "fallback": True})
        elif "bug" in text_lower or "fix" in text_lower:
            return jsonify({"priority": "high", "confidence": 65, "urgency_score": urgency, "fallback": True})
        return jsonify({"priority": "medium", "confidence": 60, "urgency_score": urgency, "fallback": True})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)

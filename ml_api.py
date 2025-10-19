from flask import Flask, request, jsonify
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app)

def calculate_priority(text, is_urgent=False, effort_hours=1):
    """Calculate task priority based on simple rules"""
    score = 0
    text = text.lower()
    
    # High priority patterns
    if any(p in text for p in ["urgent", "asap", "emergency", "critical"]):
        score += 2.0
    
    # Medium priority patterns
    if any(p in text for p in ["important", "soon", "this week"]):
        score += 1.0
    
    # Low priority patterns
    if any(p in text for p in ["whenever", "no rush", "can wait"]):
        score -= 1.0
    
    # Adjust based on metadata
    if is_urgent:
        score += 1.5
    if effort_hours > 4:
        score -= 0.5
    elif effort_hours <= 2:
        score += 0.5
    
    # Determine priority level
    if score >= 2.5:
        return "critical", min(90 + score, 98)
    elif score >= 1.5:
        return "high", min(80 + score, 90)
    elif score >= 0:
        return "medium", min(70 + score, 85)
    else:
        return "low", min(60 + abs(score), 80)

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        text = data.get("text", "")
        keywords = data.get("keywords", "")
        effort_hours = float(data.get("effort_hours", 0))
        is_urgent = data.get("is_urgent", False)
        
        # Combine text and keywords
        combined_text = f"{text} {keywords}"
        
        # Calculate priority
        priority, confidence = calculate_priority(
            combined_text,
            is_urgent=is_urgent,
            effort_hours=effort_hours
        )
        
        return jsonify({
            "priority": priority,
            "confidence": confidence,
            "aiPredicted": True
        })
        
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({
            "error": str(e),
            "priority": "medium",
            "confidence": 60,
            "aiPredicted": False
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

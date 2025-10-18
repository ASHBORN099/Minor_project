import pandas as pd
import numpy as np
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
import joblib

def preprocess_text(text):
    """Simple text preprocessing"""
    text = str(text).lower()
    return " ".join(text.split())

print("Loading and preparing data...")
# Load the data
df = pd.read_csv('../public/data.csv')
df = df.dropna(subset=['task_description', 'keywords', 'effort_hours', 'is_urgent', 'priority'])

# Prepare features and target
X = df[['task_description', 'keywords', 'effort_hours', 'is_urgent']].copy()
X['is_urgent'] = X['is_urgent'].astype(int)
y = df['priority']

# Create train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Create preprocessing pipeline
print("\nCreating and training model...")
preprocessor = ColumnTransformer(
    transformers=[
        ('text_proc', TfidfVectorizer(preprocessor=preprocess_text), 'task_description'),
        ('keyword_proc', TfidfVectorizer(preprocessor=preprocess_text), 'keywords'),
        ('num_proc', StandardScaler(), ['effort_hours']),
        ('urgent_proc', 'passthrough', ['is_urgent'])
    ],
    remainder='drop'
)

# Create and train the model
model = Pipeline([
    ('preprocessor', preprocessor),
    ('clf', LogisticRegression(max_iter=1000))
])

# Fit the model
model.fit(X_train, y_train)

# Save the model
print("Saving model...")
joblib.dump(model, '../models/priority_pipeline.joblib')

# Get predictions
y_train_pred = model.predict(X_train)
y_test_pred = model.predict(X_test)

# Calculate accuracy scores
train_score = accuracy_score(y_train, y_train_pred)
test_score = accuracy_score(y_test, y_test_pred)
score_diff = train_score - test_score

print("\nModel Performance Evaluation:")
print("\nTraining Set Performance:")
print(classification_report(y_train, y_train_pred))
print("\nTest Set Performance:")
print(classification_report(y_test, y_test_pred))

print("\nOverall Model Analysis:")
print(f"Training Accuracy: {train_score:.4f}")
print(f"Test Accuracy: {test_score:.4f}")
print(f"Accuracy Difference: {score_diff:.4f}")

# Generate and plot confusion matrices
def plot_confusion_matrix(y_true, y_pred, title):
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['High', 'Low', 'Medium'],
                yticklabels=['High', 'Low', 'Medium'])
    plt.title(f'Confusion Matrix - {title}')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    filename = f'confusion_matrix_{title.lower().replace(" ", "_")}.png'
    plt.savefig(filename)
    plt.close()
    
    # Calculate and print additional metrics
    total = np.sum(cm)
    print(f"\nDetailed Analysis for {title}:")
    classes = ['High', 'Low', 'Medium']
    for i, class_name in enumerate(classes):
        true_pos = cm[i, i]
        false_pos = np.sum(cm[:, i]) - true_pos
        false_neg = np.sum(cm[i, :]) - true_pos
        true_neg = total - (true_pos + false_pos + false_neg)
        
        precision = true_pos / (true_pos + false_pos)
        recall = true_pos / (true_pos + false_neg)
        f1 = 2 * (precision * recall) / (precision + recall)
        
        print(f"\n{class_name} Priority:")
        print(f"True Positives: {true_pos}")
        print(f"False Positives: {false_pos}")
        print(f"False Negatives: {false_neg}")
        print(f"True Negatives: {true_neg}")
        print(f"Precision: {precision:.4f}")
        print(f"Recall: {recall:.4f}")
        print(f"F1-score: {f1:.4f}")

# Generate confusion matrices for both training and test sets
plot_confusion_matrix(y_train, y_train_pred, "Training Set")
plot_confusion_matrix(y_test, y_test_pred, "Test Set")

# Analyze for overfitting/underfitting
if score_diff > 0.1:
    print("\nModel Status: OVERFITTING")
    print("- Training accuracy is significantly higher than test accuracy")
    print("- The model is memorizing training data instead of learning patterns")
    print("\nRecommendations:")
    print("1. Increase regularization in the model")
    print("2. Reduce feature complexity")
    print("3. Gather more diverse training data")
    print("4. Use cross-validation for model selection")
elif test_score < 0.6:
    print("\nModel Status: UNDERFITTING")
    print("- Both training and test accuracy are low")
    print("- The model isn't capturing important patterns in the data")
    print("\nRecommendations:")
    print("1. Decrease regularization")
    print("2. Add more relevant features")
    print("3. Use more complex model architecture")
    print("4. Improve feature engineering")
else:
    print("\nModel Status: WELL BALANCED")
    print("- Training and test accuracy are close and reasonably high")
    print("- The model shows good generalization")
    print("\nRecommendations:")
    print("1. Model is performing well")
    print("2. Monitor performance over time")
    print("3. Collect user feedback")
    print("4. Consider periodic retraining")
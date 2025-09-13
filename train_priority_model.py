import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Load updated CSV
df = pd.read_csv('public/data.csv')

# Drop rows with any NaN values in relevant columns
df = df.dropna(subset=['task_description', 'keywords', 'effort_hours', 'is_urgent', 'priority'])

# Combine all relevant features into a single text string for ML
def preprocess_row(row):
    text = f"{row['task_description']} {row['keywords']} effort:{row['effort_hours']} urgent:{row['is_urgent']}"
    return text

X = df.apply(preprocess_row, axis=1)
y = df['priority']

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Build pipeline: TF-IDF + Logistic Regression
pipeline = Pipeline([
    ('tfidf', TfidfVectorizer()),
    ('clf', LogisticRegression(max_iter=200))
])

# Train
pipeline.fit(X_train, y_train)

# Evaluate
y_pred = pipeline.predict(X_test)
print("Scikit-learn Model Results:")
print(classification_report(y_test, y_pred))
print("Accuracy:", pipeline.score(X_test, y_test))

# Predict new task (all features as string)
def predict_priority(task_description, keywords="", effort_hours=1, is_urgent=0):
    text = f"{task_description} {keywords} effort:{effort_hours} urgent:{is_urgent}"
    pred = pipeline.predict([text])[0]
    conf = max(pipeline.predict_proba([text])[0])
    return {"priority": pred, "confidence": round(conf * 100)}

# Example usage
print(predict_priority("Submit assignment before deadline", "assignment,deadline", 2, 1))

# --- TensorFlow/Keras Model ---
import numpy as np
from sklearn.preprocessing import LabelEncoder
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Embedding, GlobalAveragePooling1D
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences

# Prepare combined text for TensorFlow
texts = X.values
labels = y.values
label_encoder = LabelEncoder()
labels_encoded = label_encoder.fit_transform(labels)
max_words = 1000
max_len = 30
tokenizer = Tokenizer(num_words=max_words, oov_token="<OOV>")
tokenizer.fit_on_texts(texts)
sequences = tokenizer.texts_to_sequences(texts)
X_seq = pad_sequences(sequences, maxlen=max_len)

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X_seq, labels_encoded, test_size=0.2, random_state=42)

# Build model
model = Sequential([
    Embedding(max_words, 32),
    GlobalAveragePooling1D(),
    Dense(32, activation='relu'),
    Dense(len(label_encoder.classes_), activation='softmax')
])
model.compile(loss='sparse_categorical_crossentropy', optimizer='adam', metrics=['accuracy'])

# Train
model.fit(X_train, y_train, epochs=10, validation_data=(X_test, y_test))

# Evaluate TensorFlow model
loss, accuracy = model.evaluate(X_test, y_test)
print("TensorFlow Model Accuracy:", accuracy)

# Predict function (all features as string)
def tf_predict_priority(task_description, keywords="", effort_hours=1, is_urgent=0):
    text = f"{task_description} {keywords} effort:{effort_hours} urgent:{is_urgent}"
    seq = tokenizer.texts_to_sequences([text])
    padded = pad_sequences(seq, maxlen=max_len)
    pred = model.predict(padded)
    idx = np.argmax(pred)
    priority = label_encoder.inverse_transform([idx])[0]
    confidence = round(float(np.max(pred)) * 100)
    return {"priority": priority, "confidence": confidence}

# Example usage
print(tf_predict_priority("Submit assignment before deadline", "assignment,deadline", 2, 1))

import joblib
import pickle

# Save scikit-learn pipeline
joblib.dump(pipeline, 'priority_pipeline.joblib')

# Save TensorFlow model
model.save('priority_tf_model.keras')

# Save tokenizer and label encoder
with open('tokenizer.pkl', 'wb') as f:
    pickle.dump(tokenizer, f)
with open('label_encoder.pkl', 'wb') as f:
    pickle.dump(label_encoder, f)
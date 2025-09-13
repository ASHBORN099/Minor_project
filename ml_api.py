from flask import Flask, request, jsonify
import joblib
import tensorflow as tf
import pickle
import numpy as np
from tensorflow.keras.preprocessing.sequence import pad_sequences

app = Flask(__name__)

pipeline = joblib.load('priority_pipeline.joblib')
tf_model = tf.keras.models.load_model('priority_tf_model.h5')
with open('tokenizer.pkl', 'rb') as f:
    tokenizer = pickle.load(f)
with open('label_encoder.pkl', 'rb') as f:
    label_encoder = pickle.load(f)
max_len = 30

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    # Accept keys as sent by backend
    text = f"{data.get('text','')} {data.get('keywords','')} effort:{data.get('effort_hours',1)} urgent:{data.get('is_urgent',0)}"
    seq = tokenizer.texts_to_sequences([text])
    padded = pad_sequences(seq, maxlen=max_len)
    tf_pred_probs = tf_model.predict(padded)
    idx = np.argmax(tf_pred_probs)
    tf_pred = label_encoder.inverse_transform([idx])[0]
    tf_conf = float(np.max(tf_pred_probs))
    return jsonify({
        "priority": tf_pred,
        "confidence": round(tf_conf * 100)
    })

if __name__ == '__main__':
    app.run(port=5000)
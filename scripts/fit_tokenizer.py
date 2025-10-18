from tensorflow.keras.preprocessing.text import Tokenizer
import pickle

# Sample training data
sample_texts = [
    "Urgent meeting with client",
    "Complete project deadline tomorrow",
    "Review documents when possible",
    "Schedule team meeting next week",
    "Submit report by end of day",
    "Clean desk someday",
    "ASAP: Send presentation to boss",
    "Maybe organize files later",
    "Call customer immediately",
    "Update website content",
    "Prepare for interview tomorrow",
    "Check emails whenever possible",
    "Important: Follow up with team",
    "Buy groceries this weekend",
    "Finish the urgent task now"
]

# Initialize and fit the tokenizer
tokenizer = Tokenizer(num_words=10000)
tokenizer.fit_on_texts(sample_texts)

# Save the tokenizer
with open('tokenizer.pickle', 'wb') as handle:
    pickle.dump(tokenizer, handle, protocol=pickle.HIGHEST_PROTOCOL)

print("Tokenizer fitted and saved successfully!")
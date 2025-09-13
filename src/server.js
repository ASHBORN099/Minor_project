
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, '../public')));

let tasks = [];

app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
  const task = req.body;
  try {
    // Call ML API for priority prediction
    const mlRes = await axios.post('http://localhost:5000/predict', {
      text: task.text,
      keywords: task.keywords,
      effort_hours: task.effort_hours,
      is_urgent: task.is_urgent
    });
    const { priority, confidence } = mlRes.data;
    // Assign a unique id
    task.id = Date.now() + Math.floor(Math.random() * 10000);
    task.priority = priority;
    task.confidence = confidence;
    task.aiPredicted = true;
    task.completed = false;
    tasks.push(task);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: 'ML API error', details: err.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  tasks = tasks.filter(task => task.id !== id);
  res.status(204).end();
});

app.put('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const updatedTask = req.body;
  tasks = tasks.map(task => (task.id === id ? updatedTask : task));
  res.json(updatedTask);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
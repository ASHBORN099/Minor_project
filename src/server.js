const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3001;
const tasks = [];

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/tasks", (req, res) => {
    res.json(tasks);
});

app.post("/api/tasks", (req, res) => {
    try {
        const task = {
            id: Date.now(),
            text: req.body.text,
            keywords: req.body.keywords || "",
            effort_hours: Number(req.body.effort_hours) || 1,
            is_urgent: Boolean(req.body.is_urgent),
            priority: req.body.priority || "medium",
            confidence: req.body.confidence || 0,
            urgencyScore: req.body.urgencyScore || 0,
            basePrediction: req.body.basePrediction || req.body.priority,
            baseConfidence: req.body.baseConfidence || 0,
            aiPredicted: Boolean(req.body.aiPredicted),
            completed: false,
            created_at: new Date().toISOString()
        };
        tasks.push(task);
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete("/api/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = tasks.findIndex(task => task.id === id);
    if (index !== -1) {
        tasks.splice(index, 1);
        res.status(204).send();
    } else {
        res.status(404).json({ error: "Task not found" });
    }
});

app.put("/api/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = tasks.findIndex(task => task.id === id);
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...req.body };
        res.json(tasks[index]);
    } else {
        res.status(404).json({ error: "Task not found" });
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
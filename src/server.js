const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

// Error handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;
const tasks = [];

// Basic error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.use(cors());
app.use(bodyParser.json());

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Static files being served from: ${path.join(__dirname, "../public")}`);
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get("/api/tasks", (req, res) => {
    res.json(tasks);
});

app.post("/api/tasks", (req, res) => {
    try {
        // Calculate priority based on effort and urgency
        let calculatedPriority = "medium";
        const effort = Number(req.body.effort_hours) || 1;
        const isUrgent = Boolean(req.body.is_urgent);
        const keywords = (req.body.keywords || "").toLowerCase();
        
        // Priority calculation rules
        if (isUrgent) {
            if (effort <= 2 || keywords.includes("deadline") || keywords.includes("due") || keywords.includes("submit")) {
                calculatedPriority = "critical";
            } else {
                calculatedPriority = "high";
            }
        } else {
            if (effort > 4 || keywords.includes("organize") || keywords.includes("later")) {
                calculatedPriority = "low";
            } else if (effort <= 2 && (keywords.includes("important") || keywords.includes("soon"))) {
                calculatedPriority = "high";
            }
        }

        const task = {
            id: Date.now(),
            text: req.body.text,
            keywords: req.body.keywords || "",
            effort_hours: effort,
            is_urgent: isUrgent,
            priority: calculatedPriority,
            confidence: 0.8,
            urgencyScore: isUrgent ? 0.9 : 0.3,
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
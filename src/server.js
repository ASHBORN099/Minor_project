const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const axios = require("axios");

// Error handling
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

const app = express();
const PORT = process.env.PORT || 3000;
const ML_API_URL = process.env.ML_API_URL || "http://localhost:5000";
const tasks = [];
let nextTaskId = 1;

// Basic error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
});

// Configure CORS
app.use(cors({
    origin: '*',  // Allow all origins for now
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(bodyParser.json());

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// API Routes
app.get("/api/tasks", (req, res) => {
    console.log("GET /api/tasks - Returning tasks:", tasks);
    res.json(tasks);
});

app.post("/api/tasks", async (req, res) => {
    try {
        const effort = Number(req.body.effort_hours) || 1;
        const isUrgent = Boolean(req.body.is_urgent);
        const keywords = (req.body.keywords || "").toLowerCase();
        
        console.log("POST /api/tasks - Received request:", {
            text: req.body.text,
            keywords,
            effort,
            isUrgent
        });

        // Call ML API for priority prediction
        try {
            const mlResponse = await axios.post(`${ML_API_URL}/predict`, {
                text: req.body.text,
                keywords: keywords,
                effort_hours: effort,
                is_urgent: isUrgent
            });
            
            console.log("ML API Response:", mlResponse.data);

            const task = {
                id: nextTaskId++,
                text: req.body.text,
                keywords: keywords,
                effort_hours: effort,
                is_urgent: isUrgent,
                priority: mlResponse.data.priority,
                confidence: mlResponse.data.confidence || 0.8,
                urgencyScore: mlResponse.data.urgency_score || (isUrgent ? 0.9 : 0.3),
                aiPredicted: true,
                completed: false,
                created_at: new Date().toISOString()
            };
            tasks.push(task);
            console.log("Task added successfully:", task);
            res.status(201).json(task);
        } catch (mlError) {
            console.error("ML API Error:", mlError.message);
            // Fallback to rule-based priority if ML API fails
            let calculatedPriority = "medium";
            
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
                id: nextTaskId++,
                text: req.body.text,
                keywords: keywords,
                effort_hours: effort,
                is_urgent: isUrgent,
                priority: calculatedPriority,
                confidence: 0.6,
                urgencyScore: isUrgent ? 0.9 : 0.3,
                aiPredicted: false,
                completed: false,
                created_at: new Date().toISOString()
            };
            tasks.push(task);
            console.log("Task added with fallback priority:", task);
            res.status(201).json(task);
        }
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.delete("/api/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = tasks.findIndex(task => task.id === id);
    if (index !== -1) {
        const deletedTask = tasks.splice(index, 1)[0];
        console.log("Task deleted:", deletedTask);
        res.status(204).send();
    } else {
        console.log("Task not found for deletion:", id);
        res.status(404).json({ error: "Task not found" });
    }
});

app.put("/api/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = tasks.findIndex(task => task.id === id);
    if (index !== -1) {
        const updatedTask = { ...tasks[index], ...req.body };
        tasks[index] = updatedTask;
        console.log("Task updated:", updatedTask);
        res.json(updatedTask);
    } else {
        console.log("Task not found for update:", id);
        res.status(404).json({ error: "Task not found" });
    }
});

// Serve index.html for root path
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Static files being served from: ${path.join(__dirname, "../public")}`);
});

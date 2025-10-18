let tasks = [];
let currentFilter = 'all';
const API_URL = '/api/tasks';

// Fetch tasks when page loads
async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        if (response.ok) {
            tasks = await response.json();
            renderTasks();
            updateStats();
        }
    } catch (err) {
        console.error('Failed to fetch tasks:', err);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();
});

// AI Priority Prediction Model
async function predictPriority(taskText, keywords, effort_hours, is_urgent) {
    try {
        // Robust type conversion for the payload
        let parsedEffort = 0.0;
        if (effort_hours !== undefined && effort_hours !== "") {
            parsedEffort = parseFloat(effort_hours);
            if (isNaN(parsedEffort) || parsedEffort < 0) {
                console.warn('Invalid effort hours value, defaulting to 0');
                parsedEffort = 0.0;
            }
        }
        
        const payload = {
            text: String(taskText || "").trim(),
            keywords: String(keywords || "").trim(),
            effort_hours: parsedEffort,
            is_urgent: Boolean(is_urgent)
        };
        
        console.log('Sending prediction request with payload:', {
            ...payload,
            effort_hours_type: typeof payload.effort_hours,
            is_urgent_type: typeof payload.is_urgent
        });
        
        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error('Failed to get prediction');
        }
        
        const result = await response.json();
        return {
            priority: result.priority,
            confidence: result.confidence,
            urgencyScore: result.urgency_score,
            basePrediction: result.base_prediction,
            baseConfidence: result.base_confidence,
            fallback: result.fallback || false
        };
    } catch (error) {
        console.error('Error predicting priority:', error);
        // Enhanced fallback logic
        const urgencyPatterns = [
            /urgent|asap|emergency|critical/i,
            /deadline.*?today|due.*?today/i,
            /high.*?priority|priority.*?1/i,
            /\b(now|immediately|tonight)\b/i
        ];
        
        const urgencyScore = urgencyPatterns.reduce((score, pattern) => 
            score + (pattern.test(taskText) ? 1 : 0), 0);
            
        if (urgencyScore >= 2) {
            return { priority: 'critical', confidence: 75, fallback: true };
        } else if (urgencyScore === 1) {
            return { priority: 'high', confidence: 70, fallback: true };
        } else if (/whenever|someday|maybe|if time/i.test(taskText)) {
            return { priority: 'low', confidence: 65, fallback: true };
        }
        return { priority: 'medium', confidence: 60, fallback: true };
    }
}

async function addTask() {
    console.log('Add task function called');
    const taskInput = document.getElementById('taskInput');
    const keywordsInput = document.getElementById('keywordsInput');
    const effortInput = document.getElementById('effortInput');
    const urgentInput = document.getElementById('urgentInput');

    const taskText = taskInput.value.trim();
    const keywords = keywordsInput.value.trim();
    
    // Robust effort hours parsing
    let effort_hours = 1.0; // Default value
    if (effortInput.value.trim() !== "") {
        const parsed = parseFloat(effortInput.value);
        if (!isNaN(parsed) && parsed >= 0) {
            effort_hours = parsed;
        } else {
            console.warn('Invalid effort hours input, using default value 1.0');
        }
    }
    
    const is_urgent = Boolean(urgentInput.checked);
    
    console.log('Task input values:', { 
        taskText, 
        keywords, 
        effort_hours,
        effort_hours_type: typeof effort_hours,
        is_urgent,
        is_urgent_type: typeof is_urgent
    });

    if (taskText === '') {
        alert('Please enter a task!');
        return;
    }

    // Get AI prediction first with all task information
    const prediction = await predictPriority(taskText, keywords, effort_hours, is_urgent);

    const task = {
        text: taskText,
        keywords,
        effort_hours,
        is_urgent,
        priority: prediction.priority,
        confidence: prediction.confidence,
        urgencyScore: prediction.urgencyScore,
        basePrediction: prediction.basePrediction,
        baseConfidence: prediction.baseConfidence,
        aiPredicted: true,
        completed: false
    };
    // Add fallback priority if ML API failed
    if (!task.priority) {
        console.log('Using fallback priority logic');
        if (task.is_urgent) {
            task.priority = 'high';
            task.confidence = 70;
        } else {
            task.priority = 'medium';
            task.confidence = 60;
        }
        task.aiPredicted = false;
    }

    try {
        console.log('Sending task to server:', task);
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(task)
        });
        console.log('Server response status:', res.status);
        const responseData = await res.json();
        console.log('Server response data:', responseData);
        
        if (res.ok) {
            console.log('Task added successfully');
            taskInput.value = '';
            keywordsInput.value = '';
            effortInput.value = 1;
            urgentInput.checked = false;
            await fetchTasks();
        } else {
            console.error('Server returned error:', responseData);
            alert('Failed to add task: ' + (responseData.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Failed to add task. Backend may not be running.');
    }
}

async function deleteTask(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            tasks = tasks.filter(task => task.id !== id);
            renderTasks();
            updateStats();
        }
    } catch (err) {
        alert('Failed to delete task.');
    }
}

async function toggleTask(id) {
    const task = tasks.find(task => task.id === id);
    if (task) {
        task.completed = !task.completed;
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            if (res.ok) {
                renderTasks();
                updateStats();
            }
        } catch (err) {
            alert('Failed to update task.');
        }
    }
}

function filterTasks(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    renderTasks();
}

function renderTasks() {
    console.log('Rendering tasks. Current tasks:', tasks);
    const container = document.getElementById('tasksContainer');
    if (!container) {
        console.error('Tasks container not found!');
        return;
    }
    let filteredTasks = tasks;
    if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    } else if (currentFilter !== 'all') {
        filteredTasks = tasks.filter(task => task.priority === currentFilter && !task.completed);
    }
    console.log('Filtered tasks:', filteredTasks);
    if (filteredTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>${currentFilter === 'all' ? 'No tasks yet!' : `No ${currentFilter} priority tasks!`}</h3>
                <p>${currentFilter === 'all' ? 'Add your first task above and watch the AI predict its priority.' : 'Try a different filter or add more tasks.'}</p>
            </div>
        `;
        return;
    }
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
            container.innerHTML = filteredTasks.map(task => {
                const confidenceClass = task.confidence >= 85 ? 'high' : task.confidence >= 70 ? 'medium' : 'low';
                const priorityClass = task.priority === 'critical' ? 'critical' : 
                                    task.priority === 'high' ? 'high' :
                                    task.priority === 'medium' ? 'medium' : 'low';
                return `
                    <div class="task-item ${priorityClass} ${task.completed ? 'completed' : ''}">
                        <div class="task-content">
                            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
                            <span class="task-text">${task.text}</span>
                            ${task.keywords ? `<span class="task-keywords">🔑 ${task.keywords}</span>` : ''}
                            <span class="task-effort">⏱️ ${task.effort_hours}h</span>
                            ${task.is_urgent ? `<span class="task-urgent">⚡ Urgent</span>` : ''}
                            ${task.aiPredicted ? `
                                <div class="ai-prediction-info">
                                    <span class="ai-badge" title="AI Predicted">🤖</span>
                                    ${task.urgencyScore ? `<span class="urgency-score" title="Urgency Score">🔥 ${task.urgencyScore}</span>` : ''}
                                    ${task.basePrediction !== task.priority ? 
                                        `<span class="base-prediction" title="Initial AI Prediction">📊 ${task.basePrediction} (${task.baseConfidence.toFixed(1)}%)</span>` 
                                        : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div class="task-actions">
                            <span class="task-priority ${task.priority}">${task.priority}</span>
                            <span class="confidence-indicator ${confidenceClass}" title="AI Confidence: ${task.confidence}%"></span>
                            <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
}

function updateStats() {
    const activeTasks = tasks.filter(task => !task.completed);
    const criticalPriority = activeTasks.filter(task => task.priority === 'critical').length;
    const highPriority = activeTasks.filter(task => task.priority === 'high').length;
    const mediumPriority = activeTasks.filter(task => task.priority === 'medium').length;
    const lowPriority = activeTasks.filter(task => task.priority === 'low').length;
    
    document.getElementById('criticalPriorityCount').textContent = criticalPriority;
    document.getElementById('highPriorityCount').textContent = highPriority;
    document.getElementById('mediumPriorityCount').textContent = mediumPriority;
    document.getElementById('lowPriorityCount').textContent = lowPriority;
    document.getElementById('totalTasks').textContent = activeTasks.length;
}

document.getElementById('taskInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Fetch tasks from backend
async function fetchTasks() {
    try {
        const res = await fetch(API_URL);
        if (res.ok) {
            tasks = await res.json();
            renderTasks();
            updateStats();
        }
    } catch (err) {
        // fallback: show empty state
        tasks = [];
        renderTasks();
        updateStats();
    }
}

// Initialize the app
fetchTasks();

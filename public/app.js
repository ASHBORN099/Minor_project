let tasks = [];
let currentFilter = 'all';
const API_URL = '/api/tasks';

// AI Priority Prediction Model
function predictPriority(taskText) {
    const text = taskText.toLowerCase();
    // ...existing code from your provided HTML <script> block...
    // High priority keywords and patterns
    const urgentKeywords = ['urgent', 'asap', 'deadline', 'emergency', 'critical', 'important', 'meeting', 'call', 'interview', 'presentation', 'due', 'submit', 'send', 'finish', 'complete', 'project'];
    const timeKeywords = ['today', 'tomorrow', 'tonight', 'morning', 'afternoon', 'evening', 'soon', 'immediately', 'now'];
    const workKeywords = ['work', 'job', 'boss', 'client', 'customer', 'report', 'proposal', 'contract', 'budget'];
    // Medium priority keywords
    const mediumKeywords = ['plan', 'schedule', 'organize', 'prepare', 'review', 'check', 'update', 'research', 'learn', 'study'];
    const healthKeywords = ['doctor', 'appointment', 'health', 'exercise', 'gym', 'medication'];
    // Low priority keywords
    const lowKeywords = ['maybe', 'eventually', 'someday', 'when possible', 'if time', 'leisure', 'hobby', 'fun', 'entertainment'];
    const personalKeywords = ['clean', 'organize', 'tidy', 'shopping', 'groceries', 'laundry'];
    let priority = 'medium';
    let confidence = 0.5;
    let score = 0;
    if (urgentKeywords.some(keyword => text.includes(keyword))) score += 3;
    if (timeKeywords.some(keyword => text.includes(keyword))) score += 2;
    if (workKeywords.some(keyword => text.includes(keyword))) score += 2;
    if (healthKeywords.some(keyword => text.includes(keyword))) score += 2;
    if (taskText.includes('!')) score += 1;
    if (taskText === taskText.toUpperCase() && taskText.length > 3) score += 2;
    if (text.match(/\b(by|before|until)\b/)) score += 2;
    if (text.match(/\d+:\d+/)) score += 1;
    if (text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/)) score += 1;
    if (lowKeywords.some(keyword => text.includes(keyword))) score -= 2;
    if (personalKeywords.some(keyword => text.includes(keyword))) score -= 1;
    if (text.length < 20) score += 0.5;
    if (text.length > 100) score -= 0.5;
    if (score >= 4) {
        priority = 'high';
        confidence = Math.min(0.9, 0.6 + (score - 4) * 0.1);
    } else if (score >= 2) {
        priority = 'medium';
        confidence = 0.7;
    } else if (score <= 0) {
        priority = 'low';
        confidence = Math.max(0.6, 0.8 - Math.abs(score) * 0.1);
    } else {
        priority = 'medium';
        confidence = 0.6;
    }
    return { priority, confidence: Math.round(confidence * 100) };
}

async function addTask() {
    const taskInput = document.getElementById('taskInput');
    const keywordsInput = document.getElementById('keywordsInput');
    const effortInput = document.getElementById('effortInput');
    const urgentInput = document.getElementById('urgentInput');

    const taskText = taskInput.value.trim();
    const keywords = keywordsInput.value.trim();
    const effort_hours = Number(effortInput.value) || 1;
    const is_urgent = urgentInput.checked ? 1 : 0;

    if (taskText === '') {
        alert('Please enter a task!');
        return;
    }

    const task = {
        text: taskText,
        keywords,
        effort_hours,
        is_urgent
    };
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        if (res.ok) {
            taskInput.value = '';
            keywordsInput.value = '';
            effortInput.value = 1;
            urgentInput.checked = false;
            fetchTasks();
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
    const container = document.getElementById('tasksContainer');
    let filteredTasks = tasks;
    if (currentFilter !== 'all') {
        filteredTasks = tasks.filter(task => task.priority === currentFilter);
    }
    const notCompletedTasks = filteredTasks.filter(task => !task.completed);
    const completedTasks = filteredTasks.filter(task => task.completed);

    let html = '';
    // Not completed tasks list
    html += `<div class="task-list-section">
        <h3>Not Completed Tasks</h3>`;
    if (notCompletedTasks.length === 0) {
        html += `<div class="empty-state"><p>No not completed tasks.</p></div>`;
    } else {
        html += notCompletedTasks.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }).map(task => {
            const confidenceClass = task.confidence >= 80 ? 'high' : task.confidence >= 60 ? 'medium' : 'low';
            return `
                <div class="task-item ${task.priority}">
                    <div class="task-content">
                        <input type="checkbox" class="task-checkbox" onchange="toggleTask(${task.id})">
                        <span class="task-text">${task.text}</span>
                        ${task.keywords ? `<span class="task-keywords">🔑 ${task.keywords}</span>` : ''}
                        <span class="task-effort">⏱️ ${task.effort_hours}h</span>
                        ${task.is_urgent ? `<span class="task-urgent">⚡ Urgent</span>` : ''}
                        ${task.aiPredicted ? '<span class="ai-badge">AI</span>' : ''}
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
    html += `</div>`;

    // Completed tasks list
    html += `<div class="task-list-section">
        <h3>Completed Tasks</h3>`;
    if (completedTasks.length === 0) {
        html += `<div class="empty-state"><p>No completed tasks.</p></div>`;
    } else {
        html += completedTasks.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }).map(task => {
            const confidenceClass = task.confidence >= 80 ? 'high' : task.confidence >= 60 ? 'medium' : 'low';
            return `
                <div class="task-item ${task.priority} completed">
                    <div class="task-content">
                        <input type="checkbox" class="task-checkbox" checked onchange="toggleTask(${task.id})">
                        <span class="task-text">${task.text}</span>
                        ${task.keywords ? `<span class="task-keywords">🔑 ${task.keywords}</span>` : ''}
                        <span class="task-effort">⏱️ ${task.effort_hours}h</span>
                        ${task.is_urgent ? `<span class="task-urgent">⚡ Urgent</span>` : ''}
                        ${task.aiPredicted ? '<span class="ai-badge">AI</span>' : ''}
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
    html += `</div>`;

    container.innerHTML = html;
}

function updateStats() {
    const activeTasks = tasks.filter(task => !task.completed);
    const highPriority = activeTasks.filter(task => task.priority === 'high').length;
    const mediumPriority = activeTasks.filter(task => task.priority === 'medium').length;
    const lowPriority = activeTasks.filter(task => task.priority === 'low').length;
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

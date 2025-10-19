// API Configuration
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://todo-backend-q75s.onrender.com';

// DOM Elements
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const effortInput = document.getElementById('effortHours');
const keywordsInput = document.getElementById('keywords');
const urgentCheckbox = document.getElementById('isUrgent');
const taskList = document.getElementById('taskList');
const errorContainer = document.getElementById('errorContainer');

// Show error message
function showError(message) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
}

// Clear error message
function clearError() {
    errorContainer.style.display = 'none';
}

// Priority colors
const priorityColors = {
    critical: '#ff4444',
    high: '#ffaa33',
    medium: '#33aa33',
    low: '#3333aa'
};

// Create task element
function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.priority.toLowerCase()}`;
    li.dataset.id = task.id;
    
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    
    // Task text with keywords
    const textDiv = document.createElement('div');
    textDiv.className = 'task-text';
    textDiv.textContent = task.text;
    if (task.keywords) {
        const keywordsSpan = document.createElement('span');
        keywordsSpan.className = 'task-keywords';
        keywordsSpan.textContent = ` [${task.keywords}]`;
        textDiv.appendChild(keywordsSpan);
    }
    
    // Task details
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'task-details';
    detailsDiv.innerHTML = `
        <span class="priority-badge ${task.priority.toLowerCase()}">${task.priority}</span>
        <span class="effort-badge">${task.effort_hours}h</span>
        ${task.is_urgent ? '<span class="urgent-badge">URGENT</span>' : ''}
        ${task.aiPredicted ? '<span class="ai-badge">AI</span>' : ''}
    `;
    
    // Complete checkbox
    const completeLabel = document.createElement('label');
    completeLabel.className = 'complete-label';
    const completeCheckbox = document.createElement('input');
    completeCheckbox.type = 'checkbox';
    completeCheckbox.checked = task.completed;
    completeCheckbox.onchange = () => toggleTaskComplete(task.id, completeCheckbox.checked);
    const checkmark = document.createElement('span');
    checkmark.className = 'checkmark';
    completeLabel.appendChild(completeCheckbox);
    completeLabel.appendChild(checkmark);
    
    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerHTML = "×";
    deleteBtn.onclick = () => deleteTask(task.id);
    
    // Assemble task item
    taskContent.appendChild(textDiv);
    taskContent.appendChild(detailsDiv);
    li.appendChild(completeLabel);
    li.appendChild(taskContent);
    li.appendChild(deleteBtn);
    
    if (task.completed) {
        li.classList.add('completed');
    }
    
    return li;
}

// Fetch all tasks
async function fetchTasks() {
    try {
        console.log('Fetching tasks...');
        const response = await fetch(`${API_URL}/api/tasks`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const tasks = await response.json();
        console.log('Fetched tasks:', tasks);
        renderTasks(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        showError('Failed to load tasks. Please try again.');
    }
}

// Update priority counts
function updatePriorityCounts(tasks) {
    // Reset counts
    const counts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: tasks.length
    };
    
    // Count tasks by priority
    tasks.forEach(task => {
        if (!task.completed) {
            counts[task.priority.toLowerCase()]++;
        }
    });
    
    // Update the display
    document.getElementById('criticalPriorityCount').textContent = counts.critical;
    document.getElementById('highPriorityCount').textContent = counts.high;
    document.getElementById('mediumPriorityCount').textContent = counts.medium;
    document.getElementById('lowPriorityCount').textContent = counts.low;
    document.getElementById('totalTasks').textContent = counts.total;
}

// Render tasks
function renderTasks(tasks) {
    console.log('Rendering tasks:', tasks);
    taskList.innerHTML = '';
    
    if (!tasks || tasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <h3>No tasks yet!</h3>
                <p>Add your first task above and watch the AI predict its priority.</p>
            </div>
        `;
        updatePriorityCounts([]);
        return;
    }
    
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed === b.completed) {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority.toLowerCase()] - priorityOrder[b.priority.toLowerCase()];
        }
        return a.completed ? 1 : -1;
    });
    
    sortedTasks.forEach(task => {
        taskList.appendChild(createTaskElement(task));
    });
    
    // Update priority counts
    updatePriorityCounts(tasks);
}

// Add new task
async function addTask(event) {
    event.preventDefault();
    clearError();
    
    const taskData = {
        text: taskInput.value.trim(),
        effort_hours: parseFloat(effortInput.value) || 1,
        keywords: keywordsInput.value.trim(),
        is_urgent: urgentCheckbox.checked
    };
    
    if (!taskData.text) {
        showError('Please enter a task description');
        return;
    }
    
    try {
        console.log('Adding task:', taskData);
        const response = await fetch(`${API_URL}/api/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Refresh the task list
        fetchTasks();
        
        // Clear form
        taskForm.reset();
        
    } catch (error) {
        console.error('Error adding task:', error);
        showError('Failed to add task. Please try again.');
    }
}

// Delete task
async function deleteTask(id) {
    try {
        console.log("Deleting task:", id);
        const response = await fetch(`${API_URL}/api/tasks/${id}`, {
            method: "DELETE"
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Refresh tasks after deletion
        fetchTasks();
        
    } catch (error) {
        console.error('Error deleting task:', error);
        showError('Failed to delete task. Please try again.');
    }
}

// Toggle task complete status
async function toggleTaskComplete(id, completed) {
    try {
        console.log("Updating task completion:", id, completed);
        const response = await fetch(`${API_URL}/api/tasks/${id}`, {
            method: "PUT",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Refresh tasks to ensure correct ordering
        fetchTasks();
        
    } catch (error) {
        console.error('Error updating task:', error);
        showError('Failed to update task. Please try again.');
    }
}

// Filter tasks
function filterTasks(filter) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="filterTasks('${filter}')"]`).classList.add('active');
    
    const tasks = document.querySelectorAll('.task-item');
    tasks.forEach(task => {
        const shouldShow = filter === 'all' ||
            (filter === 'completed' && task.classList.contains('completed')) ||
            (!task.classList.contains('completed') && task.classList.contains(filter));
        task.style.display = shouldShow ? 'flex' : 'none';
    });
}

// Event Listeners
taskForm.addEventListener('submit', addTask);

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, fetching tasks...');
    fetchTasks();
});

// Fetch tasks periodically
setInterval(fetchTasks, 30000);  // Refresh every 30 seconds

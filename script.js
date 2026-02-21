// script.js

/**
 * Task Model
 * Represents a single task object.
 */
class Task {
    constructor(title, description, status, priority, dueDate) {
        this.id = Date.now().toString(); // Unique ID based on timestamp
        this.title = title;
        this.description = description;
        this.status = status; // 'todo', 'inprogress', 'completed'
        this.priority = priority; // 'low', 'medium', 'high'
        this.dueDate = dueDate;
        this.createdAt = new Date().toISOString();
    }
}

/**
 * TaskManager Class
 * Handles Data Logic: CRUD operations and LocalStorage persistence.
 */
class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
    }

    // Load tasks from LocalStorage
    loadTasks() {
        const tasks = localStorage.getItem('tasks');
        return tasks ? JSON.parse(tasks) : [];
    }

    // Save tasks to LocalStorage
    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    // Add a new task
    addTask(task) {
        this.tasks.push(task);
        this.saveTasks();
    }

    // Update an existing task
    updateTask(updatedTask) {
        const index = this.tasks.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
            this.tasks[index] = updatedTask;
            this.saveTasks();
        }
    }

    // Delete a task by ID
    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
    }

    // Get a task by ID
    getTask(id) {
        return this.tasks.find(t => t.id === id);
    }

    // Get all tasks (optionally filtered by a search term)
    getAllTasks(searchTerm = '') {
        if (!searchTerm) return this.tasks;
        const lowerTerm = searchTerm.toLowerCase();
        return this.tasks.filter(t =>
            t.title.toLowerCase().includes(lowerTerm) ||
            t.description.toLowerCase().includes(lowerTerm)
        );
    }
}

/**
 * UIManager Class
 * Handles DOM Rendering Logic and UI interactions.
 */
class UIManager {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.currentTaskId = null; // To track if we are editing or adding

        // DOM Elements
        this.todoList = document.getElementById('todo-list');
        this.inprogressList = document.getElementById('inprogress-list');
        this.completedList = document.getElementById('completed-list');

        this.todoCount = document.getElementById('todo-count');
        this.inprogressCount = document.getElementById('inprogress-count');
        this.completedCount = document.getElementById('completed-count');

        this.taskForm = document.getElementById('taskForm');
        this.taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
        this.searchInput = document.getElementById('searchInput');
        this.darkModeToggle = document.getElementById('darkModeToggle');

        // Initialize
        this.init();
    }

    init() {
        this.renderTasks();
        this.setupEventListeners();
        this.checkTheme();
    }

    // Render all tasks to the DOM
    renderTasks() {
        // Clear current lists
        this.todoList.innerHTML = '';
        this.inprogressList.innerHTML = '';
        this.completedList.innerHTML = '';

        const searchTerm = this.searchInput.value;
        const tasks = this.taskManager.getAllTasks(searchTerm);

        let counts = { todo: 0, inprogress: 0, completed: 0 };

        tasks.forEach(task => {
            const taskCard = this.createTaskCard(task);
            if (task.status === 'todo') {
                this.todoList.appendChild(taskCard);
                counts.todo++;
            } else if (task.status === 'inprogress') {
                this.inprogressList.appendChild(taskCard);
                counts.inprogress++;
            } else if (task.status === 'completed') {
                this.completedList.appendChild(taskCard);
                counts.completed++;
            }
        });

        // Update counts
        this.todoCount.textContent = counts.todo;
        this.inprogressCount.textContent = counts.inprogress;
        this.completedCount.textContent = counts.completed;
    }

    // Create HTML for a single task card
    createTaskCard(task) {
        const div = document.createElement('div');
        div.className = `card mb-3 task-card priority-${task.priority}`;
        div.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title fw-bold mb-0">${this.escapeHtml(task.title)}</h5>
                    <div class="dropdown">
                        <button class="btn btn-link text-dark p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item edit-btn" href="#" data-id="${task.id}"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                            <li><a class="dropdown-item text-danger delete-btn" href="#" data-id="${task.id}"><i class="bi bi-trash me-2"></i>Delete</a></li>
                        </ul>
                    </div>
                </div>
                <p class="card-text text-muted small mb-2">${this.escapeHtml(task.description)}</p>
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <small class="text-secondary"><i class="bi bi-calendar-event me-1"></i>${task.dueDate || 'No Date'}</small>
                    <span class="badge bg-secondary">${task.priority}</span>
                </div>
            </div>
        `;
        return div;
    }

    // Helper to prevent XSS
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    setupEventListeners() {
        // Form Submission (Add/Edit)
        this.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Search Input
        this.searchInput.addEventListener('input', () => {
            this.renderTasks();
        });

        // Delete and Edit buttons (Event Delegation)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) {
                const id = e.target.closest('.delete-btn').dataset.id;
                this.taskManager.deleteTask(id);
                this.renderTasks();
            } else if (e.target.closest('.edit-btn')) {
                const id = e.target.closest('.edit-btn').dataset.id;
                this.openEditModal(id);
            }
        });

        // Reset form when modal is closed
        const modalEl = document.getElementById('taskModal');
        modalEl.addEventListener('hidden.bs.modal', () => {
            this.taskForm.reset();
            this.currentTaskId = null;
            document.getElementById('taskModalLabel').textContent = 'Add New Task';
            document.getElementById('saveTaskBtn').textContent = 'Save Task';
        });

        // Dark Mode Toggle
        this.darkModeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    handleFormSubmit() {
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const status = document.getElementById('taskStatus').value;
        const priority = document.getElementById('taskPriority').value;
        const dueDate = document.getElementById('taskDueDate').value;

        if (this.currentTaskId) {
            // Edit Mode
            const task = this.taskManager.getTask(this.currentTaskId);
            if (task) {
                task.title = title;
                task.description = description;
                task.status = status;
                task.priority = priority;
                task.dueDate = dueDate;
                this.taskManager.updateTask(task);
            }
        } else {
            // Add Mode
            const newTask = new Task(title, description, status, priority, dueDate);
            this.taskManager.addTask(newTask);
        }

        this.taskModal.hide();
        this.renderTasks();
    }

    openEditModal(id) {
        const task = this.taskManager.getTask(id);
        if (task) {
            this.currentTaskId = task.id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskDueDate').value = task.dueDate;

            document.getElementById('taskModalLabel').textContent = 'Edit Task';
            document.getElementById('saveTaskBtn').textContent = 'Update Task';

            this.taskModal.show();
        }
    }

    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        html.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        this.updateThemeIcon(newTheme);
    }

    checkTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-bs-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    updateThemeIcon(theme) {
        const icon = this.darkModeToggle.querySelector('i');
        if (theme === 'dark') {
            icon.classList.remove('bi-moon-stars');
            icon.classList.add('bi-sun');
        } else {
            icon.classList.remove('bi-sun');
            icon.classList.add('bi-moon-stars');
        }
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    const taskManager = new TaskManager();
    const uiManager = new UIManager(taskManager);
});

document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskDeadline = document.getElementById('task-deadline');
    const taskList = document.getElementById('task-list');
    const emptyImage = document.querySelector('.empty-image');
    const currentDateElement = document.getElementById('current-date');
    const sortSelect = document.getElementById('sort-select');
    const addAdvancedBtn = document.getElementById('add-advanced-btn');
    const trashBtn = document.getElementById('trash-btn');
    const settingsBtn = document.getElementById('settings-btn');
    
    // Элементы статистики
    const totalCountElement = document.getElementById('total-count');
    const completedCountElement = document.getElementById('completed-count');
    const pendingCountElement = document.getElementById('pending-count');
    
    // Установка минимальной даты для дедлайна (сегодня)
    const today = new Date().toISOString().split('T')[0];
    taskDeadline.min = today;
    
    // Настройки по умолчанию
    const defaultSettings = {
        trashRetentionDays: 1,
        sortMethod: 'created-desc'
    };
    
    // Загрузка данных из localStorage
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let trash = JSON.parse(localStorage.getItem('trash')) || [];
    let settings = JSON.parse(localStorage.getItem('settings')) || defaultSettings;
    
    // Текущий метод сортировки
    let currentSort = settings.sortMethod || 'created-desc';
    sortSelect.value = currentSort;
    
    // Отображение текущей даты
    function updateCurrentDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateElement.textContent = now.toLocaleDateString('en-US', options);
    }
    
    // Очистка старой корзины
    function cleanOldTrash() {
        const now = new Date();
        const retentionDays = settings.trashRetentionDays || 1;
        const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
        
        trash = trash.filter(item => {
            const deletedDate = new Date(item.deletedAt);
            return (now - deletedDate) < retentionMs;
        });
        
        saveTrash();
    }
    
    // Инициализация
    updateCurrentDate();
    cleanOldTrash();
    applySorting();
    renderTasks();
    updateStats();
    
    // Сортировка задач
    function applySorting() {
        switch(currentSort) {
            case 'created-asc':
                tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'created-desc':
                tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'deadline-asc':
                tasks.sort((a, b) => {
                    if (!a.deadline && !b.deadline) return new Date(b.createdAt) - new Date(a.createdAt);
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(a.deadline) - new Date(b.deadline);
                });
                break;
            case 'deadline-desc':
                tasks.sort((a, b) => {
                    if (!a.deadline && !b.deadline) return new Date(b.createdAt) - new Date(a.createdAt);
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(b.deadline) - new Date(a.deadline);
                });
                break;
            case 'alphabetical-asc':
                tasks.sort((a, b) => a.text.localeCompare(b.text));
                break;
            case 'alphabetical-desc':
                tasks.sort((a, b) => b.text.localeCompare(a.text));
                break;
            case 'status':
                tasks.sort((a, b) => {
                    if (a.completed === b.completed) {
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    }
                    return a.completed ? 1 : -1;
                });
                break;
        }
    }
    
    // Изменение сортировки
    sortSelect.addEventListener('change', function() {
        currentSort = this.value;
        settings.sortMethod = currentSort;
        saveSettings();
        applySorting();
        renderTasks();
    });
    
    // Добавление новой задачи (простая форма)
    taskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const taskText = taskInput.value.trim();
        const deadline = taskDeadline.value;
        
        if (taskText === '') {
            alert('Please enter a task!');
            return;
        }
        
        // Создание новой задачи
        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            deadline: deadline || null,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(task);
        applySorting();
        saveTasks();
        renderTasks();
        updateStats();
        
        // Очистка формы
        taskInput.value = '';
        taskDeadline.value = '';
        taskInput.focus();
    });
    
    // Открытие расширенного редактора для добавления
    addAdvancedBtn.addEventListener('click', function() {
        openEditorModal(null);
    });
    
    // Открытие корзины
    trashBtn.addEventListener('click', function() {
        openTrashModal();
    });
    
    // Открытие настроек
    settingsBtn.addEventListener('click', function() {
        openSettingsModal();
    });
    
    // Рендер задач
    function renderTasks() {
        taskList.innerHTML = '';
        
        if (tasks.length === 0) {
            emptyImage.style.display = 'block';
            return;
        }
        
        emptyImage.style.display = 'none';
        
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.dataset.id = task.id;
            
            // Рассчитываем оставшиеся дни до дедлайна
            let deadlineInfo = '';
            let deadlineClass = '';
            
            if (task.deadline) {
                const deadlineDate = new Date(task.deadline + 'T00:00:00');
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const timeDiff = deadlineDate.getTime() - today.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                
                if (daysDiff === 0) {
                    deadlineInfo = 'Today';
                    deadlineClass = 'deadline-today';
                } else if (daysDiff < 0) {
                    deadlineInfo = `${Math.abs(daysDiff)} day(s) overdue`;
                    deadlineClass = 'deadline-overdue';
                } else {
                    deadlineInfo = `${daysDiff} day(s) left`;
                    deadlineClass = 'deadline-future';
                }
            }
            
            li.innerHTML = `
                <div class="task-content">
                    <span class="task-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.text)}</span>
                    ${task.deadline ? 
                        `<span class="task-deadline ${deadlineClass}">
                            <i class="fa-solid fa-calendar-days"></i>
                            ${deadlineInfo}
                        </span>` 
                        : ''
                    }
                </div>
                <div class="task-actions">
                    <button class="edit-btn" title="Edit task">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="delete-btn" title="Delete task">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            
            taskList.appendChild(li);
        });
        
        // Добавление обработчиков событий
        addTaskEventListeners();
    }
    
    // Добавление обработчиков событий для кнопок задач
    function addTaskEventListeners() {
        // Клик по задаче для переключения статуса выполнения
        document.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', function(e) {
                // Игнорируем клики по кнопкам редактирования/удаления
                if (e.target.closest('.task-actions')) {
                    return;
                }
                
                const taskId = parseInt(this.dataset.id);
                toggleTaskCompletion(taskId);
            });
        });
        
        // Кнопка редактирования
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const taskId = parseInt(this.closest('.task-item').dataset.id);
                const task = tasks.find(t => t.id === taskId);
                openEditorModal(task);
            });
        });
        
        // Кнопка удаления (без подтверждения)
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const taskId = parseInt(this.closest('.task-item').dataset.id);
                moveToTrash(taskId);
            });
        });
    }
    
    // Переключение статуса выполнения задачи
    function toggleTaskCompletion(taskId) {
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = !tasks[taskIndex].completed;
            applySorting();
            saveTasks();
            renderTasks();
            updateStats();
        }
    }
    
    // Перемещение задачи в корзину
    function moveToTrash(taskId) {
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) return;
        
        const task = tasks[taskIndex];
        
        // Добавляем метку времени удаления
        const trashedTask = {
            ...task,
            deletedAt: new Date().toISOString()
        };
        
        // Перемещаем в корзину
        trash.push(trashedTask);
        tasks.splice(taskIndex, 1);
        
        applySorting();
        saveTasks();
        saveTrash();
        renderTasks();
        updateStats();
    }
    
    // Восстановление из корзины
    function restoreFromTrash(trashIndex) {
        if (trashIndex < 0 || trashIndex >= trash.length) return;
        
        const task = trash[trashIndex];
        
        // Удаляем метку времени удаления
        const restoredTask = { ...task };
        delete restoredTask.deletedAt;
        
        // Восстанавливаем
        tasks.push(restoredTask);
        trash.splice(trashIndex, 1);
        
        applySorting();
        saveTasks();
        saveTrash();
        renderTasks();
        updateStats();
    }
    
    // Открытие редактора задач (модальное окно)
    function openEditorModal(task) {
        // Создаем модальное окно для редактора
        const modal = document.createElement('div');
        modal.className = 'editor-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'editor-modal-content';
        
        const isEditMode = task !== null;
        const taskText = isEditMode ? task.text : '';
        const taskDeadlineValue = isEditMode ? task.deadline || '' : '';
        
        modalContent.innerHTML = `
            <h3>${isEditMode ? 'Edit Task' : 'Add New Task'}</h3>
            <div class="editor-form">
                <textarea id="editor-task-text" placeholder="Enter task description...">${escapeHtml(taskText)}</textarea>
                <div class="editor-date">
                    <label for="editor-task-deadline">Deadline:</label>
                    <input type="date" id="editor-task-deadline" value="${taskDeadlineValue}" min="${today}">
                </div>
                <div class="editor-buttons">
                    <button type="button" id="save-editor-btn">${isEditMode ? 'Save Changes' : 'Add Task'}</button>
                    <button type="button" id="cancel-editor-btn">Cancel</button>
                </div>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Фокусируемся на поле ввода
        const editorTextInput = document.getElementById('editor-task-text');
        editorTextInput.focus();
        if (isEditMode) {
            editorTextInput.select();
        }
        
        // Обработчики для кнопок модального окна
        document.getElementById('save-editor-btn').addEventListener('click', function() {
            const newText = editorTextInput.value.trim();
            const newDeadline = document.getElementById('editor-task-deadline').value;
            
            if (newText === '') {
                alert('Task text cannot be empty!');
                return;
            }
            
            if (isEditMode) {
                // Редактирование существующей задачи
                const taskIndex = tasks.findIndex(t => t.id === task.id);
                if (taskIndex !== -1) {
                    tasks[taskIndex].text = newText;
                    tasks[taskIndex].deadline = newDeadline || null;
                }
            } else {
                // Добавление новой задачи
                const newTask = {
                    id: Date.now(),
                    text: newText,
                    completed: false,
                    deadline: newDeadline || null,
                    createdAt: new Date().toISOString()
                };
                tasks.push(newTask);
            }
            
            applySorting();
            saveTasks();
            renderTasks();
            updateStats();
            document.body.removeChild(modal);
        });
        
        document.getElementById('cancel-editor-btn').addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        // Закрытие по клику вне модального окна
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // Закрытие по клавише Escape
        const escapeHandler = function(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    // Открытие модального окна корзины
    function openTrashModal() {
        cleanOldTrash();
        
        const modal = document.createElement('div');
        modal.className = 'trash-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'trash-modal-content';
        
        let trashContent = '';
        
        if (trash.length === 0) {
            trashContent = '<div class="empty-trash">Trash is empty</div>';
        } else {
            trash.forEach((item, index) => {
                const deletedDate = new Date(item.deletedAt);
                const timeAgo = getTimeAgo(deletedDate);
                
                trashContent += `
                    <div class="trash-item">
                        <div class="trash-item-content">${escapeHtml(item.text)}</div>
                        <div class="trash-item-info">
                            <span>Deleted ${timeAgo}</span>
                            <button class="restore-btn" data-index="${index}">Restore</button>
                        </div>
                    </div>
                `;
            });
        }
        
        modalContent.innerHTML = `
            <h3>Trash Bin (last ${settings.trashRetentionDays} day${settings.trashRetentionDays !== 1 ? 's' : ''})</h3>
            <div class="trash-list">
                ${trashContent}
            </div>
            <div class="modal-buttons">
                <button type="button" class="close-modal-btn">Close</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Обработчики для кнопок восстановления
        modal.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                restoreFromTrash(index);
                document.body.removeChild(modal);
                openTrashModal(); // Обновляем модальное окно
            });
        });
        
        // Обработчик закрытия
        modal.querySelector('.close-modal-btn').addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        // Закрытие по клику вне модального окна
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // Закрытие по клавише Escape
        const escapeHandler = function(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    // Открытие модального окна настроек
    function openSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'settings-modal-content';
        
        modalContent.innerHTML = `
            <h3>Settings</h3>
            <div class="settings-form">
                <div class="setting-item">
                    <div>
                        <div class="setting-label">Trash retention period</div>
                        <div class="setting-hint">How many days to keep deleted tasks in trash</div>
                    </div>
                    <input type="number" class="setting-input" id="trash-days" value="${settings.trashRetentionDays}" min="1" max="30">
                </div>
            </div>
            <div class="modal-buttons">
                <button type="button" id="save-settings-btn">Save</button>
                <button type="button" class="close-modal-btn">Cancel</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Обработчик сохранения настроек
        document.getElementById('save-settings-btn').addEventListener('click', function() {
            const trashDaysInput = document.getElementById('trash-days');
            const trashDays = parseInt(trashDaysInput.value);
            
            if (trashDays >= 1 && trashDays <= 30) {
                settings.trashRetentionDays = trashDays;
                saveSettings();
                cleanOldTrash();
                document.body.removeChild(modal);
            } else {
                alert('Please enter a number between 1 and 30');
            }
        });
        
        // Обработчик закрытия
        modal.querySelector('.close-modal-btn').addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        // Закрытие по клику вне модального окна
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // Закрытие по клавише Escape
        const escapeHandler = function(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    // Форматирование времени "сколько времени назад"
    function getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 60) {
            return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
    }
    
    // Обновление статистики
    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const pending = total - completed;
        
        totalCountElement.textContent = total;
        completedCountElement.textContent = completed;
        pendingCountElement.textContent = pending;
    }
    
    // Сохранение задач в localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    // Сохранение корзины в localStorage
    function saveTrash() {
        localStorage.setItem('trash', JSON.stringify(trash));
    }
    
    // Сохранение настроек в localStorage
    function saveSettings() {
        localStorage.setItem('settings', JSON.stringify(settings));
    }
    
    // Экранирование HTML для безопасности
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Автоматическое обновление даты
    setInterval(() => {
        updateCurrentDate();
    }, 60000);
    
    // Автоматическая очистка корзины каждые 10 минут
    setInterval(() => {
        cleanOldTrash();
    }, 10 * 60 * 1000);
});
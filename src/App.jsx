import { useState, useEffect } from 'react'
import './App.css'


// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || window.location.origin; // Gateway URL
// const API_BASE_URL = window.location.origin;
// const AUTH_API_URL = `${API_BASE_URL}/api/auth`;
// const TASKS_API_URL = `${API_BASE_URL}/api/tasks`;

const GATEWAY_URL = 'http://localhost:8080'; // Для всех остальных запросов
const AUTH_API_URL = `${GATEWAY_URL}/api/auth`;
const TASKS_API_URL = `${GATEWAY_URL}/api/tasks`;

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showAuth, setShowAuth] = useState(true);
    const [authMode, setAuthMode] = useState('login');
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    // Состояния для аутентификации
    const [authForm, setAuthForm] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        rememberMe: false
    });

    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [draggedTask, setDraggedTask] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsConfigOpen, setIsNotificationsConfigOpen] = useState(false);

    // Данные пользователя
    const [user, setUser] = useState({
        id: null,
        username: '',
        email: '',
        name: '',
        avatar: '👤',
        joinDate: '',
        role: '',
        department: ''
    });

    // Проверка аутентификации при загрузке
    useEffect(() => {
        checkAuthentication();
    }, []);

    // Проверка JWT токена
    const checkAuthentication = async () => {
        const token = localStorage.getItem('jwt');
        if (!token) {
            setIsAuthenticated(false);
            setShowAuth(true);
            return;
        }

        try {
            const response = await fetch(`${AUTH_API_URL}/validate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                setIsAuthenticated(true);
                setShowAuth(false);
                loadTasks(token);
            } else {
                localStorage.removeItem('jwt');
                setIsAuthenticated(false);
                setShowAuth(true);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('jwt');
            setIsAuthenticated(false);
            setShowAuth(true);
        }
    };

    // Функции аутентификации
    const handleAuthInputChange = (field, value) => {
        setAuthForm(prev => ({
            ...prev,
            [field]: value
        }));
        setAuthError('');
    };

    // Улучшенная функция логина
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');

        try {
            console.log('Sending login request through Gateway:', `${AUTH_API_URL}/login`);

            const response = await fetch(`${AUTH_API_URL}/login`, {  // ← Используйте AUTH_API_URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: authForm.username,
                    password: authForm.password
                })
            });

            console.log('Login response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Login failed: ${response.status}`);
            }

            const authData = await response.json();

            if (!authData.accessToken) {
                throw new Error('No access token received');
            }

            // Сохраняем JWT в localStorage
            localStorage.setItem('jwt', authData.accessToken);
            console.log('JWT token saved');

            // Устанавливаем пользователя
            setUser({
                id: authData.userId,
                username: authData.username,
                email: authData.email,
                name: authData.name || authData.username,
                avatar: '👤',
                joinDate: new Date().toLocaleDateString('ru-RU'),
                role: authData.role || 'Пользователь',
                department: authData.department || 'Отдел разработки'
            });

            setIsAuthenticated(true);
            setShowAuth(false);

            // Загружаем задачи через Gateway (уже с JWT в header)
            await loadTasks();

        } catch (error) {
            console.error('Login error:', error);
            setAuthError(error.message || 'Ошибка аутентификации');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        if (authForm.password !== authForm.confirmPassword) {
            setAuthError('Пароли не совпадают');
            return;
        }

        setLoading(true);
        setAuthError('');

        try {
            const response = await fetch(`${AUTH_API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: authForm.username,
                    email: authForm.email,
                    password: authForm.password,
                    name: authForm.username // Можно добавить поле имени
                })
            });

            if (response.ok) {
                // После успешной регистрации автоматически логиним
                await handleLogin(e);
            } else {
                const errorData = await response.json();
                setAuthError(errorData.message || 'Ошибка регистрации');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setAuthError('Ошибка соединения с сервером');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('jwt');
        setIsAuthenticated(false);
        setShowAuth(true);
        setAuthMode('login');
        setTasks([]);
        setUser({
            id: null,
            username: '',
            email: '',
            name: '',
            avatar: '👤',
            joinDate: '',
            role: '',
            department: ''
        });
    };

    // Функции для работы с задачами
    const loadTasks = async () => {
        const token = localStorage.getItem('jwt');
        const response = await fetch('http://localhost:8080/api/tasks', {
            headers: {
                'Authorization': `Bearer ${token}`  // Gateway передаст этот header в Task Service
            }
        });
        return response.json();
    };

    const addTask = async () => {
        if (newTaskTitle.trim() === '') return;

        const token = localStorage.getItem('jwt');
        if (!token) {
            handleLogout();
            return;
        }

        try {
            const response = await fetch(`${TASKS_API_URL}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: newTaskTitle.trim(),
                    description: '',
                    priority: 'medium'
                })
            });

            if (response.ok) {
                const newTask = await response.json();
                setTasks(prev => [...prev, newTask]);
                setNewTaskTitle('');
            } else if (response.status === 401) {
                handleLogout();
            }
        } catch (error) {
            console.error('Failed to add task:', error);
        }
    };

    const updateTask = async (updatedTask) => {
        const token = localStorage.getItem('jwt');
        if (!token) {
            handleLogout();
            return;
        }

        try {
            const response = await fetch(`${TASKS_API_URL}/${updatedTask.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedTask)
            });

            if (response.ok) {
                setTasks(prev => prev.map(task =>
                    task.id === updatedTask.id ? updatedTask : task
                ));
            } else if (response.status === 401) {
                handleLogout();
            }
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    };

    const deleteTask = async (taskId) => {
        const token = localStorage.getItem('jwt');
        if (!token) {
            handleLogout();
            return;
        }

        try {
            const response = await fetch(`${TASKS_API_URL}/${taskId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setTasks(prev => prev.filter(task => task.id !== taskId));
                setIsModalOpen(false);
            } else if (response.status === 401) {
                handleLogout();
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    };

    // Остальные функции остаются практически без изменений
    const switchAuthMode = () => {
        setAuthMode(prev => prev === 'login' ? 'register' : 'login');
        setAuthForm({
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            rememberMe: false
        });
        setAuthError('');
    };

    const openTaskModal = (task) => {
        setSelectedTask({...task});
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (selectedTask) {
            updateTask(selectedTask);
        }
        setIsModalOpen(false);
        setSelectedTask(null);
    };

    // Drag & Drop функции (остаются без изменений)
    const handleDragStart = (event, task) => {
        setDraggedTask(task);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id.toString());
        event.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (event) => {
        event.currentTarget.classList.remove('dragging');
        setDraggedTask(null);
    };

    const handleDragOver = (event, targetStatus) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        event.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (event) => {
        event.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = async (event, targetColumn) => {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');

        if (!draggedTask) return;

        let updatedTask = { ...draggedTask };

        if (targetColumn === 'new') {
            updatedTask.active = false;
            updatedTask.completed = false;
        } else if (targetColumn === 'active') {
            updatedTask.active = true;
            updatedTask.completed = false;
        } else if (targetColumn === 'completed') {
            updatedTask.active = true;
            updatedTask.completed = true;
        }

        await updateTask(updatedTask);
        setDraggedTask(null);
    };

    // Остальные функции UI (handleProfileSave, handleNotificationSettingsSave и т.д.)
    // остаются без изменений, так как они работают с локальным состоянием

    const handleProfileSave = () => {
        // Здесь можно добавить вызов API для обновления профиля
        setUser({
            ...user,
            username: user.username, // из формы редактирования
            email: user.email,
            name: user.name
        });
        setIsProfileOpen(false);
    };

    const handleNotificationSettingsSave = () => {
        // Здесь можно добавить вызов API для сохранения настроек
        console.log('Notification settings saved');
        setIsNotificationsConfigOpen(false);
    };

    const handleNotificationToggle = (setting) => {
        setNotificationSettings(prev => ({
            ...prev,
            [setting]: !prev[setting]
        }));
    };

    // Фильтрация задач (без изменений)
    const newTasks = tasks.filter(task => !task.active && !task.completed);
    const activeTasks = tasks.filter(task => task.active && !task.completed);
    const completedTasks = tasks.filter(task => task.completed);

    // Настройки уведомлений (без изменений)
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: true,
        taskReminders: true,
        dailyDigest: false,
        weeklyReport: true,
        taskCompleted: true,
        newTaskAssigned: false,
        marketingEmails: false
    });

    // Форма редактирования профиля (без изменений)
    const [editForm, setEditForm] = useState({
        username: user.username,
        email: user.email,
        name: user.name,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Если пользователь не аутентифицирован, показываем окно входа/регистрации
    if (!isAuthenticated && showAuth) {
        return (
            <div className="auth-container">
                <div className="auth-background">
                    <div className="auth-shapes">
                        <div className="auth-shape shape-1"></div>
                        <div className="auth-shape shape-2"></div>
                        <div className="auth-shape shape-3"></div>
                        <div className="auth-shape shape-4"></div>
                    </div>
                </div>

                <div className="auth-modal">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <div className="auth-logo-icon">🎯</div>
                            <div className="auth-logo-text">
                                <h1>TaskFlow</h1>
                                <p>Умный менеджер задач</p>
                            </div>
                        </div>
                    </div>

                    <div className="auth-content">
                        <div className="auth-tabs">
                            <button
                                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                                onClick={() => setAuthMode('login')}
                            >
                                Вход
                            </button>
                            <button
                                className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                                onClick={() => setAuthMode('register')}
                            >
                                Регистрация
                            </button>
                        </div>

                        {authError && (
                            <div className="auth-error">
                                {authError}
                            </div>
                        )}

                        <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="auth-form">
                            <div className="form-group">
                                <label>Имя пользователя</label>
                                <input
                                    type="text"
                                    value={authForm.username}
                                    onChange={(e) => handleAuthInputChange('username', e.target.value)}
                                    placeholder="Введите ваш логин"
                                    required
                                    className="auth-input"
                                    disabled={loading}
                                />
                            </div>

                            {authMode === 'register' && (
                                <div className="form-group">
                                    <label>Email адрес</label>
                                    <input
                                        type="email"
                                        value={authForm.email}
                                        onChange={(e) => handleAuthInputChange('email', e.target.value)}
                                        placeholder="Введите ваш email"
                                        required
                                        className="auth-input"
                                        disabled={loading}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Пароль</label>
                                <input
                                    type="password"
                                    value={authForm.password}
                                    onChange={(e) => handleAuthInputChange('password', e.target.value)}
                                    placeholder="Введите ваш пароль"
                                    required
                                    className="auth-input"
                                    disabled={loading}
                                />
                            </div>

                            {authMode === 'register' && (
                                <div className="form-group">
                                    <label>Подтверждение пароля</label>
                                    <input
                                        type="password"
                                        value={authForm.confirmPassword}
                                        onChange={(e) => handleAuthInputChange('confirmPassword', e.target.value)}
                                        placeholder="Повторите пароль"
                                        required
                                        className="auth-input"
                                        disabled={loading}
                                    />
                                </div>
                            )}

                            {authMode === 'login' && (
                                <div className="auth-options">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={authForm.rememberMe}
                                            onChange={(e) => handleAuthInputChange('rememberMe', e.target.checked)}
                                            className="checkbox-input"
                                            disabled={loading}
                                        />
                                        <span className="checkmark"></span>
                                        Запомнить меня
                                    </label>
                                    <a href="#" className="forgot-password">Забыли пароль?</a>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="auth-submit-btn"
                                disabled={loading}
                            >
                                {loading ? 'Загрузка...' :
                                    authMode === 'login' ? 'Войти в систему' : 'Создать аккаунт'}
                            </button>

                            {/* Остальная часть UI остается без изменений */}
                            {/*<div className="auth-divider">*/}
                            {/*    <span>или</span>*/}
                            {/*</div>*/}

                            {/*<button type="button" className="auth-social-btn" disabled={loading}>*/}
                            {/*    <span className="social-icon">🔵</span>*/}
                            {/*    Продолжить через Google*/}
                            {/*</button>*/}

                            <div className="auth-switch">
                                {authMode === 'login' ? (
                                    <p>
                                        Нет аккаунта?{' '}
                                        <button type="button" onClick={switchAuthMode} className="auth-link" disabled={loading}>
                                            Зарегистрироваться
                                        </button>
                                    </p>
                                ) : (
                                    <p>
                                        Уже есть аккаунт?{' '}
                                        <button type="button" onClick={switchAuthMode} className="auth-link" disabled={loading}>
                                            Войти
                                        </button>
                                    </p>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="auth-footer">
                        <p>© 2024 TaskFlow. Все права защищены.</p>
                    </div>
                </div>
            </div>
        );
    }


    // Основное приложение
    return (
        <div className="app">
            {/* Анимированный фон */}
            <div className="animated-background">
                <div className="floating-shapes">
                    <div className="shape shape-1"></div>
                    <div className="shape shape-2"></div>
                    <div className="shape shape-3"></div>
                    <div className="shape shape-4"></div>
                    <div className="shape shape-5"></div>
                </div>
            </div>

            {/* Хедер с профилем */}
            <header className="app-header">
                <div className="header-content">
                    <div className="header-info">
                        <div className="logo">
                            <div className="logo-icon">🎯</div>
                            <div className="logo-text">
                                <h1>TaskFlow</h1>
                                <p>Умный менеджер задач</p>
                            </div>
                        </div>
                    </div>
                    <div className="profile-section">
                        <button
                            className="profile-button"
                            onClick={() => setIsProfileOpen(true)}
                        >
                            <div className="profile-avatar">
                                <div className="avatar-container">
                                    <span className="avatar-emoji">{user.avatar}</span>
                                    <div className="online-indicator"></div>
                                </div>
                            </div>
                            <div className="profile-info-mini">
                                <span className="username">{user.name}</span>
                                <span className="user-role">{user.role}</span>
                            </div>
                            <div className="profile-dropdown">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M7 10l5 5 5-5z"/>
                                </svg>
                            </div>
                        </button>
                        <button className="logout-btn" onClick={handleLogout} title="Выйти">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Основной контент */}
            <main className="main-content">
                <div className="container">
                    <div className="main-layout">
                        {/* Левая колонка - Статистика и быстрые действия */}
                        <div className="sidebar">
                            <div className="sidebar-card">
                                <div className="sidebar-header">
                                    <h3>📊 Обзор задач</h3>
                                </div>
                                <div className="stats-grid-sidebar">
                                    <div className="stat-item-sidebar">
                                        <div className="stat-icon-sidebar">📊</div>
                                        <div className="stat-content">
                                            <span className="stat-value-sidebar">{tasks.length}</span>
                                            <span className="stat-label-sidebar">Всего задач</span>
                                        </div>
                                    </div>
                                    <div className="stat-item-sidebar">
                                        <div className="stat-icon-sidebar">🆕</div>
                                        <div className="stat-content">
                                            <span className="stat-value-sidebar">{newTasks.length}</span>
                                            <span className="stat-label-sidebar">Новые</span>
                                        </div>
                                    </div>
                                    <div className="stat-item-sidebar">
                                        <div className="stat-icon-sidebar">⏳</div>
                                        <div className="stat-content">
                                            <span className="stat-value-sidebar">{activeTasks.length}</span>
                                            <span className="stat-label-sidebar">В работе</span>
                                        </div>
                                    </div>
                                    <div className="stat-item-sidebar">
                                        <div className="stat-icon-sidebar">✅</div>
                                        <div className="stat-content">
                                            <span className="stat-value-sidebar">{completedTasks.length}</span>
                                            <span className="stat-label-sidebar">Выполнено</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="sidebar-card">
                                <div className="sidebar-header">
                                    <h3>🚀 Быстрые действия</h3>
                                </div>
                                <div className="quick-actions">
                                    <button className="quick-action-btn">
                                        <span className="action-icon">📋</span>
                                        <span className="action-text">Создать шаблон</span>
                                    </button>
                                    <button className="quick-action-btn">
                                        <span className="action-icon">📤</span>
                                        <span className="action-text">Экспорт задач</span>
                                    </button>
                                    <button
                                        className="quick-action-btn"
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            setIsNotificationsConfigOpen(true);
                                        }}
                                    >
                                        <span className="action-icon">🔔</span>
                                        <span className="action-text">Настройки уведомлений</span>
                                    </button>
                                    <button className="quick-action-btn">
                                        <span className="action-icon">👥</span>
                                        <span className="action-text">Пригласить команду</span>
                                    </button>
                                </div>
                            </div>

                            <div className="sidebar-card">
                                <div className="sidebar-header">
                                    <h3>🎯 Продуктивность</h3>
                                </div>
                                <div className="productivity-stats">
                                    <div className="progress-item">
                                        <div className="progress-info">
                                            <span>Завершение задач</span>
                                            <span>{tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="progress-item">
                                        <div className="progress-info">
                                            <span>Активность сегодня</span>
                                            <span>75%</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: '75%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Основная область с задачами */}
                        <div className="content-area">
                            {/* Поле ввода новой задачи */}
                            <div className="add-task-section">
                                <div className="add-task-card">
                                    <div className="input-group-enhanced">
                                        <div className="input-icon">✏️</div>
                                        <input
                                            type="text"
                                            placeholder="Что нужно сделать?..."
                                            value={newTaskTitle}
                                            onChange={(event) => setNewTaskTitle(event.target.value)}
                                            onKeyPress={(event) => event.key === 'Enter' && addTask()}
                                            className="task-input-enhanced"
                                        />
                                        <button
                                            onClick={addTask}
                                            className="add-button-enhanced"
                                            disabled={!newTaskTitle.trim()}
                                        >
                                            <span className="button-icon">+</span>
                                            Добавить
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Контейнер задач */}
                            <div className="tasks-container-enhanced">
                                <div className="tasks-grid-three-columns">

                                    {/* Колонка новых задач */}
                                    <div
                                        className="tasks-column-card new-column"
                                        onDragOver={(event) => handleDragOver(event, 'new')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(event) => handleDrop(event, 'new')}
                                    >
                                        <div className="column-header">
                                            <div className="column-icon">🆕</div>
                                            <div className="column-title">
                                                <h2>Новые задачи</h2>
                                                <span className="task-count">{newTasks.length}</span>
                                            </div>
                                        </div>
                                        <div className="tasks-list-enhanced">
                                            {newTasks.length === 0 ? (
                                                <div className="empty-state-card">
                                                    <div className="empty-icon">📝</div>
                                                    <h3>Нет новых задач</h3>
                                                    <p>Добавьте новую задачу или перетащите сюда из других колонок</p>
                                                </div>
                                            ) : (
                                                newTasks.map((task) => (
                                                    <div
                                                        key={task.id}
                                                        draggable
                                                        onDragStart={(event) => handleDragStart(event, task)}
                                                        onDragEnd={handleDragEnd}
                                                        className={`task-card new-task ${draggedTask && draggedTask.id === task.id ? 'dragging' : ''}`}
                                                        onClick={() => openTaskModal(task)}
                                                    >
                                                        <div className="task-card-header">
                                                            <div className="drag-handle-enhanced">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M10 9h4v-4h-4v4zm0 10h4v-4h-4v4zm-6-6h4v-4h-4v4zm0 10h4v-4h-4v4zm-6-6h4v-4h-4v4zm0 10h4v-4h-4v4z"/>
                                                                </svg>
                                                            </div>
                                                            <div className="task-priority new"></div>
                                                        </div>
                                                        <div className="task-content">
                                                            <h3 className="task-title">{task.title}</h3>
                                                            {task.description && (
                                                                <p className="task-preview">{task.description.substring(0, 60)}...</p>
                                                            )}
                                                        </div>
                                                        <div className="task-footer">
                                                            <span className="task-date">{task.createdAt}</span>
                                                            <div className="task-actions">
                                                                <button className="task-action-btn">⋯</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Колонка активных задач */}
                                    <div
                                        className="tasks-column-card pending-column"
                                        onDragOver={(event) => handleDragOver(event, 'active')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(event) => handleDrop(event, 'active')}
                                    >
                                        <div className="column-header">
                                            <div className="column-icon">🔥</div>
                                            <div className="column-title">
                                                <h2>Активные задачи</h2>
                                                <span className="task-count">{activeTasks.length}</span>
                                            </div>
                                        </div>
                                        <div className="tasks-list-enhanced">
                                            {activeTasks.length === 0 ? (
                                                <div className="empty-state-card">
                                                    <div className="empty-icon">⏳</div>
                                                    <h3>Нет активных задач</h3>
                                                    <p>Перетащите сюда задачи из новых или выполненных</p>
                                                </div>
                                            ) : (
                                                activeTasks.map((task) => (
                                                    <div
                                                        key={task.id}
                                                        draggable
                                                        onDragStart={(event) => handleDragStart(event, task)}
                                                        onDragEnd={handleDragEnd}
                                                        className={`task-card ${draggedTask && draggedTask.id === task.id ? 'dragging' : ''}`}
                                                        onClick={() => openTaskModal(task)}
                                                    >
                                                        <div className="task-card-header">
                                                            <div className="drag-handle-enhanced">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M10 9h4v-4h-4v4zm0 10h4v-4h-4v4zm-6-6h4v-4h-4v4zm0 10h4v-4h-4v4zm-6-6h4v-4h-4v4zm0 10h4v-4h-4v4z"/>
                                                                </svg>
                                                            </div>
                                                            <div className="task-priority medium"></div>
                                                        </div>
                                                        <div className="task-content">
                                                            <h3 className="task-title">{task.title}</h3>
                                                            {task.description && (
                                                                <p className="task-preview">{task.description.substring(0, 60)}...</p>
                                                            )}
                                                        </div>
                                                        <div className="task-footer">
                                                            <span className="task-date">{task.createdAt}</span>
                                                            <div className="task-actions">
                                                                <button className="task-action-btn">⋯</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Колонка выполненных задач */}
                                    <div
                                        className="tasks-column-card completed-column"
                                        onDragOver={(event) => handleDragOver(event, 'completed')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(event) => handleDrop(event, 'completed')}
                                    >
                                        <div className="column-header">
                                            <div className="column-icon">✅</div>
                                            <div className="column-title">
                                                <h2>Выполнено</h2>
                                                <span className="task-count">{completedTasks.length}</span>
                                            </div>
                                        </div>
                                        <div className="tasks-list-enhanced">
                                            {completedTasks.length === 0 ? (
                                                <div className="empty-state-card">
                                                    <div className="empty-icon">🎉</div>
                                                    <h3>Задач нет</h3>
                                                    <p>Перетащите сюда выполненные задачи</p>
                                                </div>
                                            ) : (
                                                completedTasks.map((task) => (
                                                    <div
                                                        key={task.id}
                                                        draggable
                                                        onDragStart={(event) => handleDragStart(event, task)}
                                                        onDragEnd={handleDragEnd}
                                                        className={`task-card completed ${draggedTask && draggedTask.id === task.id ? 'dragging' : ''}`}
                                                        onClick={() => openTaskModal(task)}
                                                    >
                                                        <div className="task-card-header">
                                                            <div className="drag-handle-enhanced">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M10 9h4v-4h-4v4zm0 10h4v-4h-4v4zm-6-6h4v-4h-4v4zm0 10h4v-4h-4v4zm-6-6h4v-4h-4v4zm0 10h4v-4h-4v4z"/>
                                                                </svg>
                                                            </div>
                                                            <div className="task-completed-badge">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <div className="task-content">
                                                            <h3 className="task-title">{task.title}</h3>
                                                            {task.description && (
                                                                <p className="task-preview">{task.description.substring(0, 60)}...</p>
                                                            )}
                                                        </div>
                                                        <div className="task-footer">
                                                            <span className="task-date">{task.createdAt}</span>
                                                            <div className="task-actions">
                                                                <button className="task-action-btn">⋯</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Модальное окно редактирования задачи */}
            {isModalOpen && selectedTask && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content task-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Редактирование задачи</h2>
                            <button className="close-button" onClick={closeModal}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Заголовок:</label>
                                <input
                                    type="text"
                                    value={selectedTask.title}
                                    onChange={(event) => setSelectedTask({
                                        ...selectedTask,
                                        title: event.target.value
                                    })}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Описание:</label>
                                <textarea
                                    value={selectedTask.description}
                                    onChange={(event) => setSelectedTask({
                                        ...selectedTask,
                                        description: event.target.value
                                    })}
                                    placeholder="Добавьте описание задачи..."
                                    rows="4"
                                    className="form-textarea"
                                />
                            </div>

                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={selectedTask.active}
                                        onChange={(event) => setSelectedTask({
                                            ...selectedTask,
                                            active: event.target.checked
                                        })}
                                        className="checkbox-input"
                                    />
                                    <span className="checkmark"></span>
                                    Задача активна
                                </label>
                            </div>

                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={selectedTask.completed}
                                        onChange={(event) => setSelectedTask({
                                            ...selectedTask,
                                            completed: event.target.checked
                                        })}
                                        className="checkbox-input"
                                    />
                                    <span className="checkmark"></span>
                                    Задача выполнена
                                </label>
                            </div>

                            <div className="task-meta">
                                <small>Создано: {selectedTask.createdAt}</small>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="delete-button"
                                onClick={() => deleteTask(selectedTask.id)}
                            >
                                🗑️ Удалить задачу
                            </button>
                            <button className="save-button" onClick={closeModal}>
                                💾 Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно профиля пользователя */}
            {isProfileOpen && (
                <div className="modal-overlay" onClick={() => setIsProfileOpen(false)}>
                    <div className="modal-content profile-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header profile-modal-header">
                            <div className="profile-header-content">
                                <div className="profile-cover">
                                    <div className="cover-gradient"></div>
                                    <div className="profile-avatar-large">
                                        <div className="avatar-circle">
                                            <span className="avatar-emoji-large">{user.avatar}</span>
                                            <div className="avatar-status">
                                                <div className="status-indicator online"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="profile-basic-info">
                                    <h2>{user.name}</h2>
                                    <p className="user-title">{user.role}</p>
                                    <p className="user-department">{user.department}</p>
                                </div>
                            </div>
                            <button className="close-button" onClick={() => setIsProfileOpen(false)}>×</button>
                        </div>

                        <div className="modal-body profile-modal-body">
                            <div className="profile-stats-grid">
                                <div className="profile-stat-card">
                                    <div className="stat-icon">📊</div>
                                    <div className="stat-info">
                                        <span className="stat-value">{tasks.length}</span>
                                        <span className="stat-label">Всего задач</span>
                                    </div>
                                </div>
                                <div className="profile-stat-card">
                                    <div className="stat-icon">🆕</div>
                                    <div className="stat-info">
                                        <span className="stat-value">{newTasks.length}</span>
                                        <span className="stat-label">Новые</span>
                                    </div>
                                </div>
                                <div className="profile-stat-card">
                                    <div className="stat-icon">⏳</div>
                                    <div className="stat-info">
                                        <span className="stat-value">{activeTasks.length}</span>
                                        <span className="stat-label">В работе</span>
                                    </div>
                                </div>
                                <div className="profile-stat-card">
                                    <div className="stat-icon">✅</div>
                                    <div className="stat-info">
                                        <span className="stat-value">{completedTasks.length}</span>
                                        <span className="stat-label">Выполнено</span>
                                    </div>
                                </div>
                            </div>

                            <div className="profile-sections">
                                <div className="profile-section-card">
                                    <div className="section-header">
                                        <div className="section-icon">👤</div>
                                        <h3>Основная информация</h3>
                                    </div>
                                    <div className="section-content">
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Полное имя</label>
                                                <input
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={(event) => setEditForm({...editForm, name: event.target.value})}
                                                    className="form-input"
                                                    placeholder="Введите ваше имя"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Логин</label>
                                                <input
                                                    type="text"
                                                    value={editForm.username}
                                                    onChange={(event) => setEditForm({...editForm, username: event.target.value})}
                                                    className="form-input"
                                                    placeholder="Введите логин"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Email адрес</label>
                                            <input
                                                type="email"
                                                value={editForm.email}
                                                onChange={(event) => setEditForm({...editForm, email: event.target.value})}
                                                className="form-input"
                                                placeholder="Введите email"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="profile-section-card">
                                    <div className="section-header">
                                        <div className="section-icon">🔒</div>
                                        <h3>Безопасность</h3>
                                    </div>
                                    <div className="section-content">
                                        <div className="form-group">
                                            <label>Текущий пароль</label>
                                            <input
                                                type="password"
                                                value={editForm.currentPassword}
                                                onChange={(event) => setEditForm({...editForm, currentPassword: event.target.value})}
                                                className="form-input"
                                                placeholder="Введите текущий пароль"
                                            />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Новый пароль</label>
                                                <input
                                                    type="password"
                                                    value={editForm.newPassword}
                                                    onChange={(event) => setEditForm({...editForm, newPassword: event.target.value})}
                                                    className="form-input"
                                                    placeholder="Введите новый пароль"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Подтверждение</label>
                                                <input
                                                    type="password"
                                                    value={editForm.confirmPassword}
                                                    onChange={(event) => setEditForm({...editForm, confirmPassword: event.target.value})}
                                                    className="form-input"
                                                    placeholder="Подтвердите пароль"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="profile-actions">
                                <button
                                    className="config-button"
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        setIsNotificationsConfigOpen(true);
                                    }}
                                >
                                    <span className="button-icon">⚙️</span>
                                    Настройка уведомлений
                                </button>
                            </div>
                        </div>

                        <div className="modal-footer profile-modal-footer">
                            <button
                                className="cancel-button"
                                onClick={() => setIsProfileOpen(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className="save-profile-button"
                                onClick={handleProfileSave}
                            >
                                <span className="button-icon">💾</span>
                                Сохранить изменения
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно настройки уведомлений */}
            {isNotificationsConfigOpen && (
                <div className="modal-overlay" onClick={() => setIsNotificationsConfigOpen(false)}>
                    <div className="modal-content notifications-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header notifications-modal-header">
                            <div className="notifications-header-content">
                                <div className="notifications-icon">🔔</div>
                                <div>
                                    <h2>Настройка уведомлений</h2>
                                    <p>Управляйте вашими предпочтениями получения уведомлений</p>
                                </div>
                            </div>
                            <button className="close-button" onClick={() => setIsNotificationsConfigOpen(false)}>×</button>
                        </div>

                        <div className="modal-body notifications-modal-body">
                            <div className="notifications-categories">
                                <div className="notification-category">
                                    <h3>📧 Email уведомления</h3>
                                    <div className="notifications-list">
                                        <div className="notification-item enhanced">
                                            <div className="notification-info">
                                                <h4>Основные уведомления</h4>
                                                <p>Важные обновления и уведомления системы</p>
                                            </div>
                                            <label className="switch enhanced">
                                                <input
                                                    type="checkbox"
                                                    checked={notificationSettings.emailNotifications}
                                                    onChange={() => handleNotificationToggle('emailNotifications')}
                                                />
                                                <span className="slider enhanced"></span>
                                            </label>
                                        </div>

                                        <div className="notification-item enhanced">
                                            <div className="notification-info">
                                                <h4>Напоминания о задачах</h4>
                                                <p>Уведомления о предстоящих дедлайнах</p>
                                            </div>
                                            <label className="switch enhanced">
                                                <input
                                                    type="checkbox"
                                                    checked={notificationSettings.taskReminders}
                                                    onChange={() => handleNotificationToggle('taskReminders')}
                                                />
                                                <span className="slider enhanced"></span>
                                            </label>
                                        </div>

                                        <div className="notification-item enhanced">
                                            <div className="notification-info">
                                                <h4>Ежедневный дайджест</h4>
                                                <p>Сводка задач на день каждое утро</p>
                                            </div>
                                            <label className="switch enhanced">
                                                <input
                                                    type="checkbox"
                                                    checked={notificationSettings.dailyDigest}
                                                    onChange={() => handleNotificationToggle('dailyDigest')}
                                                />
                                                <span className="slider enhanced"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="notification-category">
                                    <h3>📊 Отчеты и аналитика</h3>
                                    <div className="notifications-list">
                                        <div className="notification-item enhanced">
                                            <div className="notification-info">
                                                <h4>Недельный отчет</h4>
                                                <p>Статистика выполненных задач за неделю</p>
                                            </div>
                                            <label className="switch enhanced">
                                                <input
                                                    type="checkbox"
                                                    checked={notificationSettings.weeklyReport}
                                                    onChange={() => handleNotificationToggle('weeklyReport')}
                                                />
                                                <span className="slider enhanced"></span>
                                            </label>
                                        </div>

                                        <div className="notification-item enhanced">
                                            <div className="notification-info">
                                                <h4>Задача выполнена</h4>
                                                <p>Уведомление при завершении задачи</p>
                                            </div>
                                            <label className="switch enhanced">
                                                <input
                                                    type="checkbox"
                                                    checked={notificationSettings.taskCompleted}
                                                    onChange={() => handleNotificationToggle('taskCompleted')}
                                                />
                                                <span className="slider enhanced"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="notification-category">
                                    <h3>🎯 Дополнительные настройки</h3>
                                    <div className="notifications-list">
                                        <div className="notification-item enhanced">
                                            <div className="notification-info">
                                                <h4>Новые назначенные задачи</h4>
                                                <p>Когда вам назначают новую задачу</p>
                                            </div>
                                            <label className="switch enhanced">
                                                <input
                                                    type="checkbox"
                                                    checked={notificationSettings.newTaskAssigned}
                                                    onChange={() => handleNotificationToggle('newTaskAssigned')}
                                                />
                                                <span className="slider enhanced"></span>
                                            </label>
                                        </div>

                                        <div className="notification-item enhanced">
                                            <div className="notification-info">
                                                <h4>Маркетинговые рассылки</h4>
                                                <p>Новости и обновления платформы</p>
                                            </div>
                                            <label className="switch enhanced">
                                                <input
                                                    type="checkbox"
                                                    checked={notificationSettings.marketingEmails}
                                                    onChange={() => handleNotificationToggle('marketingEmails')}
                                                />
                                                <span className="slider enhanced"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer notifications-modal-footer">
                            <button
                                className="cancel-button"
                                onClick={() => setIsNotificationsConfigOpen(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className="save-button"
                                onClick={handleNotificationSettingsSave}
                            >
                                💾 Сохранить настройки
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Футер */}
            <footer className="app-footer-enhanced">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-stats">
                            <div className="stat-item">
                                <span className="stat-value">{tasks.length}</span>
                                <span className="stat-label">Всего задач</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{newTasks.length}</span>
                                <span className="stat-label">Новые</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{activeTasks.length}</span>
                                <span className="stat-label">Активные</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{completedTasks.length}</span>
                                <span className="stat-label">Выполнено</span>
                            </div>
                        </div>
                        <div className="footer-info">
                            <p>🎯 Перетаскивайте задачи между колонками • TaskFlow версия 1.0</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default App
import { useState, useEffect } from 'react'
import './App.css'

const GATEWAY_URL = "";
const AUTH_API_URL = `${GATEWAY_URL}/api/auth`;
const AUTH_API_URL_SIGNIN = `${AUTH_API_URL}/register`;
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


    useEffect(() => {
        checkAuthentication();
    }, []);

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
                console.log('🔍 User data from /validate:', userData);

                // Извлекаем userId ДО установки состояния
                const userId = userData.id || userData.userId || userData.sub;
                console.log('🔍 Extracted user ID:', userId);

                // Устанавливаем пользователя
                setUser({
                    id: userId,
                    username: userData.username,
                    email: userData.email,
                    name: userData.name || userData.username,
                    avatar: '👤',
                    joinDate: new Date().toLocaleDateString('ru-RU'),
                    role: userData.role || 'Пользователь',
                    department: userData.department || 'Отдел разработки'
                });

                setIsAuthenticated(true);
                setShowAuth(false);

                // Передаем userId напрямую в loadTasks
                await loadTasks(userId);

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

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');

        try {
            console.log('🔐 Sending login request...');

            const response = await fetch(`${AUTH_API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: authForm.username,
                    password: authForm.password
                })
            });

            console.log('📥 Response status:', response.status);

            const responseText = await response.text();
            console.log('📥 RAW response text:', responseText);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${responseText}`);
            }

            let authData;
            try {
                authData = JSON.parse(responseText);
                console.log('✅ Parsed JSON response:', authData);
            } catch (parseError) {
                console.error('❌ Not JSON. Raw response:', responseText);
                if (responseText.trim().length > 0) {
                    console.log('📝 Response is plain text, might be token directly');
                    authData = { accessToken: responseText.trim() };
                } else {
                    throw new Error('Empty response from server');
                }
            }

            const token = authData.access_token || authData.accessToken || authData.token || authData.jwt;

            if (!token) {
                console.error('❌ No token found in response. Available fields:', Object.keys(authData));
                throw new Error('No JWT token received from server');
            }

            console.log('🎉 JWT Token received');

            // Сохраняем токен
            localStorage.setItem('jwt', token);

            // Извлекаем userId ДО установки состояния
            const userId = authData.userId || authData.id;
            console.log('🔍 Extracted user ID from login:', userId);

            // Обновляем пользователя
            setUser({
                id: userId,
                username: authData.username || authForm.username,
                email: authData.email || `${authForm.username}@example.com`,
                name: authData.name || authForm.username,
                avatar: '👤',
                joinDate: new Date().toLocaleDateString('ru-RU'),
                role: authData.role || 'Пользователь',
                department: authData.department || 'Отдел разработки'
            });

            setIsAuthenticated(true);
            setShowAuth(false);

            // Передаем userId напрямую в loadTasks
            await loadTasks(userId);

        } catch (error) {
            console.error('❌ Login error:', error);
            setAuthError(error.message);
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
            const response = await fetch(`${AUTH_API_URL_SIGNIN}`, {
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

    const handleGoogleAuth = async () => {




                // Endpoint существует, перенаправляем
        window.location.href = `http://localhost:9000/oauth2/authorization/google`;


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

    // В начале компонента App
    console.log('🔐 Initial JWT:', localStorage.getItem('jwt'));

// В функции loadTasks
    const loadTasks = async (userIdFromAuth = null) => {
        const token = localStorage.getItem('jwt');
        console.log('🔐 JWT Token for tasks request:', token);

        if (!token) {
            console.error('❌ No JWT token found in localStorage');
            handleLogout();
            return;
        }

        try {
            console.log('📡 Loading all tasks from server');

            // Используем переданный userId или берем из state
            const currentUserId = userIdFromAuth || user.id;
            console.log('👤 Current user ID for filtering:', currentUserId);

            const response = await fetch(`${TASKS_API_URL}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📥 Response status:', response.status);

            if (response.ok) {
                const allTasks = await response.json();
                console.log('✅ All tasks loaded:', allTasks);

                if (currentUserId) {
                    const userTasks = allTasks.filter(task => {
                        const isUserTask = task.userId === currentUserId;
                        console.log(`📋 Task ${task.id}: userId=${task.userId}, currentUserId=${currentUserId}, match=${isUserTask}`);
                        return isUserTask;
                    });

                    console.log('🎯 Filtered tasks for current user:', userTasks);
                    setTasks(userTasks);
                } else {
                    console.error('❌ Current user ID not available');
                    // Временно показываем все задачи для отладки
                    console.log('⚠️ Showing ALL tasks for debugging');
                    setTasks(allTasks);
                }
            } else if (response.status === 401) {
                console.error('❌ 401 Unauthorized - token is invalid or expired');
                handleLogout();
            } else {
                console.error('❌ Failed to load tasks, status:', response.status);
            }
        } catch (error) {
            console.error('❌ Network error loading tasks:', error);
        }
    };

    const addTask = async () => {
        if (newTaskTitle.trim() === '') return;

        const token = localStorage.getItem('jwt');
        if (!token) {
            handleLogout();
            return;
        }

        try {
            const userId = user.id;

            if (!userId) {
                console.error('❌ User ID not found in addTask');
                // Попробуем перезагрузить задачи чтобы получить актуального пользователя
                await loadTasks();
                return;
            }

            console.log('📝 Creating task for user:', userId);

            const taskTitle = newTaskTitle.trim();
            setNewTaskTitle('');

            const response = await fetch(`${TASKS_API_URL}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: taskTitle,
                    description: '',
                    priority: 'medium',
                    userId: userId
                })
            });

            if (response.ok) {
                console.log('✅ Task created successfully');
                await loadTasks(userId); // Передаем userId при перезагрузке
            } else if (response.status === 401) {
                handleLogout();
            } else {
                console.error('❌ Failed to create task:', response.status);
                setNewTaskTitle(taskTitle);
            }
        } catch (error) {
            console.error('❌ Failed to add task:', error);
            setNewTaskTitle(taskTitle);
        }
    };

    const updateTask = async (updatedTask) => {
        const token = localStorage.getItem('jwt');
        if (!token) {
            handleLogout();
            return;
        }

        try {
            // Определяем статус только если он не задан явно
            let status = updatedTask.status;
            if (!status) {
                if (!updatedTask.active && !updatedTask.completed) {
                    status = 'NEW';
                } else if (updatedTask.active && !updatedTask.completed) {
                    status = 'IN_PROGRESS';
                } else if (updatedTask.completed) {
                    status = 'COMPLETED';
                }
            }

            console.log('🔄 Updating task:', {
                taskId: updatedTask.id,
                title: updatedTask.title,
                description: updatedTask.description,
                status: status
            });

            // Отправляем ВСЕ данные задачи
            const response = await fetch(`${TASKS_API_URL}/${updatedTask.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: updatedTask.title,
                    description: updatedTask.description,
                    status: status
                    // Можно добавить другие поля если нужно
                })
            });

            if (response.ok) {
                // Обновляем задачу в локальном состоянии
                setTasks(prev => prev.map(task =>
                    task.id === updatedTask.id ? { ...updatedTask, status: status } : task
                ));
                console.log('✅ Task updated successfully');
            } else if (response.status === 401) {
                handleLogout();
            } else {
                console.error('❌ Failed to update task:', response.status);
            }
        } catch (error) {
            console.error('❌ Failed to update task:', error);
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

        // Обновляем только статус, не трогая другие поля
        if (targetColumn === 'new') {
            updatedTask.status = 'NEW';
        } else if (targetColumn === 'active') {
            updatedTask.status = 'IN_PROGRESS';
        } else if (targetColumn === 'completed') {
            updatedTask.status = 'COMPLETED';
        }

        console.log('🎯 Task dropped to:', targetColumn, 'new status:', updatedTask.status);
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
    const newTasks = tasks.filter(task => task.status === 'NEW');
    const activeTasks = tasks.filter(task => task.status === 'IN_PROGRESS');
    const completedTasks = tasks.filter(task => task.status === 'COMPLETED');

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

                            <div className="auth-divider">
                                <span>или</span>
                            </div>

                            <button
                                type="button"
                                className="auth-social-btn google-btn"
                                onClick={handleGoogleAuth}
                                disabled={loading}
                            >
                                <div className="social-btn-content">
                                    <div className="google-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24">
                                            <path fill="#4285F4"
                                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853"
                                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05"
                                                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335"
                                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                    </div>
                                    <span className="social-btn-text">
            {loading ? 'Подключение...' : 'Продолжить с Google'}
        </span>
                                </div>
                            </button>

                            <div className="auth-switch">
                                {authMode === 'login' ? (
                                    <p>
                                        Нет аккаунта?{' '}
                                        <button type="button" onClick={switchAuthMode} className="auth-link"
                                                disabled={loading}>
                                            Зарегистрироваться
                                        </button>
                                    </p>
                                ) : (
                                    <p>
                                        Уже есть аккаунт?{' '}
                                        <button type="button" onClick={switchAuthMode} className="auth-link"
                                                disabled={loading}>
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
                                    <h3>📧 Уведомления</h3>
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

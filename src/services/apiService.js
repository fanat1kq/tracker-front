import { API_URLS, APP_CONFIG } from '../config/api';

class ApiService {
    constructor() {
        this.baseURL = process.env.REACT_APP_API_URL || '/api';
        this.timeout = APP_CONFIG.API_TIMEOUT;
    }

    // Базовый метод для HTTP запросов
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            timeout: this.timeout,
            ...options,
        };

        // Добавляем токен авторизации, если есть
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            config.signal = controller.signal;

            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Методы для задач
    async getTasks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `${API_URLS.TASKS.GET_ALL}?${queryString}` : API_URLS.TASKS.GET_ALL;
        return this.request(endpoint);
    }

    async getTaskById(id) {
        return this.request(API_URLS.TASKS.GET_BY_ID(id));
    }

    async createTask(taskData) {
        return this.request(API_URLS.TASKS.CREATE, {
            method: 'POST',
            body: JSON.stringify(taskData),
        });
    }

    async updateTask(id, taskData) {
        return this.request(API_URLS.TASKS.UPDATE(id), {
            method: 'PUT',
            body: JSON.stringify(taskData),
        });
    }

    async deleteTask(id) {
        return this.request(API_URLS.TASKS.DELETE(id), {
            method: 'DELETE',
        });
    }

    async getTaskStats() {
        return this.request(API_URLS.TASKS.STATS);
    }

    // Методы для пользователей
    async getUserProfile() {
        return this.request(API_URLS.USERS.UPDATE_PROFILE);
    }

    async updateUserProfile(profileData) {
        return this.request(API_URLS.USERS.UPDATE_PROFILE, {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    }

    async changePassword(passwordData) {
        return this.request(API_URLS.USERS.CHANGE_PASSWORD, {
            method: 'PUT',
            body: JSON.stringify(passwordData),
        });
    }

    // Методы для уведомлений
    async getNotificationSettings() {
        return this.request(API_URLS.NOTIFICATIONS.SETTINGS);
    }

    async updateNotificationSettings(settings) {
        return this.request(API_URLS.NOTIFICATIONS.SETTINGS, {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
    }

    // Методы для файлов
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        return this.request(API_URLS.FILES.UPLOAD, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
            body: formData,
        });
    }

    // Системные методы
    async healthCheck() {
        return this.request(API_URLS.SYSTEM.HEALTH);
    }

    async getSystemStatus() {
        return this.request(API_URLS.SYSTEM.STATUS);
    }
}

// Создаем экземпляр сервиса
const apiService = new ApiService();

export default apiService;
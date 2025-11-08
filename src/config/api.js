// Конфигурация API endpoints
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const API_URLS = {
    // Аутентификация
    AUTH: {
        LOGIN: `${API_BASE_URL}/auth/login`,
        REGISTER: `${API_BASE_URL}/auth/register`,
        LOGOUT: `${API_BASE_URL}/auth/logout`,
        REFRESH_TOKEN: `${API_BASE_URL}/auth/refresh`,
        PROFILE: `${API_BASE_URL}/auth/profile`,
    },

    // Задачи
    TASKS: {
        BASE: `${API_BASE_URL}/tasks`,
        GET_ALL: `${API_BASE_URL}/tasks`,
        GET_BY_ID: (id) => `${API_BASE_URL}/tasks/${id}`,
        CREATE: `${API_BASE_URL}/tasks`,
        UPDATE: (id) => `${API_BASE_URL}/tasks/${id}`,
        DELETE: (id) => `${API_BASE_URL}/tasks/${id}`,
        BULK_UPDATE: `${API_BASE_URL}/tasks/bulk`,
        SEARCH: `${API_BASE_URL}/tasks/search`,
        STATS: `${API_BASE_URL}/tasks/stats`,
    },

    // Пользователи
    USERS: {
        BASE: `${API_BASE_URL}/users`,
        GET_ALL: `${API_BASE_URL}/users`,
        GET_BY_ID: (id) => `${API_BASE_URL}/users/${id}`,
        UPDATE_PROFILE: `${API_BASE_URL}/users/profile`,
        CHANGE_PASSWORD: `${API_BASE_URL}/users/password`,
        UPLOAD_AVATAR: `${API_BASE_URL}/users/avatar`,
    },

    // Настройки уведомлений
    NOTIFICATIONS: {
        BASE: `${API_BASE_URL}/notifications`,
        SETTINGS: `${API_BASE_URL}/notifications/settings`,
        PREFERENCES: `${API_BASE_URL}/notifications/preferences`,
        EMAIL_SETTINGS: `${API_BASE_URL}/notifications/email`,
    },

    // Категории и теги
    CATEGORIES: {
        BASE: `${API_BASE_URL}/categories`,
        GET_ALL: `${API_BASE_URL}/categories`,
        CREATE: `${API_BASE_URL}/categories`,
        UPDATE: (id) => `${API_BASE_URL}/categories/${id}`,
        DELETE: (id) => `${API_BASE_URL}/categories/${id}`,
    },

    // Файлы и вложения
    FILES: {
        BASE: `${API_BASE_URL}/files`,
        UPLOAD: `${API_BASE_URL}/files/upload`,
        DOWNLOAD: (id) => `${API_BASE_URL}/files/${id}`,
        DELETE: (id) => `${API_BASE_URL}/files/${id}`,
    },

    // Команды и совместная работа
    TEAMS: {
        BASE: `${API_BASE_URL}/teams`,
        GET_ALL: `${API_BASE_URL}/teams`,
        CREATE: `${API_BASE_URL}/teams`,
        INVITE: (id) => `${API_BASE_URL}/teams/${id}/invite`,
        MEMBERS: (id) => `${API_BASE_URL}/teams/${id}/members`,
    },

    // Отчеты и аналитика
    REPORTS: {
        BASE: `${API_BASE_URL}/reports`,
        DAILY: `${API_BASE_URL}/reports/daily`,
        WEEKLY: `${API_BASE_URL}/reports/weekly`,
        MONTHLY: `${API_BASE_URL}/reports/monthly`,
        PRODUCTIVITY: `${API_BASE_URL}/reports/productivity`,
    },

    // Системные endpoints
    SYSTEM: {
        HEALTH: `${API_BASE_URL}/health`,
        STATUS: `${API_BASE_URL}/status`,
        CONFIG: `${API_BASE_URL}/config`,
        LOGS: `${API_BASE_URL}/logs`,
    }
};

// Конфигурация приложения
export const APP_CONFIG = {
    APP_NAME: 'TaskFlow',
    VERSION: '1.0.0',
    API_TIMEOUT: 10000,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    SUPPORTED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 20,
        MAX_PAGE_SIZE: 100,
    },
    FEATURES: {
        DRAG_AND_DROP: true,
        REAL_TIME_UPDATES: true,
        FILE_UPLOAD: true,
        TEAM_COLLABORATION: true,
        ADVANCED_REPORTS: true,
    }
};

export default API_URLS;
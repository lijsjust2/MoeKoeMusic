// src/services/request.js
import axios from 'axios';
import { MoeAuthStore } from '../stores/store';

// 创建一个 axios 实例
const getBaseURL = () => {
    // 优先使用本地API
    const localAPI = 'http://localhost:6521';
    
    try {
        // 尝试从localStorage读取设置
        const settings = localStorage.getItem('settings');
        if (settings) {
            try {
                const parsedSettings = JSON.parse(settings);
                // 如果用户明确设置了强制使用自定义API，则使用用户配置的API
                if (parsedSettings.forceUseCustomAPI && parsedSettings.apiServer && parsedSettings.apiServer.trim()) {
                    return parsedSettings.apiServer.trim();
                }
            } catch (error) {
                console.error('解析设置出错:', error);
            }
        }
    } catch (e) {
        console.error('检查设置出错:', e);
    }
    
    // 优先返回本地API地址
    return localAPI;
};

const httpClient = axios.create({
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// 在请求拦截器中动态设置baseURL，确保每次请求都使用最新的配置
httpClient.interceptors.request.use(
    config => {
        // 每次请求前动态获取最新的baseURL
        config.baseURL = getBaseURL();
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// 请求拦截器
httpClient.interceptors.request.use(
    config => {
        const MoeAuth = MoeAuthStore();
        const token = MoeAuth.UserInfo?.token;
        const userid = MoeAuth.UserInfo?.userid;

        if (token && userid) {
            const cookieParam = `cookie=token=${encodeURIComponent(token)};userid=${encodeURIComponent(userid)}`;
            config.url += config.url.includes('?') ? `&${cookieParam}` : `?${cookieParam}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// 响应拦截器
httpClient.interceptors.response.use(
    response => {
        return response.data;
    },
    error => {
        // 确保$message可用
        const showError = (message) => {
            if (window.$message) {
                $message.error(message);
            } else {
                console.error(message);
                alert(message);
            }
        };
        
        if (error.response) {
            console.error(`http error status:${error.response.status}`,error.response.data);
            if (error.response?.data?.data) {
                console.error(error.response.data.data);
                showError(error.response.data.data || '服务器错误,请稍后再试!');
            } else {
                showError('服务器错误,请稍后再试!');
            }
        } else if (error.request) {
            console.error('No response received:', error.request);
            showError('无法连接到API服务器，请检查网络连接或服务器地址!');
        } else {
            console.error('Error:', error.message);
            showError('请求错误,请稍后再试!');
        }
        return Promise.reject(error);
    }
);

// 封装 GET 请求
export const get = async (url, params = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = await httpClient.get(url, { params, ...config });
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// 封装 POST 请求
export const post = async (url, data = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = await httpClient.post(url, data, config);
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// 封装 PUT 请求
export const put = async (url, data = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = await httpClient.put(url, data, config);
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// 封装 DELETE 请求
export const del = async (url, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = await httpClient.delete(url, config);
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// 封装 PATCH 请求
export const patch = async (url, data = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = await httpClient.patch(url, data, config);
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// 封装上传图片请求
export const uploadImage = async (url, file, additionalData = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        // 如果有其他数据（如关联的商品信息等），也可以添加到 formData
        for (const key in additionalData) {
            if (Object.prototype.hasOwnProperty.call(additionalData, key)) {
                formData.append(key, additionalData[key]);
            }
        }

        // 需要确保 Content-Type 被设置为 multipart/form-data
        const response = await httpClient.post(url, formData, {
            ...config,
            headers: {
                ...config.headers,
                'Content-Type': 'multipart/form-data'
            }
        });

        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// 导出 httpClient 以便在需要的时候直接使用 axios 实例
export default httpClient;
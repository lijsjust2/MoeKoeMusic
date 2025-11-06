import { defineStore } from 'pinia';

export const MoeAuthStore = defineStore('MoeData', {
    state: () => ({
        UserInfo: null, // 用户信息
        Config: null, // 配置信息
    }),
    actions: {
        fetchConfig(key) {
            if (!this.Config) return null;
            const configItem = this.Config.find(item => item.key === key);
            return configItem ? configItem.value : null;
        },
        setData(data) {
            if (data.UserInfo) this.UserInfo = data.UserInfo;
            if (data.Config) this.Config = data.Config;
        },
        clearData() {
            this.UserInfo = null; // 清除用户信息
        }
    },
    getters: {
        isAuthenticated: (state) => {
            // 详细检查UserInfo对象是否存在且有效
            return state.UserInfo !== null && state.UserInfo !== undefined;
        },
    },
    persist: {
        enabled: true, 
        strategies: [
            {
                key: 'MoeData', 
                storage: localStorage,
                paths: ['UserInfo', 'Config'], 
            },
        ],
    },
});
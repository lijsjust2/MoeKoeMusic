<template>
    <Header />
    <main>
        <div v-if="!isOnline" class="network-status">
            网络连接已断开
        </div>
        <router-view :playerControl="playerControl"></router-view>
    </main>
    <PlayerControl ref="playerControl" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Header from "@/components/Header.vue";
import PlayerControl from "@/components/PlayerControl.vue";
import { setTheme, applyColorTheme } from '../utils/utils';
const playerControl = ref(null);
const isOnline = ref(navigator.onLine);

// 监听网络状态变化
const handleNetworkChange = (online) => {
    isOnline.value = online;
    
    const title = online ? '网络已连接' : '网络已断开';
    const body = online ? '您已恢复网络连接' : '请检查网络设置';
    
    new Notification(title, {
        body,
        icon: './assets/images/logo.png'
    });
};

onMounted(() => {
    const savedConfig = JSON.parse(localStorage.getItem('settings'));
    if (savedConfig) {
        applyColorTheme(savedConfig['themeColor']);
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    }

    // 添加网络状态监听
    window.addEventListener('online', () => handleNetworkChange(true));
    window.addEventListener('offline', () => handleNetworkChange(false));
    
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
});

// 组件卸载时移除事件监听
onUnmounted(() => {
    window.removeEventListener('online', () => handleNetworkChange(true));
    window.removeEventListener('offline', () => handleNetworkChange(false));
});
</script>

<style>
:root {
  --primary-color: #3498db;
  --primary-light: #5dade2;
  --primary-dark: #2874a6;
  --text-color: #333;
  --text-light: #666;
  --text-lighter: #999;
  --background-color: #f5f5f5;
  --secondary-color: #fff;
  --border-color: #e0e0e0;
  --hover-color: #f0f0f0;
  --color-secondary-bg-for-transparent: rgba(209, 209, 214, 0.28);
  --color-box-shadow: rgba(0, 0, 0, 0.1);
  --background-color-secondary: #fff;
}

/* 保留滚动条但美化 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #999;
}

* {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  user-select: none;
}

html, body {
  background-color: var(--background-color);
  color: var(--text-color);
  height: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

main {
  min-height: calc(100vh - 120px);
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  padding-bottom: 80px;
}

a {
  text-decoration: none;
  color: inherit;
  display: block;
}

.network-status {
  position: fixed;
  top: 80px;
  left: 0;
  right: 0;
  background-color: #ff4757;
  color: white;
  text-align: center;
  padding: 8px;
  z-index: 1000;
}

/* 响应式调整 */
@media (max-width: 768px) {
  main {
    padding: 10px;
    padding-bottom: 80px;
  }
}

/* 全局卡片样式 */
.card {
  background: var(--secondary-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 按钮通用样式 */
.btn {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn:hover {
  background: var(--primary-dark);
}

.btn-outline {
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover {
  background: var(--primary-color);
  color: white;
}
</style>

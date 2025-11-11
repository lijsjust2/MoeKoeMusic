<template>
  <RouterView v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <keep-alive :include="['Home', 'Lyrics', 'Radio']">
        <component :is="Component" />
      </keep-alive>
    </transition>
  </RouterView>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

onMounted(() => {
  // 初始化应用
});
</script>

<style>
:root {
  --primary-color: #ff5787;
  --primary-color-dark: #e04a75;
  --primary-color-light: rgba(255, 87, 135, 0.1);
  --text-primary: #333;
  --text-secondary: #666;
  --background-color: #f5f5f5;
  --card-background: #fff;
  --card-hover: #f8f8f8;
  --border-color: #e0e0e0;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark-theme {
  --primary-color: #ff7a9d;
  --primary-color-dark: #ff9ab3;
  --primary-color-light: rgba(255, 122, 157, 0.2);
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --background-color: #121212;
  --card-background: #1e1e1e;
  --card-hover: #252525;
  --border-color: #333;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background-color: var(--background-color);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
}

/* 路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 选择文本样式 */
::selection {
  background-color: var(--primary-color);
  color: white;
}

/* 全局按钮样式重置 */
button {
  font-family: inherit;
  cursor: pointer;
}

/* 全局输入框样式重置 */
input,
textarea,
select {
  font-family: inherit;
}

/* 链接样式 */
a {
  color: var(--primary-color);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: var(--primary-color-dark);
}
</style>
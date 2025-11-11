<template>
    <!-- 弹窗已彻底移除，不再显示 -->
</template>

<script setup>
import { onMounted } from 'vue';

// 初始化时立即设置为已接受状态，防止任何地方的弹窗显示逻辑被触发
onMounted(() => {
    // 确保在localStorage中设置已接受标志
    if(typeof localStorage !== 'undefined') {
        localStorage.setItem('disclaimerAccepted', 'true');
        localStorage.setItem('agreedToTerms', 'true');
        localStorage.setItem('termsAccepted', 'true');
    }
    
    // 全局变量设置，确保任何引用都能识别已接受状态
    if (typeof window !== 'undefined') {
        window.disclaimerAccepted = true;
        window.agreedToTerms = true;
    }
    
    // 如果是Electron环境，主动发送接受响应
    if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('disclaimer-response', true);
        window.electron.ipcRenderer.send('terms-accepted', true);
    }
});
</script>

<style scoped>
/* 样式已移除，因为弹窗不再显示 */
</style>
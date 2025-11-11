<template>
    <div class="fullscreen-queue-container">
        <!-- 顶部导航栏 -->
        <div class="queue-header">
            <button class="back-btn" @click="goBack"><i class="fas fa-arrow-left"></i></button>
            <h1>{{ $t('bo-fang-lie-biao') }} ({{ musicQueueStore.queue.length }})</h1>
            <div class="header-actions">
                <button class="header-action-btn" @click="toggleSortMode" :class="{ 'active': isSortingMode }" :title="isSortingMode ? $t('guan-bi-pai-xu') : $t('kai-qi-pai-xu')">
            <i :class="isSortingMode ? 'fas fa-grip-vertical' : 'fas fa-grip-vertical'"></i>
        </button>
                <button class="header-action-btn" @click="clearQueue" title="{{ $t('qing-kong-lie-biao') }}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>

        <!-- 播放列表内容区域 - 留出底部播放器空间 -->
        <div class="queue-content">
            <div v-if="musicQueueStore.queue.length === 0" class="empty-queue">
                <i class="fas fa-music"></i>
                <p>{{ $t('lie-biao-wei-kong') }}</p>
                <button class="add-music-btn" @click="goBack">{{ $t('tian-jia-ge-quo') }}</button>
            </div>
            
            <template v-else>
                <!-- 表头 -->
                <div class="queue-table-header">
                    <div class="queue-col index-col">{{ $t('序号') }}</div>
                    <div class="queue-col title-col">{{ $t('歌曲') }}</div>
                    <div class="queue-col artist-col">{{ $t('歌手') }}</div>
                    <div class="queue-col time-col">{{ $t('时长') }}</div>
                    <div class="queue-col action-col">{{ $t('操作') }}</div>
                </div>
                
                <!-- 歌曲列表 -->
                <RecycleScroller 
                    :items="musicQueueStore.queue" 
                    :item-size="50" 
                    key-field="id" 
                    :buffer="200"
                    :items-limit="2000" 
                    :prerender="Math.min(10, musicQueueStore.queue.length)" 
                    ref="queueScroller"
                    class="queue-list"
                >
                    <template #default="{ item, index }">
                        <div 
                        class="queue-item" 
                        :class="{ 'playing': currentSong.hash == item.hash, 'sorting-active': isSortingMode }"
                        :key="item.id"
                        @dblclick="!isSortingMode && playQueueItem(item)"
                    >
                            <div class="queue-col index-col">
                                <template v-if="isSortingMode">
                                <div class="sort-icon-wrapper">
                                    <i class="fas fa-grip-vertical sort-icon" :title="$t('chang-an-tuo-yi')"></i>
                                </div>
                            </template>
                            <template v-else>
                                <div class="index-number">{{ index + 1 }}</div>
                            </template>
                            </div>
                            
                            <div class="queue-col title-col">
                                <div class="song-info">
                                    <div class="song-title" @click="!isSortingMode && playQueueItem(item)" style="cursor: pointer;">
                                        {{ item.name }}
                                        <i class="play-hint fas fa-play"></i>
                                    </div>
                                    <div v-if="currentSong.hash == item.hash" class="playing-indicator">
                                        <i class="fas fa-music"></i>
                                        <div class="audio-wave">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="queue-col artist-col">{{ item.author }}</div>
                            
                            <div class="queue-col time-col">{{ $formatMilliseconds(item.timeLength) }}</div>
                            
                            <div class="queue-col action-col">
                                <button class="action-btn" @click.stop="removeSongFromQueue(index)" :title="$t('shan-chu')">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </template>
                </RecycleScroller>
            </template>
        </div>
        
        <!-- 底部固定播放器 -->
        <div class="player-wrapper">
            <PlayerControl @addSongToQueue="handleAddSongToQueue" 
                          @addCloudMusicToQueue="handleAddCloudMusicToQueue"
                          @addLocalMusicToQueue="handleAddLocalMusicToQueue"/>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { RecycleScroller } from 'vue3-virtual-scroller';
import { useMusicQueueStore } from '../stores/musicQueue';
import PlayerControl from '../components/PlayerControl.vue';
import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css';
// 导入SortableJS用于拖拽排序
import Sortable from 'sortablejs';

let sortableInstance = null;

const router = useRouter();
const route = useRoute();
const musicQueueStore = useMusicQueueStore();
const queueScroller = ref(null);

// 从父组件接收当前播放的歌曲信息
const props = defineProps({
    currentSong: {
        type: Object,
        default: () => ({})
    }
});

// 排序模式状态
const isSortingMode = ref(false);

const emit = defineEmits(['update:showQueue', 'addSongToQueue', 'addCloudMusicToQueue', 'addLocalMusicToQueue']);

// 处理添加歌曲到队列的事件
const handleAddSongToQueue = async (hash, name, img, author) => {
    console.log('[FullScreenQueue] 播放器请求添加歌曲:', name);
    emit('addSongToQueue', hash, name, img, author);
};

const handleAddCloudMusicToQueue = async (hash, name, author, timeLength, img) => {
    console.log('[FullScreenQueue] 播放器请求添加云盘歌曲:', name);
    emit('addCloudMusicToQueue', hash, name, author, timeLength, img);
};

const handleAddLocalMusicToQueue = async (localSong) => {
    console.log('[FullScreenQueue] 播放器请求添加本地歌曲:', localSong.name);
    emit('addLocalMusicToQueue', localSong);
};

// 计算总时长
const totalDuration = computed(() => {
    return musicQueueStore.queue.reduce((total, song) => total + (song.timeLength || 0), 0);
});

// 从队列中删除歌曲
const removeSongFromQueue = (index) => {
    const updatedQueue = [...musicQueueStore.queue];
    updatedQueue.splice(index, 1);
    updatedQueue.forEach((song, i) => {
        song.id = i + 1;
    });
    musicQueueStore.setQueue(updatedQueue);
};

// 播放队列中的歌曲项
const playQueueItem = (item) => {
    console.log('[FullScreenQueue] 点击播放队列中的歌曲:', item.name);
    
    // 播放歌曲
    if (item.isCloud) {
        emit('addCloudMusicToQueue', item.hash, item.name, item.author, item.timeLength, item.img);
    } else if (item.isLocal) {
        emit('addLocalMusicToQueue', item);
    } else {
        emit('addSongToQueue', item.hash, item.name, item.img, item.author);
    }
    
    // 滚动到当前播放歌曲位置
    scrollToCurrentSong(item.hash);
};

// 清空播放列表
const clearQueue = () => {
    if (confirm($t('que-ren-yao-qing-kong-lie-biao-ma'))) {
        musicQueueStore.clearQueue();
    }
};

// 滚动到当前播放歌曲位置
const scrollToCurrentSong = async (hash) => {
    await nextTick();
    if (queueScroller.value) {
        const currentIndex = musicQueueStore.queue.findIndex(song => song.hash === hash);
        if (currentIndex !== -1) {
            queueScroller.value.scrollToItem(currentIndex);
        }
    }
};

// 返回上一页，确保播放器继续工作
const goBack = () => {
    console.log('[FullScreenQueue] 返回上一页，保持播放器运行状态');
    // 确保不会停止当前播放状态
    if (route.params.from) {
        // 记录播放状态
        const wasPlaying = window.audioElement?.paused === false;
        router.push({ path: route.params.from }).then(() => {
            // 路由跳转后，如果之前是播放状态，确保继续播放
            if (wasPlaying && window.audioElement && window.audioElement.paused) {
                window.audioElement.play().catch(err => {
                    console.log('[FullScreenQueue] 尝试恢复播放失败:', err);
                    // 静默失败，不影响用户体验
                });
            }
        });
    } else {
        // 记录播放状态
        const wasPlaying = window.audioElement?.paused === false;
        router.back().then(() => {
            // 路由跳转后，如果之前是播放状态，确保继续播放
            if (wasPlaying && window.audioElement && window.audioElement.paused) {
                window.audioElement.play().catch(err => {
                    console.log('[FullScreenQueue] 尝试恢复播放失败:', err);
                    // 静默失败，不影响用户体验
                });
            }
        });
    }
};

// 切换排序模式
const toggleSortMode = async () => {
    isSortingMode.value = !isSortingMode.value;
    console.log('[FullScreenQueue] 排序模式:', isSortingMode.value ? '开启' : '关闭');
    // 短暂延迟以确保DOM更新完成
    await new Promise(resolve => setTimeout(resolve, 100));
    // 重新初始化拖拽功能
    initDragSort();
};

// 实现拖拽排序功能
const initDragSort = async () => {
    await nextTick();
    
    // 获取滚动器的容器元素
    const scrollerContainer = document.querySelector('.queue-list .virtual-list');
    if (scrollerContainer) {
        // 如果已经有实例，先销毁
        if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null;
        }
        
        // 只有在排序模式下才创建拖拽实例
        if (isSortingMode.value && !sortableInstance) {
            // 修复虚拟滚动中的拖拽问题
            // 确保正确选择队列项元素
            const queueItems = scrollerContainer.querySelectorAll('.queue-item');
            console.log('[FullScreenQueue] 找到队列项数量:', queueItems.length);
            
            sortableInstance = new Sortable(scrollerContainer, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                handle: '.sort-icon-wrapper', // 调整选择器为排序图标容器
                disabled: false, // 现在由toggleSortMode控制
                forceFallback: true, // 强制使用JavaScript实现拖拽，避免原生拖拽问题
                fallbackClass: 'sortable-fallback',
                fallbackOnBody: true,
                preventOnFilter: false,
                filter: () => !isSortingMode.value, // 非排序模式下禁用
                onEnd: (evt) => {
                    // evt.oldIndex: 拖拽前的索引
                    // evt.newIndex: 拖拽后的索引
                    console.log('[FullScreenQueue] 拖拽结束:', evt.oldIndex, '->', evt.newIndex);
                    handleDragEnd(evt.oldIndex, evt.newIndex);
                },
                onStart: () => {
                    console.log('[FullScreenQueue] 开始拖拽');
                },
                onMove: (evt) => {
                    // 解决虚拟滚动中的索引问题
                    return true;
                }
            });
            
            console.log('[FullScreenQueue] 拖拽功能初始化完成');
        }
    } else {
        console.error('[FullScreenQueue] 未找到滚动器容器');
    }
};

// 处理拖拽结束事件
const handleDragEnd = (oldIndex, newIndex) => {
    // 创建队列的副本以进行排序
    const updatedQueue = [...musicQueueStore.queue];
    
    // 找到实际的拖拽项目
    const movedItem = updatedQueue[oldIndex];
    
    // 从原位置移除
    updatedQueue.splice(oldIndex, 1);
    
    // 插入到新位置
    updatedQueue.splice(newIndex, 0, movedItem);
    
    // 更新所有项目的ID
    updatedQueue.forEach((song, i) => {
        song.id = i + 1;
    });
    
    // 更新队列状态
    musicQueueStore.setQueue(updatedQueue);
    
    console.log(`[FullScreenQueue] 歌曲已从位置 ${oldIndex + 1} 移动到 ${newIndex + 1}`);
};

// 监听滚动事件以确保拖拽功能在滚动后仍能正常工作
onMounted(async () => {
    await nextTick();
    if (props.currentSong.hash) {
        scrollToCurrentSong(props.currentSong.hash);
    }
    
    // 监听滚动事件以确保拖拽功能在滚动后仍能正常工作
    const scrollerContainer = document.querySelector('.queue-list');
    if (scrollerContainer) {
        scrollerContainer.addEventListener('scroll', handleScroll);
    }
    
    // 监听当前播放歌曲变化
    watch(() => props.currentSong.hash, (newHash) => {
        if (newHash) {
            scrollToCurrentSong(newHash);
        }
    });
});

// 已在文件顶部导入了所需的Vue组件，此处添加watch导入到顶部

// 处理滚动事件，确保拖拽功能在滚动后仍能正常工作
const handleScroll = async () => {
    if (sortableInstance && isSortingMode.value) {
        // 临时禁用拖拽
        sortableInstance.option('disabled', true);
        // 重新初始化拖拽以适应新的可见元素
        setTimeout(() => {
            if (sortableInstance && isSortingMode.value) {
                initDragSort();
            }
        }, 100);
    }
};

// 组件卸载时，清理Sortable实例
onUnmounted(() => {
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
    
    const scrollerContainer = document.querySelector('.queue-list');
    if (scrollerContainer) {
        scrollerContainer.removeEventListener('scroll', handleScroll);
    }
});
</script>

<style scoped>
/* 排序模式提示 */
.sort-mode-badge {
  font-size: 12px;
  padding: 2px 8px;
  background-color: var(--primary-color);
  color: white;
  border-radius: 12px;
  margin-left: 10px;
  font-weight: normal;
  vertical-align: middle;
}

/* 排序模式提示框 */
.sort-mode-tooltip {
  position: absolute;
  top: 60px;
  right: 20px;
  background-color: var(--tooltip-background);
  color: var(--tooltip-text);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

.sort-mode-tooltip::before {
  content: '';
  position: absolute;
  top: -8px;
  right: 15px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid var(--tooltip-background);
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 序号和排序图标容器 */
.index-number {
  min-width: 24px;
  text-align: center;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.sort-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.sort-icon-wrapper:hover {
  transform: scale(1.1);
}

/* 主题变量补充 */
:root {
  --tooltip-background: rgba(0, 0, 0, 0.8);
  --tooltip-text: #ffffff;
  --primary-color-light: rgba(52, 152, 219, 0.1);
}
</style>

<style scoped>
/* 拖拽排序相关样式 */
.sortable-ghost {
    opacity: 0.6;
    background-color: var(--hover-color) !important;
    border: 2px dashed var(--primary-color);
    height: 70px !important; /* 确保高度一致 */
}

.sortable-chosen {
    background-color: var(--primary-color-light) !important;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    transform: scale(1.02);
}

.sortable-drag {
    opacity: 0.9;
    background-color: var(--header-background);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    transform: rotate(2deg);
    transition: all 0.2s ease;
    z-index: 9999 !important;
}

/* Fallback样式，强制使用JavaScript拖拽 */
.sortable-fallback {
    background-color: var(--header-background);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    opacity: 0.95;
    border-radius: 4px;
    z-index: 9999 !important;
}

/* 增强排序图标的可点击区域 */
.sort-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
    cursor: grab;
    width: 40px;
    height: 40px;
    border-radius: 6px;
}

.sort-icon-wrapper:hover {
    transform: scale(1.1);
    background-color: var(--hover-color);
}

.sort-icon-wrapper:active {
    cursor: grabbing;
    transform: scale(0.95);
}

/* 排序图标样式 */
.sort-icon {
    cursor: grab;
    color: var(--text-secondary);
    font-size: 18px;
    transition: all 0.3s ease;
    padding: 5px;
    border-radius: 4px;
    user-select: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
}

.sort-icon:hover {
    color: var(--primary-color);
    background-color: var(--hover-color);
    transform: scale(1.05);
}

.sort-icon:active {
    cursor: grabbing;
    transform: scale(0.95);
}

/* 排序模式下的样式 */
.queue-item.sorting-active {
    cursor: default;
    position: relative;
}

.queue-item.sorting-active::before {
    content: '';
    position: absolute;
    left: 5px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 70%;
    background-color: transparent;
    border-radius: 3px;
}

/* 拖拽时的视觉效果 */
.sortable-ghost {
    opacity: 0.6;
    background-color: var(--hover-color) !important;
    border: 2px dashed var(--primary-color);
}

.sortable-chosen {
    background-color: var(--primary-color-light) !important;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}

.sortable-drag {
    opacity: 0.9;
    background-color: var(--header-background);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    transform: rotate(2deg);
    transition: all 0.2s ease;
}

/* 排序模式下的高亮效果 */
.header-action-btn.active {
    color: var(--primary-color);
    background-color: var(--primary-color-light);
    transform: scale(1.05);
}

.header-action-btn.active i {
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.8;
        transform: scale(1.1);
    }
}

/* 移动端触摸优化 */
@media (max-width: 768px) {
    .sort-icon {
        font-size: clamp(16px, 4vw, 20px);
        padding: 8px;
        width: clamp(32px, 8vw, 36px);
        height: clamp(32px, 8vw, 36px);
    }
    
    .queue-item.sorting-active {
        padding-left: 15px;
    }
    
    .sortable-drag {
        transform: rotate(1deg);
    }
}

.fullscreen-queue-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: var(--background-color);
    color: var(--text-color);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    overflow: hidden;
    animation: slideIn 0.3s ease-out;
    position: relative;
}

@keyframes slideIn {
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.queue-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    background: var(--header-background);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 10;
}

.back-btn {
    background: none;
    border: none;
    color: var(--text-color);
    font-size: 24px;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.back-btn:hover {
    background-color: var(--hover-color);
    transform: scale(1.1);
}

.queue-header h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.header-actions {
    display: flex;
    gap: 10px;
}

.header-action-btn {
    background: none;
    border: none;
    color: var(--text-color);
    font-size: 20px;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.header-action-btn:hover {
    background-color: var(--hover-color);
    transform: scale(1.1);
}

.header-action-btn:hover::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    transform: translate(-50%, -50%);
    animation: ripple 0.6s ease-out;
}

@keyframes ripple {
    0% {
        width: 0;
        height: 0;
    }
    100% {
        width: 100px;
        height: 100px;
        opacity: 0;
    }
}

.queue-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    /* 留出底部播放器的空间 */
    padding-bottom: 80px;
}

/* 底部播放器容器 */
.player-wrapper {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
}

.empty-queue {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
}

.empty-queue i {
    font-size: 64px;
    margin-bottom: 20px;
    opacity: 0.5;
}

.empty-queue p {
    font-size: 18px;
    margin-bottom: 30px;
}

.add-music-btn {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 30px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    z-index: 1;
}

.add-music-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: all 0.6s ease;
    z-index: -1;
}

.add-music-btn:hover {
    background: var(--primary-hover);
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}

.add-music-btn:hover::before {
    left: 100%;
}

.queue-table-header {
    display: flex;
    padding: 15px 20px;
    background: var(--table-header-background);
    font-weight: 600;
    font-size: 14px;
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.queue-col {
    display: flex;
    align-items: center;
}

.index-col {
    width: 80px;
    flex-shrink: 0;
    text-align: center;
}

.title-col {
    flex: 2;
    padding: 0 15px;
    min-width: 200px;
}

.artist-col {
    flex: 1;
    padding: 0 15px;
    min-width: 150px;
}

.time-col {
    width: 100px;
    flex-shrink: 0;
    text-align: center;
}

.action-col {
    width: 120px;
    flex-shrink: 0;
    justify-content: center;
    gap: 10px;
}

.queue-list {
    flex: 1;
    overflow: auto;
    /* 确保列表内容不会被吸顶表头挡住 */
    padding-top: 0;
}

/* 滚动条样式优化 */
.queue-list::-webkit-scrollbar {
    width: 8px;
}

.queue-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
}

.queue-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    transition: background 0.3s ease;
}

.queue-list::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}

.queue-list::-webkit-scrollbar-corner {
    background: transparent;
}

.queue-item {
    display: flex;
    align-items: center;
    padding: 10px 20px;
    border-bottom: 1px solid var(--border-color);
    transition: all 0.3s ease;
    position: relative;
    animation: itemFadeIn 0.3s ease-out;
    height: 100%;
    box-sizing: border-box;
}

@keyframes itemFadeIn {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.queue-item:hover {
    background-color: var(--hover-color);
    transform: translateX(4px);
}

.queue-item.playing {
    background-color: var(--primary-color-light);
    color: var(--primary-color);
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-left: 3px solid var(--primary-color);
    padding-left: 17px; /* 补偿左边框宽度 */
}

.song-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.song-title {
    font-weight: 500;
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.queue-item.playing .playing-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--primary-color);
    font-size: 12px;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% {
        opacity: 1;
    }
    50% {
        opacity: 0.7;
    }
    100% {
        opacity: 1;
    }
}

.audio-wave {
    display: flex;
    align-items: center;
    gap: 2px;
}

.audio-wave span {
    display: inline-block;
    width: 3px;
    height: 12px;
    background: var(--primary-color);
    border-radius: 3px;
    animation: wave 1.2s infinite ease-in-out;
}

/* 在播放中的歌曲中使波形动画更明显 */
.queue-item.playing .audio-wave span {
    height: 15px;
    animation-duration: 0.8s;
}

.audio-wave span:nth-child(1) { animation-delay: 0s; }
.audio-wave span:nth-child(2) { animation-delay: 0.15s; }
.audio-wave span:nth-child(3) { animation-delay: 0.3s; }
.audio-wave span:nth-child(4) { animation-delay: 0.45s; }

@keyframes wave {
    0%, 100% { height: 4px; }
    50% { height: 14px; }
}

.action-btn {
    background: none;
    border: none;
    color: var(--text-color);
    font-size: 16px;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.3s ease;
    opacity: 0.7;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}

.action-btn:hover {
    background-color: var(--hover-color);
    opacity: 1;
    color: var(--primary-color);
    transform: scale(1.15);
}

.action-btn:hover::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%);
    animation: btnRipple 0.5s ease-out;
}

@keyframes btnRipple {
    0% {
        width: 0;
        height: 0;
    }
    100% {
        width: 60px;
        height: 60px;
        opacity: 0;
    }
}

.queue-item.playing .action-btn {
    color: var(--primary-color);
}

.queue-footer {
    padding: 15px 20px;
    background: var(--footer-background);
    border-top: 1px solid var(--border-color);
    text-align: center;
    font-size: 14px;
    color: var(--text-secondary);
}

.queue-info {
    display: flex;
    justify-content: center;
    gap: 30px;
}

/* 加载状态 */
.loading-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* 批量操作栏 */
.batch-actions {
    padding: 15px 20px;
    background: var(--footer-background);
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: center;
    gap: 15px;
    animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.batch-action-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-color);
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
}

.batch-action-btn:hover {
    background-color: var(--hover-color);
    border-color: var(--primary-color);
    color: var(--primary-color);
}

/* 基础响应式设计 - 确保整体等比例缩放 */
.queue-table-header {
    display: flex;
    padding: 15px 20px;
    background: var(--table-header-background);
    font-weight: 600;
    font-size: clamp(12px, 1vw, 14px);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.index-col {
    width: clamp(50px, 6vw, 80px);
    flex-shrink: 0;
    text-align: center;
}

.title-col {
    flex: 2;
    padding: 0 clamp(10px, 2vw, 15px);
    min-width: 0; /* 允许内容适应容器 */
}

.artist-col {
    flex: 1;
    padding: 0 clamp(10px, 2vw, 15px);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.time-col {
    width: clamp(70px, 8vw, 100px);
    flex-shrink: 0;
    text-align: center;
}

.action-col {
    width: clamp(50px, 8vw, 80px);
    flex-shrink: 0;
    justify-content: center;
    gap: clamp(5px, 1vw, 10px);
}

.song-title {
    font-weight: 500;
    font-size: clamp(14px, 1.5vw, 16px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

/* 播放提示图标 */
.play-hint {
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.2s ease;
    color: var(--primary-color);
}

.song-title:hover .play-hint {
    opacity: 1;
}

/* 在播放中的歌曲中显示播放图标 */
.queue-item.playing .song-title .play-hint {
    opacity: 1;
}

.playing-indicator {
    display: flex;
    align-items: center;
    gap: clamp(4px, 1vw, 8px);
    color: var(--primary-color);
    font-size: clamp(10px, 0.8vw, 12px);
}

.action-btn {
    background: none;
    border: none;
    color: var(--text-color);
    font-size: clamp(14px, 1.5vw, 16px);
    cursor: pointer;
    padding: clamp(6px, 1vw, 8px);
    border-radius: 50%;
    transition: all 0.3s ease;
    opacity: 0.7;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}

/* 移动端适配 */
@media (max-width: 768px) {
    .queue-header {
        padding: clamp(10px, 3vw, 15px);
    }
    
    .queue-header h1 {
        font-size: clamp(16px, 4vw, 18px);
        text-align: center;
    }
    
    .queue-table-header {
        padding: clamp(8px, 2vw, 10px) clamp(10px, 3vw, 15px);
    }
    
    .artist-col {
        display: none;
    }
    
    .queue-item {
        padding: clamp(10px, 3vw, 12px) clamp(10px, 3vw, 15px);
        transform: none;
    }
    
    /* 触摸设备优化 */
    .queue-item:active {
        background-color: var(--hover-color);
    }
    
    .back-btn,
    .header-action-btn {
        font-size: clamp(18px, 5vw, 24px);
        padding: clamp(6px, 1.5vw, 8px);
    }
    
    /* 禁用悬停效果在移动端 */
    .queue-item:hover,
    .back-btn:hover,
    .header-action-btn:hover,
    .action-btn:hover {
        transform: none;
    }
}

/* 小屏设备适配 */
@media (max-width: 480px) {
    .action-col {
        width: clamp(60px, 12vw, 80px);
    }
    
    .action-btn {
        padding: clamp(4px, 1vw, 6px);
        font-size: clamp(12px, 3vw, 14px);
    }
    
    /* 简化操作按钮 */
    .action-btn i {
        margin: 0;
    }
}
</style>
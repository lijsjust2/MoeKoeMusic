<template>
    <transition name="slide-up">
        <div v-if="showQueue" class="queue-bg" @click="handleBgClick">
            <div class="queue-screen" @click.stop>
                <div class="queue-header">
                    <button class="back-btn" @click="toggleQueue"><i class="fas fa-arrow-left"></i></button>
                    <h1>{{ $t('bo-fang-lie-biao') }} ({{ musicQueueStore.queue.length }})</h1>
                    <div class="header-actions">
                        <button class="header-action-btn" @click="toggleSortMode" :class="{ 'active': isSortingMode }" :title="isSortingMode ? $t('guan-bi-pai-xu') : $t('kai-qi-pai-xu')">
                            <i class="fas fa-grip-vertical"></i>
                        </button>
                        <button class="header-action-btn" @click="clearQueue" title="{{ $t('qing-kong-lie-biao') }}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>

                <div class="queue-content">
                    <div v-if="musicQueueStore.queue.length === 0" class="empty-queue">
                        <i class="fas fa-music"></i>
                        <p>{{ $t('lie-biao-wei-kong') }}</p>
                        <button class="add-music-btn" @click="toggleQueue">{{ $t('tian-jia-ge-quo') }}</button>
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
                            :key="listKey"
                        >
                            <template #default="{ item, index }">
                                <div 
                                class="queue-item" 
                                :class="{ 'playing': currentSong.hash == item.hash, 'sorting-active': isSortingMode }"
                                :key="item.id"
                                @click="!isSortingMode && playQueueItem(item)"
                                style="cursor: pointer;"
                            >
                                    <div class="queue-col index-col">
                                        <template v-if="isSortingMode">
                                        <div class="sort-icon-wrapper" @mousedown="(e) => handleDirectDrag(e, item, index)" @touchstart="(e) => handleDirectDrag(e, item, index)">
                                            <i class="fas fa-grip-vertical sort-icon" :title="$t('dian-ji-tuo-yi')"></i>
                                        </div>
                                    </template>
                                    <template v-else>
                                        <div class="index-number">{{ index + 1 }}</div>
                                    </template>
                                    </div>
                                    
                                    <div class="queue-col title-col">
                                        <div class="song-info">
                                            <div class="song-title">
                                                {{ item.name }}
                                                <i class="play-hint fas fa-play"></i>
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
            </div>
        </div>
    </transition>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { RecycleScroller } from 'vue3-virtual-scroller';
import { useMusicQueueStore } from '../stores/musicQueue';
import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css';
// 导入SortableJS用于拖拽排序
import Sortable from 'sortablejs';

let sortableInstance = null;

const props = defineProps({
    currentSong: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:showQueue', 'addSongToQueue', 'addCloudMusicToQueue', 'addLocalMusicToQueue']);

const musicQueueStore = useMusicQueueStore();
const queueScroller = ref(null);
const showQueue = ref(false);
const isSortingMode = ref(false);

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
    console.log('[QueueList] 点击播放队列中的歌曲:', item.name);
    // 点击后不关闭播放队列面板，保持在队列界面
    if (item.isCloud) {
        emit('addCloudMusicToQueue', item.hash, item.name, item.author, item.timeLength, item.img);
    } else if (item.isLocal) {
        emit('addLocalMusicToQueue', item);
    } else {
        emit('addSongToQueue', item.hash, item.name, item.img, item.author);
    }
    
    // 移除自动滚动到当前播放歌曲的功能，保持用户当前浏览位置
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

// 添加一个响应式的key，用于强制RecycleScroller重新渲染
const listKey = ref(0);

// 长按计时器引用
let longPressTimer = null;

// 切换排序模式
const toggleSortMode = () => {
    isSortingMode.value = !isSortingMode.value;
    
    // 立即销毁旧的Sortable实例
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
    
    if (isSortingMode.value) {
        console.log('[QueueList] 进入排序模式');
        // 设置全局样式，防止拖拽时的文本选择
        document.body.classList.add('sorting-active');
        document.body.style.userSelect = 'none';
        document.body.style.touchAction = 'none';
    } else {
        // 退出排序模式时清除样式
        document.body.classList.remove('sorting-active');
        document.body.style.userSelect = '';
        document.body.style.touchAction = '';
        // 清除拖拽事件监听
        removeDragEventListeners();
    }
};

// 直接拖拽处理函数
const handleDirectDrag = (event, item, index) => {
    // 只在排序模式下处理
    if (!isSortingMode.value) return;
    
    event.preventDefault();
    
    // 存储当前拖动状态
    let isDragging = true;
    let draggedItem = event.target.closest('.queue-item');
    let originalItem = item; // 保存原始项目引用
    let startY = event.type.includes('mouse') ? event.clientY : event.touches[0].clientY;
    let originalIndex = index; // 保存原始索引
    let currentHoverIndex = index; // 当前悬浮的索引位置
    // 选择正确的滚动容器 - 使用队列内容区域作为滚动容器
    let scrollContainer = document.querySelector('.queue-content');
    // 同时获取虚拟滚动器组件引用
    let virtualScroller = queueScroller.value?.$el;
    let scrollInterval = null; // 自动滚动的定时器
    
    console.log('[QueueList] 直接拖拽开始，索引:', originalIndex);
    
    // 添加拖动样式
    if (draggedItem) {
        draggedItem.classList.add('being-dragged');
        draggedItem.style.position = 'relative';
    }
    
    // 自动滚动函数 - 更直接的滚动方式，不使用smooth行为以提高响应速度
    const autoScroll = (direction, speed) => {
        if (!isDragging) return;
        
        // 优先使用虚拟滚动器组件
        if (virtualScroller) {
            virtualScroller.scrollTop += direction * speed;
        } 
        // 备用方案：使用队列内容区域
        else if (scrollContainer) {
            scrollContainer.scrollTop += direction * speed;
        }
    };
    
    // 拖动中的处理函数
    const handleDragMove = (moveEvent) => {
        if (!isDragging || !draggedItem) return;
        
        moveEvent.preventDefault();
        
        const currentY = moveEvent.type.includes('mouse') ? moveEvent.clientY : moveEvent.touches[0].clientY;
        const deltaY = currentY - startY;
        
        // 更新拖动元素位置（视觉反馈）
        draggedItem.style.transform = `translateY(${deltaY}px)`;
        draggedItem.style.opacity = '0.9';
        draggedItem.style.zIndex = '1000';
        draggedItem.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
        
        // 自动滚动逻辑 - 使用窗口视口作为边缘检测范围
        // 清除之前的滚动定时器
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
        
        const viewportHeight = window.innerHeight;
        const scrollMargin = 150; // 增大边缘检测区域高度，提高触发几率
        
        // 检测是否接近顶部边缘
        if (currentY < scrollMargin && (virtualScroller?.scrollTop > 0 || scrollContainer?.scrollTop > 0)) {
            // 向上滚动，距离边缘越近速度越快
            const distanceToEdge = scrollMargin - currentY;
            const scrollSpeed = Math.min(15, Math.max(3, (scrollMargin - distanceToEdge) / 10));
            scrollInterval = setInterval(() => autoScroll(-1, scrollSpeed), 10); // 提高滚动频率
        }
        // 检测是否接近底部边缘
        else if (currentY > viewportHeight - scrollMargin) {
            // 向下滚动，距离边缘越近速度越快
            const distanceToEdge = currentY - (viewportHeight - scrollMargin);
            const scrollSpeed = Math.min(15, Math.max(3, distanceToEdge / 10));
            scrollInterval = setInterval(() => autoScroll(1, scrollSpeed), 10); // 提高滚动频率
        }
        
        // 获取所有队列项
        const items = Array.from(document.querySelectorAll('.queue-item'));
        
        // 计算当前鼠标/触摸位置对应的索引
        if (items.length > 0) {
            // 找到当前鼠标/触摸位置对应的项目索引
            let newIndex = originalIndex;
            
            // 检查每个项目的位置范围
            for (let i = 0; i < items.length; i++) {
                const itemRect = items[i].getBoundingClientRect();
                // 检查当前位置是否在该项目的范围内
                if (currentY >= itemRect.top && currentY <= itemRect.bottom && items[i] !== draggedItem) {
                    newIndex = i;
                    break;
                }
            }
            
            // 更新当前悬浮的索引（仅用于视觉反馈，不实时更新数据）
            if (newIndex !== currentHoverIndex) {
                currentHoverIndex = newIndex;
                console.log('[QueueList] 悬浮位置变化到索引:', currentHoverIndex);
                
                // 添加视觉指示器（可选）
                items.forEach((item, idx) => {
                    if (idx === currentHoverIndex) {
                        item.style.opacity = '0.7';
                    } else {
                        item.style.opacity = '1';
                    }
                });
            }
        }
    };
    
    // 结束拖拽的处理函数
    const handleDragEnd = () => {
        if (!isDragging || !draggedItem) return;
        
        console.log('[QueueList] 拖拽结束，从索引', originalIndex, '移动到', currentHoverIndex);
        
        // 清除自动滚动定时器
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
        
        // 只有当位置真正改变时才更新数据
        if (currentHoverIndex !== originalIndex) {
            // 更新队列数据
            const updatedQueue = [...musicQueueStore.queue];
            const [movedItem] = updatedQueue.splice(originalIndex, 1);
            updatedQueue.splice(currentHoverIndex, 0, movedItem);
            
            // 更新歌曲ID
            updatedQueue.forEach((song, i) => {
                song.id = i + 1;
            });
            
            // 更新store中的队列并触发重渲染
            musicQueueStore.setQueue(updatedQueue);
            listKey.value++;
        }
        
        // 移除所有拖动时的视觉效果
        draggedItem.style.transform = '';
        draggedItem.style.opacity = '';
        draggedItem.style.zIndex = '';
        draggedItem.style.boxShadow = '';
        draggedItem.style.position = '';
        draggedItem.classList.remove('being-dragged');
        
        // 清除所有项目的悬浮状态
        const items = Array.from(document.querySelectorAll('.queue-item'));
        items.forEach(item => {
            item.style.opacity = '1';
        });
        
        // 重置状态
        isDragging = false;
        draggedItem = null;
        startY = 0;
        scrollContainer = null;
        
        // 移除临时事件监听
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('touchmove', handleDragMove, { passive: false });
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchend', handleDragEnd);
        document.removeEventListener('mouseleave', handleDragEnd);
        document.removeEventListener('touchcancel', handleDragEnd);
    };
    
    // 添加临时事件监听
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);
    document.addEventListener('mouseleave', handleDragEnd);
    document.addEventListener('touchcancel', handleDragEnd);
};

// 存储拖拽处理函数的引用
window.__queueDragHandlers = {
    handleDirectDrag
};

// 移除拖拽事件监听
const removeDragEventListeners = () => {
    if (window.__queueDragHandlers) {
        // 清空引用
        window.__queueDragHandlers = null;
    }
};

// 长按计时器变量已不再需要
// let longPressTimer = null;

// 清空播放列表
const clearQueue = () => {
    if (confirm('确认要清空播放列表吗？')) {
        musicQueueStore.clearQueue();
        console.log('[QueueList] 播放列表已清空');
    }
};

// 计算总时长
const totalDuration = computed(() => {
    return musicQueueStore.queue.reduce((total, song) => total + (song.timeLength || 0), 0);
});

// 处理背景点击，关闭播放列表
const handleBgClick = () => {
    toggleQueue();
};

// 切换队列显示/隐藏
const toggleQueue = () => {
    showQueue.value = !showQueue.value;
    if (showQueue.value) {
        // 进入队列界面时禁止背景页面滚动
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none'; // 防止移动设备上的滚动
        // 进入队列界面时滚动到当前播放歌曲
        setTimeout(() => {
            scrollToCurrentSong(props.currentSong.hash);
        }, 100);
    } else {
        // 退出时恢复背景页面滚动
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        // 退出时关闭排序模式
        if (isSortingMode.value) {
            toggleSortMode();
        }
    }
};

const handleKeydown = (event) => {
    // ESC键关闭播放列表
    if (event.key === 'Escape' && showQueue.value) {
        toggleQueue();
    }
    // 空格键播放/暂停当前选中歌曲（如果在排序模式下则不处理）
    if (event.key === ' ' && showQueue.value && !isSortingMode.value) {
        event.preventDefault(); // 阻止页面滚动
        const currentSongIndex = musicQueueStore.queue.findIndex(song => song.hash === props.currentSong.hash);
        if (currentSongIndex !== -1) {
            playQueueItem(musicQueueStore.queue[currentSongIndex]);
        }
    }
};

onMounted(() => {
    // 移除播放状态改变时的自动滚动功能，避免用户浏览位置被改变
    musicQueueStore.$subscribe((mutation, state) => {
        // 注释掉自动滚动功能，但保留订阅以维持其他可能需要的逻辑
        // if (showQueue.value) {
        //     scrollToCurrentSong(props.currentSong.hash);
        // }
    });
    
    // 添加键盘事件监听
    document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    // 清理Sortable实例
    if (sortableInstance) {
        sortableInstance.destroy();
    }
    
    // 移除键盘事件监听
    document.removeEventListener('keydown', handleKeydown);
});

defineExpose({
    toggleQueue,
    removeSongFromQueue,
    showQueue
});
</script>
<style scoped>
/* 全屏队列背景 */
.queue-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
}

/* 队列屏幕容器 */
.queue-screen {
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    background: white;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

/* 队列头部 */
.queue-header {
    display: flex;
    align-items: center;
    padding: 15px 20px;
    background: var(--background-color-secondary);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 10;
}

.queue-header .back-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: var(--text-color);
    cursor: pointer;
    margin-right: 20px;
}

.queue-header h1 {
    flex: 1;
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-color);
}

.header-actions {
    display: flex;
    gap: 10px;
}

.header-action-btn {
    background: none;
    border: none;
    font-size: 18px;
    color: var(--text-color);
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.2s;
}

.header-action-btn:hover {
    background: var(--hover-color);
    color: var(--primary-color);
}

.header-action-btn.active {
    color: var(--primary-color);
}

/* 队列内容区域 */
.queue-content {
    flex: 1;
}

/* 空队列提示 */
.empty-queue {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #999;
}

.empty-queue i {
    font-size: 48px;
    margin-bottom: 10px;
}

.add-music-btn {
    margin-top: 15px;
    padding: 8px 20px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
}

.add-music-btn:hover {
    background: var(--color-primary);
}

/* 列表表头 */
.queue-table-header {
    display: flex;
    padding: 10px 20px;
    color: var(--text-color);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    background: var(--background-color-secondary);
    z-index: 5;
}

.queue-col {
    display: flex;
    align-items: center;
}

.index-col {
    width: 60px;
}

.title-col {
    flex: 1;
    min-width: 200px;
}

.artist-col {
    width: 180px;
    padding: 0 10px;
}

.time-col {
    width: 80px;
    text-align: right;
}

.action-col {
    width: 50px;
    text-align: center;
}

/* 歌曲列表 */
.queue-list {
    height: calc(100vh - 150px);
}

.queue-item {
    display: flex;
    align-items: center;
    padding: 10px 20px;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.2s;
}

.queue-item:hover {
    background-color: var(--hover-color);
}

.queue-item.playing {
    background-color: var(--color-primary-light);
}

.queue-item.sorting-active {
    cursor: grab;
}

/* 排序图标 */
.sort-icon-wrapper {
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}

.sort-icon-wrapper:active {
    cursor: grabbing;
}

.sort-icon {
    color: var(--primary-color);
    font-size: 16px;
    user-select: none;
}

.index-number {
    font-size: 14px;
    color: #999;
}

/* 拖拽排序的视觉效果样式 */
.sortable-ghost {
    opacity: 0.4;
    background-color: rgba(0, 0, 0, 0.05);
}

.sortable-chosen {
    background-color: rgba(206, 206, 206, 0.5);
    border-radius: 4px;
}

.sortable-drag {
    opacity: 0.8;
    background-color: rgba(255, 255, 255, 0.95);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 4px;
}

.sortable-fallback {
    position: absolute;
    pointer-events: none;
    opacity: 0.8;
    background-color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 4px;
}

/* 排序模式下的队列项样式增强 */
.queue-item.sorting-active {
    cursor: grab;
    user-select: none;
}

.queue-item.sorting-active:active {
    cursor: grabbing;
}

/* 正在拖动时的样式 */
.queue-item.being-dragged {
    cursor: grabbing;
    background-color: var(--color-primary-light) !important;
    opacity: 0.9;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    transform: scale(1.01);
    z-index: 100;
}

/* 全局拖拽时的样式，防止文本选择 */
.sorting-active {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -webkit-touch-callout: none;
}

/* 增强排序图标的可点击区域 */
.sort-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 30px;
    padding: 5px;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.sort-icon-wrapper:hover {
    background-color: var(--hover-color);
}

/* 歌曲信息 */
.song-info {
    display: flex;
    flex-direction: column;
}

.song-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-color);
    margin-bottom: 4px;
    display: flex;
    align-items: center;
}

.play-hint {
    display: none;
    margin-left: 8px;
    font-size: 12px;
    color: var(--primary-color);
}

.queue-item:hover .play-hint {
    display: inline;
}

/* 播放指示器 */
.playing-indicator {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: var(--primary-color);
}

.audio-wave {
    display: flex;
    align-items: center;
    margin-left: 5px;
    height: 12px;
}

.audio-wave span {
    display: inline-block;
    width: 2px;
    height: 100%;
    background-color: var(--primary-color);
    margin: 0 1px;
    animation: wave 1.2s infinite ease-in-out;
}

.audio-wave span:nth-child(1) { animation-delay: 0s; }
.audio-wave span:nth-child(2) { animation-delay: 0.2s; }
.audio-wave span:nth-child(3) { animation-delay: 0.4s; }
.audio-wave span:nth-child(4) { animation-delay: 0.6s; }

@keyframes wave {
    0%, 100% { transform: scaleY(0.3); }
    50% { transform: scaleY(1); }
}

/* 操作按钮 */
.action-btn {
    background: none;
    border: none;
    color: #999;
    font-size: 14px;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    opacity: 0;
    transition: all 0.2s;
}

.queue-item:hover .action-btn {
    opacity: 1;
}

.action-btn:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #ff4757;
}

/* 动画过渡 */
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .queue-screen {
        max-width: 100%;
        max-height: 80%;
        border-radius: 0;
    }
    
    .artist-col {
        display: none;
    }
    
    .queue-col {
        font-size: 14px;
    }
}

/* 队列项正在播放状态 */
.queue-item.playing .song-title {
    color: var(--primary-color);
    font-weight: 600;
}

.queue-item.playing .queue-artist {
    color: var(--primary-color);
}
</style>
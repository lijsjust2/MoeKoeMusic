<template>
    <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>{{ t('xuan-ze-yin-zhi') }}</h3>
                <button class="close-btn" @click="closeModal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="song-info">
                    <div class="song-name">{{ song?.name }}</div>
                    <div class="artist-name">{{ song?.author }}</div>
                </div>
                <div class="quality-list">
                    <div 
                        v-for="quality in availableQualities" 
                        :key="quality.value"
                        class="quality-item"
                        :class="{ disabled: quality.disabled }"
                        @click="selectQuality(quality)"
                    >
                        <div class="quality-info">
                            <div class="quality-name">{{ quality.label }}</div>
                            <div class="quality-desc">{{ quality.desc }}</div>
                        </div>
                        <div class="quality-size">
                            <i class="fas fa-download"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { get } from '@/utils/request';
import { MoeAuthStore } from '@/stores/store';

const props = defineProps({
    isOpen: {
        type: Boolean,
        default: false
    },
    song: {
        type: Object,
        default: () => ({})
    }
});

const emit = defineEmits(['close', 'quality-selected']);
const { t } = useI18n();

// 可用的音质选项
const availableQualities = ref([
    {
        label: t('yin-zhi-flac'),
        value: 'flac',
        desc: '无损音质',
        disabled: false,
        size: null
    },
    {
        label: t('yin-zhi-320'),
        value: '320',
        desc: '320kbps',
        disabled: false,
        size: null
    },
    {
        label: t('yin-zhi-128'),
        value: '128',
        desc: '128kbps',
        disabled: false,
        size: null
    },
    {
        label: t('yin-zhi-piano'),
        value: 'piano',
        desc: '钢琴曲',
        disabled: false,
        size: null
    },
    {
        label: t('yin-zhi-acappella'),
        value: 'acappella',
        desc: '纯人声',
        disabled: false,
        size: null
    }
]);

// 初始化时检查音质可用性
const checkQualities = async () => {
    if (!props.song || !props.song.hash) return;
    
    // 重置可用性状态
    availableQualities.value.forEach(q => {
        q.disabled = false;
    });
    
    // 对于云端音乐，可能不支持某些特殊音质
    if (props.song.isCloud) {
        availableQualities.value.forEach(q => {
            if (q.value === 'piano' || q.value === 'acappella') {
                q.disabled = true;
            }
        });
    }
};

// 选择音质
const selectQuality = async (quality) => {
    if (quality.disabled || !props.song) return;
    
    try {
        const MoeAuth = typeof MoeAuthStore === 'function' ? MoeAuthStore() : { isAuthenticated: false };
        const data = {
            hash: props.song.hash,
            quality: quality.value
        };
        
        if (!MoeAuth.isAuthenticated) {
            data.free_part = 1;
        }
        
        const response = await get('/song/url', data);
        
        if (response.status === 1 && response.url) {
            emit('quality-selected', { quality: quality.value, url: response.url[0], label: quality.label });
            closeModal();
        } else {
            console.error('获取音乐URL失败:', response);
            window.$modal.alert(t('huo-qu-ge-qu-URL-shi-bai'));
        }
    } catch (error) {
        console.error('获取音乐URL失败:', error);
        window.$modal.alert(t('huo-qu-ge-qu-URL-shi-bai'));
    }
};

// 关闭模态框
const closeModal = () => {
    emit('close');
};

// 监听isOpen变化，当打开时检查音质可用性
import { watch } from 'vue';
watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        checkQualities();
    }
});
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.modal-content {
    background-color: var(--background-color);
    border-radius: 10px;
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-color);
}

.close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--text-color);
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.3s;
}

.close-btn:hover {
    background-color: var(--secondary-color);
}

.modal-body {
    padding: 0;
}

.song-info {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    background-color: var(--hover-color);
}

.song-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.artist-name {
    font-size: 14px;
    color: var(--text-secondary-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.quality-list {
    padding: 8px 0;
}

.quality-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px;
    cursor: pointer;
    transition: background-color 0.3s;
    border-bottom: 1px solid var(--border-color);
}

.quality-item:last-child {
    border-bottom: none;
}

.quality-item:hover:not(.disabled) {
    background-color: var(--hover-color);
}

.quality-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.quality-info {
    flex: 1;
}

.quality-name {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-color);
    margin-bottom: 2px;
}

.quality-desc {
    font-size: 13px;
    color: var(--text-secondary-color);
}

.quality-size {
    font-size: 13px;
    color: var(--text-secondary-color);
    min-width: 60px;
    text-align: right;
}
</style>
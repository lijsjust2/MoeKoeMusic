<template>
    <div class="batch-download-page">
        <div class="container">
            <h1 class="page-title">歌手歌曲批量下载</h1>
            
            <div class="input-section">
                <div class="form-group">
                    <label for="singerId">歌手ID（支持逗号分隔多个ID）</label>
                    <textarea 
                        id="singerId" 
                        v-model="singerId" 
                        placeholder="例如：3520, 1234, 5678
可以输入多行"
                        @input="resetState"
                        rows="5"
                        style="resize: vertical;"
                    ></textarea>
                </div>
                
                <div class="form-group">
                    <label for="quality">下载音质</label>
                    <select id="quality" v-model="quality">
                        <option value="flac">无损音质 (FLAC)</option>
                        <option value="320">高音质320K</option>
                        <option value="128">普通音质128K</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>歌曲下载时间间隔</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input 
                            v-model.number="delayMin" 
                            placeholder="最小间隔"
                            type="number"
                            min="1"
                            max="60"
                            style="width: 100px;"
                        >
                        <span>秒 -</span>
                        <input 
                            v-model.number="delayMax" 
                            placeholder="最大间隔"
                            type="number"
                            min="1"
                            max="60"
                            style="width: 100px;"
                        >
                        <span>秒</span>
                    </div>
                    <small style="color: #999;">请输入适当时间间隔，以防频繁访问服务器</small>
                </div>
                <div class="form-group">
                    <label for="pushplusToken">输入pushplus token，下载完成即可发送通知</label>
                    <input 
                        id="pushplusToken" 
                        v-model="pushplusToken" 
                        placeholder="请输入PushPlus Token"
                        type="text"
                    >
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input 
                            type="checkbox" 
                            v-model="excludeNoAlbumSongs"
                        >
                        <span>排除没有专辑的歌曲</span>
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input 
                            type="checkbox" 
                            v-model="excludeConcertAlbums"
                        >
                        <span>排除演唱会专辑的歌曲</span>
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input 
                            type="checkbox" 
                            v-model="excludeLiveAlbums"
                        >
                        <span>排除live专辑的歌曲</span>
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input 
                            type="checkbox" 
                            v-model="excludeShortSongs"
                        >
                        <span>排除时长少于1分钟的歌曲</span>
                    </label>
                </div>
                
                <button 
                    class="download-btn" 
                    @click="startDownload"
                    :disabled="isDownloading || !singerId"
                >
                    <i class="fas fa-download"></i> 
                    {{ isDownloading ? '下载中...' : '开始批量下载' }}
                </button>
                <button 
                    class="stop-btn" 
                    @click="stopDownload"
                    v-if="isDownloading"
                >
                    <i class="fas fa-stop"></i> 
                    停止下载
                </button>
                <div class="countdown-info" v-if="isDownloading && countdown > 0">
                    <i class="fas fa-clock"></i> 
                    下一首下载倒计时: {{ countdown }}秒
                </div>
            </div>
            
            <div class="status-section" v-if="downloadHistory.length > 0">
                <h2 class="section-title">下载状态</h2>
                <div class="download-list">
                    <!-- 按歌手分组显示 -->
                    <div 
                        v-for="(singerSongs, singer) in groupBySinger" 
                        :key="singer"
                        class="singer-group"
                    >
                        <!-- 歌手折叠头 -->
                        <div 
                            class="singer-header"
                            @click="toggleSingerCollapse(singer)"
                        >
                            <div class="singer-info">
                                <span class="singer-name">{{ singer }}</span>
                                <span class="song-count">({{ singerSongs.length }})</span>
                            </div>
                            <div class="collapse-arrow" :class="{ 'collapsed': collapsedSingers[singer] }">
                                <i class="fas fa-chevron-down"></i>
                            </div>
                        </div>
                        <!-- 歌手的歌曲列表 -->
                        <div 
                            class="singer-songs" 
                            v-show="!collapsedSingers[singer]"
                        >
                            <div 
                                v-for="(item, index) in singerSongs" 
                                :key="index"
                                class="download-item"
                                :class="{
                                    'success': item.status === 'success',
                                    'error': item.status === 'error',
                                    'downloading': item.status === 'downloading'
                                }"
                            >
                                <div class="song-info">
                                    <span class="song-name">{{ item.song.name || '未知歌曲' }}</span>
                                </div>
                                <div class="download-status">
                                    <span v-if="item.status === 'downloading'">
                                        <i class="fas fa-spinner fa-spin"></i> 下载中... {{ item.progress }}%
                                        <div class="single-progress-bar-container">
                                            <div 
                                                class="single-progress-bar" 
                                                :style="{ width: item.progress + '%' }"
                                            ></div>
                                        </div>
                                    </span>
                                    <span v-if="item.status === 'success'">
                                        <i class="fas fa-check-circle"></i> 下载成功
                                    </span>
                                    <span v-if="item.status === 'error'">
                                        <i class="fas fa-times-circle"></i> 下载失败: {{ item.error || '未知错误' }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="progress-section" v-if="isDownloading">
                <div class="progress-info">
                    <span>正在下载: {{ currentDownloadIndex + 1 }}/{{ totalSongs }}</span>
                    <span>进度: {{ ((currentDownloadIndex + 1) / totalSongs * 100).toFixed(0) }}%</span>
                    <span v-if="countdown > 0">下一首倒计时: {{ countdown }}秒</span>
                </div>
                <div class="progress-bar-container">
                    <div 
                        class="progress-bar" 
                        :style="{ width: ((currentDownloadIndex + 1) / totalSongs * 100) + '%' }"
                    ></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { get } from '../utils/request';

// 输入参数
const singerId = ref('');
const quality = ref('flac');
const pushplusToken = ref(localStorage.getItem('pushplusToken') || '');
const delayMin = ref(10);
const delayMax = ref(15);
const excludeNoAlbumSongs = ref(false);
const excludeConcertAlbums = ref(false);
const excludeLiveAlbums = ref(false);
const excludeShortSongs = ref(false);

// 监听pushplusToken变化并保存到localStorage
watch(pushplusToken, (newValue) => {
    localStorage.setItem('pushplusToken', newValue);
});

// 下载状态
const isDownloading = ref(false);
const downloadHistory = ref([]);
const currentDownloadIndex = ref(-1);
const totalSongs = ref(0);
const isStopRequested = ref(false);
const countdown = ref(0);

// 按歌手分组的下载历史
const groupedDownloads = ref({});

// 折叠状态管理
const collapsedSingers = ref({});

// 按歌手分组下载历史
const groupBySinger = computed(() => {
  const groups = {};
  downloadHistory.value.forEach(item => {
    const singer = item.song.author || '未知歌手';
    if (!groups[singer]) {
      groups[singer] = [];
    }
    groups[singer].push(item);
  });
  return groups;
});

// 切换歌手折叠状态
const toggleSingerCollapse = (singer) => {
  collapsedSingers.value[singer] = !collapsedSingers.value[singer];
};

// 重置状态
const resetState = () => {
    downloadHistory.value = [];
    currentDownloadIndex.value = -1;
    totalSongs.value = 0;
    isDownloading.value = false;
    isStopRequested.value = false;
    countdown.value = 0;
};

// 停止下载
const stopDownload = () => {
    isStopRequested.value = true;
    countdown.value = 0;
};

// 获取歌手歌曲
const getArtistSongs = async () => {
    try {
        // 将输入的歌手ID字符串分割为数组
        const singerIds = singerId.value.split(',').map(id => id.trim()).filter(id => id);
        
        if (singerIds.length === 0) {
            return [];
        }
        
        // 为每个歌手ID获取歌曲
        const allSongs = [];
        for (const id of singerIds) {
            const response = await get('/artist/audios', {
                id: id,
                sort: 'hot',
                page: 1,
                pagesize: 9999 // 获取尽可能多的歌曲
            });
            
            if (response.status === 1) {
                const songs = response.data.map(track => {
                    // 更灵活地提取歌曲名称和歌手名称
                    const songName = track.audio_name || track.title || track.songname || track.name || '';
                    const singerName = track.author_name || track.singer || track.artist || track.author || '';
                    
                    // 创建安全的文件名，去除特殊字符
                    const safeSongName = songName.replace(/[\/\\:*?"<>|]/g, "") || '未知歌曲';
                    const safeSingerName = singerName.replace(/[\/\\:*?"<>|]/g, "") || '未知歌手';
                    
                    return {
                        hash: track.hash || track.audio_id || '',
                        name: safeSongName,
                        author: safeSingerName,
                        album: track.album_name || track.album || '',
                        cover: track.trans_param?.union_cover?.replace("{size}", 480).replace('http://', 'https://') || track.album_pic || '',
                        timelen: track.timelength || track.duration || 0,
                        isSQ: track.hash_flac && track.hash_flac !== '',
                        isHQ: track.hash_320 && track.hash_320 !== '',
                        originalData: track
                    };
                });
                allSongs.push(...songs);
            }
        }
        
        return allSongs;
    } catch (error) {
        console.error('获取歌手歌曲失败:', error);
        return [];
    }
};

// 下载单个歌曲
const downloadSingleSong = async (song, index) => {
    try {
        // 根据选择的音质获取对应的歌曲hash
        let hash;
        switch (quality.value) {
            case 'flac':
            case '999':
                hash = song.originalData?.hash_flac || song.hash || song.id;
                break;
            case '320':
                hash = song.originalData?.hash_320 || song.hash || song.id;
                break;
            default:
                hash = song.hash || song.id;
                break;
        }
        
        // 获取下载链接
        const downloadParams = {
            hash: hash,
            quality: quality.value
        };

        // 未登录用户添加free_part参数
        if (!window.MoeAuth?.isAuthenticated) {
            downloadParams.free_part = 1;
        }

        const response = await get('/song/url', downloadParams);
        
        // 解析下载链接
        let downloadUrl = null;
        const data = response?.data || {};
        
        if (response.url) {
            downloadUrl = Array.isArray(response.url) ? response.url[0] : response.url;
        } else if (data.url) {
            downloadUrl = Array.isArray(data.url) ? data.url[0] : data.url;
        } else if (Array.isArray(data) && data[0]?.url) {
            downloadUrl = data[0].url;
        } else if (data.list && Array.isArray(data.list) && data.list[0]?.url) {
            downloadUrl = data.list[0].url;
        } else if (response.data?.url) {
            downloadUrl = Array.isArray(response.data.url) ? response.data.url[0] : response.data.url;
        }
        
        if (!downloadUrl) {
            throw new Error('未找到下载链接');
        }
        
        // 使用XMLHttpRequest实现带进度的下载
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', downloadUrl, true);
            xhr.responseType = 'blob';

            // 跟踪下载进度
            xhr.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    downloadHistory.value[index].progress = progress;
                }
                
                // 检查是否需要停止下载
                if (isStopRequested.value) {
                    xhr.abort();
                }
            };

            // 下载完成
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const blob = xhr.response;
                    const downloadLink = document.createElement('a');
                    const blobUrl = URL.createObjectURL(blob);
                    
                    // 创建安全的文件名
                    const safeFileName = `${song.name || '未知歌曲'} - ${song.author || '未知歌手'}.${quality.value === 'flac' ? 'flac' : 'mp3'}`;
                    
                    downloadLink.href = blobUrl;
                    downloadLink.download = safeFileName;
                    
                    // 模拟点击下载
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                    
                    // 释放Blob URL
                    URL.revokeObjectURL(blobUrl);
                    
                    resolve(true);
                } else {
                    reject(new Error('下载失败，状态码: ' + xhr.status));
                }
            };

            // 下载错误
            xhr.onerror = () => {
                reject(new Error('网络错误'));
            };

            // 取消下载
            xhr.onabort = () => {
                reject(new Error('下载已取消'));
            };

            xhr.send();
        });
    } catch (error) {
        // 如果是用户取消的下载，返回false而不是抛出错误
        if (error.message.includes('下载已取消')) {
            return false;
        }
        console.error('下载歌曲失败:', error);
        return false;
    }
};

// 发送PushPlus通知
const sendPushPlusNotification = async (successCount, failedCount) => {
    try {
        const totalCount = successCount + failedCount;
        const title = '批量下载完成通知';
        
        // 构建下载明细内容
        let content = `批量下载已完成：\n- 总下载数：${totalCount}\n- 成功数：${successCount}\n- 失败数：${failedCount}\n\n下载明细：\n`;
        
        // 遍历下载历史，添加每首歌的下载信息
        downloadHistory.value.forEach(item => {
            const song = item.song;
            const statusText = item.status === 'success' ? '下载成功' : '下载失败';
            // 格式：歌手-歌曲名-音质  下载状态
            const detailLine = `${song.author || '未知歌手'}-${song.name || '未知歌曲'}-${quality.value}  ${statusText}\n`;
            content += detailLine;
        });
        
        const response = await fetch('http://www.pushplus.plus/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: pushplusToken.value.trim(),
                title: title,
                content: content,
                template: 'txt',
            }),
        });
        
        const result = await response.json();
        if (result.code !== 200) {
            console.error('PushPlus通知发送失败:', result);
        }
    } catch (error) {
        console.error('发送PushPlus通知时出错:', error);
    }
};

// 开始批量下载
const startDownload = async () => {
    if (!singerId.value) {
        alert('请输入歌手ID');
        return;
    }
    
    isDownloading.value = true;
    isStopRequested.value = false;
    
    try {
        // 获取歌手歌曲
        let songs = await getArtistSongs();
        
        // 如果勾选了排除没有专辑的歌曲，则进行过滤
        if (excludeNoAlbumSongs.value) {
            songs = songs.filter(song => song.album && song.album.trim() !== '');
        }
        
        // 如果勾选了排除演唱会专辑的歌曲，则进行过滤
        if (excludeConcertAlbums.value) {
            const concertKeywords = ['演唱会', '现场', 'Live现场', 'Live版'];
            songs = songs.filter(song => {
                // 检查专辑名称是否包含演唱会相关关键词
                const albumName = song.album || '';
                return !concertKeywords.some(keyword => albumName.includes(keyword));
            });
        }
        
        // 如果勾选了排除live专辑的歌曲，则进行过滤
        if (excludeLiveAlbums.value) {
            songs = songs.filter(song => {
                // 检查专辑名称是否包含live相关关键词（不区分大小写）
                const albumName = (song.album || '').toLowerCase();
                return !albumName.includes('live');
            });
        }
        
        // 如果勾选了排除时长少于1分钟的歌曲，则进行过滤
        if (excludeShortSongs.value) {
            // 假设歌曲时长单位为秒，过滤掉小于60秒的歌曲
            songs = songs.filter(song => {
                const duration = parseInt(song.timelen || 0);
                return duration >= 60;
            });
        }
        
        if (songs.length === 0) {
            let message = '未找到该歌手的歌曲';
            const hasShortFilter = excludeShortSongs.value;
            const hasAlbumFilter = excludeNoAlbumSongs.value;
            const hasConcertFilter = excludeConcertAlbums.value;
            const hasLiveFilter = excludeLiveAlbums.value;
            
            // 构建提示信息
            if (hasShortFilter) {
                if (hasAlbumFilter) {
                    // 排除短歌曲 + 排除无专辑
                    message = '未找到该歌手时长1分钟以上的专辑歌曲';
                    if (hasConcertFilter && hasLiveFilter) {
                        message = '未找到该歌手时长1分钟以上、非演唱会和非live的专辑歌曲';
                    } else if (hasConcertFilter) {
                        message = '未找到该歌手时长1分钟以上、非演唱会的专辑歌曲';
                    } else if (hasLiveFilter) {
                        message = '未找到该歌手时长1分钟以上、非live的专辑歌曲';
                    }
                } else if (hasConcertFilter && hasLiveFilter) {
                    message = '未找到该歌手时长1分钟以上、非演唱会和非live的歌曲';
                } else if (hasConcertFilter) {
                    message = '未找到该歌手时长1分钟以上、非演唱会的歌曲';
                } else if (hasLiveFilter) {
                    message = '未找到该歌手时长1分钟以上、非live的歌曲';
                } else {
                    message = '未找到该歌手时长1分钟以上的歌曲';
                }
            } else if (hasAlbumFilter) {
                // 排除无专辑但不排除短歌曲
                message = '未找到该歌手的专辑歌曲';
                if (hasConcertFilter && hasLiveFilter) {
                    message = '未找到该歌手非演唱会和非live的专辑歌曲';
                } else if (hasConcertFilter) {
                    message = '未找到该歌手非演唱会的专辑歌曲';
                } else if (hasLiveFilter) {
                    message = '未找到该歌手非live的专辑歌曲';
                }
            } else if (hasConcertFilter && hasLiveFilter) {
                message = '未找到该歌手非演唱会和非live的歌曲';
            } else if (hasConcertFilter) {
                message = '未找到该歌手非演唱会的歌曲';
            } else if (hasLiveFilter) {
                message = '未找到该歌手非live的歌曲';
            }
            
            alert(message);
            isDownloading.value = false;
            return;
        }
        
        totalSongs.value = songs.length;
        
        // 初始化下载历史
        downloadHistory.value = songs.map(song => ({
            song,
            status: 'pending',
            progress: 0
        }));
        
        // 批量下载歌曲
        for (let i = 0; i < songs.length; i++) {
            if (isStopRequested.value) {
                break;
            }
            
            currentDownloadIndex.value = i;
            
            // 更新下载状态
            downloadHistory.value[i].status = 'downloading';
            downloadHistory.value[i].progress = 0;
            
            // 下载歌曲
            const success = await downloadSingleSong(songs[i], i);
            
            // 更新下载结果
            downloadHistory.value[i].status = success ? 'success' : 'error';
            
            // 下载间等待用户设置的时间间隔
            if (i < songs.length - 1 && !isStopRequested.value) {
                // 确保最小延迟不大于最大延迟
                const actualMin = Math.min(delayMin.value, delayMax.value) * 1000;
                const actualMax = Math.max(delayMin.value, delayMax.value) * 1000;
                const delay = Math.floor(Math.random() * (actualMax - actualMin + 1)) + actualMin;
                const delaySeconds = Math.round(delay / 1000);
                
                // 显示倒计时
                for (let sec = delaySeconds; sec > 0 && !isStopRequested.value; sec--) {
                    countdown.value = sec;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                countdown.value = 0;
            }
        }
        
        // 检查是否被停止
        if (isStopRequested.value) {
            alert('批量下载已停止');
        } else {
            alert('批量下载完成');
        }
        
        // 下载完成后发送PushPlus通知
        if (pushplusToken.value.trim()) {
            const successCount = downloadHistory.value.filter(item => item.status === 'success').length;
            const failedCount = downloadHistory.value.filter(item => item.status === 'error').length;
            sendPushPlusNotification(successCount, failedCount);
        }
        
        isDownloading.value = false;
        
    } catch (error) {
        console.error('批量下载失败:', error);
        isDownloading.value = false;
        alert('批量下载失败');
    }
};
</script>

<style scoped>
.batch-download-page {
    min-height: 100vh;
    background-color: #f5f7fa;
    padding: 20px;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    padding: 30px;
}

.page-title {
    text-align: center;
    color: #333;
    margin-bottom: 30px;
    font-size: 24px;
}

.input-section {
    margin-bottom: 30px;
}

.form-group {
    margin-bottom: 20px;
}

label {
    display: block;
    margin-bottom: 5px;
    color: #666;
    font-weight: 500;
}

input[type="text"], textarea, select {
    width: 100%;
    padding: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 16px;
    color: #333;
}

input:focus, select:focus {
    outline: none;
    border-color: #ff6b6b;
}

.download-btn {
    display: block;
    width: 100%;
    padding: 12px;
    background-color: #ff6b6b;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    margin-top: 10px;
}

.download-btn:hover {
    background-color: #ff5252;
}

.download-btn:disabled {
    background-color: #ccc;
    cursor: not-allowed;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.status-section {
    margin-bottom: 30px;
}

.section-title {
    color: #333;
    margin-bottom: 20px;
    font-size: 20px;
}

.download-list {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
}

.download-item {
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.download-item:last-child {
    border-bottom: none;
}

/* 歌手分组样式 */
.singer-group {
    border-bottom: 1px solid #e0e0e0;
}

.singer-group:last-child {
    border-bottom: none;
}

.singer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background-color: #fafafa;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.singer-header:hover {
    background-color: #f5f5f5;
}

.singer-info {
    display: flex;
    align-items: center;
}

.singer-name {
    font-weight: 600;
    color: #333;
    margin-right: 8px;
}

.song-count {
    font-size: 12px;
    color: #999;
    background-color: #e5e7eb;
    padding: 2px 6px;
    border-radius: 10px;
}

.collapse-arrow {
    transition: transform 0.3s ease;
}

/* 单个歌曲进度条样式 */
.single-progress-bar-container {
    width: 100%;
    height: 4px;
    background-color: #e0e0e0;
    border-radius: 2px;
    margin-top: 4px;
    overflow: hidden;
}

.single-progress-bar {
    height: 100%;
    background-color: #ff6b6b;
    border-radius: 2px;
    transition: width 0.3s ease;
}

.collapse-arrow.collapsed {
    transform: rotate(-180deg);
}

.singer-songs {
    margin-left: 12px;
}

.song-info {
    flex: 1;
}

.song-name {
    font-weight: 500;
    color: #333;
    display: block;
}

.song-author {
    font-size: 14px;
    color: #999;
    display: block;
}

.download-status {
    font-size: 14px;
    font-weight: 500;
}

.downloading {
    background-color: #fff3f3;
}

.success {
    background-color: #f0fff4;
    color: #10b981;
}

.error {
    background-color: #fff5f5;
    color: #ef4444;
}

.countdown-info {
    margin-top: 15px;
    color: #666;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 5px;
    background-color: #f0f9ff;
    padding: 10px 15px;
    border-radius: 4px;
    border-left: 4px solid #3b82f6;
}

.progress-section {
    margin-bottom: 30px;
}

.progress-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    color: #666;
    font-size: 14px;
}

.progress-bar-container {
    width: 100%;
    height: 8px;
    background-color: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    background-color: #ff6b6b;
    transition: width 0.3s ease;
}

.single-progress-bar-container {
    width: 150px;
    height: 6px;
    background-color: #e0e0e0;
    border-radius: 3px;
    margin-top: 5px;
    overflow: hidden;
}

.single-progress-bar {
    height: 100%;
    background-color: #ff6b6b;
    transition: width 0.1s ease;
}
</style>
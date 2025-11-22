<template>
    <div class="ranking-container">
        <!-- 添加榜单选择区域 -->
        <div class="rank-selector">
            <div 
                v-for="rank in allRanks" 
                :key="rank.rankid"
                class="rank-chip"
                :class="{ active: selectedRankIds.includes(rank.rankid) }"
                @click="toggleRank(rank)"
            >
                {{ rank.rankname }}
            </div>
        </div>

        <!-- 现有的榜单展示区域 -->
        <div class="ranking-list">
            <div class="ranking-item" v-for="(rank, index) in displayedRanks" :key="index">
                <div class="rank-header">
                    <div class="rank-cover">
                        <img :src="$getCover(rank.imgurl, 640)">
                        <div class="rank-play-btn" @click.stop="handlePlayClick($event, rank.songs)">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                    <div class="rank-info">
                        <h2 class="rank-title" :style="{ color: rank.album_cover_color }">{{ rank.rankname }}</h2>
                        <span class="rank-update">{{ formatIntro(rank.intro) }}</span>
                    </div>
                </div>
                <div class="song-list">
                    <div class="song-item" v-for="(song, sIndex) in rank.songs" :key="sIndex" 
                         @click="props.playerControl.addSongToQueue(song.deprecated.hash, song.songname, $getCover(song.trans_param.union_cover, 480), song.author_name)">
                        <div class="col-index">
                            <span class="song-index" :class="{'top-three': sIndex < 3}">{{ sIndex + 1 }}</span>
                        </div>
                        <div class="col-cover">
                            <img :src="$getCover(song.trans_param.union_cover, 120)" :alt="song.songname">
                            <div class="hover-play">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                        <div class="col-name">{{ song.songname }}</div>
                        <div class="col-artist">{{ song.author_name }}</div>
                        <div class="col-time">{{ $formatMilliseconds(song.deprecated.duration) }}</div>
                    </div>
                    

                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { get } from '../utils/request';

const allRanks = ref([]);
const displayedRanks = ref([]);
const selectedRankIds = ref([]);

// 要保留的榜单名称列表
const preservedRanks = [
    'TOP500',
    '新歌榜',
    '内地榜',
    '香港地区榜',
    '台湾地区榜',
    '欧美金曲榜',
    '飙升榜',
    '80后热歌榜',
    '00后热歌版'
];


const props = defineProps({
    playerControl: Object
});

const saveSelectedRanks = () => {
    localStorage.setItem('selectedRankIds', JSON.stringify(selectedRankIds.value));
};



// 加载榜单歌曲数据
const loadRankSongs = async (rankId) => {
    try {
        // 一次性加载所有歌曲，不使用分页
        const songsResponse = await get(`/rank/audio?rankid=${rankId}&page=1&pagesize=100`);
        if (songsResponse.status === 1) {
            const songs = songsResponse.data.songlist || [];
            const rank = displayedRanks.value.find(r => r.rankid === rankId);
            
            if (rank) {
                rank.songs = songs;
            }
        }
    } catch (error) {
        console.error('加载榜单歌曲失败:', error);
    }
};

// 加载指定的榜单
const loadSelectedRanks = async (rankList, rankIds) => {
    for (const rankId of rankIds) {
        const rank = rankList.find(r => r.rankid === rankId);
        if (rank) {
            selectedRankIds.value.push(rank.rankid);
            displayedRanks.value.push(rank);
            await loadRankSongs(rank.rankid);
        }
    }
};

// 随机选择并加载榜单
const loadRandomRanks = async (rankList, count = 1) => {
    const randomRanks = rankList.sort(() => 0.5 - Math.random()).slice(0, count);
    
    for (const rank of randomRanks) {
        selectedRankIds.value.push(rank.rankid);
        displayedRanks.value.push(rank);
        await loadRankSongs(rank.rankid);
    }
    saveSelectedRanks();
};

// 切换榜单选择状态
const toggleRank = async (rank) => {
    const index = selectedRankIds.value.indexOf(rank.rankid);
    
    if (index === -1) {
        // 单选模式：先清空之前的选择
        
        // 清空并添加新选择的榜单
        selectedRankIds.value = [rank.rankid];
        displayedRanks.value = [rank];
        await loadRankSongs(rank.rankid);
    }
    saveSelectedRanks();
};

const formatIntro = (intro) => {
    if (!intro) return '';
    const parts = intro.split('\n');
    const sortRule = parts.find(p => p.includes('排序方式：'))?.replace('排序方式：', '').trim() || '';
    const updateFreq = parts.find(p => p.includes('更新频率：'))?.replace('更新频率：', '').trim() || '';
    
    if (sortRule && updateFreq) {
        return `${sortRule} (${updateFreq})`;
    }
    return intro;
};

// 添加播放整个榜单
const playRankSongs = (songs) => {
    if (props.playerControl && songs?.length) {
        const newTracks = songs.map(song => ({ 
            hash: song.deprecated.hash,
            author: song.author_name, 
            name: song.songname,
            cover: song.trans_param.union_cover?.replace("{size}", 120).replace('http://', 'https://'),
            timelen: song.deprecated.duration
        }))
        props.playerControl.addPlaylistToQueue(newTracks);
    }
};



// 处理播放按钮点击
const handlePlayClick = (event, songs) => {
    const note = document.createElement('i');
    note.className = 'fas fa-music music-note';
    const x = event.clientX;
    const y = event.clientY;
    note.style.left = x + 'px';
    note.style.top = y + 'px';
    
    document.body.appendChild(note);
    const targetX = window.innerWidth - 300;
    const targetY = window.innerHeight - 100;
    
    const deltaX = targetX - x;
    const deltaY = targetY - y;
    
    requestAnimationFrame(() => {
        note.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        note.style.opacity = '0';
    });
    
    setTimeout(() => {
        document.body.removeChild(note);
    }, 1000);
    
    playRankSongs(songs);
};

onMounted(async () => {
    const response = await get('/rank/list');
    if (response.status === 1) {
        // 只保留指定的榜单
        allRanks.value = response.data.info.filter(rank => 
            preservedRanks.includes(rank.rankname)
        );
        
        // 找到TOP500榜单
        const top500 = allRanks.value.find(rank => rank.rankname === 'TOP500');
        
        if (top500) {
            // 默认选中TOP500榜单
            selectedRankIds.value = [top500.rankid];
            displayedRanks.value = [top500];
            await loadRankSongs(top500.rankid);
        } else if (allRanks.value.length > 0) {
            // 如果没有找到TOP500，则选择第一个可用的榜单
            selectedRankIds.value = [allRanks.value[0].rankid];
            displayedRanks.value = [allRanks.value[0]];
            await loadRankSongs(allRanks.value[0].rankid);
        }
        
        saveSelectedRanks();
    }
});
</script>

<style scoped>
.ranking-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
    width: 100%;
    max-width: none;
    margin: 0 auto;
}

.rank-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px;
    /* 移除了多余的视觉图层效果 */
}

.rank-chip {
    padding: 8px 16px;
    border-radius: 20px;
    background: #f5f5f5;
    color: #666;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.rank-chip:hover {
    background: #eeeeee;
    transform: translateY(-2px);
}

.rank-chip.active {
    background: var(--primary-color)!important;
    color: white;
}

.ranking-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 0;
    align-items: center;
    width: 100%;
}

.ranking-item {
        transition: transform 0.3s ease;
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 100%;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

.ranking-item:hover {
    transform: translateY(-4px);
}

.rank-header {
    display: flex;
    align-items: center;
    padding: 20px;
    position: relative;
    background: linear-gradient(to right, rgba(100, 61, 73, 0.133), transparent)
}

.rank-cover {
    width: 100px;
    height: 100px;
    position: relative;
    overflow: hidden;
    border-radius: 8px;
}

.rank-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.rank-cover:hover img {
    transform: scale(1.05);
}

.rank-info {
    flex: 1;
    margin-left: 20px;
}

.rank-title {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px 0;
}

.rank-update {
    font-size: 13px;
    color: #666;
}

.rank-play-btn {
    position: absolute;
    bottom: 10px;
    right: 10px;
    width: 40px;
    height: 40px;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    opacity: 0.8;
}

.rank-play-btn:hover {
    transform: scale(1.1);
    background: var(--primary-color);
    opacity: 1;
}

.rank-play-btn:hover i {
    color: white;
}

.rank-play-btn i {
    font-size: 20px;
    color: var(--primary-color);
    transition: color 0.3s ease;
}

.song-list {
    padding: 0;
    margin-top: 0;
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    background: white;
}

/* 歌曲项样式 */
.song-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    transition: all 0.2s ease;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
}

.song-item:last-child {
    border-bottom: none;
}

.song-item:hover {
    background: #f8f9fa;
}

/* 各列样式 */
.col-index {
    width: 20px;
    height: 20px;
    text-align: center;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
}

.col-cover {
    width: 48px;
    height: 48px;
    margin: 0 16px;
    flex-shrink: 0;
}

.col-name {
    flex: 2;
    min-width: 0;
    padding-right: 12px;
}

.col-artist {
    flex: 1.5;
    min-width: 0;
    padding-right: 12px;
}



.col-time {
    width: 80px;
    text-align: right;
    color: #999;
    flex-shrink: 0;
}

/* 序号样式 */
.song-index {
    font-size: 16px;
    font-weight: 500;
    color: #999;
}

.song-index.top-three {
    font-size: 18px;
    font-weight: 600;
    background: linear-gradient(45deg, #ff6b6b, #ff8787);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

/* 封面图样式 */
.col-cover {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    overflow: hidden;
}

.col-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* 播放按钮样式 */
.hover-play {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.song-item:hover .hover-play {
    opacity: 1;
}

.hover-play i {
    color: white;
    font-size: 24px;
}

/* 文本样式 */
.col-name,
.col-artist {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.col-name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

.col-artist {
    font-size: 13px;
    color: #666;
}

.col-time {
    font-size: 12px;
}



.loading-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: #666;
    font-size: 14px;
    gap: 8px;
}

.loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.no-more-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    color: #999;
    font-size: 13px;
    border-top: 1px solid #f0f0f0;
    margin-top: 8px;
}

@media (max-width: 1200px) {
    .ranking-list {
        gap: 15px;
        padding: 0;
        align-items: center;
    }
    
    .ranking-item {
        max-width: 100%;
    }
    
    .rank-header {
        padding: 15px;
    }
    
    .rank-cover {
        width: 80px;
        height: 80px;
    }
    
    .rank-title {
        font-size: 20px;
    }
    
    .rank-update {
        font-size: 12px;
    }
}

@media (max-width: 1200px) {
    .ranking-list {
        grid-template-columns: 1fr;
        gap: 15px;
        padding: 15px;
        justify-items: center;
    }
    
    .ranking-item {
        /* 移除固定高度 */
    }
    
    .rank-header {
        padding: 15px;
    }
    
    .rank-cover {
        width: 80px;
        height: 80px;
    }
    
    .rank-title {
        font-size: 20px;
    }
    
    .rank-update {
        font-size: 12px;
    }
    
    .col-index {
        width: 50px;
    }
    
    .col-cover {
        width: 40px;
        height: 40px;
        margin: 0 12px;
    }
    
    .col-time {
        width: 70px;
    }
}

@media (max-width: 768px) {
    .ranking-container {
        padding: 10px;
        max-width: 100%;
    }
    
    .rank-selector {
        padding: 12px;
        gap: 8px;
    }
    
    .rank-chip {
        padding: 6px 12px;
        font-size: 12px;
    }
    
    .ranking-list {
        gap: 10px;
        padding: 0;
        align-items: center;
    }
    
    .ranking-item {
        max-width: 100%;
    }
    
    .rank-cover {
        width: 60px;
        height: 60px;
    }
    
    .rank-info {
        margin-left: 10px;
    }
    
    .rank-title {
        font-size: 16px;
        margin: 0 0 4px 0;
    }
    
    .song-item {
        padding: 10px 12px;
    }
    
    .col-index {
        width: 20px;
    }
    
    .col-cover {
        width: 36px;
        height: 36px;
        margin: 0 8px;
    }
    
    .col-time {
        width: 50px;
    }
    
    .col-name,
    .col-artist {
        font-size: 12px;
    }
}

:global(.music-note) {
    position: fixed;
    color: #ff6b6b;
    font-size: 24px;
    pointer-events: none;
    z-index: 9999;
    transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
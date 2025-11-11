<template>
    <div class="container">
        <div v-if="!authStore.isAuthenticated" class="login-tip">
            请先<span class="login-link" @click="showLoginModal">登录酷狗账号</span>
        </div>
        <h2 class="section-title">
            {{ $t('mei-ri-tui-jian') }}
        </h2>
        <div v-if="isLoading" class="skeleton-loader">
            <div v-for="n in 16" :key="n" class="skeleton-item">
                <div class="skeleton-cover"></div>
                <div class="skeleton-info">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
            </div>
        </div>
        <div v-else class="song-list">
            <!-- 歌曲列表 -->
            <div class="song-item" v-for="(song, index) in songs" :key="index"
                @click="playSong($getQuality(null, song), song.ori_audio_name, $getCover(song.sizable_cover, 480), song.author_name)"
                @contextmenu.prevent="showContextMenu($event, song)">
                <div class="col-index">
                    <span class="song-index" :class="{'top-three': index < 3}">{{ index + 1 }}</span>
                </div>
                <div class="col-cover">
                    <img :src="$getCover(song.sizable_cover, 120)" :alt="song.ori_audio_name">
                    <div class="hover-play">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <div class="col-name">{{ song.ori_audio_name }}</div>
                <div class="col-artist">{{ song.author_name }}</div>
                <div class="col-album" @click.stop="navigateToAlbum(song)" style="cursor: pointer; color: #0066cc;">{{ song.album_name || '未知专辑' }}</div>
                <div class="col-time">{{ $formatMilliseconds(song.time_length) }}</div>
            </div>
        </div>
        <h2 class="section-title">{{ $t('tui-jian-ge-dan') }}</h2>
        <div class="playlist-grid">
            <div class="playlist-item" v-for="(playlist, index) in special_list" :key="index">
                <router-link :to="{
                    path: '/PlaylistDetail',
                    query: { global_collection_id: playlist.global_collection_id }
                }">
                    <img :src="$getCover(playlist.flexible_cover, 240)" class="playlist-cover">
                    <div class="playlist-info">
                        <div class="playlist-title">{{ playlist.specialname }}</div>
                        <div class="playlist-description">{{ playlist.intro }}</div>
                    </div>
                </router-link>
            </div>
        </div>
        <ContextMenu ref="contextMenuRef" :playerControl="playerControl" />
    </div>
</template>

<script setup>
import { ref, onMounted, computed, onUpdated } from "vue";
import { get } from '../utils/request';
import ContextMenu from '../components/ContextMenu.vue';
import { useRoute,useRouter } from 'vue-router';
import { getCover } from '../utils/utils';
import { MoeAuthStore } from '../stores/store';

const authStore = MoeAuthStore();
const router = useRouter();
const showLoginModal = () => {
    router.push({ path: '/login', query: { redirect: '/home' } });
};
const route = useRoute();
const songs = ref([]);
const special_list = ref([]);
const isLoading = ref(true);
const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};
const contextMenuRef = ref(null);
const showContextMenu = (event, song) => {
    if (contextMenuRef.value) {
        contextMenuRef.value.openContextMenu(event, {
            OriSongName: song.filename,
            FileHash: song.hash,
            cover: song.sizable_cover?.replace("{size}", 480).replace('http://', 'https://') || './assets/images/ico.png',
            timeLength: song.time_length
        });
    }
};

// 跳转到专辑详情页
const navigateToAlbum = (song) => {
    // 尝试获取专辑ID（根据数据结构可能不同）
    const albumId = song.album_id || song.albuminfo?.album_id || null;
    if (albumId) {
        router.push({
            path: '/albumSongs',
            query: { id: albumId }
        });
    } else if (song.album_name) {
        // 如果没有专辑ID，使用专辑名称作为查询参数
        router.push({
            path: '/albumSongs',
            query: { name: song.album_name }
        });
    }
};
const props = defineProps({
    playerControl: Object
});

onMounted(() => {
    recommend();
    playlist();
});

onUpdated(() => {
    if(!window.electron){
        if(route.query.hash){
            privilegeSong(route.query.hash).then(res=>{
                if(res.status==1){
                    const songInfo = res.data[0];
                    playSong(songInfo.hash,songInfo.albumname,getCover(songInfo.info.image, 480),songInfo.singername)
                    router.push('/');
                }
            })
        }else if(route.query.listid){
            router.push({
                path: '/PlaylistDetail',
                query: { global_collection_id: route.query.listid }
            });
        }
    }
})

const recommend = async () => {
    const response = await get('/everyday/recommend');
    if (response.status == 1) {
        songs.value = response.data.song_list.sort(() => Math.random() - 0.5);
    }
    isLoading.value = false;
}

const playlist = async () => {
    const response = await get(`/top/playlist?category_id=0`);
    if (response.status == 1) {
        special_list.value = response.data.special_list;
    }
}

const privilegeSong = async (hash) => {
    const response = await get(`/privilege/lite`,{hash:hash});
    return response;
}


</script>

<style scoped>
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

.section-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 30px;
    color: var(--primary-color);
}
.recommendations {
    display: flex;
    gap: 35px;
    margin-bottom: 40px;
}

.recommend-card {
    width: 400px;
    height: 200px;
    overflow: hidden;
    transition: transform 0.3s ease;
}

.recommend-card:hover {
    transform: translateY(-5px);
}

.recommend-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.play-icon {
    font-size: 30px;
    color: white;
    cursor: pointer;
}

.card-content {
    display: flex;
    align-items: center;
}

.song-list {
    padding: 0;
    margin-top: 20px;
    /* 移除了多余的视觉图层效果 */
}

.song-list {
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    background: white;
    margin-bottom: 40px; /* 增加与推荐歌单标题之间的间距 */
}



/* 歌曲项样式 */
.song-item {
    display: flex;
    align-items: center;
    padding: 8px 8px;
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
    width: 60px;
    text-align: center;
    flex-shrink: 0;
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

.col-album {
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
.col-artist,
.col-album {
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

/* 响应式设计 */
@media screen and (max-width: 1200px) {
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

@media screen and (max-width: 768px) {
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
    .col-artist,
    .col-album {
        font-size: 12px;
    }
}

/* 自定义滚动条 */
.song-list::-webkit-scrollbar {
    width: 6px;
}

.song-list::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 3px;
}

.song-list::-webkit-scrollbar-track {
    background: #f5f5f5;
}

.playlist-grid {
    display: flex;
    gap: 35px;
    flex-wrap: wrap;
    justify-content: space-evenly;
}

.playlist-item {
    transition: transform 0.3s ease;
    cursor: pointer;
    width: calc(16.666% - 30px);
    /* 移除了多余的视觉图层效果 */
}

@media screen and (max-width: 1400px) {
    .playlist-grid {
        gap: 25px;
    }
    
    .playlist-item {
        width: calc(20% - 20px);
    }
}

@media screen and (max-width: 1200px) {
    .playlist-grid {
        gap: 20px;
    }
    
    .playlist-item {
        width: calc(25% - 15px);
    }
}

@media screen and (max-width: 1024px) {
    .playlist-grid {
        gap: 18px;
    }
    
    .playlist-item {
        width: calc(25% - 14px);
    }
}

@media screen and (max-width: 768px) {
    .playlist-grid {
        gap: 15px;
    }
    
    .playlist-item {
        width: calc(33.333% - 10px);
        min-width: 150px;
    }
}

@media screen and (max-width: 576px) {
    .playlist-grid {
        gap: 12px;
    }
    
    .playlist-item {
        width: calc(50% - 6px);
        min-width: 140px;
    }
}
.playlist-item:hover {
    transform: translateY(-5px);
}

.playlist-cover {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
}

.playlist-info {
    padding: 15px;
}

.playlist-title {
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 14px;
    color: var(--primary-color);
}

.playlist-description {
    color: #666;
    font-size: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    max-height: 50px;
    line-height: 25px;
}

.skeleton-loader {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    margin-top: 10px;
}

.skeleton-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    width: 250px;
    border-radius: 10px;
    padding-left: 10px;
    background-color: #f0f0f0;
    height: 68px;
}

.skeleton-cover {
    width: 50px;
    height: 50px;
    margin-right: 10px;
    border-radius: 10px;
    background-color: #e0e0e0;
}

.skeleton-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 190px;
}

.skeleton-line {
    height: 10px;
    background-color: #e0e0e0;
    margin-bottom: 5px;
    border-radius: 5px;
    width: 150px;
}

.radio-card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 15px;
}

.radio-left {
    flex: 0;
    margin-top: 7px;
    display: flex;
    align-items: center;
    width: 100%;
    justify-content: space-between;
}

.disc-container {
    position: relative;
    order: 1;
}

.radio-disc {
    width: 125px;
    height: 125px;
    object-fit: cover;
    border-radius: 50%;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2),
        inset 0 0 20px rgba(0, 0, 0, 0.1),
        0 2px 4px rgba(255, 255, 255, 0.8);
    padding: 2px;
}

.decorative-box {
    width: 60px;
    height: 60px;
    position: relative;
    transform: perspective(500px) rotateY(-15deg);
    transition: transform 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 10px;
}

.music-bars {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 30px;
}

.bar {
    width: 3px;
    background: #4a90e2;
    animation: sound-wave 1.2s ease-in-out infinite;
}

.bar:nth-child(1) {
    height: 15px;
    animation-delay: 0s;
}

.bar:nth-child(2) {
    height: 20px;
    animation-delay: 0.2s;
}

.bar:nth-child(3) {
    height: 12px;
    animation-delay: 0.4s;
}

.bar:nth-child(4) {
    height: 18px;
    animation-delay: 0.6s;
}

@keyframes sound-wave {

    0%,
    100% {
        transform: scaleY(1);
    }

    50% {
        transform: scaleY(0.5);
    }
}

.login-tip {
    color: #666;
    margin-bottom: 20px;
    font-size: 18px;
    text-align: center;
}

.login-link {
    color: var(--primary-color);
    text-decoration: underline;
    cursor: pointer;
    font-size: 18px;
}

.play-button {
    order: 3;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-right: 20px;
    margin-top: -57px;
    position: relative;
    font-size: 20px;
    color: #333;
}

.play-button::after {
    content: '♪';
    transition: all 0.2s ease;
}

.play-button:hover {
    transform: scale(1.05);
    background: var(--primary-color);
    color: #fff;
}

.play-button:hover::after {
    border-color: none;
}

.play-button::after {
    border: none;
    margin-left: 0;
}

.radio-title {
    justify-content: center;
    font-size: 22px;
    font-weight: bold;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
}

.heart-icon {
    font-size: 20px;
}

.shuffle-icon {
    font-size: 20px;
    color: #666;
    cursor: pointer;
    transition: transform 0.3s ease;
}

.shuffle-icon:hover {
    transform: scale(1.1);
    color: var(--primary-color);
}

.radio-subtitle {
    font-size: 15px;
    color: white;
    text-align: center;
}

.note-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    overflow: hidden;
}

.flying-note {
    position: absolute;
    font-size: 36px;
    color: var(--primary-color);
    pointer-events: none;
    transform-origin: center;
}

.fly-note-enter-active {
    animation: fly-note 2s ease-out forwards;
}

.fly-note-leave-active {
    animation: fly-note 2s ease-out forwards;
}

@keyframes fly-note {
    0% {
        transform: translate(var(--start-x), calc(var(--start-y) - 50px)) rotate(0deg) scale(1.2);
        opacity: 0.9;
    }

    20% {
        transform: translate(calc(var(--start-x) + 20px), calc(var(--start-y) - 70px)) rotate(45deg) scale(1.3);
        opacity: 0.85;
    }

    100% {
        transform: translate(80vw, 100vh) rotate(360deg) scale(0.6);
        opacity: 0;
    }
}

.ranking-entry {
    display: block;
    width: 100%;
    height: 100%;
    text-decoration: none;
    background: linear-gradient(135deg, var(--primary-color), #9f92ff);
    overflow: hidden;
}

.ranking-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    position: relative;
}

.ranking-icon{
    width: 135px
}

.ranking-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 0px;
    margin-top: 0px;
}

.ranking-description {
    font-size: 16px;
    opacity: 0.9;
}

.recommend-card.gradient-background {
    background: linear-gradient(135deg, var(--primary-color), #8ff2ff);
    color: white;
}

.playlist-entry {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--primary-color), #cfff82);
    color: white;
    text-align: center;
    transition: transform 0.3s ease;
}

.playlist-entry:hover {
    transform: translateY(-5px);
}

.playlist-content {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    justify-content: flex-end;
}

.playlist-icon {
    width: 144px;
    height: 144px;
}

.playlist-icon img {
    width: 100%;
    height: 100%;
}
</style>
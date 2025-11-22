<template>
    <div class="library-page">
        <div class="profile-section">
            <div class="profile-header" :style="`background-image: url(${userDetail.bg_pic || './assets/images/banner.png'})`">
                <div class="profile-info">
                    <img class="profile-pic" :src="user.pic" :alt="$t('yong-hu-tou-xiang')" />
                    <div class="user-details">
                        <div class="user-name-row">
                            <h2 class="user-name">{{ user.nickname }}</h2>
                        </div>
                        <div class="user-signature">{{ userDetail.descri || '' }}</div>


                        <div class="user-actions" style="display: flex; justify-content: center;">
                            <span class="action-button" @click="signIn">{{ $t('qian-dao') }}</span>
                            <span class="action-button" @click="getVip">VIP</span>
                            <span class="action-button" @click="goToSettings">设置</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>


        <!-- 分类导航 -->
        <div class="category-tabs">
            <div class="tabs-left">
                <button :class="{ 'active': selectedCategory === 0 }" @click="selectCategory(0)">
                    {{ categories[0] }}
                </button>
                <button v-for="(tab, index) in categories.slice(1)" :key="index" :class="{ 'active': selectedCategory === index + 1 }"
                    @click="selectCategory(index + 1)">
                    {{ tab }}
                </button>
            </div>
            <button v-if="selectedCategory === 0" class="create-playlist-nav-button" @click="createPlaylist">
                创建歌单
            </button>
        </div>

        <!-- 音乐卡片网格（显示歌单或关注的歌手） -->
        <div class="playlist-grid">
            <template v-if="selectedCategory === 0 || selectedCategory === 1 || selectedCategory === 2">
                <!-- 已移除：我的云盘和本地音乐 -->
                <div class="playlist-item"
                    v-for="(item, index) in (selectedCategory === 0 ? userPlaylists : selectedCategory === 1 ? collectedPlaylists : collectedAlbums)"
                    :key="index">
                    <router-link :to="selectedCategory !== 2 ? {
                        path: '/PlaylistDetail',
                        query: { global_collection_id: item.list_create_gid || item.global_collection_id, listid: item.listid}
                    } : {
                        path: '/albumSongs',
                        query: { id: item.album_id || item.id }
                    }">
                        <img :src="getPlaylistCover(item)"
                            class="playlist-cover" />
                        <div class="playlist-info">
                            <h3 class="playlist-title">{{ item.name }}</h3>
                            <p class="playlist-description">{{ item.count }} <span>{{ $t('shou-ge') }}</span></p>
                        </div>
                    </router-link>
                </div>

            </template>

        </div>
        <div v-if="
        (selectedCategory == 0 && userPlaylists.length === 0) || 
        (selectedCategory == 1 && collectedPlaylists.length === 0) || 
        (selectedCategory == 2 && followedArtists.length === 0)"
            class="empty-container">
            <div class="empty-image">
                <img src="/assets/images/empty.png" alt="暂无数据" />
            </div>
            <div class="empty-description">{{ t('zhe-li-shi-mo-du-mei-you') }}</div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { get } from '../utils/request';
import { MoeAuthStore } from '../stores/store';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const router = useRouter();
const MoeAuth = MoeAuthStore();
const user = ref({});
const userPlaylists = ref([]); // 创建的歌单
const collectedPlaylists = ref([]); // 收藏的歌单
const collectedAlbums = ref([]); // 收藏的专辑
const collectedFriends = ref([]); // 好友
const followedArtists = ref([]); // 关注的歌手

const userVip = ref({});
const userDetail = ref({}); // 新增：用户详细信息
const categories = ref(['我的歌单', '收藏歌单']);
const selectedCategory = ref(0);
const isLoading = ref(true); 
const selectCategory = (index) => {
    selectedCategory.value = index;
    router.replace({ path: '/library', query: { category: index } });
};

// 格式化听歌时长（分钟转为小时和分钟）
const formatDuration = (minutes) => {
    if (!minutes) return '0';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}${t('xiao-shi')} ${mins}${t('fen-zhong')}`;
    }
    return `${mins}${t('fen-zhong')}`;
};

// 格式化注册时间
const formatRegTime = (timestamp) => {
    if (!timestamp) return '';
    const registerDate = new Date(timestamp * 1000);
    const now = new Date();
    const years = now.getFullYear() - registerDate.getFullYear();
    return `${t('le-ling')} ${years} ${t('nian')}`;
};

const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};

const props = defineProps({
    playerControl: Object
});

onMounted(() => {
    if (MoeAuth.isAuthenticated) {
        user.value = MoeAuth.UserInfo;
        // 获取用户vip信息
        getVipInfo();
    }
});
const getUserDetails = () => {
    // 获取用户详细信息
    getUserDetail();
    // 获取用户创建和收藏的歌单
    getplaylist()
    // 已移除关注歌手功能
    selectedCategory.value = parseInt(router.currentRoute.value.query.category || 0);
    isLoading.value = false;
}

// 获取用户详细信息
const getUserDetail = async () => {
    try {
        const detailResponse = await get('/user/detail');
        if (detailResponse.status === 1) {
            userDetail.value = detailResponse.data;
        }
    } catch (error) {
        console.error('Failed to get user details:', error);
    }
}

const getVipInfo = async () => {
    try {
        const VipInfoResponse = await get('/user/vip/detail');
        if (VipInfoResponse.status === 1) {
            userVip.value = VipInfoResponse.data.busi_vip
            getUserDetails();
        }
    } catch (error) {
        window.$modal.alert(t('deng-lu-shi-xiao-qing-zhong-xin-deng-lu'));
        router.push('/login');
    }
}


// 已移除关注歌手功能
// 获取歌单封面图
const getPlaylistCover = (playlist) => {
    // 如果歌单有音乐且第一首音乐有封面，则使用第一首音乐的封面
    if (playlist.tracks && playlist.tracks.length > 0 && playlist.tracks[0].cover) {
        return playlist.tracks[0].cover.replace("{size}", 480).replace('http://', 'https://');
    }
    // 如果歌单有pic属性，则使用歌单的pic
    if (playlist.pic) {
        return $getCover(playlist.pic, 480);
    }
    // 否则使用默认封面图
    return '/dist/assets/images/ico.png';
}

// 获取歌单音乐列表
const fetchPlaylistTracks = async (playlistId) => {
    try {
        const response = await get('/playlist/track/all', {
            id: playlistId,
            page: 1,
            pagesize: 1 // 只获取第一首歌曲的信息
        });
        if (response.status === 1 && response.data.info && response.data.info.length > 0) {
            return response.data.info;
        }
    } catch (error) {
        console.error(`获取歌单${playlistId}音乐失败:`, error);
    }
    return [];
}

const getplaylist = async () => {
    try {
        const playlistResponse = await get('/user/playlist',{
            pagesize:500,
            t: localStorage.getItem('t')
        });
        if (playlistResponse.status === 1) {
            const sortedInfo = playlistResponse.data.info.sort((a, b) => {
                if (a.sort !== b.sort) {
                    return a.sort - b.sort;
                }
                return 0;
            });

            // 过滤掉"我喜欢"和"本地"，只显示用户创建的歌单
            userPlaylists.value = sortedInfo.filter(playlist => 
                playlist.list_create_userid === user.value.userid && playlist.name !== '我喜欢' && playlist.name !== '本地' && playlist.name !== '默认收藏'
            );

            // 增强过滤逻辑，确保完全移除默认收藏
            collectedPlaylists.value = sortedInfo.filter(playlist => 
                playlist.list_create_userid !== user.value.userid && 
                !playlist.authors && 
                playlist.name !== '默认收藏' &&
                playlist.name !== '我的云盘'
            );

            // 增强专辑过滤逻辑，确保默认收藏不会出现在专辑中
            collectedAlbums.value = sortedInfo.filter(playlist => 
                playlist.list_create_userid !== user.value.userid && 
                playlist.authors && 
                playlist.name !== '默认收藏' &&
                playlist.name !== '我的云盘'
            );
            
            const collectedIds = [];
            sortedInfo.forEach(playlist => {
                if (playlist.list_create_userid !== user.value.userid) {
                    collectedIds.push({
                        list_create_listid: playlist.list_create_listid, 
                        listid: playlist.listid
                    });
                }
            });
            localStorage.setItem('collectedPlaylists', JSON.stringify(collectedIds));
            
            // 为每个歌单获取第一首音乐的信息，用于封面图
            const allPlaylists = [...userPlaylists.value, ...collectedPlaylists.value];
            for (const playlist of allPlaylists) {
                if (playlist.count > 0 && (playlist.list_create_gid || playlist.global_collection_id)) {
                    playlist.tracks = await fetchPlaylistTracks(playlist.list_create_gid || playlist.global_collection_id);
                }
            }
        }
    } catch (error) {
        window.$modal.alert(t('xin-zeng-zhang-hao-qing-xian-zai-guan-fang-ke-hu-duan-zhong-deng-lu-yi-ci')); 
    }
}
const createPlaylist = async () => {
    // 创建一个更适合移动端的自定义弹窗
    const createCustomPrompt = () => {
        return new Promise((resolve) => {
            // 创建弹窗覆盖层
            const overlay = document.createElement('div');
            overlay.style.cssText = `
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
            `;
            
            // 创建弹窗内容
            const modal = document.createElement('div');
            modal.style.cssText = `
                background-color: #fff;
                border-radius: 12px;
                padding: 20px;
                width: 90%;
                max-width: 400px;
                max-height: 80vh;
                box-sizing: border-box;
            `;
            
            // 创建标题
            const title = document.createElement('h3');
            title.textContent = t('请输入歌单名称');
            title.style.cssText = `
                margin: 0 0 15px 0;
                font-size: 18px;
                color: #333;
                text-align: center;
            `;
            
            // 创建输入框
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = t('歌单名称');
            input.style.cssText = `
                width: 100%;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 16px;
                box-sizing: border-box;
                margin-bottom: 20px;
            `;
            
            // 创建按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 10px;
            `;
            
            // 创建取消按钮
            const cancelButton = document.createElement('button');
            cancelButton.textContent = t('qu-xiao');
            cancelButton.style.cssText = `
                flex: 1;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background-color: #f5f5f5;
                color: #666;
                font-size: 16px;
                cursor: pointer;
            `;
            
            // 创建确定按钮
            const confirmButton = document.createElement('button');
            confirmButton.textContent = t('que-ding');
            confirmButton.style.cssText = `
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 8px;
                background-color: #ff69b4;
                color: white;
                font-size: 16px;
                cursor: pointer;
            `;
            
            // 添加事件监听
            cancelButton.addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(null);
            });
            
            confirmButton.addEventListener('click', () => {
                const value = input.value.trim();
                document.body.removeChild(overlay);
                resolve(value);
            });
            
            // 点击覆盖层关闭弹窗
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    resolve(null);
                }
            });
            
            // 添加Enter键支持
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const value = input.value.trim();
                    document.body.removeChild(overlay);
                    resolve(value);
                }
            });
            
            // 组装弹窗
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(confirmButton);
            modal.appendChild(title);
            modal.appendChild(input);
            modal.appendChild(buttonContainer);
            overlay.appendChild(modal);
            
            // 添加到页面
            document.body.appendChild(overlay);
            
            // 自动聚焦输入框
            input.focus();
        });
    };
    
    try {
        const result = await createCustomPrompt();
        if (result) {
            const playlistResponse = await get('/playlist/add', { name: result, list_create_userid: user.value.userid });
            if (playlistResponse.status === 1) {
                localStorage.setItem('t', Date.now());
                getplaylist();
                if (window.$message) {
                    window.$message.success(t('创建成功'));
                }
            }
        }
    } catch (error) {
        console.error('创建歌单失败:', error);
        if (window.$message) {
            window.$message.error(t('创建失败'));
        } else {
            alert(t('创建失败'));
        }
    }
}

const goToArtistDetail = (artist) => {
    if (!artist.singerid) return;
    router.push({
        path: '/PlaylistDetail',
        query: { 
            singerid: artist.singerid,
            unfollow: true
        }
    });
};
const signIn = async () => {
    try {
        const res = await get('/youth/vip');
        if (res.status === 1) {
            window.$modal.alert(`签到成功，获得${res.data.award_vip_hour}小时VIP时长`);
        }
    } catch (error) {
        window.$modal.alert('签到失败，请勿频繁签到');
    }
}
const getVip = async () => {
    try{
        const vipResponse = await get('/youth/day/vip');
        if (vipResponse.status === 1) {
            window.$modal.alert(`签到成功，获得1天畅听VIP`);
        }
    } catch (error) {
        window.$modal.alert('获取VIP失败, 一天仅限一次');
    }
}

const goToSettings = () => {
    router.push('/settings');
}

</script>

<style scoped>
.sign-in {
    cursor: pointer;
    color: var(--primary-color);
    margin-left: 10px;
    border-radius: 5px;
    padding: 2px 8px;
    border: 1px solid var(--primary-color);
    font-size: 12px;
}

.library-page {
    padding: 20px;
}

.user-level {
    width: 50px;
    margin-left: 10px;
    cursor: pointer;
}


.section-title {
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 30px;
    color: var(--primary-color);
    cursor: cell;
    margin-bottom: 0px;
    display: inline-block;
}

.profile-section {
    display: flex;
    align-items: center;
}

.profile-header {
    width: 100%;
    height: 100%; 
    background-size: cover;
    background-position: center;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    position: relative;
    overflow: visible;
    transition: background-image 1s ease-in-out;
    height: 200px;
}

.profile-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: transparent;
    z-index: 1;
}

.profile-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    width: 100%;
    z-index: 2;
    gap: 10px;
}

.profile-pic {
    width: 90px;
    height: 90px;
    background-color: #ffffff;
    border-radius: 50%;
}

.user-details {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    flex: 1;
}

.user-name-row {
    display: flex;
    align-items: center;
    margin-bottom: 2px;
    justify-content: center;
}

.user-name {
    font-size: 28px;
    font-weight: bold;
    margin: 0;
}

.user-level {
    font-size: 14px;
    background-color: rgba(255, 255, 255, 0.2);
    padding: 2px 8px;
    color: white;
}

.user-vip-icon {
    height: 22px;
    margin-left: 10px;
}

.user-signature {
    font-size: 14px;
    color: #eee;
    margin-bottom: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
}

.user-stats {
    display: flex;
    justify-content: flex-start;
    gap: 20px;
    margin-bottom: 5px;
    font-size: 14px;
    color: #fff;
}

.stat-item {
    text-align: center;
}

.stat-value {
    font-size: 18px;
    font-weight: bold;
    display: inline-block;
    margin-right: 3px;
}

.stat-label {
    display: inline-block;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
}

.user-meta {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 12px;
    color: #fff;
    margin-bottom: 10px;
}

.user-gender i {
    font-size: 16px;
    color: #fff;
}

.user-duration,
.user-age {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 3px 8px;
    color: white;
}

.user-actions {
    display: flex;
    gap: 10px;
    margin-top: 5px;
}

.action-button {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 4px 10px;
    color: white;
    cursor: pointer;
    font-size: 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    transition: background-color 0.3s ease;
}

.action-button:hover {
    background-color: rgba(255, 255, 255, 0.3);
}

.favorite-section {
    display: flex;
    justify-content: space-between;
}

.favorite-playlist {
    background-color: var(--background-color);
    padding: 20px;
    flex: 1;
    margin-right: 20px;
    border: 1px solid var(--secondary-color);
    margin-bottom: 20px;
}

.playlist-info p {
    margin: 10px 0;
}

.play-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background-color: var(--secondary-color);
    color: white;
    border: none;
    padding: 10px 15px;
    cursor: pointer;
}

.play-button i {
    font-size: 16px;
}

.category-tabs {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.tabs-left {
    display: flex;
    gap: 20px;
}

.category-tabs button {
    padding: 10px 15px;
    border: none;
    background-color: #f5f5f5;
    cursor: pointer;
}

.category-tabs button.active {
    background-color: var(--primary-color);
    color: white;
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
    margin: 0;
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
    margin: 0;
}

/* 响应式设计 */
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



.create-playlist-nav-button {
    background-color: transparent;
    color: #ff69b4;
    border: 1px solid #ff69b4;
    padding: 8px 16px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
}

.create-playlist-nav-button:hover {
    background-color: rgba(255, 105, 180, 0.1);
    border-color: #ff1493;
    color: #ff1493;
}

/* 空状态容器样式 */
.empty-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 0;
    width: 100%;
}

.empty-image {
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
}

.empty-image img {
    width: 200px;
    height: 200px;
    opacity: 0.6;
}

.empty-description {
    color: #909399;
    font-size: 14px;
    text-align: center;
    margin-left: 60px;
}
</style>
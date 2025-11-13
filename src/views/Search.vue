<template>
    <div class="search-page">
        <div class="search-results">
            <!-- 添加搜索输入框和按钮 -->
            <div class="search-input-container">
                <input 
                    type="text" 
                    v-model="searchQuery" 
                    class="search-input" 
                    placeholder="搜索歌曲、歌手、专辑或歌单..."
                    @keyup.enter="performSearch"
                />
                <button class="search-button" @click="performSearch">搜索</button>
            </div>
            
            <!-- 添加搜索类型标签栏 -->
            <div class="search-tabs">
                <button 
                    v-for="tab in searchTabs" 
                    :key="tab.type" 
                    :class="['tab-button', { active: searchType === tab.type }]"
                    @click="changeSearchType(tab.type)"
                >
                    {{ tab.name }}
                </button>
            </div>
            <!-- 骨架屏加载效果 -->
            <div v-if="isLoading" class="skeleton-container">
                <!-- 歌曲骨架屏 -->
                <div v-if="searchType === 'song'" class="song-skeleton">
                    <div v-for="i in 10" :key="i" class="skeleton-item result-item">
                        <div class="skeleton-cover"></div>
                        <div class="skeleton-info">
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line short"></div>
                        </div>
                        <div class="skeleton-meta">
                            <div class="skeleton-line tiny"></div>
                            <div class="skeleton-line tiny"></div>
                        </div>
                    </div>
                </div>
                
                <!-- 歌手/专辑/歌单共用骨架屏 -->
                <div v-else class="grid-skeleton">
                    <div class="skeleton-grid">
                        <div v-for="i in 12" :key="i" :class="['skeleton-grid-card', {
                            'skeleton-artist-card': searchType === 'author',
                            'skeleton-album-card': searchType === 'album',
                            'skeleton-playlist-card': searchType === 'special'
                        }]">
                            <div :class="[searchType === 'author' ? 'skeleton-avatar' : 'skeleton-cover square']"></div>
                            <div class="skeleton-line"></div>
                            <div v-if="searchType !== 'author'" class="skeleton-line short"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <template v-else-if="searchResults.length > 0">
                <!-- 歌曲搜索结果 -->
                <ul v-if="searchType === 'song'">
                    <li v-for="(result, index) in searchResults" :key="index" class="result-item"
                        @click="playSong(result?.HQFileHash || result?.SQFileHash || result?.FileHash, result.SongName, $getCover(result.Image, 480), result.SingerName)"
                        @contextmenu.prevent="showContextMenu($event, result)">
                        <img :src="$getCover(result.Image, 100)" alt="Cover" />
                        <div class="result-info">
                            <p class="result-name">{{ result.SongName }}</p>
                            <p class="result-type">{{ result.SingerName }}</p>
                        </div>
                        <div class="result-meta">
                            <div class="meta-column">
                                <p class="result-duration">{{ $formatMilliseconds(result.Duration) }}</p>
                                <p class="result-publish-date">{{ result.PublishDate }}</p>
                            </div>
                        </div>
                        <!-- 添加操作列 -->
                        <div class="result-actions">
                            <button class="action-btn add-to-playlist" @click.stop="showAddToPlaylistMenu($event, result)" title="添加到歌单">
                                <i class="fas fa-plus-circle"></i>
                            </button>
                            <button class="action-btn download" @click.stop="downloadSong(result)" title="下载">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </li>
                </ul>
                
                <!-- 歌手搜索结果 -->
                <ArtistGrid v-else-if="searchType === 'author'" :artists="searchResults" @artist-click="handleArtistClick" />
                
                <!-- 专辑搜索结果 -->
                <AlbumGrid v-else-if="searchType === 'album'" :albums="searchResults" @album-click="handleAlbumClick" />
                
                <!-- 歌单搜索结果 -->
                <PlaylistGrid v-else-if="searchType === 'special'" :playlists="searchResults" @playlist-click="handlePlaylistClick" />

                <div class="pagination">
                    <button @click="prevPage" :disabled="currentPage === 1">{{ $t('shang-yi-ye') }}</button>
                    <div class="page-numbers">
                        <button v-for="pageNum in displayedPageNumbers" :key="pageNum" :class="['page-number', {
                            active: pageNum === currentPage,
                            'ellipsis': pageNum === '...'
                        }]" @click="pageNum !== '...' && goToPage(pageNum)" :disabled="pageNum === '...'">
                            {{ pageNum }}
                        </button>
                    </div>
                    <button @click="nextPage" :disabled="currentPage === totalPages">{{ $t('xia-yi-ye') }}</button>
                </div>
            </template>
        </div>
    </div>
    <ContextMenu ref="contextMenuRef" :playerControl="playerControl" />
    
    <!-- 歌单选择菜单 -->
    <div v-if="showPlaylistMenu" 
         :style="{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }" 
         class="playlist-menu">
      <ul>
        <li v-for="playlist in playlists" :key="playlist.listid"
            @click="addToPlaylist(playlist.listid)">
          {{ playlist.name }}
        </li>
      </ul>
    </div>
  
  <!-- 音质选择模态框 -->
  <QualitySelectModal 
    :is-open="showQualityModal" 
    :song="currentDownloadSong"
    @close="showQualityModal = false"
    @quality-selected="handleQualitySelected"
  />
</template>
<script setup>
import { ref, onMounted, watch, computed, onBeforeUnmount } from 'vue';
import ContextMenu from '../components/ContextMenu.vue';
import AlbumGrid from '../components/AlbumGrid.vue';
import PlaylistGrid from '../components/PlaylistGrid.vue';
import ArtistGrid from '../components/ArtistGrid.vue';
import QualitySelectModal from '../components/QualitySelectModal.vue';
import { get } from '../utils/request';
import { useRoute, useRouter } from 'vue-router';
import { MoeAuthStore } from '../stores/store';
const route = useRoute();
const router = useRouter();
const searchQuery = ref(route.query.q || '');
const searchType = ref(route.query.type || 'song'); 
const searchResults = ref([]);
const currentPage = ref(1);
const pageSize = ref(30);
const totalPages = ref(1);
const contextMenuRef = ref(null);
const isLoading = ref(false);
const MoeAuth = MoeAuthStore();
const showPlaylistMenu = ref(false);
const menuPosition = ref({ x: 0, y: 0 });
const playlists = ref([]);
const currentSong = ref(null);
const showQualityModal = ref(false);
const currentDownloadSong = ref(null);

const searchTabs = [
    { type: 'song', name: '单曲' },
    { type: 'special', name: '歌单' },
    { type: 'album', name: '专辑' },
    { type: 'author', name: '歌手' }
];

// 切换搜索类型
const changeSearchType = (type) => {
    searchType.value = type;
    currentPage.value = 1; // 切换类型时重置页码
    
    // 更新URL参数
    router.push({
        query: { 
            ...route.query,
            type: type 
        }
    });
    performSearch();
};

const showContextMenu = (event, song) => {
    if (contextMenuRef.value) {
        song.cover = song.Image?.replace("{size}", 480) || './assets/images/ico.png',
        song.timeLength = song.Duration;
        song.OriSongName = song.FileName;
        contextMenuRef.value.openContextMenu(event, song);
    }
};

onMounted(() => {
    // 初始化时从URL参数获取所有状态
    if (route.query.type) {
        searchType.value = route.query.type;
    }
    if (route.query.page) {
        currentPage.value = parseInt(route.query.page) || 1;
    }
    // 只有当有搜索词时才执行搜索
    if (searchQuery.value) {
        performSearch();
    }
    
    // 添加点击外部关闭歌单菜单的监听
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    // 移除点击外部关闭歌单菜单的监听
    document.removeEventListener('click', handleClickOutside);
});

// 监听路由参数变化，恢复搜索状态
watch(() => [route.query.q, route.query.type, route.query.page], ([newQuery, newType, newPage]) => {
    if (newQuery !== undefined) {
        searchQuery.value = newQuery || '';
    }
    if (newType) {
        searchType.value = newType;
    }
    if (newPage) {
        currentPage.value = parseInt(newPage) || 1;
    }
    // 只有当有搜索词时才执行搜索，避免初始加载时的空搜索
    if (searchQuery.value) {
        performSearch();
    }
}, { deep: true });

const props = defineProps({
    playerControl: Object
});

// 添加到歌单功能 - 显示歌单选择菜单
const showAddToPlaylistMenu = async (event, song) => {
  event.stopPropagation();
  
  if (!MoeAuth.isAuthenticated) {
    $message.warning('请先登录');
    return;
  }
  
  currentSong.value = song;
  menuPosition.value = { x: event.clientX, y: event.clientY };
  
  try {
    const playlistResponse = await get('/user/playlist', { pagesize: 100 });
    if (playlistResponse.status === 1) {
      // 过滤歌单列表，移除默认收藏、我喜欢和本地这些特殊选项
      playlists.value = playlistResponse.data.info.filter(
        playlist => {
          // 确保是当前用户创建的歌单
          const isUserPlaylist = playlist.list_create_userid === MoeAuth.UserInfo.userid;
          // 排除特定名称的歌单
          const isSpecialPlaylist = ['默认收藏', '我喜欢', '本地'].includes(playlist.name);
          // 返回既属于用户创建又不是特殊歌单的项目
          return isUserPlaylist && !isSpecialPlaylist;
        }
      );
      showPlaylistMenu.value = true;
    }
  } catch (error) {
    $message.error('获取歌单失败');
  }
};

// 实际添加歌曲到指定歌单
const addToPlaylist = async (listid) => {
  if (!currentSong.value) return;
  
  try {
    await get(`/playlist/tracks/add?listid=${listid}&data=${encodeURIComponent(
      currentSong.value.OriSongName?.replace(',', '') || currentSong.value.SongName?.replace(',', '')
    )}|${currentSong.value.FileHash || currentSong.value.hash}`);
    showPlaylistMenu.value = false;
    $message.success('成功添加到歌单');
  } catch (error) {
    $message.error('添加到歌单失败');
  }
};

// 点击其他区域关闭歌单选择菜单
const handleClickOutside = () => {
  showPlaylistMenu.value = false;
};

// 获取默认下载音质设置
const getDefaultDownloadQuality = () => {
  try {
    const savedSettings = JSON.parse(localStorage.getItem('settings'));
    return savedSettings?.downloadQuality?.toString() || '128';
  } catch (error) {
    console.error('获取默认下载音质设置失败:', error);
    return '128';
  }
};

// 使用默认音质直接下载歌曲
const downloadSong = async (song) => {
  try {
    // 获取默认下载音质设置
    const defaultQuality = getDefaultDownloadQuality();
    
    // 准备下载的歌曲数据
    currentDownloadSong.value = {
      name: song.SongName || song.name || song.FileName,
      author: song.SingerName || song.author || song.singer,
      hash: song.FileHash || song.hash,
      isCloud: false,
      isLocal: false
    };
    
    // 直接获取音质信息并下载
    // 这里简化处理，直接构建一个包含所需信息的对象
    const qualityInfo = {
      quality: defaultQuality,
      label: defaultQuality === 'flac' ? '无损' : defaultQuality === '320' ? '320K' : '128K',
      url: null // 稍后会在handleQualitySelected中获取
    };
    
    // 直接调用下载处理函数
    await handleQualitySelected(qualityInfo);
  } catch (error) {
    console.error('下载歌曲失败:', error);
    if (window.$message) {
      window.$message.error('下载失败');
    }
  }
};

// 用于指定音质下载的函数（保留原功能，供特殊场景使用）
const downloadWithQuality = (song) => {
  // 准备下载的歌曲数据
  currentDownloadSong.value = {
    name: song.SongName || song.name || song.FileName,
    author: song.SingerName || song.author || song.singer,
    hash: song.FileHash || song.hash,
    isCloud: false,
    isLocal: false
  };
  
  // 显示音质选择模态框
  showQualityModal.value = true;
};

// 处理音质选择并下载
const handleQualitySelected = async (qualityInfo) => {
  try {
    // 如果没有提供URL，则根据音质参数获取下载链接
    if (!qualityInfo.url) {
      // 获取歌曲hash
      const hash = currentDownloadSong.value.hash;
      if (!hash) {
        throw new Error('歌曲缺少hash信息');
      }
      
      // 根据音质转换br参数
      let br;
      switch(qualityInfo.quality) {
        case 'flac':
        case '999':
        case 999:
          br = 999000; // 无损音质
          break;
        case '320':
        case 320:
          br = 320000;
          break;
        case '128':
        case 128:
          br = 128000;
          break;
        default:
          br = 128000; // 默认128K
      }
      
      // 获取下载链接
      const response = await get('/song/url', { 
        hash: hash,
        quality: qualityInfo.quality
      });
      
      let downloadUrl = null;
      
      // 尝试不同的响应格式
      const data = response?.data || {};
      if (data.url) {
        downloadUrl = data.url;
      } else if (Array.isArray(data) && data[0]?.url) {
        downloadUrl = data[0].url;
      } else if (data.list && Array.isArray(data.list) && data.list[0]?.url) {
        downloadUrl = data.list[0].url;
      } else if (data.data && data.data.url) {
        downloadUrl = data.data.url;
      } else if (data.data && Array.isArray(data.data) && data.data[0]?.url) {
        downloadUrl = data.data[0].url;
      }
      
      if (!downloadUrl) {
        throw new Error('无法获取下载链接');
      }
      
      qualityInfo.url = downloadUrl;
    }
    
    console.log(`开始下载歌曲 (${qualityInfo.label}):`, currentDownloadSong.value.name);
    
    // 使用fetch API获取文件blob，确保强制下载而不是播放
    const response = await fetch(qualityInfo.url);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const blob = await response.blob();
    console.log('成功获取文件blob，大小:', blob.size);
    
    // 创建blob URL
    const blobUrl = URL.createObjectURL(blob);
    
    // 创建下载链接
    const link = document.createElement('a');
    link.href = blobUrl;
    
    // 设置文件名，包含音质信息，避免特殊字符
    let fileExtension = 'mp3';
    if (qualityInfo.quality === 'flac' || qualityInfo.quality === 999) {
      fileExtension = 'flac';
    }
    let fileName = `${currentDownloadSong.value.name} - ${currentDownloadSong.value.author} (${qualityInfo.label}).${fileExtension}`;
    fileName = fileName.replace(/[<>"/\\|?*:]/g, '_'); // 替换Windows文件名中的非法字符
    
    link.download = fileName;
    link.target = '_blank'; // 确保在新标签中打开，不会干扰当前页面
    
    // 触发下载
    document.body.appendChild(link);
    
    // 使用setTimeout确保DOM操作完成
    setTimeout(() => {
      link.click();
      // 清理
      document.body.removeChild(link);
      // 延迟释放blob URL，确保下载完成
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    }, 0);
    
    console.log('歌曲下载已触发:', fileName);
    if (window.$message) {
      window.$message.success('下载已开始');
    }
    
  } catch (error) {
    console.error('下载歌曲失败:', error);
    if (window.$message) {
      window.$message.error('下载失败');
    }
  }
};

const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};

const performSearch = async () => {
    if (!searchQuery.value) return;
    
    // 更新URL参数，这样点击返回按钮时可以恢复搜索状态
    router.push({
        query: {
            q: searchQuery.value,
            type: searchType.value,
            page: currentPage.value
        }
    });
    
    isLoading.value = true;
    try {
        const response = await get(`/search?keywords=${encodeURIComponent(searchQuery.value)}&page=${currentPage.value}&pagesize=${pageSize.value}&type=${searchType.value}`)
        if (response.status === 1) {
            searchResults.value = response.data.lists;
            totalPages.value = Math.ceil(response.data.total / pageSize.value);
        }
    } catch (error) {
        console.error("搜索请求失败", error);
    } finally {
        isLoading.value = false;
    }
};

// 分页操作
const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++;
        performSearch();
    }
};

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
        performSearch();
    }
};

const displayedPageNumbers = computed(() => {
    const delta = 2; // 当前页前后显示的页码数
    let pages = [];

    if (totalPages.value <= 7) {
        // 如果总页数小于等于7，显示所有页码
        for (let i = 1; i <= totalPages.value; i++) {
            pages.push(i);
        }
    } else {
        // 始终显示第一页
        pages.push(1);

        // 计算中间页码的范围
        let leftBound = Math.max(2, currentPage.value - delta);
        let rightBound = Math.min(totalPages.value - 1, currentPage.value + delta);

        // 添加左边的省略号
        if (leftBound > 2) {
            pages.push('...');
        }

        // 添加中间的页码
        for (let i = leftBound; i <= rightBound; i++) {
            pages.push(i);
        }

        // 添加右边的省略号
        if (rightBound < totalPages.value - 1) {
            pages.push('...');
        }

        // 始终显示最后一页
        pages.push(totalPages.value);
    }

    return pages;
});

const goToPage = (page) => {
    currentPage.value = page;
    performSearch();
};

const handleAlbumClick = (album) => {
    // 尝试使用不同可能的专辑ID属性名
    const albumId = album.id || album.albumid || album.album_id;
    if (albumId) {
        router.push({
            path: '/albumSongs',
            query: { id: albumId }
        })
    } else {
        console.error('找不到专辑ID:', album);
        window.$modal.alert('无法获取专辑信息');
    }
};

const handlePlaylistClick = (playlist) => {
    router.push({
        path: `/PlaylistDetail`,
        query: { global_collection_id: playlist.gid }
    });
};

const handleArtistClick = (artist) => {
    router.push({
        path: '/PlaylistDetail',
        query: { 
            singerid: artist.AuthorId
        }
    });
};
</script>

<style scoped>
.search-results {
    padding: 20px;
}

/* 搜索输入框样式 */
.search-input-container {
    display: flex;
    margin-bottom: 30px;
    gap: 10px;
}

.search-input {
    flex: 1;
    padding: 12px 20px;
    font-size: 16px;
    border: 2px solid #e0e0e0;
    outline: none;
    transition: border-color 0.3s;
}

.search-input:focus {
    border-color: var(--primary-color);
}

.search-button {
    padding: 12px 30px;
    background-color: var(--primary-color);
    color: white;
    border: none;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s;
}

.search-button:hover {
    background-color: #ff568f;
}

.search-tabs {
    display: flex;
    margin-bottom: 20px;
    border-bottom: 1px solid #eee;
}

.tab-button {
    padding: 10px 20px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    color: #666;
    position: relative;
    transition: all 0.3s;
}

.tab-button:hover {
    color: var(--primary-color);
}

.tab-button.active {
    color: var(--primary-color);
    font-weight: bold;
}

.tab-button.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--primary-color);
}

.result-item {
    display: flex;
    align-items: center;
    padding: 5px;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.3s;
    cursor: pointer;
    gap: 5px;
}

.result-item:hover {
    background-color: #f5f5f5;
}

.result-item img {
    width: 50px;
    height: 50px;
    margin-right: 10px;
}

.result-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0; /* 防止flex子项溢出 */
}

.result-meta {
    display: flex;
    margin-left: auto;
    min-width: 10px;
    justify-content: flex-end;
    padding-right: 5px;
}

/* 操作列样式 */
.result-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: flex-end;
    flex-shrink: 0;
}

.action-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: #666;
    font-size: 18px;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
}

.action-btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--primary-color);
}

.action-btn.add-to-playlist:hover {
    color: var(--primary-color);
}

.action-btn.download:hover {
    color: #52c41a;
}

.playlist-menu {
    position: fixed;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 10px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    min-width: 180px;
}

.playlist-menu ul {
    list-style: none;
    padding: 5px 0;
    margin: 0;
}

.playlist-menu li {
    padding: 8px 14px;
    cursor: pointer;
    border-radius: 10px;
}

.playlist-menu li:hover {
    background-color: #f5f5f5;
}

.meta-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
}

.result-name {
    font-size: 16px;
    font-weight: bold;
    height: 23px;
    margin: 0;
    max-width: 900px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.result-duration,
.result-publish-date {
    font-size: 14px;
    color: #888;
    margin: 0;
    white-space: nowrap;
}

.result-duration {
    color: #666;
}

.result-publish-date {
    font-size: 12px;
    color: #999;
}

.result-type {
    font-size: 14px;
    color: #666;
    margin: 6px 0 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 20px 0;
    gap: 10px;
}

.page-numbers {
    display: flex;
    gap: 5px;
}

.page-number {
    padding: 8px 12px;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    cursor: pointer;
    color: #333;
    min-width: 40px;
    transition: all 0.3s;
}

.page-number:hover {
    background-color: var(--primary-color);
    color: white;
}

.page-number.active {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
}

.pagination button {
    padding: 8px 15px;
    background-color: white;
    color: #333;
    border: 1px solid #ddd;
    cursor: pointer;
    transition: all 0.3s;
}

.pagination button:hover:not(:disabled) {
    background-color: var(--primary-color);
    color: white;
}

.pagination button:disabled {
    background-color: white;
    color: #999;
    cursor: not-allowed;
    border-color: #ddd;
}

.page-number.ellipsis {
    background-color: transparent;
    border: none;
    cursor: default;
    pointer-events: none;
    padding: 8px 8px;
    min-width: 30px;
}

.page-number.ellipsis:hover {
    background-color: transparent;
    color: #333;
}

</style>

<!-- 添加骨架屏样式 -->
<style scoped>
/* 骨架屏动画 */
@keyframes shimmer {
    0% {
        background-position: -468px 0;
    }
    100% {
        background-position: 468px 0;
    }
}

.skeleton-container {
    width: 100%;
}

.skeleton-item {
    margin-bottom: 15px;
}

.skeleton-cover, .skeleton-avatar {
    width: 50px;
    height: 50px;
    background: linear-gradient(to right, #f0f0f0 8%, #e0e0e0 18%, #f0f0f0 33%);
    background-size: 800px 104px;
    animation: shimmer 1.5s linear infinite forwards;
}

.skeleton-avatar {
    width: 100px;
    height: 100px;
    margin: 0 auto 10px;
}

.skeleton-cover.square {
    width: 150px;
    height: 150px;
    margin: 0 auto 10px;
}

.skeleton-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.skeleton-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-end;
}

.skeleton-line {
    height: 16px;
    background: linear-gradient(to right, #f0f0f0 8%, #e0e0e0 18%, #f0f0f0 33%);
    background-size: 800px 104px;
    animation: shimmer 1.5s linear infinite forwards;
    width: 100%;
    margin-top: 5px;
}

.skeleton-line.short {
    width: 60%;
}

.skeleton-line.tiny {
    width: 40%;
    height: 12px;
}

.skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 20px;
}

.skeleton-artist-card, .skeleton-album-card, .skeleton-playlist-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 15px;
    background-color: #f9f9f9;
    transition: transform 0.3s;
}
</style>
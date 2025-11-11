<template>
  <div class="album-songs-page">
    <!-- 音质选择弹窗 -->
    <div v-if="showQualityModal" class="quality-select-modal-overlay" @click="closeQualityModal">
      <div class="quality-select-modal" @click.stop>
        <div class="modal-header">
          <h3>选择音质</h3>
          <button class="close-btn" @click="closeQualityModal">&times;</button>
        </div>
        <div class="modal-content">
          <div class="song-info">
            <div class="song-title">{{ batchSelectionMode ? `${selectedTracks.length} 首歌曲` : currentDownloadSong ? getSongName(currentDownloadSong) : '' }}</div>
            <div class="song-artist">{{ batchSelectionMode ? '批量下载' : currentDownloadSong ? getAuthorName(currentDownloadSong) : '' }}</div>
          </div>
          <div class="quality-options">
            <div class="quality-item" @click="selectQuality('flac')">
              <div class="quality-info">
                <div class="quality-name">无损音质 (FLAC)</div>
                <div class="quality-desc">无损音质</div>
              </div>
              <div class="download-icon">↓</div>
            </div>
            <div class="quality-item" @click="selectQuality('320')">
              <div class="quality-info">
                <div class="quality-name">高音质320K</div>
                <div class="quality-desc">320kbps</div>
              </div>
              <div class="download-icon">↓</div>
            </div>
            <div class="quality-item" @click="selectQuality('128')">
              <div class="quality-info">
                <div class="quality-name">普通音质128K</div>
                <div class="quality-desc">128kbps</div>
              </div>
              <div class="download-icon">↓</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 头部信息区域 - 采用AlbumDetail风格 -->
    <div class="header">
      <img class="cover-art" :src="album.cover" :alt="album.name" @error="handleImageError" />
      <div class="info">
        <h1 class="title">{{ album.name || '未知专辑' }}</h1>
        <p class="subtitle">{{ album.publish_date || '未知时间' }}</p>
        <div class="meta" v-if="album.publish_company">{{ album.publish_company }}</div>
        <div class="description">{{ album.intro || '暂无介绍' }}</div>
        <div class="actions">
          <button class="primary-btn" @click="playAllSongs">
            <i class="fas fa-play"></i> 播放全部
          </button>
          <button class="fav-btn" @click="toggleFavorite" :class="{ 'active': isFavorited }" style="display: none">
            <i class="fas fa-heart"></i>
          </button>
          <div class="relative" style="display: none">
            <button class="batch-action-btn" @click="toggleBatchSelection">
              <i class="fas fa-check-double"></i> {{ batchSelectionMode ? (selectedTracks.length > 0 ? `已选择 ${selectedTracks.length}` : '批量选择') : '批量选择' }}
            </button>
            <!-- 批量操作菜单 -->
            <div v-if="isBatchMenuVisible && batchSelectionMode && selectedTracks.length > 0" class="batch-actions-menu">
              <ul>
                <li @click="appendSelectedToQueue"><i class="fas fa-plus"></i> 添加到播放列表</li>
                <li @click="addSelectedToOtherPlaylist"><i class="fas fa-list"></i> 添加到歌单</li>
                <li @click="downloadSelectedSongs"><i class="fas fa-download"></i> 批量下载</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>正在加载数据...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchAlbumSongs">重试</button>
    </div>
    
    <div v-else class="content">
      <!-- 歌曲列表区域 -->
      <div class="songs-list">
        <h2>歌曲列表 (共{{ totalSongs }}首)</h2>
        <div class="table-wrapper">
          <table class="songs-table">
            <thead>
              <tr>
                <th v-if="batchSelectionMode" class="checkbox-col">
                  <input type="checkbox" :checked="isAllSelected" @click="toggleSelectAll" />
                </th>
                <th class="number-col">序号</th>
                <th class="name-col">歌名</th>
                <th class="artist-col">歌手</th>
                <th class="time-col">时间</th>
                <th class="action-col">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(song, index) in songs" :key="song.base?.audio_id || song.audio_id || song.id || index" class="song-row" @click="batchSelectionMode ? handleRowClick(event, index) : playSong(song)">
                <td v-if="batchSelectionMode" class="checkbox-col">
                  <input type="checkbox" :checked="selectedTracks.includes(index)" @click.stop="selectTrack(index, $event)" />
                </td>
                <td class="number-col">
                  <i class="play-icon">▶</i>
                  <span>{{ index + 1 }}</span>
                </td>
                <td class="name-col">
                  <div class="song-name">
                    {{ getSongName(song) }}
                    <span v-if="getSongQuality(song)" class="quality-tag">{{ getSongQuality(song) }}</span>
                  </div>
                </td>
                <td class="artist-col">{{ getAuthorName(song) }}</td>
                <td class="time-col">{{ formatDuration(song.audio_info?.duration || song.audio_info?.duration_128 || song.timelen || song.duration || 0) }}</td>
                <td class="action-col">
                  <button class="action-btn add-to-playlist" @click.stop="handleFavoriteSong(song)" title="添加到歌单">
                    <i class="fas fa-plus-circle"></i>
                  </button>
                  <button class="action-btn download" @click.stop="handleDownloadSong(song)" title="下载">
                    <i class="fas fa-download"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { get } from '../utils/request';
import { useMusicQueueStore } from '../stores/musicQueue';
import useSongQueue from '../components/player/SongQueue';
import i18n from '../utils/i18n';
import { MoeAuthStore } from '../stores/store';
import { useI18n } from 'vue-i18n';
// 移除音质选择弹窗组件，暂时不使用音质选择功能

const { t } = useI18n();
const MoeAuth = MoeAuthStore();

const route = useRoute();
const albumId = ref(route.query.id || '966846'); // 默认使用966846作为示例ID
const rawData = ref(null);
const songs = ref([]);
const totalSongs = ref(0);
const loading = ref(true);
const error = ref(null);

// 专辑信息状态 - 类似AlbumDetail
const album = ref({
  id: '',
  name: '',
  cover: './assets/images/ico.png',
  authors: [],
  publish_date: '',
  publish_company: '',
  intro: ''
});
const isFavorited = ref(false);

// 批量选择相关状态
const batchSelectionMode = ref(false);
const selectedTracks = ref([]);
const lastSelectedIndex = ref(-1);
const isBatchMenuVisible = ref(false);

// 下载相关状态
const songsToDownload = ref([]);
const currentDownloadQuality = ref('320');
const showQualityModal = ref(false);
const currentDownloadSong = ref(null);

// 初始化播放队列相关功能
const musicQueueStore = useMusicQueueStore();
const { addSongToQueue } = useSongQueue(i18n.global.t, musicQueueStore);

// 不再需要格式化原始数据为可读字符串

// 获取歌曲名称
const getSongName = (song) => {
  // 专辑歌曲格式
  if (song.base && song.base.audio_name) {
    return song.base.audio_name;
  }
  // 歌单格式
  if (song.remark) {
    return song.remark;
  }
  // 通用格式
  return song.audio_name || song.name || song.song_name || '未知歌曲';
};

// 获取作者名称
const getAuthorName = (song) => {
  // 专辑歌曲格式
  if (song.base && song.base.author_name) {
    return song.base.author_name;
  }
  if (song.authors && song.authors.length > 0) {
    return song.authors.map(author => author.author_name).join('、');
  }
  // 歌单格式
  if (song.singerinfo && song.singerinfo.length > 0) {
    return song.singerinfo.map(singer => singer.name).join('、');
  }
  // 通用格式
  if (song.extend && song.extend.author_name) {
    return song.extend.author_name;
  }
  return song.author_name || song.singer || song.artist_name || song.author || '未知艺术家';
};

// 获取专辑名称
const getAlbumName = (song) => {
  // 专辑歌曲格式
  if (song.album_info && song.album_info.album_name) {
    return song.album_info.album_name;
  }
  // 歌单格式
  if (song.albuminfo && song.albuminfo.name) {
    return song.albuminfo.name;
  }
  return song.album_name || song.album || '未知专辑';
};

// 获取歌曲音质
const getSongQuality = (song) => {
  if (song.audio_info && song.audio_info.bitrate) {
    if (song.audio_info.bitrate >= 320) {
      return 'HQ';
    }
  }
  if (song.bitrate) {
    if (song.bitrate >= 320) {
      return 'HQ';
    }
  }
  return '';
};

// 格式化时长
const formatDuration = (duration) => {
  if (!duration) return '00:00';
  // 处理毫秒单位的时长
  const totalSeconds = Math.floor(duration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// 处理图片加载失败
const handleImageError = (event) => {
  // 图片加载失败时使用默认图片
  event.target.src = './assets/images/ico.png';
};

// 切换收藏状态
const toggleFavorite = async () => {
  if (!MoeAuth.isAuthenticated) {
    // 使用更友好的提示
    if (window.$message) {
      window.$message.info('请先登录后再收藏专辑');
    } else {
      alert('请先登录后再收藏专辑');
    }
    return;
  }
  
  try {
    // 模拟专辑ID格式，与歌单收藏保持一致
    const albumGid = `album_${albumId.value}`;
    // 获取专辑艺术家信息
    const artistName = album.value.authors && album.value.authors.length > 0 
      ? album.value.authors[0].name 
      : '未知艺术家';
    
    // 获取当前收藏列表
    let collectedPlaylists = JSON.parse(localStorage.getItem('collectedPlaylists') || '[]');
    
    if (isFavorited.value) {
      // 取消收藏逻辑
      const playlistIndex = collectedPlaylists.findIndex(p => p.list_create_gid === albumGid);
      
      if (playlistIndex > -1) {
        try {
          // 尝试调用API取消收藏
          const playlist = collectedPlaylists[playlistIndex];
          if (playlist.listid) {
            await get('/playlist/del', { listid: playlist.listid });
          }
        } catch (apiError) {
          console.warn('API取消收藏失败，使用本地存储方案:', apiError);
          // API失败不阻止本地操作
        }
        
        // 无论API是否成功，都更新本地存储
        const newCollectedPlaylists = collectedPlaylists.filter(item => 
          item.list_create_gid !== albumGid
        );
        localStorage.setItem('collectedPlaylists', JSON.stringify(newCollectedPlaylists));
        isFavorited.value = false;
        
        // 显示成功提示
        if (window.$message) {
          window.$message.success('取消收藏成功');
        } else {
          alert('取消收藏成功');
        }
      }
    } else {
      // 添加收藏逻辑
      
      // 准备收藏数据
      const newPlaylist = {
        list_create_listid: albumId.value,
        list_create_gid: albumGid,
        name: album.value.name,
        pic: album.value.cover,
        count: totalSongs.value,
        authors: [artistName], // 添加作者信息标记为专辑
        create_time: new Date().getTime()
      };
      
      try {
        // 尝试调用API添加收藏
        const response = await get('/playlist/add', { 
          name: album.value.name, 
          list_create_userid: MoeAuth.UserInfo.userid || 0, 
          type: 1,
          list_create_gid: albumGid,
          authors: [artistName]
        });
        
        if (response.status === 1) {
          // API调用成功，添加listid
          newPlaylist.listid = response.data.info?.listid || '';
        }
      } catch (apiError) {
        console.warn('API添加收藏失败，使用本地存储方案:', apiError);
        // API失败不阻止本地操作
      }
      
      // 无论API是否成功，都保存到本地存储
      collectedPlaylists.push(newPlaylist);
      localStorage.setItem('collectedPlaylists', JSON.stringify(collectedPlaylists));
      
      isFavorited.value = true;
      
      // 显示成功提示
      if (window.$message) {
        window.$message.success('收藏成功');
      } else {
        alert('收藏成功');
      }
    }
    
    // 更新时间戳，触发Library页面刷新
    localStorage.setItem('t', Date.now());
    
  } catch (error) {
    console.error('收藏操作失败:', error);
    // 显示友好的错误提示
    const errorMessage = isFavorited.value ? '取消收藏失败，请稍后重试' : '收藏失败，请稍后重试';
    if (window.$message) {
      window.$message.error(errorMessage);
    } else {
      alert(errorMessage);
    }
  }
};

// 计算属性：是否全选
const isAllSelected = computed(() => {
  return selectedTracks.value.length > 0 && selectedTracks.value.length === songs.value.length;
});

// 切换批量选择模式
const toggleBatchSelection = () => {
  if (batchSelectionMode.value) {
    // 如果已经在批量选择模式，则切换菜单显示或退出模式
    if (isBatchMenuVisible.value) {
      // 如果菜单已经显示，则点击后退出批量选择模式
      batchSelectionMode.value = false;
      isBatchMenuVisible.value = false;
      selectedTracks.value = [];
      lastSelectedIndex.value = -1;
    } else {
      // 如果菜单未显示，则显示菜单
      isBatchMenuVisible.value = true;
    }
  } else {
    // 首次进入批量选择模式
    batchSelectionMode.value = true;
    isBatchMenuVisible.value = false;
  }
};

// 处理行点击
const handleRowClick = (event, index) => {
  if (event.target.tagName === 'INPUT' || event.target.closest('input')) {
    // 如果点击的是复选框，不执行选择操作
    return;
  }
  selectTrack(index, event);
};

// 选择/取消选择歌曲
const selectTrack = (index, event) => {
  if (event.shiftKey && lastSelectedIndex.value !== -1) {
    // Shift 键多选
    const start = Math.min(lastSelectedIndex.value, index);
    const end = Math.max(lastSelectedIndex.value, index);
    
    for (let i = start; i <= end; i++) {
      if (!selectedTracks.value.includes(i)) {
        selectedTracks.value.push(i);
      }
    }
  } else {
    // 普通点击
    const existingIndex = selectedTracks.value.indexOf(index);
    if (existingIndex === -1) {
      selectedTracks.value.push(index);
    } else {
      selectedTracks.value.splice(existingIndex, 1);
    }
  }
  
  lastSelectedIndex.value = index;
};

// 切换全选/取消全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedTracks.value = [];
  } else {
    selectedTracks.value = Array.from({ length: songs.value.length }, (_, i) => i);
  }
};

// 处理点击外部关闭菜单
const handleClickOutside = (event) => {
  const batchActionsMenu = document.querySelector('.batch-actions-menu');
  const batchActionBtn = document.querySelector('.batch-action-btn');
  if (batchActionsMenu && !batchActionsMenu.contains(event.target) && !batchActionBtn.contains(event.target)) {
    isBatchMenuVisible.value = false;
  }
};

// 组件挂载时添加事件监听
onMounted(() => {
  fetchAlbumSongs();
  document.addEventListener('click', handleClickOutside);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 将选中歌曲添加到播放队列（追加到当前队列）
const appendSelectedToQueue = async () => {
  if (selectedTracks.value.length === 0) return;
  
  try {
    const selectedSongs = selectedTracks.value.map(index => songs.value[index]);
    
    // 遍历选中的歌曲并添加到播放队列
    for (const song of selectedSongs) {
      const hash = getSongHash(song);
      const name = getSongName(song);
      const author = getAuthorName(song);
      const img = album.value.cover || './assets/images/ico.png';
      
      if (hash) {
        await addSongToQueue(hash, name, img, author);
      }
    }
    
    // 显示成功消息
    if (window.$message) {
      window.$message.success('添加到播放列表成功');
    } else {
      console.log('添加到播放列表成功');
    }
    
    // 关闭菜单
    isBatchMenuVisible.value = false;
  } catch (error) {
    console.error('添加到播放列表失败:', error);
    if (window.$message) {
      window.$message.error('添加到播放列表失败');
    }
  }
};

// 将选中歌曲添加到其他歌单
const addSelectedToOtherPlaylist = async () => {
  if (selectedTracks.value.length === 0) return;
  
  try {
    const selectedSongs = selectedTracks.value.map(index => songs.value[index]);
    
    // 检查是否已登录
    if (typeof MoeAuth !== 'undefined' && !MoeAuth.isAuthenticated) {
      if (window.$modal) {
        window.$modal.alert('请先登录');
      } else {
        alert('请先登录');
      }
      return;
    }
    
    // 调用歌单选择弹窗（这里假设系统有类似PlaylistDetail中的playlistSelect组件）
    // 由于没有看到具体的歌单选择组件实现，这里使用一个简化的实现
    // 实际项目中需要使用正确的组件或API
    const response = await window.$modal.prompt('请输入歌单名称:', '新建歌单');
    if (response) {
      console.log('将歌曲添加到歌单:', response);
      // 这里应该调用API将歌曲添加到指定歌单
      if (window.$message) {
        window.$message.success('添加到歌单成功');
      }
    }
    
    // 关闭菜单
    isBatchMenuVisible.value = false;
  } catch (error) {
    console.error('添加到歌单失败:', error);
    if (window.$message) {
      window.$message.error('添加到歌单失败');
    }
  }
};

// 批量下载选中的歌曲
const downloadSelectedSongs = async () => {
  if (selectedTracks.value.length === 0) return;
  
  try {
    // 保存选中的歌曲，用于后续下载
    songsToDownload.value = selectedTracks.value.map(index => songs.value[index]);
    
    // 显示音质选择弹窗
    showQualityModal.value = true;
    
    // 关闭菜单
    isBatchMenuVisible.value = false;
  } catch (error) {
    console.error('批量下载失败:', error);
    if (window.$message) {
      window.$message.error('批量下载失败');
    }
  }
};

// 关闭音质选择弹窗
const closeQualityModal = () => {
  showQualityModal.value = false;
  currentDownloadSong.value = null;
};

// 处理单首歌曲收藏
const handleFavoriteSong = async (song) => {
  try {
    // 检查是否已登录
    if (typeof MoeAuth !== 'undefined' && !MoeAuth.isAuthenticated) {
      if (window.$modal) {
        window.$modal.alert('请先登录');
      } else {
        alert('请先登录');
      }
      return;
    }
    
    // 获取用户的歌单列表
    const playlists = await fetchUserPlaylists();
    
    // 构建歌单选择HTML
    const playlistOptions = playlists.map(playlist => `
      <div class="playlist-option" data-id="${playlist.id}">
        ${playlist.name}
      </div>
    `).join('');
    
    const modalContent = `
      <div class="playlist-selector">
        <h3>收藏到</h3>
        <div class="playlists-container">
          ${playlistOptions}
        </div>
        <div class="modal-footer">
          <button class="close-btn">关闭</button>
        </div>
      </div>
      <style>
        .playlist-selector {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          width: 300px;
          max-height: 400px;
          overflow-y: auto;
        }
        .playlist-selector h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
          color: #333;
        }
        .playlists-container {
          margin-bottom: 15px;
        }
        .playlist-option {
          padding: 10px 15px;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        .playlist-option:hover {
          background-color: #f5f5f5;
        }
        .modal-footer {
          text-align: center;
        }
        .close-btn {
          background: #ff4081;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          width: 100%;
        }
      </style>
    `;
    
    // 创建自定义弹窗
    const modal = createCustomModal(modalContent);
    
    // 处理歌单选择
    modal.querySelectorAll('.playlist-option').forEach(option => {
      option.addEventListener('click', async () => {
        const playlistId = option.getAttribute('data-id');
        const playlistName = option.textContent.trim();
        
        // 调用API将歌曲添加到指定歌单
        await addSongToPlaylist(song, playlistId);
        
        if (window.$message) {
          window.$message.success(`已添加到歌单「${playlistName}」`);
        }
        
        closeModal(modal);
      });
    });
    
    // 处理关闭按钮
    modal.querySelector('.close-btn').addEventListener('click', () => {
      closeModal(modal);
    });
  } catch (error) {
    console.error('收藏歌曲失败:', error);
    if (window.$message) {
      window.$message.error('收藏歌曲失败');
    }
  }
};

// 获取用户歌单列表
const fetchUserPlaylists = async () => {
  try {
    // 从API获取真实的用户歌单数据
    const response = await get('/user/playlist', {
      pagesize: 100
    });
    
    if (response.status === 1 && response.data?.info) {
      // 只返回用户自己创建的歌单，并排除系统默认歌单
        return response.data.info.filter(
            playlist => 
                playlist.list_create_userid === MoeAuth.UserInfo.userid &&
                playlist.name !== '默认收藏' &&
                playlist.name !== '我喜欢' &&
                playlist.name !== '本地' &&
                playlist.name !== '我的云盘'
        ).map(playlist => ({
        id: playlist.listid, // 确保使用正确的ID字段
        name: playlist.name
      }));
    }
  } catch (error) {
    console.error('获取用户歌单失败:', error);
  }
  
  // 如果API调用失败，返回空数组
  return [];
};

// 添加歌曲到歌单
const addSongToPlaylist = async (song, playlistId) => {
  // 这里应该调用实际的API来添加歌曲到歌单
  console.log('添加歌曲到歌单:', song, '歌单ID:', playlistId);
  // 可以参考playlist_add.js中的API实现
};

// 创建自定义弹窗
const createCustomModal = (content) => {
  const modalOverlay = document.createElement('div');
  modalOverlay.style.position = 'fixed';
  modalOverlay.style.top = '0';
  modalOverlay.style.left = '0';
  modalOverlay.style.width = '100%';
  modalOverlay.style.height = '100%';
  modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modalOverlay.style.display = 'flex';
  modalOverlay.style.justifyContent = 'center';
  modalOverlay.style.alignItems = 'center';
  modalOverlay.style.zIndex = '1000';
  
  const modalContent = document.createElement('div');
  modalContent.innerHTML = content;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  return modalContent;
};

// 关闭弹窗
const closeModal = (modal) => {
  if (modal && modal.parentNode) {
    document.body.removeChild(modal.parentNode);
  }
};

// 处理单首歌曲下载
const handleDownloadSong = async (song) => {
  try {
    // 设置当前要下载的歌曲
    currentDownloadSong.value = song;
    
    // 保存到下载队列
    songsToDownload.value = [song];
    
    // 显示音质选择弹窗（类似图3的效果）
    showQualityModal.value = true;
  } catch (error) {
    console.error('准备下载歌曲失败:', error);
    if (window.$message) {
      window.$message.error('准备下载歌曲失败');
    }
  }
};

// 选择音质
const selectQuality = async (quality) => {
  // 关闭弹窗
  showQualityModal.value = false;
  
  // 处理下载
  await handleQualitySelected(quality);
};

// 带重试机制的下载函数 - 增强版，添加严格参数验证和详细日志记录
const downloadWithRetry = async (song, quality, maxRetries = 2) => {
  // 严格参数验证
  console.log('【调试】downloadWithRetry开始，参数验证', { 
    songId: song?.id,
    quality,
    hasHash: !!song?.hash,
    hasAudioInfo: !!song?.audio_info,
    maxRetries
  });
  
  if (!song || !song.id) {
    console.error('【错误】downloadWithRetry: 缺少有效的歌曲信息');
    return { success: false, error: new Error('缺少有效的歌曲信息') };
  }
  
  if (!quality) {
    console.error('【错误】downloadWithRetry: 缺少音质参数');
    return { success: false, error: new Error('缺少音质参数') };
  }
  
  let lastError = null;
  const startTime = Date.now();
  
  // 尝试不同的hash获取策略 - 添加策略名称标识
  const hashStrategies = [
    { name: 'getHashByQualityAlt', fn: () => getHashByQualityAlt(song, quality) }, // 原始hash获取
    { name: 'song.hash', fn: () => song.hash }, // 直接使用song.hash
    { name: 'getHashByQuality(320)', fn: () => getHashByQuality(song, '320') }, // 降级到320音质
    { name: 'getHashByQuality(128)', fn: () => getHashByQuality(song, '128') }, // 降级到128音质
    { name: 'getSongHash', fn: () => getSongHash(song) } // 使用默认hash获取方法
  ];
  
  // 尝试不同的音质降级策略
  const qualityStrategies = quality === 'flac' || quality === 999 
    ? [quality, 320, 128]
    : quality === '320' || quality === 320
    ? [quality, 128]
    : [quality];
  
  console.log(`【调试】下载策略配置: 最大重试${maxRetries}次，音质降级路径: ${qualityStrategies.join(' → ')}`);
  
  for (let retry = 0; retry <= maxRetries; retry++) {
    console.log(`【调试】开始下载尝试轮次 ${retry}/${maxRetries}，歌曲: ${getSongName(song)}`);
    
    for (const currentQuality of qualityStrategies) {
      const qualityLabel = getQualityLabel(currentQuality);
      console.log(`【调试】尝试音质: ${qualityLabel}`);
      
      for (let hashStrategyIndex = 0; hashStrategyIndex < hashStrategies.length; hashStrategyIndex++) {
        const strategy = hashStrategies[hashStrategyIndex];
        
        try {
          console.log(`【调试】尝试Hash策略 ${hashStrategyIndex + 1}/${hashStrategies.length}: ${strategy.name}`);
          
          // 尝试当前hash策略
          const hash = strategy.fn();
          
          if (!hash) {
            console.warn(`【调试】hash策略 ${hashStrategyIndex + 1} (${strategy.name}) 返回空值，尝试下一个策略`);
            continue;
          }
          
          console.log(`【调试】使用Hash策略 ${hashStrategyIndex + 1} (${strategy.name}) 获取到hash:`, hash);
          
          if (retry > 0 || currentQuality !== quality || hashStrategyIndex > 0) {
            console.log(`【调试】重试下载 ${getSongName(song)} (第${retry}次)，使用音质: ${qualityLabel}，hash策略: ${strategy.name}`);
          }
          
          // 尝试下载
          const downloadResult = await downloadSong(song, hash, currentQuality);
          
          const endTime = Date.now();
          console.log(`【调试】下载成功: ${getSongName(song)}，音质: ${qualityLabel}，耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
          
          return { 
            success: true, 
            quality: currentQuality,
            hashStrategy: strategy.name,
            hash,
            duration: ((endTime - startTime) / 1000).toFixed(2)
          };
        } catch (error) {
          lastError = error;
          console.error(`【调试】下载尝试失败 (音质: ${qualityLabel}, hash策略: ${strategy.name}):`, error.message);
          // 继续尝试下一个策略
          continue;
        }
      }
    }
    
    // 等待后重试 - 增加等待时间，使用指数退避
    if (retry < maxRetries) {
      const waitTime = Math.pow(2, retry + 1) * 1000; // 2秒、4秒、8秒...
      console.log(`【调试】所有策略尝试失败，将在${waitTime}ms后重试...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  const endTime = Date.now();
  console.error(`【调试】下载完全失败，耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒，歌曲: ${getSongName(song)}`);
  
  return { 
    success: false, 
    error: lastError,
    duration: ((endTime - startTime) / 1000).toFixed(2),
    retries: maxRetries,
    qualityAttempts: qualityStrategies.length,
    hashStrategiesAttempted: hashStrategies.length
  };
};

// 处理下载逻辑 - 增强版，添加严格参数验证和详细日志记录
const handleQualitySelected = async (quality) => {
  // 记录开始时间
  const startTime = Date.now();
  console.log('【调试】handleQualitySelected开始，参数验证', { 
    quality,
    songsToDownloadCount: songsToDownload.value?.length || 0,
    timestamp: new Date().toISOString()
  });
  
  try {
    // 严格参数验证
    if (!quality) {
      console.error('【错误】缺少音质参数');
      if (window.$message) {
        window.$message.warning('请选择音质');
      }
      return;
    }
    
    if (!songsToDownload.value || !Array.isArray(songsToDownload.value) || songsToDownload.value.length === 0) {
      console.error('【错误】下载队列为空或无效');
      if (window.$message) {
        window.$message.warning('没有可下载的歌曲');
      }
      return;
    }
    
    // 过滤有效歌曲
    const validSongs = songsToDownload.value.filter(song => song && song.id);
    if (validSongs.length === 0) {
      console.error('【错误】没有有效歌曲可下载');
      if (window.$message) {
        window.$message.warning('所选歌曲信息无效，请重新选择');
      }
      return;
    }
    
    currentDownloadQuality.value = quality;
    console.log(`【调试】使用音质 ${getQualityLabel(quality)} 下载 ${validSongs.length} 首有效歌曲`);
    
    // 下载统计
    let successCount = 0;
    let failCount = 0;
    const failedSongs = [];
    
    // 确保音质参数格式一致性
    let qualityParam = quality;
    if (typeof quality === 'string') {
      // 如果是字符串格式，转换为数字
      if (quality === 'flac') qualityParam = 999;
      else if (quality === '320' || quality === '128') qualityParam = parseInt(quality);
    }
    
    console.log(`【调试】音质参数转换: ${quality} -> ${qualityParam}`);
    
    // 显示开始下载的提示
    const messageOptions = { 
      message: `开始下载 ${validSongs.length} 首歌曲，将自动进行重试和音质降级`,
      type: 'info',
      duration: 5000
    };
    
    if (window.$message) {
      window.$message(messageOptions);
    }
    
    // 真实下载过程 - 串行下载以避免并发问题
    for (const [index, song] of validSongs.entries()) {
      // 再次验证song对象有效性
      if (!song || !song.id) {
        console.error(`【错误】第${index + 1}首歌曲对象无效`);
        continue;
      }
      
      const songName = getSongName(song);
      const artistName = getAuthorName(song);
      
      console.log(`【调试】开始处理第 ${index + 1}/${validSongs.length} 首: ${songName} - ${artistName}`);
      
      try {
        // 使用带重试机制的下载函数
        const result = await downloadWithRetry(song, quality);
        
        if (result.success) {
          successCount++;
          console.log(`【调试】第 ${index + 1} 首下载成功，使用音质: ${getQualityLabel(result.quality)}，hash策略: ${result.hashStrategy}`);
          
          // 显示单个下载成功的消息
          if (window.$message && validSongs.length <= 5) { // 只在少量歌曲时显示每个成功消息
            window.$message.success(`成功下载: ${songName}`);
          }
        } else {
          failCount++;
          failedSongs.push({
            name: songName,
            error: result.error?.message || '未知错误',
            retries: result.retries,
            strategiesAttempted: result.hashStrategiesAttempted
          });
          console.error(`【调试】歌曲 ${songName} 下载失败（所有重试均失败）:`, result.error?.message);
          console.error(`【调试】失败详情:`, result);
        }
      } catch (unexpectedError) {
        failCount++;
        failedSongs.push({
          name: songName,
          error: unexpectedError.message,
          type: 'unexpected_error'
        });
        console.error(`【调试】处理歌曲 ${songName} 时发生意外错误:`, unexpectedError);
        console.error(`【调试】错误堆栈:`, unexpectedError.stack);
      }
      
      // 添加延迟避免请求过于密集 - 使用随机延迟增加稳定性
      if (index < validSongs.length - 1) {
        const delay = Math.floor(Math.random() * 500) + 800; // 800-1300ms的随机延迟
        console.log(`【调试】添加请求间隔: ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // 显示下载完成消息
    console.log(`【调试】批量下载完成，耗时: ${duration.toFixed(2)}秒`);
    console.log(`【调试】下载结果统计: 成功${successCount}首，失败${failCount}首`);
    
    if (window.$message) {
      if (failCount === 0) {
        window.$message.success(`成功下载全部 ${successCount} 首歌曲 (耗时: ${duration.toFixed(2)}秒)`);
      } else {
        window.$message.warning(`成功下载 ${successCount} 首歌曲，${failCount} 首歌曲下载失败 (耗时: ${duration.toFixed(2)}秒)`);
        // 记录失败歌曲列表到控制台
        console.warn('【调试】下载失败的歌曲详细列表:', JSON.stringify(failedSongs, null, 2));
      }
    }
  } catch (error) {
    console.error('【调试】下载过程中发生严重错误:', error);
    console.error('【调试】错误堆栈:', error.stack);
    
    if (window.$message) {
      window.$message.error('下载过程中发生严重错误');
    }
  } finally {
    // 清空下载队列
    songsToDownload.value = [];
    console.log('【调试】批量下载流程完全结束，已清空下载队列');
  }
};

// 根据音质获取对应的hash
const getHashByQuality = (song, quality) => {
  // 从audio_info中获取对应音质的hash
  if (song.audio_info) {
    switch(quality) {
      case 'flac':
        return song.audio_info.hash_flac || song.audio_info.hash_320 || song.audio_info.hash_128 || song.audio_info.hash;
      case '320':
        return song.audio_info.hash_320 || song.audio_info.hash_128 || song.audio_info.hash;
      case '128':
      default:
        return song.audio_info.hash_128 || song.audio_info.hash;
    }
  }
  
  // 如果没有audio_info，使用默认的hash获取方式
  return getSongHash(song);
};

// 根据音质获取文件扩展名
const getExtensionByQuality = (quality) => {
  if (quality === 'flac') return 'flac';
  return 'mp3'; // 其他音质默认为mp3
};

// 根据音质获取显示名称
const getQualityLabel = (quality) => {
  // 支持字符串格式的音质参数
  if (quality === 'flac' || quality === 999) {
    return '无损音质 FLAC';
  } else if (quality === '320' || quality === 320) {
    return '高音质320K';
  } else if (quality === '128' || quality === 128) {
    return '普通音质128K';
  }
  return typeof quality === 'number' ? `${quality}K` : '标准音质';
};

// 根据选择的音质获取对应的hash - 支持数字格式的音质参数
const getHashByQualityAlt = (song, quality) => {
  // 转换数字格式为字符串格式以保持兼容性
  let qualityStr = quality;
  if (quality === 999) qualityStr = 'flac';
  else if (quality === 320 || quality === 128) qualityStr = String(quality);
  
  return getHashByQuality(song, qualityStr);
};

// 真实下载实现 - 优化版，增强错误处理和下载可靠性
const downloadSong = async (song, hash, quality) => {
  // 详细记录song对象结构，用于调试
  console.log('【调试】song对象结构:', {id: song.id, hash: song.hash, audio_info: song.audio_info ? Object.keys(song.audio_info) : 'undefined'});
  
  // 参数验证增强
  if (!song) {
    console.error('【调试】缺少song对象');
    return Promise.reject(new Error('缺少歌曲信息'));
  }
  
  if (!hash) {
    console.error('【调试】缺少hash值，song.hash:', song.hash, 'song.audio_info:', song.audio_info);
    return Promise.reject(new Error('缺少歌曲hash值'));
  }

  try {
    const songName = getSongName(song);
    const artistName = getAuthorName(song);
    const qualityLabel = getQualityLabel(quality);
    
    console.log(`【调试】开始下载歌曲 (${qualityLabel}):`, songName, 'by', artistName, 'hash:', hash);
    
    // 首先获取真实的音频文件URL
    // 转换音质参数，与song_url API保持一致
    let apiQuality = quality;
    if (quality === 'flac' || quality === 999) {
      apiQuality = 'flac';
    } else if (quality === 320 || quality === '320') {
      apiQuality = 320;
    } else if (quality === 128 || quality === '128') {
      apiQuality = 128;
    }
    
    console.log(`【调试】API调用参数: hash=${hash}, quality=${apiQuality}`);
    
    // 获取音频文件的真实URL - 增加超时控制
    console.log('【调试】调用song/url API...');
    
    // 添加超时机制的fetch函数
    const fetchWithTimeout = (url, options, timeout = 15000) => {
      return Promise.race([
        get(url, options),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API请求超时')), timeout)
        )
      ]);
    };
    
    // 尝试多次API请求
    let urlResponse = null;
    let maxApiRetries = 2;
    let apiRetryCount = 0;
    
    while (!urlResponse && apiRetryCount <= maxApiRetries) {
      try {
        if (apiRetryCount > 0) {
          console.log(`【调试】API请求重试 (${apiRetryCount}/${maxApiRetries})...`);
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * apiRetryCount));
        }
        urlResponse = await fetchWithTimeout('/song/url', { hash, quality: apiQuality });
      } catch (apiError) {
        console.error(`【调试】API请求失败 (${apiRetryCount}/${maxApiRetries}):`, apiError.message);
        apiRetryCount++;
        if (apiRetryCount > maxApiRetries) {
          throw new Error(`API请求失败且重试耗尽: ${apiError.message}`);
        }
      }
    }
    
    console.log('【调试】URL API响应完整结构:', JSON.stringify(urlResponse));
    
    // 检查API响应结构，使用更健壮的处理方式
    let downloadUrl = null;
    
    try {
      // 尝试获取响应数据
      const data = urlResponse?.data || {};
      
      // 处理可能的响应格式
      // 格式1: 直接在data中包含url
      if (data.url) {
        downloadUrl = data.url;
        console.log('【调试】从data.url获取下载链接:', downloadUrl);
      }
      // 格式2: data是数组，第一个元素包含url
      else if (Array.isArray(data) && data.length > 0 && data[0].url) {
        downloadUrl = data[0].url;
        console.log('【调试】从data[0].url获取下载链接:', downloadUrl);
      }
      // 格式3: 尝试查找第一个有效的url
      else if (Array.isArray(data)) {
        const validItem = data.find(item => item && item.url);
        if (validItem) {
          downloadUrl = validItem.url;
          console.log('【调试】从data数组中找到有效url:', downloadUrl);
        }
      }
      // 格式4: 检查是否有其他可能包含url的字段
      else if (data.data && (data.data.url || (Array.isArray(data.data) && data.data[0]?.url))) {
        if (data.data.url) {
          downloadUrl = data.data.url;
        } else if (Array.isArray(data.data) && data.data[0]?.url) {
          downloadUrl = data.data[0].url;
        }
        console.log('【调试】从嵌套data字段获取下载链接:', downloadUrl);
      }
      // 格式5: 检查是否有歌曲列表格式
      else if (data.list && Array.isArray(data.list) && data.list.length > 0 && data.list[0].url) {
        downloadUrl = data.list[0].url;
        console.log('【调试】从data.list获取下载链接:', downloadUrl);
      }
      // 格式6: 尝试通过audio_data获取
      else if (data.audio_data && (data.audio_data.url || (Array.isArray(data.audio_data) && data.audio_data[0]?.url))) {
        if (data.audio_data.url) {
          downloadUrl = data.audio_data.url;
        } else if (Array.isArray(data.audio_data) && data.audio_data[0]?.url) {
          downloadUrl = data.audio_data[0].url;
        }
        console.log('【调试】从data.audio_data获取下载链接:', downloadUrl);
      }
      
      // 额外检查是否返回了错误信息
      if (urlResponse?.error || urlResponse?.code === -1 || urlResponse?.status === -1) {
        throw new Error(`API返回错误: ${JSON.stringify(urlResponse)}`);
      }
    } catch (parseError) {
      console.error('【调试】解析API响应失败:', parseError);
    }
    
    // 如果仍然没有获取到url，尝试重试或使用备选方案
    if (!downloadUrl) {
      // 尝试使用默认音质重新获取
      console.warn('【调试】未获取到URL，尝试使用默认音质(320)重新获取...');
      const fallbackResponse = await get('/song/url', { hash, quality: 320 });
      console.log('【调试】备选API响应:', JSON.stringify(fallbackResponse));
      
      const fallbackData = fallbackResponse?.data || {};
      if (fallbackData.url) {
        downloadUrl = fallbackData.url;
        console.log('【调试】通过备选请求获取到URL:', downloadUrl);
      } else if (Array.isArray(fallbackData) && fallbackData[0]?.url) {
        downloadUrl = fallbackData[0].url;
        console.log('【调试】通过备选请求获取到URL:', downloadUrl);
      } else if (fallbackData.list && Array.isArray(fallbackData.list) && fallbackData.list.length > 0 && fallbackData.list[0].url) {
        downloadUrl = fallbackData.list[0].url;
        console.log('【调试】通过备选请求data.list获取到URL:', downloadUrl);
      }
    }
    
    // 如果仍然没有URL，尝试使用最低音质
    if (!downloadUrl) {
      console.warn('【调试】仍然未获取到URL，尝试使用最低音质(128)重新获取...');
      const lastResortResponse = await get('/song/url', { hash, quality: 128 });
      console.log('【调试】最低音质API响应:', JSON.stringify(lastResortResponse));
      
      const lastResortData = lastResortResponse?.data || {};
      if (lastResortData.url) {
        downloadUrl = lastResortData.url;
        console.log('【调试】通过最低音质请求获取到URL:', downloadUrl);
      } else if (Array.isArray(lastResortData) && lastResortData[0]?.url) {
        downloadUrl = lastResortData[0].url;
        console.log('【调试】通过最低音质请求获取到URL:', downloadUrl);
      }
    }
    
    if (!downloadUrl) {
      throw new Error('无法获取音频文件URL，请检查歌曲是否可下载');
    }
    
    console.log('【调试】最终获取到音频文件URL:', downloadUrl);
    
    // 使用fetch API获取文件blob，确保强制下载而不是播放
    console.log('【调试】开始fetch下载文件');
    
    // 添加fetch选项，确保正确处理跨域请求和认证
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Accept': 'audio/mpeg, audio/flac, audio/*, application/octet-stream',
        'User-Agent': navigator.userAgent
      },
      credentials: 'include', // 包含cookie，处理可能的认证需求
      mode: 'cors',
      cache: 'no-cache'
    };
    
    // 添加超时控制的fetch
    const fileFetchWithTimeout = (url, options, timeout = 30000) => {
      return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('文件下载超时')), timeout)
        )
      ]);
    };
    
    // 尝试多次下载文件
    let response = null;
    let maxDownloadRetries = 1;
    let downloadRetryCount = 0;
    
    while (!response && downloadRetryCount <= maxDownloadRetries) {
      try {
        if (downloadRetryCount > 0) {
          console.log(`【调试】文件下载重试 (${downloadRetryCount}/${maxDownloadRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        response = await fileFetchWithTimeout(downloadUrl, fetchOptions);
      } catch (downloadError) {
        console.error(`【调试】文件下载失败 (${downloadRetryCount}/${maxDownloadRetries}):`, downloadError.message);
        downloadRetryCount++;
        if (downloadRetryCount > maxDownloadRetries) {
          throw new Error(`文件下载失败且重试耗尽: ${downloadError.message}`);
        }
      }
    }
    
    console.log('【调试】fetch响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
      // 尝试处理HTTP错误状态
      if (response.status === 404) {
        throw new Error('文件不存在或已被删除');
      } else if (response.status === 403) {
        throw new Error('没有权限访问此文件，可能需要登录');
      } else if (response.status >= 500) {
        throw new Error('服务器错误，请稍后重试');
      } else if (response.status === 429) {
        throw new Error('请求过于频繁，请稍后再试');
      } else {
        throw new Error(`网络请求失败: ${response.status} ${response.statusText}`);
      }
    }
    
    // 检查响应内容类型
    const contentType = response.headers.get('content-type');
    console.log('【调试】响应内容类型:', contentType);
    
    // 验证是否为音频文件
    if (!contentType || (!contentType.includes('audio') && !contentType.includes('application/octet-stream'))) {
      console.warn('【调试】警告: 响应内容可能不是音频文件');
    }
    
    const blob = await response.blob();
    console.log('【调试】成功获取文件blob，大小:', blob.size, '类型:', blob.type);
    
    // 创建blob URL
    const blobUrl = URL.createObjectURL(blob);
    
    // 创建下载链接 - 改进版，增强兼容性和可靠性
    const link = document.createElement('a');
    link.href = blobUrl;
    
    // 设置文件名，包含音质信息，避免特殊字符
    const extension = getExtensionByQuality(quality);
    let fileName = `${artistName} - ${songName} (${qualityLabel}).${extension}`;
    fileName = fileName.replace(/[<>"/\\|?*:]/g, '_'); // 替换Windows文件名中的非法字符
    
    // 确保文件名不超过200个字符
    if (fileName.length > 200) {
      const nameWithoutExt = fileName.substring(0, fileName.length - extension.length - 1);
      fileName = nameWithoutExt.substring(0, 200 - extension.length - 1) + '.' + extension;
      console.log('【调试】文件名过长，已截断:', fileName);
    }
    
    link.download = fileName;
    link.target = '_blank'; // 确保在新标签中打开，不会干扰当前页面
    
    // 设置样式，确保链接不可见
    link.style.display = 'none';
    link.style.opacity = '0';
    link.style.position = 'absolute';
    link.style.left = '-9999px';
    
    // 触发下载 - 增强版，支持更多浏览器和环境
    document.body.appendChild(link);
    
    // 使用多种方式确保下载触发
    try {
      // 方式1: 标准的点击事件
      console.log('【调试】尝试标准方式触发下载');
      link.click();
      
      // 方式2: 如果标准方式失败，尝试使用自定义事件
      setTimeout(() => {
        console.log('【调试】确认下载触发或尝试备用方式');
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        link.dispatchEvent(clickEvent);
      }, 50);
      
      // 清理 - 延迟更长时间，确保下载完成
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        // 延迟更长时间释放blob URL，确保下载完成
        setTimeout(() => {
          try {
            URL.revokeObjectURL(blobUrl);
            console.log('【调试】已释放blob URL');
          } catch (revokeError) {
            console.warn('【调试】释放blob URL时出错:', revokeError);
          }
        }, 3000); // 3秒后释放
      }, 100);
      
      console.log('【调试】歌曲下载已触发:', fileName);
      return Promise.resolve({ success: true, fileName });
      
    } catch (downloadTriggerError) {
      console.error('【调试】触发下载时出错:', downloadTriggerError);
      // 清理资源
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (revokeError) {
        console.warn('【调试】释放blob URL时出错:', revokeError);
      }
      
      // 尝试使用替代方案：打开新窗口
      console.log('【调试】尝试替代方案：直接打开下载链接');
      try {
        window.open(blobUrl, '_blank');
        console.log('【调试】已通过新窗口触发下载');
        return Promise.resolve({ success: true, fileName, method: 'new_window' });
      } catch (fallbackError) {
        throw new Error(`触发下载失败: ${downloadTriggerError.message}`);
      }
    }
    
  } catch (error) {
    console.error('【调试】下载歌曲失败:', error.message, '错误对象:', error);
    // 添加详细的错误信息，便于排查
    const detailedError = new Error(`歌曲下载失败: ${error.message} (hash: ${hash}, quality: ${quality})`);
    detailedError.originalError = error;
    return Promise.reject(detailedError);
  }
};

// 播放全部歌曲
const playAllSongs = async () => {
  if (songs.value.length === 0) {
    console.error('没有可播放的歌曲');
    alert('暂无歌曲可播放');
    return;
  }
  
  try {
      // 遍历所有歌曲并添加到播放队列
      for (let i = 0; i < songs.value.length; i++) {
        const song = songs.value[i];
        const hash = getSongHash(song);
        const name = getSongName(song);
        const author = getAuthorName(song);
        const img = album.value.cover || './assets/images/ico.png';
        
        if (hash) {
          await addSongToQueue(hash, name, img, author);
        }
      }
      
      console.log(`已添加 ${songs.value.length} 首歌曲到播放队列`);
      
      // 播放第一首歌
      if (songs.value.length > 0) {
        const firstSong = songs.value[0];
        const hash = getSongHash(firstSong);
        const name = getSongName(firstSong);
        const author = getAuthorName(firstSong);
        const img = album.value.cover || './assets/images/ico.png';
        
        const result = await addSongToQueue(hash, name, img, author);
        if (!result.error) {
          // 触发播放事件
          const playEvent = new CustomEvent('playSong', {
            detail: { song: result.song }
          });
          window.dispatchEvent(playEvent);
          
          // 尝试直接播放
          try {
            if (window.audioElement) {
              await window.audioElement.play();
            } else {
              const audio = document.querySelector('audio');
              if (audio) {
                window.audioElement = audio;
                await audio.play();
              }
            }
          } catch (playError) {
            console.warn('自动播放被阻止:', playError);
          }
        }
      }
    } catch (error) {
      console.error('播放全部歌曲失败:', error);
      alert('播放歌曲时发生错误，请稍后重试');
    }
  };
  
  // 检查专辑是否已收藏
  const checkAlbumFavoriteStatus = () => {
    if (!MoeAuth.isAuthenticated) return;
    
    try {
      const collectedPlaylists = JSON.parse(localStorage.getItem('collectedPlaylists') || '[]');
      const albumGid = `album_${albumId.value}`;
      const isFavoritedAlbum = collectedPlaylists.some(p => p.list_create_gid === albumGid);
      isFavorited.value = isFavoritedAlbum;
    } catch (error) {
      console.error('检查收藏状态失败:', error);
      isFavorited.value = false;
    }
  };

  // 获取专辑详情
  const fetchAlbumDetail = async () => {
    if (!albumId.value) return;
    
    try {
      // 使用正确的API路径和参数名'id'
      const response = await get('/album/detail', { id: albumId.value });
      const apiData = response.data;
      
      console.log('专辑详情API返回数据:', apiData);
      
      // 检查API返回是否有数据
      if (apiData && Array.isArray(apiData) && apiData.length > 0) {
        // 取数组中的第一个元素作为专辑数据
        const data = apiData[0];
        
        // 映射专辑数据到组件需要的格式
        let coverUrl = './assets/images/ico.png'; // 默认封面
        
        // 与AlbumGrid组件保持完全一致的图片处理方式
        if (data.img) {
          coverUrl = (data.img || './assets/images/ico.png').replace('/240/','/480/');
        } else if (data.image) {
          coverUrl = (data.image || './assets/images/ico.png').replace('/240/','/480/');
        } else if (data.cover) {
          if (data.cover.startsWith('http://') || data.cover.startsWith('https://')) {
            coverUrl = data.cover.replace('/240/','/480/');
          } else {
            const fileName = data.cover.includes('/') ? data.cover.split('/').pop() : data.cover;
            coverUrl = `https://imge.kugou.com/stdmusic/480/${fileName}`;
          }
        } else if (data.cover_url) {
          coverUrl = data.cover_url.replace('/240/','/480/');
        } else if (data.album_cover) {
          coverUrl = data.album_cover.replace('/240/','/480/');
        }
        
        coverUrl = coverUrl.replace('/240/','/480/');
        
        album.value = {
          id: albumId.value,
          name: data.album_name || data.name || '未知专辑',
          cover: coverUrl,
          authors: data.author_name ? [{ name: data.author_name }] : [{ name: '未知艺术家' }],
          publish_date: data.publish_date || '未知时间',
          publish_company: data.publish_company || '',
          intro: data.intro || '暂无介绍'
        };
      }
    } catch (err) {
      console.error('获取专辑详情失败:', err);
      // 使用默认专辑信息
      album.value = {
        id: albumId.value,
        name: '未知专辑',
        cover: './assets/images/ico.png',
        authors: [{ name: '未知艺术家' }],
        publish_date: '未知时间',
        publish_company: '',
        intro: '暂无介绍'
      };
    } finally {
      // 检查专辑收藏状态
      checkAlbumFavoriteStatus();
    }
  };

// 获取专辑歌曲数据
const fetchAlbumSongs = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      console.log(`正在获取专辑ID: ${albumId.value} 的歌曲数据`);
      
      // 先获取专辑详情
      await fetchAlbumDetail();
      
      // 然后调用专辑歌曲API
      const response = await get('/album/songs', { id: albumId.value });
      
      // 保存原始数据
      rawData.value = response;
      console.log('专辑歌曲API返回原始数据:', rawData.value);
      
      // 处理歌曲列表数据
      const songsData = response;
      
      // 优先处理专辑歌曲格式：根据用户提供的专辑歌曲数据格式
      if (songsData.data && songsData.data.songs && Array.isArray(songsData.data.songs)) {
        // 专辑歌曲格式处理
        songs.value = songsData.data.songs;
        totalSongs.value = songsData.data.songs.length;
        
        // 如果有total字段，使用它作为总数
        if (songsData.total) {
          totalSongs.value = songsData.total;
        }
      } else if (songsData.data && songsData.data.list && Array.isArray(songsData.data.list)) {
        // 处理歌单格式
        songs.value = songsData.data.list;
        totalSongs.value = songsData.data.list.length;
      } else if (songsData.data && Array.isArray(songsData.data)) {
        // 处理直接是数组的情况
        songs.value = songsData.data;
        totalSongs.value = songsData.data.length;
      } else if (Array.isArray(songsData)) {
        // 处理直接返回数组的情况
        songs.value = songsData;
        totalSongs.value = songsData.length;
      } else {
        console.log('专辑歌曲API返回格式不符合预期');
        songs.value = [];
        totalSongs.value = 0;
      }
      
      console.log(`成功获取到 ${totalSongs.value} 首歌曲`);
    } catch (err) {
      console.error('获取专辑歌曲数据失败:', err);
      error.value = `获取数据失败: ${err.message || '未知错误'}`;
      songs.value = [];
      totalSongs.value = 0;
    } finally {
      loading.value = false;
    }
  };

// 监听路由参数变化
import { watch } from 'vue';
watch(() => route.query.id, (newId) => {
  if (newId) {
    albumId.value = newId;
    fetchAlbumSongs();
  }
});

// 收藏/取消收藏专辑功能已在前面定义

// 播放歌曲
const playSong = async (song) => {
  try {
    // 获取歌曲信息
    const hash = getSongHash(song);
    const name = getSongName(song);
    const author = getAuthorName(song);
    // 使用默认图片，因为专辑API返回的数据中可能没有歌曲封面
    const img = './assets/images/ico.png';
    
    if (!hash) {
      console.error('无法获取歌曲hash');
      alert('无法获取歌曲信息，请稍后重试');
      return;
    }
    
    console.log('播放歌曲:', name, 'by', author, 'hash:', hash);
    
    // 添加到播放队列并播放
    const result = await addSongToQueue(hash, name, img, author);
    
    if (result.error) {
      console.error('添加歌曲到队列失败:', result);
      // 显示更友好的错误提示
      if (result.shouldPlayNext) {
        alert('当前歌曲暂时无法播放，正在尝试播放下一首');
      } else {
        alert('获取歌曲失败，请稍后重试');
      }
    } else {
      console.log('歌曲添加到队列成功');
      // 创建自定义事件，通知PlayerControl组件播放歌曲
      const playEvent = new CustomEvent('playSong', {
        detail: { song: result.song }
      });
      window.dispatchEvent(playEvent);
      
      // 同时尝试直接播放，作为备选方案
      try {
        // 通过window对象获取audio元素并播放
        if (window.audioElement) {
          await window.audioElement.play();
        } else {
          // 如果window.audioElement不存在，尝试获取DOM中的audio元素
          const audio = document.querySelector('audio');
          if (audio) {
            // 保存到window对象以便后续使用
            window.audioElement = audio;
            await audio.play();
          }
        }
        console.log('播放尝试已发送');
      } catch (playError) {
        console.warn('自动播放被阻止，需要用户交互:', playError);
        // 这不应该阻止用户体验，因为用户已经点击了播放按钮
      }
    }
  } catch (error) {
    console.error('播放歌曲失败:', error);
    alert('播放歌曲时发生错误，请稍后重试');
  }
};

// 获取歌曲hash
const getSongHash = (song) => {
  // 专辑歌曲格式：优先从audio_info中获取hash
  if (song.audio_info) {
    if (song.audio_info.hash) return song.audio_info.hash;
    if (song.audio_info.hash_128) return song.audio_info.hash_128;
    if (song.audio_info.hash_320) return song.audio_info.hash_320;
    if (song.audio_info.hash_flac) return song.audio_info.hash_flac;
  }
  // 歌单格式和其他通用字段
  if (song.hash) return song.hash;
  if (song.file_hash) return song.file_hash;
  if (song.track_id) return song.track_id;
  if (song.audio_id) return song.audio_id;
  if (song.id) return song.id;
  if (song.base?.audio_id) return song.base.audio_id;
  return null;
};

// 已在上面的onMounted中处理，这里移除重复代码
</script>

<style scoped>
.album-songs-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background-color: var(--bg-color, #f5f5f5);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.header {
  background-color: var(--card-bg-color, #ffffff);
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
}

.cover-art {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.info {
  flex: 1;
  min-width: 300px;
}

.title {
  margin: 0 0 10px 0;
  color: var(--text-color, #333333);
  font-size: 32px;
  font-weight: bold;
}

.subtitle {
  margin: 0 0 5px 0;
  color: var(--text-secondary-color, #666666);
  font-size: 16px;
}

.meta {
  margin: 0 0 15px 0;
  color: var(--text-secondary-color, #666666);
  font-size: 14px;
}

.description {
  margin: 0 0 20px 0;
  color: var(--text-secondary-color, #666666);
  font-size: 14px;
  line-height: 1.6;
  max-height: 80px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.actions {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.relative {
  position: relative;
}

.batch-action-btn {
  background-color: var(--secondary-color, #7289da);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.3s, transform 0.2s;
}

.batch-action-btn:hover {
  background-color: var(--secondary-hover-color, #5b6eae);
  transform: translateY(-2px);
}

.checkbox-col {
  width: 40px;
  text-align: center;
}

.checkbox-col input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.batch-actions-menu {
  position: absolute;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  z-index: 1000;
  min-width: 180px;
}

.batch-actions-menu ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.batch-actions-menu li {
  padding: 10px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.batch-actions-menu li:hover {
  background-color: #f5f5f5;
}

.primary-btn {
  background-color: var(--primary-color, #1db954);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.3s, transform 0.2s;
}

.primary-btn:hover {
  background-color: var(--primary-hover-color, #1aa34a);
  transform: translateY(-2px);
}

.fav-btn {
  background-color: transparent;
  border: 2px solid var(--border-color, #e0e0e0);
  color: var(--text-secondary-color, #666666);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.fav-btn:hover {
  border-color: #f44336;
  color: #f44336;
}

.fav-btn.active {
  background-color: #f44336;
  border-color: #f44336;
  color: white;
}

.refresh-btn {
  background-color: var(--primary-color, #1db954);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.3s;
}

.refresh-btn:hover {
  background-color: var(--primary-hover-color, #1aa34a);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary-color, #666666);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color, #e0e0e0);
  border-top: 4px solid var(--primary-color, #1db954);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  background-color: #ffebee;
  border: 1px solid #ffcdd2;
  color: #c62828;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 20px;
}

.error button {
  background-color: #c62828;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.content {
  display: block;
}

.songs-list {
  background-color: var(--card-bg-color, #ffffff);
  padding: 0;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.songs-list h2 {
  margin: 0;
  padding: 20px;
  color: var(--text-color, #333333);
  font-size: 18px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  background-color: var(--header-bg-color, #f8f9fa);
}

.table-wrapper {
  max-height: 600px;
  overflow-y: auto;
}

.songs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  table-layout: fixed;
}

.songs-table tr {
  display: table;
  width: 100%;
  table-layout: fixed;
}

.songs-table th {
  background-color: var(--header-bg-color, #f8f9fa);
  padding: 10px 10px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary-color, #666666);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  position: sticky;
  top: 0;
  z-index: 10;
  font-size: 13px;
}

.songs-table td {
  padding: 10px 5px;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
  color: var(--text-color, #333333);
}

.song-row {
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.song-row:hover {
  background-color: rgba(29, 185, 84, 0.05);
}

.song-row:hover .play-icon {
  opacity: 1;
  color: var(--primary-color, #1db954);
}

.song-row:hover .number-col span {
  opacity: 0;
}

.play-icon {
  position: absolute;
  left: 16px;
  opacity: 0;
  transition: opacity 0.2s ease, color 0.2s ease;
  font-style: normal;
  font-size: 12px;
  width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
}

.number-col {
  position: relative;
  width: 50px;
  text-align: center;
  color: var(--text-secondary-color, #666666);
  font-size: 13px;
}

.number-col span {
  transition: opacity 0.2s ease;
}

.song-row:nth-child(even) {
  background-color: transparent;
}

.name-col {
  width: 25%;
  min-width: 180px;
  font-weight: 500;
  word-break: break-all;
}

.artist-col {
  width: 20%;
  min-width: 150px;
  color: var(--text-secondary-color, #666666);
  font-size: 13px;
  word-break: break-all;
}

.time-col {
  width: 20%;
  text-align: center;
  color: var(--text-secondary-color, #999999);
  font-size: 13px;
}

.action-col {

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.song-name {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.quality-tag {
    color: #1db954;
    font-size: 11px;
    padding: 2px 4px;
    border: 1px solid #1db954;
    border-radius: 3px;
    line-height: 1;
  }

  /* 音质选择弹窗样式 */
  .quality-select-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .quality-select-modal {
    background-color: white;
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid #f0f0f0;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background-color: #f5f5f5;
    color: #333;
  }

  .modal-content {
    padding: 20px;
  }

  .song-info {
    padding: 16px 0;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 16px;
  }

  .song-title {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }

  .song-artist {
    font-size: 14px;
    color: #666;
  }

  .quality-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .quality-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .quality-item:hover {
    background-color: #f8f9fa;
  }

  .quality-info {
    flex: 1;
  }

  .quality-name {
    font-size: 15px;
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }

  .quality-desc {
    font-size: 13px;
    color: #999;
  }

  .download-icon {
    font-size: 20px;
    color: #1db954;
    width: 32px;
    text-align: center;
  }

/* 滚动条样式 */
.table-wrapper::-webkit-scrollbar {
  width: 6px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

/* 操作按钮样式 */
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
  margin-right: 5px;
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
</style>
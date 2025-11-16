<template>
  <div class="detail-page">
    <!-- 头部信息区域 -->
    <div class="header">
      <img class="cover-art" :src="album.cover" :alt="album.name" @error="handleImageError" />
      <div class="info">
        <h1 class="title">{{ album.name || '未知专辑' }}</h1>
        <p class="subtitle">{{ album.publish_date || '未知时间' }}</p>
        <div class="meta" v-if="album.publish_company">{{ album.publish_company }}</div>
        <div class="description">{{ album.intro || '暂无介绍' }}</div>
        <div class="actions">
          <button class="primary-btn" @click="playAllSongs($event)">
            <i class="fas fa-play"></i> 播放全部
          </button>
          <button class="fav-btn" @click="toggleFavorite" :class="{ 'active': isFavorited }">
            <i class="fas fa-heart"></i>
          </button>
          <input type="text" v-model="searchQuery" @keyup.enter="searchTracks" placeholder="搜索歌曲" class="search-input" />
        </div>
      </div>

      <!-- 表头 -->
      <div class="track-list-header-row">
        <div class="track-number-header">♪</div>
        <div class="track-title-header" @click="sortTracks('name')">
          歌名 <i class="fas" :class="getSortIconClass('name')"></i>
        </div>
        <div class="track-artist-header" @click="sortTracks('author')">
          歌手 <i class="fas" :class="getSortIconClass('author')"></i>
        </div>
        <div class="track-album-header" @click="sortTracks('album')">
          专辑 <i class="fas" :class="getSortIconClass('album')"></i>
        </div>
        <div class="track-timelen-header" @click="sortTracks('timelen')">
          时间 <i class="fas" :class="getSortIconClass('timelen')"></i>
        </div>
      </div>

      <!-- 歌曲列表 -->
      <div class="track-list">
        <template v-for="(item, index) in filteredTracks" :key="item.hash || index">
          <div class="li" 
              @click="playSong(item, $event)"
              @contextmenu.prevent="showContextMenu($event, item)">
              
              <!-- 序号 -->
              <div class="track-number">{{ index + 1 }}</div>

              <!-- 歌曲信息 -->
              <div class="track-title" :title="item.name">{{ item.name || '未知歌曲' }}
                <span v-if="item.privilege == 10" class="icon vip-icon">VIP</span>
                <span v-if="item.isHQ" class="icon sq-icon">HQ</span>
                <span v-else-if="item.isSQ" class="icon sq-icon">SQ</span>
              </div>
              <div class="track-artist" :title="item.author">{{ item.author || '未知艺术家' }}</div>
              <div class="track-album" :title="item.album">{{ item.album || '' }}</div>
              <div class="track-timelen">
                <button v-if="currentSongHash === item.hash" 
                    class="queue-play-btn fas fa-music"></button>
                {{ formatDuration(item.timelen) }}
              </div>
          </div>
        </template>
        <div v-if="filteredTracks.length === 0" class="empty">暂无歌曲</div>
      </div>
    </div>

    <div class="note-container">
      <transition-group name="fly-note">
        <div v-for="note in flyingNotes" :key="note.id" class="flying-note" :style="note.style">♪</div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue';
import { getCover } from '../utils/utils';
import { useRoute, useRouter } from 'vue-router';
import { get } from '../utils/request';
import { useMusicQueueStore } from '../stores/musicQueue';
import useSongQueue from '../components/player/SongQueue';
import { useI18n } from 'vue-i18n';


// 组件属性和状态
// 移除props依赖，直接使用musicQueueStore
// const props = defineProps({
//   playerControl: {
//     type: Object,
//     default: () => ({})
//   }
// });

const router = useRouter();
const route = useRoute();

// 专辑信息状态
const album = ref({
  id: '',
  name: '',
  cover: '',
  authors: [],
  publish_date: '',
  publish_company: '',
  intro: ''
});

// 歌曲列表状态
const tracks = ref([]);
const filteredTracks = ref([]);
const searchQuery = ref('');
const loading = ref(true);
const isFavorited = ref(false);
const flyingNotes = ref([]);
let noteId = 0;

// 排序状态
const sortField = ref('');
const sortOrder = ref('asc');
const currentSongHash = ref('');

// 状态管理和队列相关
const { t } = useI18n();
const musicQueueStore = useMusicQueueStore();
const { addSongToQueue } = useSongQueue(t, musicQueueStore);

// 队列相关状态
const isPlaying = ref(false);
const queueSongs = ref([]);

// 获取队列中的歌曲列表
const getQueueSongs = computed(() => {
  return musicQueueStore.songs || [];
});

// 添加歌曲到队列的增强函数
const addSongToQueueEnhanced = async (hash, name, img, author) => {
  try {
    // 先使用现有的功能添加歌曲
    const result = await addSongToQueue(hash, name, img, author);
    
    if (!result.error) {
      // 更新本地队列
      queueSongs.value = [...getQueueSongs.value];
    }
    
    return result;
  } catch (error) {
    console.error('添加歌曲到队列失败:', error);
    return { song: null, error: error.message };
  }
};

// 获取歌曲hash的增强函数
const getSongHashEnhanced = (song) => {
  const hash = getSongHash(song);
  
  // 如果原函数没有获取到hash，尝试更多方法
  if (!hash && song) {
    if (song.audio_id) return `audio_${song.audio_id}`;
    if (song.mid) return `mid_${song.mid}`;
    // 生成唯一hash作为最后的备选方案
    return `unique_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  return hash;
};

// 监听路由参数变化
watch(() => route.params.id || route.query.id, (newId) => {
  if (newId) {
    fetchAlbumDetail();
  }
});

// 获取排序图标类名
const getSortIconClass = (field) => {
  if (sortField.value !== field) return '';
  return sortOrder.value === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
};

// 排序歌曲
const sortTracks = (field) => {
  if (sortField.value === field) {
    // 切换排序方向
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    // 新的排序字段，默认升序
    sortField.value = field;
    sortOrder.value = 'asc';
  }
  
  // 应用排序
  const sorted = [...filteredTracks.value].sort((a, b) => {
    let aValue = a[field] || '';
    let bValue = b[field] || '';
    
    // 确保字符串类型
    if (typeof aValue !== 'string') aValue = String(aValue);
    if (typeof bValue !== 'string') bValue = String(bValue);
    
    // 时间字段特殊处理
    if (field === 'timelen') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    } else {
      // 字符串转小写进行比较
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });
  
  filteredTracks.value = sorted;
};

// 搜索歌曲
const searchTracks = () => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) {
    filteredTracks.value = [...tracks.value];
    return;
  }
  
  filteredTracks.value = tracks.value.filter(track => 
    track.name.toLowerCase().includes(query) ||
    track.author.toLowerCase().includes(query) ||
    track.album.toLowerCase().includes(query)
  );
};

// 格式化时长
const formatDuration = (duration) => {
  if (!duration) return '00:00';
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// 初始化播放队列相关功能已在前面完成

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

// 播放歌曲
const playSong = async (item, event) => {
  if (!item) {
    console.error('无效的歌曲信息');
    return;
  }
  
  try {
      // 获取或生成歌曲hash
      const hash = getSongHash(item);
      const name = item.name || '未知歌曲';
      const author = item.author || '未知艺术家';
      const img = './assets/images/ico.png';
      
      // 初始化uniqueHash变量
      let uniqueHash = null;
      if (!hash) {
        // 如果没有获取到hash，生成一个唯一的hash
        uniqueHash = `unique_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.warn('没有获取到歌曲hash，生成唯一hash:', uniqueHash);
      }
      
      // 将歌曲添加到队列
      const finalHash = hash || uniqueHash;
      const result = await addSongToQueueEnhanced(finalHash, name, img, author);
      
      if (!result.error) {
        // 设置当前播放的歌曲
        currentSongHash.value = finalHash;
      
      // 创建飞行动画效果
      if (event) createFlyingNote(event);
      
      // 触发播放事件
      const playEvent = new CustomEvent('playSong', {
        detail: { song: result.song }
      });
      window.dispatchEvent(playEvent);
      
      // 尝试直接播放
      try {
        if (window.audioElement) {
          await window.audioElement.play();
          isPlaying.value = true;
        } else {
          const audio = document.querySelector('audio');
          if (audio) {
            window.audioElement = audio;
            await audio.play();
            isPlaying.value = true;
          }
        }
      } catch (playError) {
        console.warn('自动播放被阻止:', playError);
      }
    } else {
      console.error('添加歌曲到队列失败:', result.error);
      alert('添加歌曲失败，请稍后重试');
    }
  } catch (error) {
    console.error('播放歌曲失败:', error);
    alert('播放歌曲时发生错误');
  }
};

// 播放全部歌曲
const playAllSongs = async (event) => {
  if (filteredTracks.value.length === 0) {
    console.error('没有可播放的歌曲');
    alert('暂无歌曲可播放');
    return;
  }
  
  try {
      // 遍历所有歌曲并添加到播放队列
      for (let i = 0; i < filteredTracks.value.length; i++) {
        const song = filteredTracks.value[i];
        const hash = getSongHash(song);
        const name = song.name || '未知歌曲';
        const author = song.author || '未知艺术家';
        const img = './assets/images/ico.png';
        
        if (hash) {
          await addSongToQueue(hash, name, img, author);
        }
      }
      
      console.log(`已添加 ${filteredTracks.value.length} 首歌曲到播放队列`);
      
      // 播放第一首歌
      if (filteredTracks.value.length > 0) {
        const firstSong = filteredTracks.value[0];
        const hash = getSongHash(firstSong);
        const name = firstSong.name || '未知歌曲';
        const author = firstSong.author || '未知艺术家';
        const img = './assets/images/ico.png';
        
        const result = await addSongToQueue(hash, name, img, author);
        if (!result.error) {
          currentSongHash.value = hash;
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

// 切换收藏状态
const toggleFavorite = () => {
  isFavorited.value = !isFavorited.value;
  // 这里可以添加收藏/取消收藏的API调用
  console.log(`${isFavorited.value ? '收藏' : '取消收藏'}专辑: ${album.value.name}`);
  if (event) createFlyingNote(event);
};

// 显示右键菜单
const showContextMenu = (event, song) => {
  // 这里可以实现右键菜单功能
  console.log('右键菜单:', song.name);
};

// 处理图片加载失败
const handleImageError = (event) => {
  // 图片加载失败时使用本地默认图片
  event.target.src = './assets/images/ico.png';
};

// 创建飞行动画效果
const createFlyingNote = (event) => {
  if (!event) return;
  
  const rect = event.target.getBoundingClientRect();
  const note = {
    id: noteId++,
    style: {
      left: `${rect.left + rect.width / 2}px`,
      top: `${rect.top + rect.height / 2}px`,
      opacity: 1,
      transform: 'scale(1)'
    }
  };
  
  flyingNotes.value.push(note);
  
  // 动画结束后移除
  setTimeout(() => {
    flyingNotes.value = flyingNotes.value.filter(n => n.id !== note.id);
  }, 1500);
};

// 获取专辑详情
const fetchAlbumDetail = async () => {
    loading.value = true;
    const albumId = route.params.id || route.query.id;
    
    // 如果没有专辑ID，显示错误信息并返回
    if (!albumId) {
      console.error('未找到专辑ID');
      loading.value = false;
      return;
    }
    
    console.log('当前专辑ID:', albumId);
    
    try {
      // 使用正确的API路径和参数名'id'
      const response = await get('/album/detail', { id: albumId });
      const apiData = response.data;
      
      console.log('API返回数据:', apiData);
      
      // 检查API返回是否有数据，根据实际API返回结构，直接检查apiData是否为数组
      if (apiData && Array.isArray(apiData) && apiData.length > 0) {
        // 取数组中的第一个元素作为专辑数据
          const data = apiData[0];
        
        // 映射专辑数据到组件需要的格式，根据API返回的实际结构适配
        // 尝试多种可能的封面URL来源
        let coverUrl = 'https://imge.kugou.com/stdmusic/200x200/20220705143006989099.jpg'; // 默认封面
        
        // 与AlbumGrid组件保持完全一致的图片处理方式
        // 首先尝试使用img字段，这是搜索结果中使用的字段
        if (data.img) {
          // 直接应用与AlbumGrid相同的替换逻辑
          coverUrl = (data.img || './assets/images/ico.png').replace('/240/','/480/');
        } else if (data.image) {
          // 搜索结果中也使用image字段，应用相同的替换逻辑
          coverUrl = (data.image || './assets/images/ico.png').replace('/240/','/480/');
        } else if (data.cover) {
          // 检查是否已经是完整URL
          if (data.cover.startsWith('http://') || data.cover.startsWith('https://')) {
            coverUrl = data.cover.replace('/240/','/480/');
          } else {
            // 对于非完整URL，构建与搜索结果相同格式的URL
            const fileName = data.cover.includes('/') ? data.cover.split('/').pop() : data.cover;
            coverUrl = `https://imge.kugou.com/stdmusic/480/${fileName}`;
          }
        } else if (data.cover_url) {
          coverUrl = data.cover_url.replace('/240/','/480/');
        } else if (data.album_cover) {
          coverUrl = data.album_cover.replace('/240/','/480/');
        } else if (data.sizable_cover) {
          coverUrl = data.sizable_cover.replace('/240/','/480/');
        }
        
        // 确保所有coverUrl都应用了480尺寸替换
        coverUrl = coverUrl.replace('/240/','/480/');
        
        album.value = {
          id: albumId,
          name: data.album_name || data.name || '未知专辑',
          cover: coverUrl,
          authors: data.author_name ? [{ name: data.author_name }] : [{ name: '未知艺术家' }],
          publish_date: data.publish_date || '未知时间',
          publish_company: data.publish_company || '',
          intro: data.intro || '暂无介绍'
        };
        
        // 处理歌曲列表，调用专门的专辑歌曲API
        try {
          // 调用专辑歌曲API获取歌曲列表
          const songsResponse = await get('/album/songs', { id: albumId });
          const songsData = songsResponse.data;
          
          console.log('专辑歌曲API返回数据:', songsData);
          
          // 根据API返回的结构处理歌曲列表
          console.log('专辑歌曲API返回完整数据:', songsData);
          
          // 优先检查songsData.data.songs结构（用户提供的实际接口返回格式）
          if (songsData && songsData.data && songsData.data.songs && Array.isArray(songsData.data.songs)) {
            tracks.value = songsData.data.songs.map((song, index) => {
              // 从extend字段获取排序信息
              const disc = song.extend?.disc || 1;
              const sort = song.extend?.sort || index + 1;
              
              // 处理作者信息
              let author = '未知艺术家';
              // 尝试从不同字段获取作者信息
              if (song.extend && song.extend.author_name) {
                author = song.extend.author_name;
              } else if (song.author_name) {
                author = song.author_name;
              } else if (song.singer) {
                author = song.singer;
              }
              
              // 处理封面图
              let cover = album.value.cover;
              if (song.trans_param && song.trans_param.union_cover) {
                cover = song.trans_param.union_cover.replace('{size}', 480).replace('http://', 'https://');
              } else if (song.cover) {
                cover = song.cover;
              }
              
              return {
                id: song.id || index + 1,
                hash: song.hash || song.fileHash || `hash_${song.id || index}`,
                name: song.audio_name || song.name || song.song_name || '未知歌曲',
                author: author,
                album: album.value.name,
                timelen: song.timelen || song.duration || song.song_duration || 0,
                cover: cover,
                isHQ: song.trans_param?.qualitymap?.attr0 > 2134622325 || false,
                isSQ: song.trans_param?.qualitymap?.attr1 > 1747189245 || false,
                privilege: song.privilege || 0,
                disc: disc,
                sort: sort
              };
            });
            
            // 根据碟片号和排序号排序
            tracks.value.sort((a, b) => {
              if (a.disc !== b.disc) return a.disc - b.disc;
              return a.sort - b.sort;
            });
          } 
          // 其次检查songsData.data.list结构
          else if (songsData && songsData.data && songsData.data.list && Array.isArray(songsData.data.list)) {
            tracks.value = songsData.data.list.map((song, index) => ({
              id: song.audio_id || song.id || index + 1,
              hash: song.hash || `hash_${song.audio_id || song.id || index}`,
              name: song.audio_name || song.name || song.song_name || '未知歌曲',
              author: song.authors && song.authors.length > 0 ? song.authors.map(author => author.author_name).join('、') : song.singer || song.artist_name || song.author || '未知艺术家',
              album: song.album || song.album_name || album.value.name,
              timelen: song.timelen || song.song_duration || song.duration || 0,
              cover: song.cover || album.value.cover,
              isHQ: song.isHQ || false,
              isSQ: song.isSQ || false,
              privilege: song.privilege || 0
            }));
          } 
          // 兼容songsData.data是数组的情况
          else if (songsData && songsData.data && Array.isArray(songsData.data)) {
            tracks.value = songsData.data.map((song, index) => ({
              id: song.id || index + 1,
              hash: song.hash || `hash_${song.id || index}`,
              name: song.name || song.song_name || '未知歌曲',
              author: song.singer || song.artist_name || song.author || '未知艺术家',
              album: song.album || song.album_name || album.value.name,
              timelen: song.timelen || song.song_duration || song.duration || 0,
              cover: song.cover || album.value.cover,
              isHQ: song.isHQ || false,
              isSQ: song.isSQ || false,
              privilege: song.privilege || 0
            }));
          } 
          // 兼容直接返回数组的情况
          else if (songsData && Array.isArray(songsData)) {
            tracks.value = songsData.map((song, index) => ({
              id: song.id || index + 1,
              hash: song.hash || `hash_${song.id || index}`,
              name: song.name || song.song_name || '未知歌曲',
              author: song.singer || song.artist_name || song.author || '未知艺术家',
              album: song.album || song.album_name || album.value.name,
              timelen: song.timelen || song.song_duration || song.duration || 0,
              cover: song.cover || album.value.cover,
              isHQ: song.isHQ || false,
              isSQ: song.isSQ || false,
              privilege: song.privilege || 0
            }));
          } else {
            console.log('专辑歌曲API返回格式不符合预期');
            tracks.value = [];
          }
        } catch (songsError) {
          console.error('获取专辑歌曲列表失败:', songsError);
          tracks.value = [];
        }
      } else {
        // API返回格式不符合预期时重置数据
        console.log('API返回格式不符合预期');
        album.value = {
          id: albumId,
          name: '未知专辑',
          cover: './assets/images/live.png',
          authors: [{ name: '未知艺术家' }],
          publish_date: '未知时间',
          publish_company: '',
          intro: '暂无介绍'
        };
        tracks.value = [];
      }
    } catch (error) {
      console.error('获取专辑数据失败:', error);
      // 发生错误时重置数据，不使用模拟数据
      album.value = {
        id: albumId,
        name: '未知专辑',
        cover: 'https://imge.kugou.com/stdmusic/200x200/20220705143006989099.jpg',
        authors: [{ name: '未知艺术家' }],
        publish_date: '未知时间',
        publish_company: '',
        intro: '暂无介绍'
      };
      tracks.value = [];
    } finally {
      // 初始化过滤后的列表
      filteredTracks.value = [...tracks.value];
      loading.value = false;
      console.log('加载完成，歌曲数量:', tracks.value.length);
    }
};

// 组件挂载时获取专辑详情
onMounted(() => {
  fetchAlbumDetail();
});
</script>

<style scoped>
.detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background-color: var(--bg-color, #f5f5f5);
  color: var(--text-color, #333);
}

.header {
  background-color: var(--card-bg-color, #ffffff);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.cover-art {
  width: 240px;
  height: 240px;
  object-fit: cover;
  float: left;
  margin-right: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.info {
  padding: 30px;
  overflow: hidden;
}

.title {
  font-size: 28px;
  font-weight: bold;
  margin: 0 0 15px 0;
  color: var(--text-color, #333);
}

.subtitle {
  color: var(--secondary-text-color, #666);
  margin: 0 0 10px 0;
  font-size: 14px;
}

.meta {
  color: var(--secondary-text-color, #666);
  margin: 0 0 20px 0;
  font-size: 14px;
}

.description {
  background-color: var(--subtle-bg-color, #f8f8f8);
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  max-height: 100px;
  overflow-y: auto;
  color: var(--text-color, #333);
  line-height: 1.6;
  font-size: 14px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.primary-btn {
  background-color: var(--primary-color, #ff69b4);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.primary-btn:hover {
  background-color: var(--primary-hover-color, #ff5ca8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 105, 180, 0.3);
}

.primary-btn i {
  margin-right: 5px;
}

.fav-btn {
  background-color: transparent;
  border: 1px solid var(--secondary-color, #ccc);
  padding: 10px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.fav-btn:hover {
  background-color: var(--subtle-bg-color, #f0f0f0);
}

.fav-btn i {
  color: var(--secondary-text-color, #999);
  font-size: 18px;
}

.fav-btn.active i {
  color: var(--primary-color, #ff69b4);
}

.search-input {
  padding: 10px 15px;
  border: 1px solid var(--secondary-color, #ccc);
  border-radius: 25px;
  font-size: 14px;
  width: 200px;
  background-color: var(--input-bg-color, #ffffff);
  color: var(--text-color, #333);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color, #ff69b4);
}

/* 表头样式 */
.track-list-header-row {
  display: flex;
  padding: 15px 30px;
  background-color: var(--header-bg-color, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  font-weight: bold;
  font-size: 14px;
  color: var(--secondary-text-color, #666);
}

.track-number-header {
  margin-right: 10px;
  width: 30px;
}

.track-title-header {
  flex: 2;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.track-artist-header, .track-album-header {
  flex: 1;
  padding: 0 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.track-timelen-header {
  width: 95px;
  text-align: right;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.track-title-header i, .track-artist-header i, .track-album-header i, .track-timelen-header i {
  margin-left: 5px;
  font-size: 14px;
}

.track-list-header-row:hover {
  background-color: var(--hover-bg-color, #e9e9e9);
}

/* 歌曲列表样式 */
.track-list {
  display: flex;
  flex-direction: column;
  padding: 0 30px;
}

.li {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.li:hover {
  background-color: var(--hover-bg-color, #fafafa);
}

.track-number {
  margin-right: 10px;
  width: 30px;
  text-align: center;
  color: var(--secondary-text-color, #999);
  font-size: 14px;
}

.track-title {
  flex: 2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  color: var(--text-color, #333);
}

.track-artist {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 10px;
  font-size: 13px;
  color: var(--secondary-text-color, #999);
}

.track-album {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 10px;
  font-size: 13px;
  color: var(--secondary-text-color, #999);
}

.track-timelen {
  width: 95px;
  text-align: right;
  font-size: 13px;
  color: var(--secondary-text-color, #999);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 5px;
}

.icon {
  margin-left: 5px;
  border: 1px solid;
  font-size: 10px;
  padding-left: 6px;
  padding-right: 6px;
}

.vip-icon {
  color: #ff6d00;
}

.sq-icon {
  color: #0094ff;
}

.queue-play-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--primary-color, #ff69b4);
  cursor: pointer;
}

.empty {
  text-align: center;
  padding: 40px;
  color: var(--secondary-text-color, #999);
  font-size: 16px;
}

/* 飞行动画 */
.note-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.flying-note {
  position: absolute;
  color: var(--primary-color, #ff69b4);
  font-size: 24px;
  animation: flyUp 1.5s ease-out forwards;
  z-index: 1001;
}

@keyframes flyUp {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(0, -100px) scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: translate(0, -200px) scale(1.5);
    opacity: 0;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cover-art {
    width: 180px;
    height: 180px;
    margin-right: 20px;
  }
  
  .info {
    padding: 20px;
  }
  
  .title {
    font-size: 24px;
  }
  
  .track-list-header-row,
  .track-list {
    padding: 0 15px;
  }
  
  .track-album-header,
  .track-album {
    display: none;
  }
  
  .track-title-header,
  .track-title {
    flex: 2;
  }
  
  .track-artist-header,
  .track-artist {
    flex: 1;
  }
  
  .search-input {
    width: 150px;
  }
}

@media (max-width: 480px) {
  .cover-art {
    width: 140px;
    height: 140px;
    margin-right: 15px;
  }
  
  .info {
    padding: 15px;
  }
  
  .title {
    font-size: 20px;
  }
  
  .actions {
    flex-wrap: wrap;
  }
  
  .search-input {
    width: 100%;
    margin-top: 10px;
  }
}
</style>
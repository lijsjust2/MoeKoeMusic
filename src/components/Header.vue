<template>
    <header>
        <nav class="navigation">
            <div class="nav-links">
                <router-link to="/">{{ $t('shou-ye') }}</router-link>
                <router-link to="/discover">{{ $t('fa-xian') }}</router-link>
                <router-link to="/Ranking">排行</router-link>
                <router-link to="/library">我的</router-link>
            </div>
            <div class="search-profile">
                <button class="search-icon" @click="openSearchPage">
                    <i class="fas fa-search"></i>
                </button>
                <div class="profile" @click="toggleProfile">
                    <img :src="MoeAuth.UserInfo ? MoeAuth.UserInfo.pic : './assets/images/profile.jpg'"
                        alt="Profile Picture">
                    <div class="profile-menu" v-if="showProfile">
                        <ul>
                            <li>
                                <router-link to="/settings">
                                    <i class="fas fa-cog"></i> {{ $t('she-zhi') }}
                                </router-link>
                            </li>
                            <li>
                                <a v-if="MoeAuth.isAuthenticated" @click="logout"><i
                                        class="fas fa-sign-out-alt"></i>{{ $t('tui-chu') }}</a>
                                <router-link to="/login" v-else>
                                    <i class="fas fa-sign-in-alt"></i> {{ $t('deng-lu') }}
                                </router-link>
                            </li>
                            <li>
                                <a @click="openRegisterUrl(downloadUrl || 'https://github.com/iAJue/MoeKoeMusic/releases')" style="position: relative;">
                                    <i class="fab fa-github"></i> {{ $t('geng-xin') }}
                                    <i v-if="showNewBadge" class="new-badge">new</i>
                                </a>
                            </li>
                            <li>
                                <a @click="Disclaimer()">
                                    <i class="fas fa-info-circle"></i> {{ $t('guan-yu') }}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </nav>
    </header>
    <div v-if="isDisclaimerVisible" class="modal-overlay" @click="Disclaimer">
        <div class="modal-content" @click.stop>
            <h2>{{ $t('mian-ze-sheng-ming') }}</h2>
            <p>{{ $t('0-ben-cheng-xu-shi-ku-gou-di-san-fang-ke-hu-duan-bing-fei-ku-gou-guan-fang-xu-yao-geng-wan-shan-de-gong-neng-qing-xia-zai-guan-fang-ke-hu-duan-ti-yan') }}</p>
            <p>{{ $t('1-ben-xiang-mu-jin-gong-xue-xi-shi-yong-qing-zun-zhong-ban-quan-qing-wu-li-yong-ci-xiang-mu-cong-shi-shang-ye-hang-wei-ji-fei-fa-yong-tu') }}</p>
            <p>{{ $t('2-shi-yong-ben-xiang-mu-de-guo-cheng-zhong-ke-neng-hui-chan-sheng-ban-quan-shu-ju-dui-yu-zhe-xie-ban-quan-shu-ju-ben-xiang-mu-bu-yong-you-ta-men-de-suo-you-quan-wei-le-bi-mian-qin-quan-shi-yong-zhe-wu-bi-zai-24-xiao-shi-nei-qing-chu-shi-yong-ben-xiang-mu-de-guo-cheng-zhong-suo-chan-sheng-de-ban-quan-shu-ju') }}</p>
            <p>{{ $t('3-you-yu-shi-yong-ben-xiang-mu-chan-sheng-de-bao-kuo-you-yu-ben-xie-yi-huo-you-yu-shi-yong-huo-wu-fa-shi-yong-ben-xiang-mu-er-yin-qi-de-ren-he-xing-zhi-de-ren-he-zhi-jie-jian-jie-te-shu-ou-ran-huo-jie-guo-xing-sun-hai-bao-kuo-dan-bu-xian-yu-yin-shang-yu-sun-shi-ting-gong-ji-suan-ji-gu-zhang-huo-gu-zhang-yin-qi-de-sun-hai-pei-chang-huo-ren-he-ji-suo-you-qi-ta-shang-ye-sun-hai-huo-sun-shi-you-shi-yong-zhe-fu-ze') }}
            </p>
            <p>{{ $t('4-jin-zhi-zai-wei-fan-dang-di-fa-lv-fa-gui-de-qing-kuang-xia-shi-yong-ben-xiang-mu-dui-yu-shi-yong-zhe-zai-ming-zhi-huo-bu-zhi-dang-di-fa-lv-fa-gui-bu-yun-xu-de-qing-kuang-xia-shi-yong-ben-xiang-mu-suo-zao-cheng-de-ren-he-wei-fa-wei-gui-hang-wei-you-shi-yong-zhe-cheng-dan-ben-xiang-mu-bu-cheng-dan-you-ci-zao-cheng-de-ren-he-zhi-jie-jian-jie-te-shu-ou-ran-huo-jie-guo-xing-ze-ren') }}
            </p>
            <p>{{ $t('5-yin-le-ping-tai-bu-yi-qing-zun-zhong-ban-quan-zhi-chi-zheng-ban') }}</p>
            <p>{{ $t('6-ben-xiang-mu-jin-yong-yu-dui-ji-shu-ke-hang-xing-de-tan-suo-ji-yan-jiu-bu-jie-shou-ren-he-shang-ye-bao-kuo-dan-bu-xian-yu-guang-gao-deng-he-zuo-ji-juan-zeng') }}</p>
            <p>{{ $t('7-ru-guo-guan-fang-yin-le-ping-tai-jue-de-ben-xiang-mu-bu-tuo-ke-lian-xi-ben-xiang-mu-geng-gai-huo-yi-chu') }}</p>
            <button @click="Disclaimer">{{ $t('guan-bi') }}</button>
            <div class="version-number">© MoeKoe Music <span v-if="appVersion">V{{ appVersion }} - {{ platform }}</span></div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { MoeAuthStore } from '../stores/store';
import { openRegisterUrl } from '../utils/utils';
import { useI18n } from 'vue-i18n';
const MoeAuth = MoeAuthStore();
const isDisclaimerVisible = ref(false);
const router = useRouter();
const { t } = useI18n();
const showNewBadge = ref(false);
const downloadUrl = ref('');
const appVersion = ref('');
const platform = ref('');
onMounted(() => {
    if (window.electron) {
        window.electron.ipcRenderer.on('version', (version) => {
            appVersion.value = version;
            fetchLatestVersion();
            platform.value = window.electron.platform;
            localStorage.setItem('version', version);
        });
    }
});
const Disclaimer = () => {
    isDisclaimerVisible.value = !isDisclaimerVisible.value;
};
const logout = async () => {
    const result = await window.$modal.confirm(t('ni-que-ren-yao-tui-chu-deng-lu-ma'));
    if (result) {
        MoeAuth.clearData();
        router.push({ path: '/' });   
    }
}
const showProfile = ref(false);

const toggleProfile = () => {
    showProfile.value = !showProfile.value;
};
const openSearchPage = () => {
    router.push('/search');
};
const handleClickOutside = (event) => {
    const queueProfile = document.querySelector('.profile-menu');
    if (queueProfile && !queueProfile.contains(event.target) && !event.target.closest('.profile')) {
        showProfile.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});

const fetchLatestVersion = async () => {
    try {
        const response = await fetch('https://api.github.com/repos/iAJue/MoeKoeMusic/releases/latest');
        const data = await response.json();
        downloadUrl.value = data.html_url;
        const latestVersion = data.tag_name.replace(/^v/, '');
        if (isVersionLower(appVersion.value, latestVersion)) {
            showNewBadge.value = true; 
        }
    } catch (error) {
        console.error('获取最新版本号失败:', error);
    }
};

const isVersionLower = (current, latest) => {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        if ((latestParts[i] || 0) > (currentParts[i] || 0)) {
            return true;
        } else if ((latestParts[i] || 0) < (currentParts[i] || 0)) {
            return false;
        }
    }
    return false;
};
</script>
<style scoped>
header {
    background-color: #fff;
    padding: 15px 0;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    position: fixed;
    width: 100%;
    top: 0px;
    z-index: 9;
}

.navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.nav-links {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-grow: 1;
}

.nav-links a {
    text-decoration: none;
    color: var(--primary-color);
    -webkit-app-region: no-drag;
    font-size: 18px;
    font-weight: 700;
    border-radius: 6px;
    padding: 8px 12px;
    transition: .2s;
    -webkit-user-drag: none;
}

.nav-links a:hover {
    background: var(--color-secondary-bg-for-transparent)
}

.nav-links a:active {
    transform: scale(.92);
    transition: .2s
}

.nav-links a.active {
    color: var(--color-primary);
    background-color: var(--color-secondary-bg-for-transparent);
}

.search-profile {
    display: flex;
    align-items: center;
    gap: 15px;
}

.search-icon {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: var(--color-text);
    transition: background-color 0.2s;
}

.search-icon:hover {
    background-color: var(--color-secondary-bg-for-transparent);
}

.profile {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: var(--secondary-color);
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.profile img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
}

.profile-menu {
    position: absolute;
    top: 50px;
    right: 0;
    background-color: #fff;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    padding: 10px;
    width: 150px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    animation: fadeInOut 0.3s ease-in-out;
    z-index: 100;
}

@keyframes fadeInOut {
    0% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

.profile-menu ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.profile-menu li a {
    display: flex;
    align-items: center;
    gap: 15px;
    cursor: pointer;
    padding: 7px 5px;
    border-radius: 5px;
    color: #000;
    text-decoration: none;
}

.profile-menu li a:hover {
    background-color: var(--secondary-color);
}

/* 移动端响应式样式 */
@media (max-width: 768px) {
    .navigation {
        padding: 0 15px;
    }
    
    .nav-links {
        gap: 10px;
        flex-grow: 1;
    }
    
    .nav-links a {
        font-size: 18px;
        padding: 6px 8px;
    }
    
    .search-icon {
        font-size: 16px;
        padding: 6px;
    }
    
    .profile {
        width: 36px;
        height: 36px;
    }
    
    .profile img {
        width: 36px;
        height: 36px;
    }
    
    .search-profile {
        gap: 10px;
    }
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    position: relative;
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    max-width: 700px;
    width: 90%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    text-align: left;
    animation: fadeIn 0.3s ease;
}

.modal-content h2 {
    margin-top: 0;
    color: var(--primary-color);
}

.modal-content p {
    margin: 10px 0;
    line-height: 1.6;
}

.modal-content button {
    margin-top: 15px;
    padding: 8px 12px;
    background-color: var(--primary-color);
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}


@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.new-badge {
    position: absolute;
    top: 1px;
    left: 67px;
    background-color: red;
    color: white;
    padding: 0px 4px;
    border-radius: 5px;
    font-size: 14px;
}

.version-number {
    position: absolute;
    bottom: 10px;
    right: 10px;
    font-size: 12px;
    color: #666;
}
</style>
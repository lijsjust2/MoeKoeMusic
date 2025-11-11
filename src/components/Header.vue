<template>
    <header>
        <nav class="navigation">
            <div class="nav-links">
                <router-link to="/">{{ $t('shou-ye') }}</router-link>
                <router-link to="/discover">{{ $t('fa-xian') }}</router-link>
                <router-link to="/Ranking">排行</router-link>
            </div>
            <div class="search-profile">
                <button class="search-icon" @click="openSearchPage">
                    <i class="fas fa-search"></i>
                </button>
                <div class="profile" @click="handleProfileClick">
                    <img :src="MoeAuth.UserInfo ? MoeAuth.UserInfo.pic : './assets/images/profile.jpg'"
                        alt="Profile Picture">
                </div>
            </div>
        </nav>
    </header>

</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { MoeAuthStore } from '../stores/store';
import { useI18n } from 'vue-i18n';
const MoeAuth = MoeAuthStore();
const router = useRouter();
const { t } = useI18n();
const logout = async () => {
    const result = await window.$modal.confirm(t('ni-que-ren-yao-tui-chu-deng-lu-ma'));
    if (result) {
        MoeAuth.clearData();
        router.push({ path: '/' });   
    }
}
const openSearchPage = () => {
    router.push('/search');
};

const handleProfileClick = () => {
    // 调试信息，查看认证状态
    console.log('Profile clicked, isAuthenticated:', MoeAuth.isAuthenticated);
    
    if (MoeAuth.isAuthenticated) {
        // 已登录，跳转到我的页面
        router.push('/library');
    } else {
        // 未登录，跳转到登录页面
        // 简化跳转逻辑，确保能正确跳转
        router.push('/login');
    }
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
</style>
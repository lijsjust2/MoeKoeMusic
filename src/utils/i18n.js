import { createI18n } from 'vue-i18n';
import zh_CN from '../language/zh-CN.json';

const messages = {
  'zh-CN': zh_CN,
};

const getBrowserLocale = () => {
  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) {
    if (browserLang === 'zh-TW' || browserLang === 'zh-HK') {
      return 'zh-CN'; // 统一使用简体中文
    }
    return 'zh-CN';
  }
  // 对于非中文浏览器，也返回中文
  return 'zh-CN';
};

// 默认使用中文，同时保留用户设置的优先级
const defaultLocale = JSON.parse(localStorage.getItem('settings'))?.['language'] || 'zh-CN';

const i18n = createI18n({
  locale: defaultLocale,
  fallbackLocale: 'zh-CN',
  messages,
});

export default i18n;
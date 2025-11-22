import { createI18n } from 'vue-i18n';
import zh_CN from '../language/zh-CN.json';

// 只使用简体中文
const messages = {
  'zh-CN': zh_CN
};

// 总是返回简体中文
const getBrowserLocale = () => 'zh-CN';

// 默认使用中文，同时保留用户设置的优先级
const defaultLocale = JSON.parse(localStorage.getItem('settings'))?.['language'] || 'zh-CN';

const i18n = createI18n({
  locale: defaultLocale,
  fallbackLocale: 'zh-CN',

  messages,
});

export default i18n;
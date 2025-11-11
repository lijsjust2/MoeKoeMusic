import { createI18n } from 'vue-i18n';
import zh_CN from '../language/zh-CN.json';

// 只使用简体中文
const messages = {
  'zh-CN': zh_CN
};

// 总是返回简体中文
const getBrowserLocale = () => 'zh-CN';

// 始终使用中文作为默认语言
const defaultLocale = 'zh-CN';

const i18n = createI18n({
  locale: defaultLocale,
  fallbackLocale: 'zh-CN', // 改为中文作为后备语言
  messages,
});

export default i18n;
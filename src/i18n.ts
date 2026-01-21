import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "app_title": "Primary School Typing Practice",
            "start": "Start",
            "next_lesson": "Next Lesson",
            "select_grade": "Select Grade",
            "all_grades": "All Grades",
            "language": "Language",
            "loading": "Loading...",
            "error": "Error",
            "results": "Results",
            "wpm": "WPM",
            "accuracy": "Accuracy",
            "time": "Time",
            "back_home": "Back Home",
            "restart": "Restart"
        }
    },
    zh: {
        translation: {
            "app_title": "小学语文课文打字练习",
            "start": "开始",
            "next_lesson": "下一篇",
            "select_grade": "选择年级",
            "all_grades": "所有年级",
            "language": "语言",
            "loading": "加载中...",
            "error": "错误",
            "results": "结果",
            "wpm": "速度 (WPM)",
            "accuracy": "准确率",
            "time": "时间",
            "back_home": "返回首页",
            "restart": "重新开始"
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'zh',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;

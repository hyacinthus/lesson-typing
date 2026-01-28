import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "app_title": "Elementary School Typing Practice",
            "start": "Start Practice",
            "hero_subtitle": "Practice with familiar texts",
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
            "back_home": "Back to Home",
            "restart": "Restart",
            "stats": {
                "duration": "Duration",
                "char_speed": "Character Speed",
                "char_unit": "Chars/min",
                "wpm_title": "WPM",
                "wpm_unit": "words/min",
                "accuracy": "Accuracy",
                "grade": "Rank: "
            }
        }
    },
    zh: {
        translation: {
            "app_title": "小学语文课文打字练习",
            "start": "开始练习",
            "hero_subtitle": "用熟悉的课文练习打字",
            "next_lesson": "下一课",
            "select_grade": "选择年级",
            "all_grades": "全部年级",
            "language": "语言",
            "loading": "加载中...",
            "error": "错误",
            "results": "成绩",
            "wpm": "WPM",
            "accuracy": "准确率",
            "time": "时间",
            "back_home": "返回首页",
            "restart": "重新开始",
            "stats": {
                "duration": "用时",
                "char_speed": "字符速度",
                "char_unit": "字符/分钟",
                "wpm_title": "WPM",
                "wpm_unit": "字/分钟",
                "accuracy": "准确率",
                "grade": "评级: "
            }
        }
    },
    es: {
        translation: {
            "app_title": "Práctica de mecanografía escolar",
            "start": "Empezar a practicar",
            "hero_subtitle": "Practica con textos conocidos",
            "next_lesson": "Siguiente lección",
            "select_grade": "Elegir grado",
            "all_grades": "Todos los grados",
            "language": "Idioma",
            "loading": "Cargando...",
            "error": "Error",
            "results": "Resultados",
            "wpm": "PPM",
            "accuracy": "Precisión",
            "time": "Tiempo",
            "back_home": "Volver al inicio",
            "restart": "Reiniciar",
            "stats": {
                "duration": "Duración",
                "char_speed": "Vel. de caracteres",
                "char_unit": "car./min",
                "wpm_title": "PPM",
                "wpm_unit": "palabras/min",
                "accuracy": "Precisión",
                "grade": "Nivel: "
            }
        }
    },
    ja: {
        translation: {
            "app_title": "小学校国語のタイピング練習",
            "start": "タイピング練習を始める",
            "hero_subtitle": "なじみのある教科書でタイピング練習",
            "next_lesson": "次のレッスン",
            "select_grade": "学年を選ぶ",
            "all_grades": "全学年",
            "language": "言語",
            "loading": "読み込み中...",
            "error": "エラー",
            "results": "結果",
            "wpm": "WPM",
            "accuracy": "正確率",
            "time": "時間",
            "back_home": "ホームに戻る",
            "restart": "やり直す",
            "stats": {
                "duration": "所要時間",
                "char_speed": "打鍵速度",
                "char_unit": "打/分",
                "wpm_title": "WPM",
                "wpm_unit": "語/分",
                "accuracy": "正確率",
                "grade": "評価: "
            }
        }
    },
    pt: {
        translation: {
            "app_title": "Prática de Digitação do Ensino Fundamental",
            "start": "Começar a praticar",
            "hero_subtitle": "Pratique com textos conhecidos",
            "next_lesson": "Próxima lição",
            "select_grade": "Selecionar série",
            "all_grades": "Todas as séries",
            "language": "Idioma",
            "loading": "Carregando...",
            "error": "Erro",
            "results": "Resultados",
            "wpm": "PPM",
            "accuracy": "Precisão",
            "time": "Tempo",
            "back_home": "Voltar ao início",
            "restart": "Recomeçar",
            "stats": {
                "duration": "Duração",
                "char_speed": "Vel. de caracteres",
                "char_unit": "car/min",
                "wpm_title": "PPM",
                "wpm_unit": "palavras/min",
                "accuracy": "Precisão",
                "grade": "Nível: "
            }
        }
    },
    fr: {
        translation: {
            "app_title": "Entraînement de dactylographie pour le primaire",
            "start": "Commencer",
            "hero_subtitle": "Exercez-vous avec des textes familiers",
            "next_lesson": "Leçon suivante",
            "select_grade": "Choisir le niveau",
            "all_grades": "Tous les niveaux",
            "language": "Langue",
            "loading": "Chargement...",
            "error": "Erreur",
            "results": "Résultats",
            "wpm": "MPM",
            "accuracy": "Précision",
            "time": "Temps",
            "back_home": "Retour à l'Accueil",
            "restart": "Recommencer",
            "stats": {
                "duration": "Durée",
                "char_speed": "Vit. des caractères",
                "char_unit": "car./min",
                "wpm_title": "MPM",
                "wpm_unit": "mots/min",
                "accuracy": "Précision",
                "grade": "Niveau: "
            }
        }
    },
    de: {
        translation: {
            "app_title": "Tipptrainer für die Grundschule",
            "start": "Übung starten",
            "hero_subtitle": "Mit vertrauten Texten tippen üben",
            "next_lesson": "Nächste Lektion",
            "select_grade": "Klasse wählen",
            "all_grades": "Alle Klassen",
            "language": "Sprache",
            "loading": "Laden...",
            "error": "Fehler",
            "results": "Ergebnisse",
            "wpm": "WPM",
            "accuracy": "Genauigkeit",
            "time": "Zeit",
            "back_home": "Zur Startseite",
            "restart": "Neu starten",
            "stats": {
                "duration": "Dauer",
                "char_speed": "Zeichentempo",
                "char_unit": "Zeichen/min",
                "wpm_title": "WPM",
                "wpm_unit": "Wörter/min",
                "accuracy": "Genauigkeit",
                "grade": "Niveau: "
            }
        }
    },
    it: {
        translation: {
            "app_title": "Pratica di Dattilografia per la Scuola Primaria",
            "start": "Inizia l'esercizio",
            "hero_subtitle": "Esercitati con testi familiari",
            "next_lesson": "Lezione successiva",
            "select_grade": "Seleziona classe",
            "all_grades": "Tutte le classi",
            "language": "Lingua",
            "loading": "Caricamento...",
            "error": "Errore",
            "results": "Risultati",
            "wpm": "PPM",
            "accuracy": "Precisione",
            "time": "Tempo",
            "back_home": "Torna alla home",
            "restart": "Ricomincia",
            "stats": {
                "duration": "Durata",
                "char_speed": "Velocità dei caratteri",
                "char_unit": "car/min",
                "wpm_title": "PPM",
                "wpm_unit": "parole/min",
                "accuracy": "Precisione",
                "grade": "Valutazione: "
            }
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'lesson-typing-language',
        },
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;

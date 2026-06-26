import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en/translation.json";
import ka from "./locales/ka/translation.json";

const savedLang = localStorage.getItem("kosmeo_lang") || "ka";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ka: { translation: ka },
    },
    lng: savedLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;

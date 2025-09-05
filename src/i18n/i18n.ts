import { createI18n } from 'vue-i18n';

import { messages as en } from './en/messages';
import { messages as es } from './es/messages';
import { messages as fr } from './fr/messages';

const messages = {
    en: en,
    es: es,
    fr: fr
};

const userLocale = navigator.language.split('-')[0];
const supportedLocales = Object.keys(messages);

export const usersLocale = supportedLocales.includes(userLocale) ? userLocale : 'en';
export const i18n = createI18n({
    locale: usersLocale,
    fallbackLocale: 'en',
    messages: messages
});

export function translate(key: string): string {
    return i18n.global.t(key);
}

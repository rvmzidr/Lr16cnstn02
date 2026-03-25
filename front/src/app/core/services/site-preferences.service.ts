
import { Injectable, computed, inject, signal, DOCUMENT } from '@angular/core';

export type SiteLanguage = 'fr' | 'en' | 'ar';

export type LocalizedCopy = {
  fr: string;
  en?: string;
  ar?: string;
  es?: string;
  de?: string;
  it?: string;
};

const STORAGE_LANGUAGE_KEY = 'lr16-site-language';
const STORAGE_THEME_KEY = 'lr16-site-theme';

@Injectable({ providedIn: 'root' })
export class SitePreferencesService {
  private readonly document = inject(DOCUMENT);
  readonly languages = [
    { code: 'fr' as const, label: 'Francais' },
    { code: 'en' as const, label: 'English' },
    { code: 'ar' as const, label: 'العربية' }
  ];

  readonly language = signal<SiteLanguage>('fr');
  readonly isDarkMode = signal(false);
  readonly isRtl = computed(() => this.language() === 'ar');
  readonly languageLabel = computed(
    () => this.languages.find((item) => item.code === this.language())?.label ?? 'Francais'
  );

  constructor() {
    if (typeof window !== 'undefined') {
      const storedLanguage = window.localStorage.getItem(STORAGE_LANGUAGE_KEY) as SiteLanguage | null;
      if (storedLanguage && this.languages.some((option) => option.code === storedLanguage)) {
        this.language.set(storedLanguage);
      } else if (storedLanguage) {
        window.localStorage.setItem(STORAGE_LANGUAGE_KEY, 'fr');
      }

      const storedTheme = window.localStorage.getItem(STORAGE_THEME_KEY);
      if (storedTheme === 'dark') {
        this.isDarkMode.set(true);
      } else if (storedTheme === 'light') {
        this.isDarkMode.set(false);
      } else {
        this.isDarkMode.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    }

    this.syncDom();
  }

  setLanguage(language: SiteLanguage) {
    this.language.set(language);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_LANGUAGE_KEY, language);
    }
    this.syncDom();
  }

  toggleDarkMode() {
    this.isDarkMode.update((value) => !value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_THEME_KEY, this.isDarkMode() ? 'dark' : 'light');
    }
    this.syncDom();
  }

  localize(copy: LocalizedCopy) {
    const language = this.language();
    return copy[language] || copy.fr;
  }

  private syncDom() {
    this.document.documentElement.lang = this.language();
    this.document.documentElement.dir = this.isRtl() ? 'rtl' : 'ltr';
    this.document.documentElement.classList.toggle('dark', this.isDarkMode());
    this.document.documentElement.style.colorScheme = this.isDarkMode() ? 'dark' : 'light';
  }
}

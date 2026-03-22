import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { SiteLanguage, SitePreferencesService } from '../../core/services/site-preferences.service';
import { sharedIcons } from '../lucide-icons';

@Component({
  selector: 'app-toolbar-controls',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="relative flex items-center gap-2">
      <button
        type="button"
        class="toolbar-icon-button"
        [attr.aria-label]="site.localize(languageButtonLabel)"
        (click)="toggleLanguageMenu()"
      >
        <lucide-icon [img]="icons.Globe" class="h-4 w-4"></lucide-icon>
        <span class="text-xs font-semibold tracking-[0.2em]">{{ languageCode() }}</span>
      </button>

      @if (languageMenuOpen()) {
        <div class="toolbar-dropdown">
          @for (option of primaryLanguages; track option.code) {
            <button
              type="button"
              class="toolbar-dropdown__item"
              [class.toolbar-dropdown__item--active]="site.language() === option.code"
              (click)="setLanguage(option.code)"
            >
              <span class="min-w-8 text-left text-xs font-semibold tracking-[0.2em]">{{ option.code.toUpperCase() }}</span>
              <span>{{ option.label }}</span>
            </button>
          }
        </div>
      }

      <button
        type="button"
        class="toolbar-icon-button"
        [attr.aria-label]="site.isDarkMode() ? site.localize(lightModeLabel) : site.localize(darkModeLabel)"
        (click)="site.toggleDarkMode()"
      >
        <lucide-icon [img]="site.isDarkMode() ? icons.SunMedium : icons.Moon" class="h-4 w-4"></lucide-icon>
      </button>
    </div>
  `
})
export class ToolbarControlsComponent {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly languageMenuOpen = signal(false);
  readonly primaryLanguages = this.site.languages;
  readonly languageCode = computed(() => this.site.language().toUpperCase());
  readonly languageButtonLabel = {
    fr: 'Changer la langue',
    en: 'Change language',
    ar: 'تغيير اللغة'
  };
  readonly darkModeLabel = {
    fr: 'Activer le mode sombre',
    en: 'Enable dark mode',
    ar: 'تفعيل الوضع الداكن'
  };
  readonly lightModeLabel = {
    fr: 'Activer le mode clair',
    en: 'Enable light mode',
    ar: 'تفعيل الوضع الفاتح'
  };

  toggleLanguageMenu() {
    this.languageMenuOpen.set(!this.languageMenuOpen());
  }

  setLanguage(language: SiteLanguage) {
    this.site.setLanguage(language);
    this.languageMenuOpen.set(false);
  }

  @HostListener('document:click')
  closeMenu() {
    this.languageMenuOpen.set(false);
  }

  @HostListener('click', ['$event'])
  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}

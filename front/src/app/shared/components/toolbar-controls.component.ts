import { Component, HostListener, Input, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { SiteLanguage, SitePreferencesService } from '../../core/services/site-preferences.service';
import { sharedIcons } from '../lucide-icons';

@Component({
  selector: 'app-toolbar-controls',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="relative flex items-center gap-2" [class.flex-col]="compact" [class.items-stretch]="compact">
      <button
        type="button"
        class="toolbar-icon-button"
        [class.toolbar-icon-button--compact]="compact"
        [attr.aria-label]="site.localize(languageButtonLabel)"
        (click)="toggleLanguageMenu()"
      >
        <lucide-icon [img]="icons.Globe" class="h-4 w-4"></lucide-icon>
        @if (!compact) {
          <span class="text-xs font-semibold tracking-[0.2em]">{{ languageCode() }}</span>
        }
      </button>

      @if (languageMenuOpen()) {
        <div class="toolbar-dropdown" [class.toolbar-dropdown--from-rail]="compact">
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
        [class.toolbar-icon-button--compact]="compact"
        [attr.aria-label]="site.isDarkMode() ? site.localize(lightModeLabel) : site.localize(darkModeLabel)"
        (click)="site.toggleDarkMode()"
      >
        <lucide-icon [img]="site.isDarkMode() ? icons.SunMedium : icons.Moon" class="h-4 w-4"></lucide-icon>
      </button>
    </div>
  `
})
export class ToolbarControlsComponent {
  @Input() compact = false;
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

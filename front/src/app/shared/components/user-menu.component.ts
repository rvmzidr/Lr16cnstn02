import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { getInitials } from '../../core/utils/format';
import { sharedIcons } from '../lucide-icons';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    @if (auth.isAuthenticated()) {
      <div class="relative">
        <button type="button" class="user-menu-trigger" (click)="toggleMenu()">
          <span class="user-menu-trigger__avatar">{{ initials() }}</span>
          <span class="hidden text-left md:block">
            <span class="block text-sm font-semibold text-foreground">{{ auth.session()?.utilisateur?.nomComplet }}</span>
            <span class="block text-xs text-muted-foreground">{{ site.localize(accountLabel) }}</span>
          </span>
        </button>

        @if (menuOpen()) {
          <div class="toolbar-dropdown min-w-52">
            <a routerLink="/dashboard/profil" class="toolbar-dropdown__item" (click)="menuOpen.set(false)">
              <lucide-icon [img]="icons.UserCircle2" class="h-4 w-4"></lucide-icon>
              <span>{{ site.localize(profileLabel) }}</span>
            </a>
            <a routerLink="/dashboard" class="toolbar-dropdown__item" (click)="menuOpen.set(false)">
              <lucide-icon [img]="icons.Home" class="h-4 w-4"></lucide-icon>
              <span>{{ site.localize(spaceLabel) }}</span>
            </a>
            <a routerLink="/dashboard/profil" class="toolbar-dropdown__item" (click)="menuOpen.set(false)">
              <lucide-icon [img]="icons.Settings" class="h-4 w-4"></lucide-icon>
              <span>{{ site.localize(settingsLabel) }}</span>
            </a>
            <button type="button" class="toolbar-dropdown__item" (click)="logout()">
              <lucide-icon [img]="icons.X" class="h-4 w-4"></lucide-icon>
              <span>{{ site.localize(logoutLabel) }}</span>
            </button>
          </div>
        }
      </div>
    }
  `
})
export class UserMenuComponent {
  readonly icons = sharedIcons;
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly initials = computed(() => getInitials(this.auth.session()?.utilisateur?.nomComplet));
  readonly accountLabel = { fr: 'Compte', en: 'Account', ar: 'الحساب' };
  readonly profileLabel = { fr: 'Profil', en: 'Profile', ar: 'الملف الشخصي' };
  readonly spaceLabel = { fr: 'Tableau de bord', en: 'Dashboard', ar: 'لوحة التحكم' };
  readonly settingsLabel = { fr: 'Parametres', en: 'Settings', ar: 'الإعدادات' };
  readonly logoutLabel = { fr: 'Deconnexion', en: 'Sign out', ar: 'تسجيل الخروج' };

  toggleMenu() {
    this.menuOpen.set(!this.menuOpen());
  }

  async logout() {
    this.menuOpen.set(false);
    this.auth.logout();
    await this.router.navigateByUrl('/connexion');
  }

  @HostListener('document:click')
  closeMenu() {
    this.menuOpen.set(false);
  }

  @HostListener('click', ['$event'])
  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}

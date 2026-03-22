import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { sharedIcons } from '../lucide-icons';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    @if (items().length > 1) {
      <nav class="breadcrumb-shell" aria-label="Breadcrumb">
        @for (item of items(); track item.url; let last = $last) {
          @if (!last) {
            <a [routerLink]="item.url" class="breadcrumb-shell__link">{{ item.label }}</a>
            <lucide-icon [img]="icons.ChevronRight" class="h-3.5 w-3.5 text-muted-foreground"></lucide-icon>
          } @else {
            <span class="breadcrumb-shell__current">{{ item.label }}</span>
          }
        }
      </nav>
    }
  `
})
export class BreadcrumbComponent {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly router = inject(Router);

  private readonly labels: Record<string, { fr: string; en: string; ar: string }> = {
    dashboard: { fr: 'Tableau de bord', en: 'Dashboard', ar: 'لوحة التحكم' },
    profil: { fr: 'Profil', en: 'Profile', ar: 'الملف الشخصي' },
    articles: { fr: 'Articles', en: 'Articles', ar: 'المقالات' },
    'articles/recherche': { fr: 'Recherche', en: 'Search', ar: 'البحث' },
    actualites: { fr: 'Actualites', en: 'News', ar: 'الأخبار' },
    about: { fr: 'A propos', en: 'About', ar: 'حول' },
    'a-propos': { fr: 'A propos', en: 'About', ar: 'حول' },
    contact: { fr: 'Contact', en: 'Contact', ar: 'اتصل بنا' },
    connexion: { fr: 'Connexion', en: 'Sign in', ar: 'تسجيل الدخول' },
    inscription: { fr: 'Inscription', en: 'Registration', ar: 'التسجيل' },
    'mot-de-passe-oublie': { fr: 'Mot de passe oublie', en: 'Forgot password', ar: 'نسيت كلمة المرور' },
    'reinitialiser-mot-de-passe': { fr: 'Reinitialiser le mot de passe', en: 'Reset password', ar: 'إعادة تعيين كلمة المرور' },
    projects: { fr: 'Projets', en: 'Projects', ar: 'المشاريع' },
    messages: { fr: 'Messagerie', en: 'Messages', ar: 'الرسائل' },
    purchases: { fr: 'Demandes d\'achat', en: 'Purchase requests', ar: 'طلبات الشراء' },
    'admin/comptes': { fr: 'Administration', en: 'Administration', ar: 'الإدارة' },
    'chef/articles': { fr: 'Moderation articles', en: 'Article moderation', ar: 'إدارة المقالات' },
    'chef/actualites': { fr: 'Gestion actualites', en: 'News management', ar: 'إدارة الأخبار' },
    news: { fr: 'Actualites', en: 'News', ar: 'الأخبار' }
  };

  readonly items = computed(() => {
    const url = this.router.url.split('?')[0].split('#')[0];
    const segments = url.split('/').filter(Boolean);

    if (!segments.length) {
      return [{ url: '/', label: this.site.localize({ fr: 'Accueil', en: 'Home', ar: 'الرئيسية' }) }];
    }

    const items = [{ url: '/', label: this.site.localize({ fr: 'Accueil', en: 'Home', ar: 'الرئيسية' }) }];
    let currentUrl = '';

    segments.forEach((segment, index) => {
      currentUrl += `/${segment}`;
      const composed = segments.slice(0, index + 1).join('/');
      const match = this.labels[composed] || this.labels[segment];
      if (!match) {
        return;
      }

      items.push({
        url: currentUrl,
        label: this.site.localize(match)
      });
    });

    return items;
  });
}

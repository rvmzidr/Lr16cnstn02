import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import type { Actualite } from '../../core/models/models';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-news-page',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  template: `
    <section class="page-shell py-8">
      <div class="hero-banner--light surface-card px-8 py-12 lg:px-12">
        <div class="max-w-5xl space-y-6">
          <div class="tag-chip">{{ site.localize(newsTag) }}</div>
          <h1 class="text-5xl font-bold text-foreground lg:text-7xl">
            {{ site.localize(newsTitle) }}
          </h1>
          <p class="text-xl leading-9 text-muted-foreground">
            {{ site.localize(newsIntro) }}
          </p>
        </div>
      </div>
    </section>

    <section class="page-shell py-6">
      <div class="surface-card p-6">
        <div class="relative">
          <lucide-icon
            [img]="icons.Search"
            class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          ></lucide-icon>
          <input
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            class="input-shell pl-11"
            [placeholder]="site.localize(searchPlaceholder)"
          />
        </div>
      </div>
    </section>

    <section class="page-shell py-4">
      <div class="grid gap-6 lg:grid-cols-2">
        @for (item of filteredNews(); track item.id) {
          <a
            [routerLink]="['/news', item.id]"
            class="surface-card surface-card--interactive block p-8 hover:border-primary/35"
          >
            <div
              class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"
            >
              <span class="badge-soft">{{ site.localize(headlineLabel) }}</span>
              <span>{{ formatDate(item.publieeLe || item.creeLe) }}</span>
            </div>
            <h2 class="mt-5 text-4xl font-bold leading-tight text-foreground">
              {{ item.titre }}
            </h2>
            <p class="mt-5 text-lg leading-8 text-muted-foreground">
              {{ item.resume || item.contenu }}
            </p>
            <div class="mt-6 text-base text-muted-foreground">
              {{ item.auteur?.nomComplet || site.localize(defaultAuthor) }}
            </div>
            <div class="mt-7 text-lg font-semibold text-primary">
              {{ site.localize(readLabel) }}
            </div>
          </a>
        }
      </div>

      @if (!filteredNews().length) {
        <div class="empty-state mt-8">{{ site.localize(emptyLabel) }}</div>
      }
    </section>
  `,
})
export class NewsPageComponent implements OnInit {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly query = signal('');
  readonly news = signal<Actualite[]>([]);
  readonly formatDate = formatDate;
  readonly newsTag = { fr: 'Actualités', en: 'News', ar: 'الأخبار' };
  readonly newsTitle = { fr: 'Actualités', en: 'News', ar: 'الأخبار' };
  readonly newsIntro = {
    fr: 'Restez informés des annonces, activités et avancées du laboratoire LR16CNSTN02.',
    en: 'Stay informed about announcements, activities, and progress at LR16CNSTN02 laboratory.',
    ar: 'تابع إعلانات وأنشطة وتطورات مختبر LR16CNSTN02.',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher une actualité...',
    en: 'Search news...',
    ar: 'ابحث في الأخبار...',
  };
  readonly headlineLabel = { fr: 'À la une', en: 'Headline', ar: 'في الواجهة' };
  readonly defaultAuthor = {
    fr: 'LR16CNSTN02',
    en: 'LR16CNSTN02',
    ar: 'LR16CNSTN02',
  };
  readonly readLabel = { fr: 'Lire', en: 'Read', ar: 'اقرأ' };
  readonly emptyLabel = {
    fr: 'Aucune actualité ne correspond à vos critères.',
    en: 'No news matches your criteria.',
    ar: 'لا توجد أخبار تطابق معاييرك.',
  };

  readonly filteredNews = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.news().filter(
      (item) =>
        !q ||
        item.titre.toLowerCase().includes(q) ||
        (item.resume || '').toLowerCase().includes(q) ||
        item.contenu.toLowerCase().includes(q),
    );
  });

  async ngOnInit() {
    try {
      const response = await api.listPublicNews({ limit: 24 });
      this.news.set(response.elements);
    } catch {
      this.news.set([]);
    }
  }
}

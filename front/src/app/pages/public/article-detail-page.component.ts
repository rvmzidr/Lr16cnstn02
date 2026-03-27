import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import type { Article } from '../../core/models/models';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { estimateReadTime, formatDate } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-article-detail-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <section class="page-shell py-8">
      <a routerLink="/articles" class="btn-outline mb-6">
        <lucide-icon [img]="icons.ChevronLeft" class="h-4 w-4"></lucide-icon>
        {{ site.localize(backToArticlesLabel) }}
      </a>

      @if (article()) {
        <article class="surface-card px-8 py-10 lg:px-12">
          <div
            class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"
          >
            <span class="badge-soft">{{
              article()?.categorie?.libelle || site.localize(otherCategoryLabel)
            }}</span>
            <span>{{
              formatDate(article()?.publieLe || article()?.creeLe)
            }}</span>
            <span>{{ estimateReadTime(article()?.contenu) }}</span>
          </div>
          <h1
            class="mt-6 max-w-5xl text-5xl font-bold leading-tight text-foreground lg:text-7xl"
          >
            {{ article()?.titre }}
          </h1>
          <p class="mt-6 max-w-4xl text-xl leading-9 text-muted-foreground">
            {{ article()?.resume }}
          </p>
          <div
            class="mt-8 flex items-center gap-3 text-base text-muted-foreground"
          >
            <lucide-icon
              [img]="icons.UserCircle2"
              class="h-5 w-5 text-primary"
            ></lucide-icon>
            <span>{{
              article()?.deposant?.nomComplet || site.localize(defaultAuthor)
            }}</span>
          </div>
          <div
            class="mt-10 whitespace-pre-line text-lg leading-9 text-foreground"
          >
            {{ article()?.contenu }}
          </div>
        </article>
      } @else {
        <div class="empty-state">{{ site.localize(notFoundLabel) }}</div>
      }
    </section>
  `,
})
export class ArticleDetailPageComponent implements OnInit {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly route = inject(ActivatedRoute);
  readonly article = signal<Article | null>(null);
  readonly formatDate = formatDate;
  readonly estimateReadTime = estimateReadTime;
  readonly backToArticlesLabel = {
    fr: 'Retour aux articles',
    en: 'Back to articles',
    ar: 'العودة إلى المقالات',
  };
  readonly otherCategoryLabel = { fr: 'AUTRE', en: 'OTHER', ar: 'أخرى' };
  readonly defaultAuthor = {
    fr: 'LR16CNSTN02',
    en: 'LR16CNSTN02',
    ar: 'LR16CNSTN02',
  };
  readonly notFoundLabel = {
    fr: 'Article introuvable.',
    en: 'Article not found.',
    ar: 'المقال غير موجود.',
  };

  async ngOnInit() {
    const articleId = this.route.snapshot.paramMap.get('articleId');
    if (!articleId) {
      return;
    }

    try {
      this.article.set(await api.getPublicArticle(articleId));
    } catch {
      this.article.set(null);
    }
  }
}

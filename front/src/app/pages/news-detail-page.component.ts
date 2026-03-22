import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import type { Actualite } from '../core/models/models';
import { api } from '../core/services/api';
import { formatDate } from '../core/utils/format';
import { sharedIcons } from '../shared/lucide-icons';

@Component({
  selector: 'app-news-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    <section class="page-shell py-8">
      <a routerLink="/news" class="btn-outline mb-6">
        <lucide-icon [img]="icons.ChevronLeft" class="h-4 w-4"></lucide-icon>
        Retour aux actualites
      </a>

      @if (newsItem()) {
        <article class="surface-card px-8 py-10 lg:px-12">
          <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span class="badge-soft">Actualite</span>
            <span>{{ formatDate(newsItem()?.publieeLe || newsItem()?.creeLe) }}</span>
          </div>
          <h1 class="mt-6 max-w-5xl text-5xl font-bold leading-tight text-foreground lg:text-7xl">{{ newsItem()?.titre }}</h1>
          <p class="mt-6 max-w-4xl text-xl leading-9 text-muted-foreground">{{ newsItem()?.resume || newsItem()?.contenu }}</p>
          <div class="mt-8 flex items-center gap-3 text-base text-muted-foreground">
            <lucide-icon [img]="icons.UserCircle2" class="h-5 w-5 text-primary"></lucide-icon>
            <span>{{ newsItem()?.auteur?.nomComplet || 'LR16CNSTN02' }}</span>
          </div>
          <div class="mt-10 whitespace-pre-line text-lg leading-9 text-foreground">{{ newsItem()?.contenu }}</div>
        </article>
      } @else {
        <div class="empty-state">Actualite introuvable.</div>
      }
    </section>
  `
})
export class NewsDetailPageComponent implements OnInit {
  readonly icons = sharedIcons;
  readonly route = inject(ActivatedRoute);
  readonly newsItem = signal<Actualite | null>(null);
  readonly formatDate = formatDate;

  async ngOnInit() {
    const newsId = this.route.snapshot.paramMap.get('newsId');
    if (!newsId) {
      return;
    }

    try {
      this.newsItem.set(await api.getPublicNews(newsId));
    } catch {
      this.newsItem.set(null);
    }
  }
}

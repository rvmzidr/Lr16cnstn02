
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Article, LabHeadArticlesData } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import { formatDate } from '../../core/utils/format';

@Component({
  selector: 'app-lab-head-articles-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-8">
      <div>
        <h2 class="text-4xl font-bold text-foreground">Moderation des articles</h2>
        <p class="text-lg text-muted-foreground">Valider, refuser ou publier les soumissions scientifiques.</p>
      </div>

      <section class="surface-card p-8">
        <h3 class="text-3xl font-bold text-foreground">Articles en attente</h3>
        <div class="mt-6 space-y-4">
          @for (article of data()?.articles || []; track article.id) {
            <div class="rounded-2xl border border-border/50 p-5">
              <div class="text-2xl font-bold text-foreground">{{ article.titre }}</div>
              <div class="mt-2 text-sm text-muted-foreground">{{ article.deposant?.nomComplet || 'LR16CNSTN02' }} • {{ formatDate(article.modifieLe) }}</div>
              <p class="mt-4 text-muted-foreground">{{ article.resume }}</p>
              <div class="mt-5 flex flex-wrap gap-3">
                <button type="button" class="btn-secondary" (click)="validate(article.id)">Valider</button>
                <button type="button" class="btn-outline" (click)="refuse(article.id)">Refuser</button>
              </div>
            </div>
          }
        </div>
      </section>

      <section class="surface-card p-8">
        <h3 class="text-3xl font-bold text-foreground">Articles valides</h3>
        <div class="mt-6 space-y-4">
          @for (article of data()?.articlesValides || []; track article.id) {
            <div class="rounded-2xl border border-border/50 p-5">
              <div class="text-2xl font-bold text-foreground">{{ article.titre }}</div>
              <div class="mt-2 text-sm text-muted-foreground">{{ article.deposant?.nomComplet || 'LR16CNSTN02' }} • {{ formatDate(article.modifieLe) }}</div>
              <p class="mt-4 text-muted-foreground">{{ article.resume }}</p>
              <div class="mt-5 flex flex-wrap gap-3">
                <button type="button" class="btn-secondary" (click)="publish(article.id)">Publier</button>
              </div>
            </div>
          }
        </div>
      </section>

      @if (statusMessage()) { <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-feedback-success">{{ statusMessage() }}</div> }
      @if (errorMessage()) { <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-feedback-error">{{ errorMessage() }}</div> }
    </div>
  `
})
export class LabHeadArticlesPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly data = signal<LabHeadArticlesData | null>(null);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly formatDate = formatDate;

  async ngOnInit() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    try {
      this.data.set(await api.getLabHeadArticles(token));
    } catch {
      this.data.set(null);
    }
  }

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  async validate(articleId: number) {
    try {
      await api.validateArticle(this.token, articleId);
      this.statusMessage.set('Article valide.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors de la validation.');
    }
  }

  async refuse(articleId: number) {
    try {
      await api.refuseArticle(this.token, articleId, { motifRejet: 'Precisions methodologiques requises.' });
      this.statusMessage.set('Article refuse.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors du refus.');
    }
  }

  async publish(articleId: number) {
    try {
      await api.publishArticle(this.token, articleId);
      this.statusMessage.set('Article publie.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors de la publication.');
    }
  }
}

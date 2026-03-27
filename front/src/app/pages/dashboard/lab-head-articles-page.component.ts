import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import type { LabHeadArticlesData } from '../../core/models/models';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';

@Component({
  selector: 'app-lab-head-articles-page',
  standalone: true,
  imports: [],
  template: `
    <div class="space-y-8">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">{{ site.localize(moderationTitle) }}</h2>
          <p class="app-page-description">
            {{ site.localize(moderationIntro) }}
          </p>
        </div>
      </div>

      <section class="app-kpi-grid">
        @for (card of summaryCards(); track card.label) {
          <div class="app-kpi-card">
            <div class="app-kpi-card__label">{{ card.label }}</div>
            <div class="app-kpi-card__value">{{ card.value }}</div>
            <div class="app-kpi-card__meta">{{ card.meta }}</div>
          </div>
        }
      </section>

      <section class="surface-card overflow-hidden">
        <div class="border-b border-border px-6 py-5">
          <h3 class="text-xl font-semibold text-foreground">
            Articles en attente
          </h3>
        </div>
        <div class="app-data-table-wrap rounded-none border-0 shadow-none">
          <table class="table-shell">
            <thead>
              <tr>
                <th>Article</th>
                <th>Deposant</th>
                <th>Maj</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (article of data()?.articles || []; track article.id) {
                <tr>
                  <td>
                    <div class="font-semibold text-foreground">
                      {{ article.titre }}
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {{ article.resume }}
                    </div>
                  </td>
                  <td>{{ article.deposant?.nomComplet || 'LR16CNSTN02' }}</td>
                  <td>{{ formatDate(article.modifieLe) }}</td>
                  <td>
                    <div class="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        class="btn-secondary"
                        (click)="validate(article.id)"
                      >
                        {{ site.localize(validateLabel) }}
                      </button>
                      <button
                        type="button"
                        class="btn-outline"
                        (click)="refuse(article.id)"
                      >
                        {{ site.localize(refuseLabel) }}
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4">
                    <div class="empty-state m-4">
                      Aucun article en attente de moderation.
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="surface-card overflow-hidden">
        <div class="border-b border-border px-6 py-5">
          <h3 class="text-xl font-semibold text-foreground">
            Articles valides
          </h3>
        </div>
        <div class="app-data-table-wrap rounded-none border-0 shadow-none">
          <table class="table-shell">
            <thead>
              <tr>
                <th>Article</th>
                <th>Deposant</th>
                <th>Maj</th>
                <th class="text-right">Publication</th>
              </tr>
            </thead>
            <tbody>
              @for (
                article of data()?.articlesValides || [];
                track article.id
              ) {
                <tr>
                  <td>
                    <div class="font-semibold text-foreground">
                      {{ article.titre }}
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {{ article.resume }}
                    </div>
                  </td>
                  <td>{{ article.deposant?.nomComplet || 'LR16CNSTN02' }}</td>
                  <td>{{ formatDate(article.modifieLe) }}</td>
                  <td>
                    <div class="flex justify-end">
                      <button
                        type="button"
                        class="btn-secondary"
                        (click)="publish(article.id)"
                      >
                        Publier
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4">
                    <div class="empty-state m-4">
                      Aucun article valide en attente de publication.
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (statusMessage()) {
        <div
          class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-feedback-success"
        >
          {{ statusMessage() }}
        </div>
      }
      @if (errorMessage()) {
        <div
          class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-feedback-error"
        >
          {{ errorMessage() }}
        </div>
      }
    </div>
  `,
})
export class LabHeadArticlesPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly data = signal<LabHeadArticlesData | null>(null);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly formatDate = formatDate;
  readonly moderationTitle = {
    fr: 'Modération des articles',
    en: 'Article moderation',
    ar: 'مراجعة المقالات',
  };
  readonly moderationIntro = {
    fr: 'Valider, refuser ou publier les soumissions scientifiques déjà exposées par l API actuelle.',
    en: 'Validate, reject, or publish scientific submissions already exposed by the current API.',
    ar: 'اعتمد أو ارفض أو انشر الإرسالات العلمية المتاحة عبر الواجهة الحالية.',
  };
  readonly validateLabel = { fr: 'Valider', en: 'Validate', ar: 'اعتماد' };
  readonly refuseLabel = { fr: 'Refuser', en: 'Refuse', ar: 'رفض' };

  readonly summaryCards = computed(() => [
    {
      label: 'En attente',
      value: this.data()?.statistiques.enAttente || 0,
      meta: 'A arbitrer',
    },
    {
      label: 'Valides',
      value: this.data()?.statistiques.valides || 0,
      meta: 'Pretes pour publication',
    },
    {
      label: 'Rejetes',
      value: this.data()?.statistiques.rejetes || 0,
      meta: 'Retournes aux auteurs',
    },
    {
      label: 'Publies',
      value: this.data()?.statistiques.publies || 0,
      meta: 'Deja visibles publiquement',
    },
  ]);

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
      this.statusMessage.set(
        this.site.localize({
          fr: 'Article validé.',
          en: 'Article validated.',
          ar: 'تم اعتماد المقال.',
        }),
      );
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur lors de la validation.',
              en: 'Validation error.',
              ar: 'خطأ أثناء الاعتماد.',
            }),
      );
    }
  }

  async refuse(articleId: number) {
    try {
      await api.refuseArticle(this.token, articleId, {
        motifRejet: 'Precisions methodologiques requises.',
      });
      this.statusMessage.set(
        this.site.localize({
          fr: 'Article refusé.',
          en: 'Article refused.',
          ar: 'تم رفض المقال.',
        }),
      );
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur lors du refus.',
              en: 'Refusal error.',
              ar: 'خطأ أثناء الرفض.',
            }),
      );
    }
  }

  async publish(articleId: number) {
    try {
      await api.publishArticle(this.token, articleId);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Article publié.',
          en: 'Article published.',
          ar: 'تم نشر المقال.',
        }),
      );
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur lors de la publication.',
              en: 'Publication error.',
              ar: 'خطأ أثناء النشر.',
            }),
      );
    }
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DomSanitizer,
  SafeResourceUrl,
} from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import type {
  Article,
  ArticlePayload,
  ArticleStatus,
  LabHeadArticlesData,
  LabHeadArticlesQuery,
  PaginationMeta,
  RegistrationReferences,
  UtilisateurComplet,
} from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import {
  SitePreferencesService,
  type LocalizedCopy,
} from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';
import { RoleService } from '../../shared/services/role.service';

type DashboardStatusFilter = 'TOUS' | ArticleStatus;
type WorkflowAction = NonNullable<ArticlePayload['action']>;
type DetailPreviewMode = 'pdf' | 'content';

const MAX_ARTICLE_PDF_BYTES = 5 * 1024 * 1024;
const MIN_DETAIL_PDF_ZOOM = 70;
const MAX_DETAIL_PDF_ZOOM = 170;
const PDF_UPLOADABLE_STATUSES: ArticleStatus[] = ['BROUILLON', 'SOUMIS', 'REJETE'];
const PDF_SIZE_ERROR_MESSAGE =
  'Le fichier PDF d\u00E9passe la taille maximale autoris\u00E9e (5 Mo).';

type SummaryCard = {
  label: string;
  value: number;
  meta: string;
  toneClass: string;
  icon: any;
};

type CreateArticleForm = {
  titre: string;
  resume: string;
  contenu: string;
  lienDoi: string;
  coAuteurIds: string[];
  categorieId: number | null;
  equipeRechercheId: number | null;
  dateSoumission: string;
  motsCles: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countOccurrences(value: string, query: string) {
  if (!value || !query) {
    return 0;
  }

  const matches = value.match(new RegExp(escapeRegExp(query), 'gi'));
  return matches ? matches.length : 0;
}

@Component({
  selector: 'app-articles-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <section class="app-page-hero app-page-hero--articles">
        <div class="app-page-hero__orb app-page-hero__orb--primary"></div>
        <div class="app-page-hero__orb app-page-hero__orb--secondary"></div>
        <div class="app-page-hero__orb app-page-hero__orb--tertiary"></div>

        <div class="app-page-hero__content">
          <p class="app-page-eyebrow">
            <span class="inline-flex items-center gap-2">
              <lucide-icon [img]="icons.FileSearch" class="h-3.5 w-3.5"></lucide-icon>
              {{ site.localize(moduleLabel) }}
            </span>
          </p>

          <div class="app-page-header mt-2">
            <div>
              <h2 class="app-page-title">{{ site.localize(pageTitle) }}</h2>
              <p class="app-page-description">{{ site.localize(pageSubtitle) }}</p>
            </div>

            <div class="app-hero-actions flex flex-wrap items-center gap-2">
              <button type="button" class="btn-outline" (click)="openUploadPdfModal()">
                <span class="app-inline-icon">
                  <lucide-icon [img]="icons.FileText" class="h-4 w-4"></lucide-icon>
                </span>
                {{ site.localize(uploadPdfQuickLabel) }}
              </button>

              @if (canCreateArticle()) {
                <button type="button" class="btn-secondary" (click)="openCreateModal()">
                  <span class="app-inline-icon app-inline-icon--light">
                    <lucide-icon [img]="icons.Plus" class="h-4 w-4"></lucide-icon>
                  </span>
                  {{ site.localize(newArticleButtonLabel) }}
                </button>
              }

              <a routerLink="/dashboard/resume-ia" class="btn-secondary bg-indigo-600 hover:bg-indigo-700 text-white">
                <span class="app-inline-icon app-inline-icon--light">
                  <lucide-icon [img]="icons.Wand2" class="h-4 w-4"></lucide-icon>
                </span>
                Résumé IA
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="app-kpi-grid">
        @for (card of summaryCards(); track card.label) {
          <article class="app-kpi-card app-kpi-card--article" [class]="card.toneClass">
            <div class="app-kpi-card__head">
              <span class="app-kpi-card__icon app-kpi-card__icon--articles">
                <lucide-icon [img]="card.icon" class="h-4 w-4"></lucide-icon>
              </span>
              <p class="app-kpi-card__label">{{ card.label }}</p>
            </div>
            <p class="app-kpi-card__value">{{ card.value }}</p>
            <p class="app-kpi-card__meta">{{ card.meta }}</p>
          </article>
        }
      </section>

      <section class="surface-card app-articles-filters space-y-4 p-5">
        <div class="app-articles-filters__search relative">
          <lucide-icon
            [img]="icons.Search"
            class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          ></lucide-icon>
          <input
            class="input-shell pl-11"
            [placeholder]="site.localize(searchPlaceholder)"
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
          />
        </div>

        <div class="app-articles-filters__chips flex flex-wrap gap-2">
          @for (option of statusFilters; track option.value) {
            <button
              type="button"
              class="app-filter-pill"
              [class.app-filter-pill--active]="statusFilter() === option.value"
              (click)="setStatusFilter(option.value)"
            >
              {{ site.localize(option.label) }}
            </button>
          }
        </div>

        @if (canModerate() && meta()) {
          <div class="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            {{ site.localize(resultMetaLabel) }}: {{ meta()!.total }} | {{ site.localize(pageLabel) }} {{ meta()!.page }} / {{ meta()!.totalPages }}
          </div>
        }
      </section>

      <section class="space-y-3">
        @if (loading()) {
          <article class="surface-card p-6 text-sm text-muted-foreground">
            {{ site.localize(loadingLabel) }}
          </article>
        } @else {
          @for (article of displayedArticles(); track article.id) {
            <article class="surface-card app-article-card border border-border/70 p-5">
              <div class="grid gap-4 xl:grid-cols-[1fr_auto]">
                <div class="min-w-0">
                  <div class="app-article-card__header flex flex-wrap items-center gap-2">
                    <span class="inline-flex h-7 items-center rounded-lg border border-border bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground">
                      #{{ article.id }}
                    </span>
                    <span [class]="statusBadgeClass(article.statut)">
                      {{ statusLabel(article.statut) }}
                    </span>
                  </div>

                  <h3 class="mt-3 text-lg font-semibold text-foreground lg:text-xl">{{ article.titre }}</h3>
                  <p class="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{{ article.resume }}</p>
                  <p class="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground/90">{{ article.contenu }}</p>

                  <div class="app-article-meta-grid mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-2">
                    <div class="app-article-meta-item">
                      <lucide-icon [img]="icons.UserCircle2" class="h-3.5 w-3.5"></lucide-icon>
                      <span>{{ site.localize(authorLabel) }}: {{ articleAuthorsLabel(article) }}</span>
                    </div>
                    <div class="app-article-meta-item">
                      <lucide-icon [img]="icons.Link2" class="h-3.5 w-3.5"></lucide-icon>
                      <span>{{ site.localize(doiLabel) }}:</span>
                      @if (article.lienDoi) {
                        <a
                          [href]="resolveDoiUrl(article.lienDoi)"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="truncate text-primary hover:underline"
                        >
                          {{ article.lienDoi }}
                        </a>
                      } @else {
                        <span>{{ site.localize(notAvailableLabel) }}</span>
                      }
                    </div>
                  </div>

                  @if (article.categorie?.libelle || article.dateSoumission || article.dateValidation || article.publieLe) {
                    <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      @if (article.categorie?.libelle) {
                        <span>{{ site.localize(categoryLabel) }}: {{ article.categorie?.libelle }}</span>
                      }
                      @if (article.dateSoumission) {
                        <span>{{ site.localize(submittedLabel) }}: {{ formatDate(article.dateSoumission) }}</span>
                      }
                      @if (article.dateValidation) {
                        <span>{{ site.localize(validatedLabel) }}: {{ formatDate(article.dateValidation) }}</span>
                      }
                      @if (article.publieLe) {
                        <span>{{ site.localize(publishedLabel) }}: {{ formatDate(article.publieLe) }}</span>
                      }
                    </div>
                  }
                </div>

                <div class="flex min-w-[200px] flex-col gap-2 xl:items-stretch">
                  <button type="button" class="btn-outline app-action-button h-9 px-3" (click)="openDetail(article)">
                    <lucide-icon [img]="icons.FileSearch" class="h-4 w-4"></lucide-icon>
                    {{ site.localize(viewDetailsLabel) }}
                  </button>

                  @if (article.articlePdf) {
                    <button type="button" class="btn-outline app-action-button h-9 px-3" (click)="openPdf(article)">
                      <lucide-icon [img]="icons.ExternalLink" class="h-4 w-4"></lucide-icon>
                      {{ site.localize(viewPdfLabel) }}
                    </button>
                    <button type="button" class="btn-outline app-action-button h-9 px-3" (click)="downloadPdf(article)">
                      <lucide-icon [img]="icons.Paperclip" class="h-4 w-4"></lucide-icon>
                      {{ site.localize(downloadPdfLabel) }}
                    </button>
                  }

                  @if (canModerate() && article.statut === 'SOUMIS') {
                    <button type="button" class="btn-secondary app-action-button h-9 px-3" (click)="approveArticle(article.id)">
                      <lucide-icon [img]="icons.Check" class="h-4 w-4"></lucide-icon>
                      {{ site.localize(validateLabel) }}
                    </button>
                    <button type="button" class="btn-outline app-action-button h-9 px-3" (click)="openRejectModal(article)">
                      <lucide-icon [img]="icons.X" class="h-4 w-4"></lucide-icon>
                      {{ site.localize(rejectLabel) }}
                    </button>
                  }

                  @if (canPublish() && article.statut === 'VALIDE') {
                    <button type="button" class="btn-secondary app-action-button h-9 px-3" (click)="publishArticle(article.id)">
                      <lucide-icon [img]="icons.CheckCheck" class="h-4 w-4"></lucide-icon>
                      {{ site.localize(publishLabel) }}
                    </button>
                  }
                </div>
              </div>
            </article>
          } @empty {
            <div class="empty-state py-12">{{ site.localize(emptyStateLabel) }}</div>
          }
        }
      </section>

      @if (canModerate() && paginationPages().length > 1 && meta()) {
        <section class="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
          <button type="button" class="btn-outline" (click)="goToPreviousPage()" [disabled]="!meta()!.hasPreviousPage || loading()">
            <lucide-icon [img]="icons.ChevronLeft" class="mr-1.5 h-4 w-4"></lucide-icon>
            {{ site.localize(previousLabel) }}
          </button>

          <div class="flex flex-wrap items-center gap-2">
            @for (pageNumber of paginationPages(); track pageNumber) {
              <button
                type="button"
                class="rounded-xl border px-3 py-2 text-xs font-semibold transition"
                [class.border-primary]="pageNumber === page()"
                [class.bg-primary/10]="pageNumber === page()"
                [class.text-primary]="pageNumber === page()"
                [class.border-border]="pageNumber !== page()"
                [class.text-muted-foreground]="pageNumber !== page()"
                (click)="goToPage(pageNumber)"
                [disabled]="loading()"
              >
                {{ pageNumber }}
              </button>
            }
          </div>

          <button type="button" class="btn-outline" (click)="goToNextPage()" [disabled]="!meta()!.hasNextPage || loading()">
            {{ site.localize(nextLabel) }}
            <lucide-icon [img]="icons.ChevronRight" class="ml-1.5 h-4 w-4"></lucide-icon>
          </button>
        </section>
      }

      @if (statusMessage()) {
        <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">
          {{ statusMessage() }}
        </div>
      }

      @if (errorMessage()) {
        <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">
          {{ errorMessage() }}
        </div>
      }
    </div>

    @if (showDetailModal() && selectedArticle()) {
      <div
        class="fixed inset-0 z-[130] bg-black/55 p-2 backdrop-blur-[2px] sm:p-4"
        [class.p-0]="detailFullscreen()"
        (click)="closeDetailModal()"
      >
        <div
          class="mx-auto flex h-[96vh] w-full max-w-[min(96vw,1380px)] flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-elevated transition-all duration-200"
          [class.h-screen]="detailFullscreen()"
          [class.max-w-none]="detailFullscreen()"
          [class.rounded-none]="detailFullscreen()"
          (click)="$event.stopPropagation()"
        >
          <header class="border-b border-border px-4 py-4 sm:px-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0 space-y-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">
                    {{ site.localize(detailHeaderMetaLabel) }}
                  </p>
                  <h3 class="mt-2 break-words text-xl font-semibold text-foreground lg:text-2xl">
                    {{ selectedArticle()!.titre }}
                  </h3>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex h-8 items-center rounded-full border border-border bg-muted px-3 text-xs font-semibold text-muted-foreground">
                    {{ site.localize(referenceLabel) }} #{{ selectedArticle()!.id }}
                  </span>
                  <span [class]="statusBadgeClass(selectedArticle()!.statut)">
                    {{ statusLabel(selectedArticle()!.statut) }}
                  </span>
                  @if (selectedArticle()!.derniereVersion) {
                    <span class="inline-flex h-8 items-center rounded-full border border-border bg-muted px-3 text-xs font-semibold text-muted-foreground">
                      {{ site.localize(versionLabel) }} {{ selectedArticle()!.derniereVersion!.numeroVersion }}
                    </span>
                  }
                  @if (selectedArticle()!.articlePdf) {
                    <span class="inline-flex h-8 items-center rounded-full border border-border bg-muted px-3 text-xs font-semibold text-muted-foreground">
                      {{ site.localize(fileTypeLabel) }} PDF
                    </span>
                  }
                </div>
              </div>

              <div class="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="btn-outline h-10 px-3"
                  (click)="toggleDetailFullscreen()"
                >
                  {{ detailFullscreen() ? site.localize(exitFullscreenLabel) : site.localize(fullscreenLabel) }}
                </button>
                <button
                  type="button"
                  class="btn-outline h-10 px-3"
                  (click)="closeDetailModal()"
                >
                  {{ site.localize(closeLabel) }}
                </button>
              </div>
            </div>
          </header>

          <div class="border-b border-border bg-muted/20 px-4 py-3 sm:px-5">
            <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {{ site.localize(readerToolsLabel) }}
                </span>

                @if (detailHasPdf()) {
                  <button
                    type="button"
                    class="rounded-full border px-3 py-2 text-xs font-semibold transition"
                    [class.border-primary]="detailPreviewMode() === 'pdf'"
                    [class.bg-primary/12]="detailPreviewMode() === 'pdf'"
                    [class.text-primary]="detailPreviewMode() === 'pdf'"
                    [class.border-border]="detailPreviewMode() !== 'pdf'"
                    [class.text-muted-foreground]="detailPreviewMode() !== 'pdf'"
                    (click)="setDetailPreviewMode('pdf')"
                  >
                    {{ site.localize(documentPreviewLabel) }}
                  </button>
                }

                <button
                  type="button"
                  class="rounded-full border px-3 py-2 text-xs font-semibold transition"
                  [class.border-primary]="detailPreviewMode() === 'content'"
                  [class.bg-primary/12]="detailPreviewMode() === 'content'"
                  [class.text-primary]="detailPreviewMode() === 'content'"
                  [class.border-border]="detailPreviewMode() !== 'content'"
                  [class.text-muted-foreground]="detailPreviewMode() !== 'content'"
                  (click)="setDetailPreviewMode('content')"
                >
                  {{ site.localize(contentPreviewLabel) }}
                </button>

                @if (detailPreviewMode() === 'pdf' && detailHasPdf()) {
                  <div class="ml-1 flex flex-wrap items-center gap-2 rounded-full border border-border bg-card px-2 py-1">
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
                      (click)="changeDetailPdfPage(-1)"
                      [disabled]="detailPdfLoading() || detailPdfPage() <= 1"
                    >
                      <lucide-icon [img]="icons.ChevronLeft" class="h-4 w-4"></lucide-icon>
                    </button>

                    <label class="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <span>{{ site.localize(pageNavigationLabel) }}</span>
                      <input
                        type="number"
                        min="1"
                        class="h-8 w-16 rounded-full border border-border bg-background px-3 text-center text-xs font-semibold text-foreground outline-none"
                        [value]="detailPdfPage()"
                        (input)="updateDetailPdfPage($event)"
                      />
                    </label>

                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
                      (click)="changeDetailPdfPage(1)"
                      [disabled]="detailPdfLoading()"
                    >
                      <lucide-icon [img]="icons.ChevronRight" class="h-4 w-4"></lucide-icon>
                    </button>
                  </div>

                  <div class="ml-1 flex flex-wrap items-center gap-2 rounded-full border border-border bg-card px-2 py-1">
                    <button
                      type="button"
                      class="inline-flex h-8 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
                      (click)="decreaseDetailPdfZoom()"
                      [disabled]="detailPdfLoading()"
                    >
                      A-
                    </button>
                    <span class="text-xs font-semibold text-muted-foreground">
                      {{ site.localize(zoomLabel) }} {{ detailPdfZoom() }}%
                    </span>
                    <button
                      type="button"
                      class="inline-flex h-8 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
                      (click)="increaseDetailPdfZoom()"
                      [disabled]="detailPdfLoading()"
                    >
                      A+
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-8 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
                      (click)="resetDetailPdfView()"
                      [disabled]="detailPdfLoading()"
                    >
                      {{ site.localize(resetViewLabel) }}
                    </button>
                  </div>
                }

                @if (detailSearchTerm().trim()) {
                  <span class="inline-flex h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground">
                    @if (detailSearchMatchCount() > 0) {
                      {{ detailSearchMatchCount() }} {{ site.localize(searchResultsLabel) }}
                    } @else {
                      {{ site.localize(noSearchResultsLabel) }}
                    }
                  </span>
                }
              </div>

              <label class="relative block xl:w-[20rem]">
                <lucide-icon
                  [img]="icons.Search"
                  class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                ></lucide-icon>
                <input
                  class="input-shell h-10 pl-11"
                  [placeholder]="site.localize(searchInArticleLabel)"
                  [value]="detailSearchTerm()"
                  (input)="setDetailSearchTerm($event)"
                />
              </label>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-hidden">
            <div class="grid h-full min-h-0 xl:grid-cols-[minmax(0,1fr)_23rem]">
              <section class="min-h-0 overflow-hidden border-b border-border bg-[radial-gradient(circle_at_top,rgba(235,205,141,0.18),transparent_38%),linear-gradient(180deg,rgba(250,248,242,0.94),rgba(245,241,233,0.92))] xl:border-b-0 xl:border-r">
                <div class="flex h-full min-h-0 flex-col overflow-y-auto p-4 sm:p-5">
                  <div class="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-foreground">{{ site.localize(previewPanelLabel) }}</p>
                      <p class="text-xs text-muted-foreground">
                        @if (detailPreviewMode() === 'pdf' && detailHasPdf()) {
                          {{ site.localize(pdfViewerHintLabel) }}
                        } @else {
                          {{ site.localize(contentLabel) }}
                        }
                      </p>
                    </div>
                  </div>

                  @if (detailPreviewMode() === 'pdf' && detailHasPdf()) {
                    <div class="flex min-h-[24rem] flex-1 flex-col gap-4">
                      @if (detailPdfLoading()) {
                        <div class="flex min-h-[24rem] flex-1 items-center justify-center rounded-[1.5rem] border border-border bg-card px-6 text-sm text-muted-foreground">
                          {{ site.localize(pdfPreviewLoadingLabel) }}
                        </div>
                      } @else if (detailPdfError()) {
                        <div class="flex min-h-[24rem] flex-1 flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-dashed border-border bg-card px-6 text-center">
                          <p class="max-w-xl text-sm leading-6 text-muted-foreground">
                            {{ detailPdfError() || site.localize(pdfPreviewUnavailableLabel) }}
                          </p>
                          <div class="flex flex-wrap justify-center gap-2">
                            <button type="button" class="btn-outline" (click)="openPdf(selectedArticle()!)">
                              {{ site.localize(openInBrowserLabel) }}
                            </button>
                            <button type="button" class="btn-outline" (click)="downloadPdf(selectedArticle()!)">
                              {{ site.localize(downloadPdfLabel) }}
                            </button>
                          </div>
                        </div>
                      } @else if (detailPdfViewerSrc()) {
                        <div class="min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-sm">
                          <iframe
                            [src]="detailPdfViewerSrc()"
                            class="h-full min-h-[24rem] w-full bg-white"
                            title="Article PDF preview"
                          ></iframe>
                        </div>
                      } @else {
                        <div class="flex min-h-[24rem] flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-card px-6 text-sm text-muted-foreground">
                          {{ site.localize(noPdfPreviewLabel) }}
                        </div>
                      }
                    </div>
                  } @else {
                    <article class="mx-auto w-full max-w-4xl rounded-[1.75rem] border border-border bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
                      <div class="border-b border-border/80 pb-5">
                        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">
                          {{ site.localize(summaryLabel) }}
                        </p>
                        <h4 class="mt-3 text-2xl font-semibold text-foreground">
                          {{ selectedArticle()!.titre }}
                        </h4>
                        <p class="mt-2 text-sm text-muted-foreground">
                          {{ articleAuthorsLabel(selectedArticle()!) }}
                        </p>
                      </div>

                      @if (detailSearchTerm().trim() && detailSearchMatchCount() === 0) {
                        <div class="mt-5 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                          {{ site.localize(noSearchResultsLabel) }}
                        </div>
                      }

                      <section class="mt-6 space-y-3">
                        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {{ site.localize(summaryLabel) }}
                        </p>
                        <div
                          class="text-sm leading-7 text-foreground"
                          [innerHTML]="highlightDetailText(selectedArticle()!.resume)"
                        ></div>
                      </section>

                      <section class="mt-8 space-y-3">
                        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {{ site.localize(contentLabel) }}
                        </p>
                        <div
                          class="text-sm leading-8 text-foreground"
                          [innerHTML]="highlightDetailText(selectedArticle()!.contenu)"
                        ></div>
                      </section>
                    </article>
                  }
                </div>
              </section>

              <aside class="min-h-0 overflow-y-auto bg-card">
                <div class="space-y-4 p-4 sm:p-5">
                  <article class="rounded-2xl border border-border bg-muted/20 p-4">
                    <h4 class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {{ site.localize(metadataPanelLabel) }}
                    </h4>

                    <div class="mt-4 space-y-3 text-sm text-muted-foreground">
                      <p>
                        {{ site.localize(categoryLabel) }}:
                        <span class="font-medium text-foreground">
                          {{ selectedArticle()!.categorie?.libelle || site.localize(notAvailableLabel) }}
                        </span>
                      </p>
                      <p>
                        {{ site.localize(submittedLabel) }}:
                        <span class="font-medium text-foreground">
                          {{ selectedArticle()!.dateSoumission ? formatDate(selectedArticle()!.dateSoumission) : site.localize(notAvailableLabel) }}
                        </span>
                      </p>
                      <p>
                        {{ site.localize(validatedLabel) }}:
                        <span class="font-medium text-foreground">
                          {{ selectedArticle()!.dateValidation ? formatDate(selectedArticle()!.dateValidation) : site.localize(notAvailableLabel) }}
                        </span>
                      </p>
                      <p>
                        {{ site.localize(publishedLabel) }}:
                        <span class="font-medium text-foreground">
                          {{ selectedArticle()!.publieLe ? formatDate(selectedArticle()!.publieLe) : site.localize(notAvailableLabel) }}
                        </span>
                      </p>
                    </div>
                  </article>

                  <article class="rounded-2xl border border-border bg-card p-4">
                    <h4 class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {{ site.localize(authorsPanelLabel) }}
                    </h4>

                    <div class="mt-4 space-y-3">
                      <div class="rounded-2xl border border-border bg-muted/20 px-3 py-3">
                        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {{ site.localize(authorLabel) }}
                        </p>
                        <p class="mt-2 text-sm font-semibold text-foreground">
                          {{ selectedArticle()!.deposant?.nomComplet || site.localize(unknownAuthorLabel) }}
                        </p>
                        <p class="text-xs text-muted-foreground">
                          {{ selectedArticle()!.deposant?.emailInstitutionnel || site.localize(notAvailableLabel) }}
                        </p>
                      </div>

                      <div class="space-y-2">
                        @for (coAuthor of selectedArticle()!.coAuteurs; track coAuthor.utilisateurId) {
                          <div class="rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-foreground">
                            {{ coAuthor.utilisateur?.nomComplet || coAuthor.utilisateurId }}
                          </div>
                        } @empty {
                          <div class="rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                            {{ site.localize(noCoAuthorLabel) }}
                          </div>
                        }
                      </div>
                    </div>
                  </article>

                  <article class="rounded-2xl border border-border bg-card p-4">
                    <h4 class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {{ site.localize(assetsPanelLabel) }}
                    </h4>

                    <div class="mt-4 space-y-3 text-sm text-muted-foreground">
                      <p>
                        {{ site.localize(doiLabel) }}:
                        @if (selectedArticle()!.lienDoi) {
                          <a
                            [href]="resolveDoiUrl(selectedArticle()!.lienDoi)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="font-medium text-primary hover:underline"
                          >
                            {{ selectedArticle()!.lienDoi }}
                          </a>
                        } @else {
                          <span class="font-medium text-foreground">{{ site.localize(notAvailableLabel) }}</span>
                        }
                      </p>

                      <div class="rounded-xl border border-border bg-muted/20 px-3 py-3">
                        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          PDF
                        </p>
                        @if (selectedArticle()!.articlePdf) {
                          <p class="mt-2 break-all text-sm font-medium text-foreground">
                            {{ selectedArticle()!.articlePdf!.nomFichier }}
                          </p>
                          <p class="mt-1 text-xs text-muted-foreground">
                            {{ articleFileDetails(selectedArticle()!) }}
                          </p>
                        } @else {
                          <p class="mt-2 text-sm text-muted-foreground">
                            {{ site.localize(noPdfPreviewLabel) }}
                          </p>
                        }
                      </div>
                    </div>
                  </article>

                  @if (selectedArticle()!.motifRejet) {
                    <article class="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                      <h4 class="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                        {{ site.localize(rejectionReasonLabel) }}
                      </h4>
                      <p class="mt-3 text-sm leading-6 text-rose-700">
                        {{ selectedArticle()!.motifRejet }}
                      </p>
                    </article>
                  }

                  <article class="rounded-2xl border border-border bg-card p-4">
                    <h4 class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {{ site.localize(actionsPanelLabel) }}
                    </h4>

                    <div class="mt-4 flex flex-col gap-2">
                      @if (selectedArticle()!.articlePdf) {
                        <button type="button" class="btn-outline w-full justify-center" (click)="openPdf(selectedArticle()!)">
                          {{ site.localize(openInBrowserLabel) }}
                        </button>
                        <button type="button" class="btn-outline w-full justify-center" (click)="downloadPdf(selectedArticle()!)">
                          {{ site.localize(downloadPdfLabel) }}
                        </button>
                      }

                      @if (canModerate() && selectedArticle()!.statut === 'SOUMIS') {
                        <button type="button" class="btn-secondary w-full justify-center" (click)="approveArticle(selectedArticle()!.id)">
                          {{ site.localize(validateLabel) }}
                        </button>
                        <button type="button" class="btn-outline w-full justify-center" (click)="openRejectModal(selectedArticle()!)">
                          {{ site.localize(rejectLabel) }}
                        </button>
                      }

                      @if (canPublish() && selectedArticle()!.statut === 'VALIDE') {
                        <button type="button" class="btn-secondary w-full justify-center" (click)="publishArticle(selectedArticle()!.id)">
                          {{ site.localize(publishLabel) }}
                        </button>
                      }
                    </div>
                  </article>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    }

    @if (showRejectModal() && rejectTarget()) {
      <div class="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4" (click)="closeRejectModal()">
        <div class="w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-elevated" (click)="$event.stopPropagation()">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold text-foreground">{{ site.localize(rejectModalTitle) }}</h3>
              <p class="text-sm text-muted-foreground">{{ rejectTarget()!.titre }}</p>
            </div>
            <button type="button" class="btn-outline" (click)="closeRejectModal()">{{ site.localize(closeLabel) }}</button>
          </div>

          <label class="mb-1.5 block text-sm font-medium text-foreground">{{ site.localize(rejectionReasonLabel) }}</label>
          <textarea class="textarea-shell min-h-32" [placeholder]="site.localize(rejectionPlaceholder)" [ngModel]="rejectReason()" (ngModelChange)="rejectReason.set($event)"></textarea>

          <div class="mt-5 flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" class="btn-outline" (click)="closeRejectModal()" [disabled]="processing()">{{ site.localize(cancelLabel) }}</button>
            <button type="button" class="btn-secondary" (click)="submitReject()" [disabled]="processing()">{{ site.localize(confirmRejectionLabel) }}</button>
          </div>
        </div>
      </div>
    }

    @if (showCreateModal()) {
      <div
        class="fixed inset-0 z-[145] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
        (click)="closeCreateModal()"
      >
        <div
          class="flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-elevated sm:max-h-[94vh] sm:rounded-[1.75rem]"
          (click)="$event.stopPropagation()"
        >
          <!-- Header avec accent de couleur -->
          <header class="relative overflow-hidden border-b border-border bg-gradient-to-r from-primary/8 via-transparent to-transparent px-5 py-5 shrink-0">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.10),transparent_55%)]"></div>
            <div class="relative flex items-start justify-between gap-4">
              <div class="flex items-start gap-4">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <lucide-icon [img]="icons.FileText" class="h-5 w-5"></lucide-icon>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-foreground lg:text-xl">{{ site.localize(newArticleModalTitle) }}</h3>
                  <p class="mt-0.5 text-sm text-muted-foreground">{{ site.localize(newArticleModalSubtitle) }}</p>
                </div>
              </div>
              <button
                type="button"
                class="btn-outline h-9 w-9 shrink-0 p-0"
                (click)="closeCreateModal()"
                [disabled]="creatingArticle()"
              >
                <lucide-icon [img]="icons.X" class="h-4 w-4"></lucide-icon>
              </button>
            </div>
            <div class="relative mt-4 flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
              <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500"></span>
              {{ site.localize(requiredFieldsHintLabel) }}
            </div>
          </header>

          <!-- Corps scrollable -->
          <div class="min-h-0 flex-1 overflow-y-auto divide-y divide-border">

            <!-- SECTION 1 — Informations principales -->
            <section class="px-5 py-6">
              <div class="mb-5 flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                  <lucide-icon [img]="icons.FileText" class="h-4 w-4"></lucide-icon>
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-foreground">{{ site.localize(sectionInformationsPrincipales) }}</h4>
                  <p class="text-xs text-muted-foreground">{{ site.localize({ fr: 'Titre, résumé, contenu scientifique et DOI', en: 'Title, abstract, scientific content and DOI', ar: 'العنوان والملخص والمحتوى العلمي وDOI' }) }}</p>
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                    {{ site.localize(articleTitleLabel) }}
                    <span class="text-rose-500">*</span>
                  </label>
                  <input
                    class="input-shell"
                    [placeholder]="site.localize({ fr: 'Ex: Étude dosimétrique par simulation Monte Carlo...', en: 'Ex: Dosimetric study by Monte Carlo simulation...', ar: 'مثال: دراسة قياس الجرعة بمحاكاة مونتي كارلو...' })"
                    [(ngModel)]="createForm.titre"
                  />
                </div>

                <div>
                  <div class="mb-1.5 flex items-center justify-between">
                    <label class="flex items-center gap-1 text-sm font-medium text-foreground">
                      {{ site.localize(summaryLabel) }}
                      <span class="text-rose-500">*</span>
                    </label>
                    <span class="text-xs text-muted-foreground">{{ createForm.resume.length }} / 1000</span>
                  </div>
                  <textarea
                    class="textarea-shell min-h-24"
                    [placeholder]="site.localize({ fr: 'Résumé concis des objectifs, méthodes et résultats...', en: 'Concise summary of objectives, methods and results...', ar: 'ملخص موجز للأهداف والأساليب والنتائج...' })"
                    [(ngModel)]="createForm.resume"
                    maxlength="1000"
                  ></textarea>
                </div>

                <div>
                  <div class="mb-1.5 flex items-center justify-between">
                    <label class="flex items-center gap-1 text-sm font-medium text-foreground">
                      {{ site.localize(contentLabel) }}
                      <span class="text-rose-500">*</span>
                    </label>
                    <span class="text-xs text-muted-foreground">{{ createForm.contenu.length }} / 5000</span>
                  </div>
                  <textarea
                    class="textarea-shell min-h-40"
                    [placeholder]="site.localize({ fr: 'Description scientifique détaillée, méthodologie, résultats et discussion...', en: 'Detailed scientific description, methodology, results and discussion...', ar: 'وصف علمي مفصل، منهجية، نتائج ومناقشة...' })"
                    [(ngModel)]="createForm.contenu"
                    maxlength="5000"
                  ></textarea>
                </div>

                <div>
                  <label class="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                    {{ site.localize(doiLabel) }}
                    <span class="text-rose-500">*</span>
                  </label>
                  <div class="relative">
                    <lucide-icon
                      [img]="icons.Link2"
                      class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    ></lucide-icon>
                    <input
                      class="input-shell pl-11"
                      [placeholder]="site.localize(doiPlaceholderLabel)"
                      [(ngModel)]="createForm.lienDoi"
                    />
                  </div>
                </div>
              </div>
            </section>

            <!-- SECTION 2 — Auteurs -->
            <section class="px-5 py-6">
              <div class="mb-5 flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <lucide-icon [img]="icons.Users" class="h-4 w-4"></lucide-icon>
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-foreground">{{ site.localize(sectionAuteurs) }}</h4>
                  <p class="text-xs text-muted-foreground">{{ site.localize(authorsSelectionHintLabel) }}</p>
                </div>
              </div>

              <div class="grid gap-4 lg:grid-cols-2">
                <!-- Auteur principal -->
                <div class="rounded-2xl border border-border bg-gradient-to-br from-muted/60 to-muted/20 p-4">
                  <p class="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {{ site.localize(mainAuthorLabel) }}
                  </p>
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {{ currentUserFullName().charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold text-foreground">{{ currentUserFullName() }}</p>
                      <p class="truncate text-xs text-muted-foreground">{{ currentUserEmail() }}</p>
                    </div>
                  </div>
                  <div class="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                    <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    {{ site.localize(mainAuthorLabel) }}
                  </div>
                </div>

                <!-- Sélection co-auteurs -->
                <div class="flex flex-col gap-3">
                  <label class="text-sm font-medium text-foreground">{{ site.localize(authorsSelectionLabel) }}</label>

                  <div class="relative">
                    <lucide-icon
                      [img]="icons.Search"
                      class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    ></lucide-icon>
                    <input
                      class="input-shell h-9 py-0 pl-9 text-sm"
                      [placeholder]="site.localize(searchCoAuthorPlaceholder)"
                      [ngModel]="coAuthorSearch()"
                      (ngModelChange)="coAuthorSearch.set($event)"
                    />
                  </div>

                  <div class="max-h-40 overflow-y-auto rounded-xl border border-border bg-card">
                    @for (member of coAuthorCandidates(); track member.id) {
                      <label class="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition hover:bg-muted/40 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border">
                        <input
                          type="checkbox"
                          class="h-4 w-4 accent-primary"
                          [checked]="isCoAuthorSelected(member.id)"
                          (change)="toggleCoAuthor(member.id, $event)"
                        />
                        <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                          {{ member.nomComplet.charAt(0).toUpperCase() }}
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-medium text-foreground">{{ member.nomComplet }}</p>
                          <p class="truncate text-xs text-muted-foreground">{{ member.emailInstitutionnel }}</p>
                        </div>
                        @if (isCoAuthorSelected(member.id)) {
                          <lucide-icon [img]="icons.Check" class="h-3.5 w-3.5 shrink-0 text-primary"></lucide-icon>
                        }
                      </label>
                    } @empty {
                      <div class="px-3 py-4 text-center text-xs text-muted-foreground">
                        {{ site.localize(noCoAuthorCandidateLabel) }}
                      </div>
                    }
                  </div>

                  <!-- Co-auteurs sélectionnés sous forme de chips -->
                  @if (createForm.coAuteurIds.length > 0) {
                    <div class="flex flex-wrap gap-1.5">
                      @for (coAuthorId of createForm.coAuteurIds; track coAuthorId) {
                        <span class="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
                          {{ getCoAuthorName(coAuthorId) }}
                          <button
                            type="button"
                            class="flex items-center opacity-70 hover:opacity-100"
                            (click)="removeCoAuthor(coAuthorId)"
                          >
                            <lucide-icon [img]="icons.X" class="h-3 w-3"></lucide-icon>
                          </button>
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            </section>

            <!-- SECTION 3 — Fichier PDF -->
            <section class="px-5 py-6">
              <div class="mb-5 flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <lucide-icon [img]="icons.Paperclip" class="h-4 w-4"></lucide-icon>
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-foreground">{{ site.localize(sectionFichiers) }}</h4>
                  <p class="text-xs text-muted-foreground">{{ site.localize(pdfMaxSizeHintLabel) }}</p>
                </div>
              </div>

              <label class="group cursor-pointer block">
                <input
                  type="file"
                  class="sr-only"
                  accept="application/pdf"
                  (change)="onCreatePdfSelected($event)"
                />
                @if (selectedPdfName()) {
                  <div class="flex items-center gap-4 rounded-2xl border-2 border-primary/30 bg-primary/5 px-5 py-4 transition group-hover:bg-primary/8">
                    <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
                      <lucide-icon [img]="icons.FileText" class="h-6 w-6"></lucide-icon>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-semibold text-foreground">{{ selectedPdfName() }}</p>
                      <p class="text-xs text-muted-foreground">PDF · {{ site.localize({ fr: 'Cliquer pour changer', en: 'Click to change', ar: 'انقر للتغيير' }) }}</p>
                    </div>
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                      <lucide-icon [img]="icons.Check" class="h-4 w-4"></lucide-icon>
                    </div>
                  </div>
                } @else {
                  <div class="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 py-8 text-center transition group-hover:border-primary/40 group-hover:bg-primary/5">
                    <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
                      <lucide-icon [img]="icons.Paperclip" class="h-6 w-6"></lucide-icon>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-foreground">
                        {{ site.localize(pdfAttachmentLabel) }}
                        <span class="ml-1 text-rose-500">*</span>
                      </p>
                      <p class="mt-0.5 text-xs text-muted-foreground">{{ site.localize(pdfMaxSizeHintLabel) }}</p>
                    </div>
                    <span class="rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition group-hover:border-primary/30 group-hover:text-primary">
                      {{ site.localize({ fr: 'Choisir un fichier PDF', en: 'Choose a PDF file', ar: 'اختر ملف PDF' }) }}
                    </span>
                  </div>
                }
              </label>
            </section>

            <!-- SECTION 4 — Métadonnées (optionnel) -->
            <section class="px-5 py-6">
              <div class="mb-5 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <lucide-icon [img]="icons.Settings" class="h-4 w-4"></lucide-icon>
                  </div>
                  <div>
                    <h4 class="text-sm font-semibold text-foreground">{{ site.localize(metadataOptionalLabel) }}</h4>
                    <p class="text-xs text-muted-foreground">{{ site.localize(metadataOptionalHintLabel) }}</p>
                  </div>
                </div>
                <span class="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {{ site.localize({ fr: 'Optionnel', en: 'Optional', ar: 'اختياري' }) }}
                </span>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-foreground">{{ site.localize(submissionDateLabel) }}</label>
                  <div class="relative">
                    <lucide-icon
                      [img]="icons.Calendar"
                      class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    ></lucide-icon>
                    <input class="input-shell pl-11" type="date" [(ngModel)]="createForm.dateSoumission" />
                  </div>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-foreground">{{ site.localize(categoryLabel) }}</label>
                  <select class="select-shell" [(ngModel)]="createForm.categorieId">
                    <option [ngValue]="null">{{ site.localize(selectCategoryLabel) }}</option>
                    @for (category of categories(); track category.id) {
                      <option [ngValue]="category.id">{{ category.libelle }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-foreground">{{ site.localize(teamLabel) }}</label>
                  <select class="select-shell" [(ngModel)]="createForm.equipeRechercheId">
                    <option [ngValue]="null">{{ site.localize(selectTeamLabel) }}</option>
                    @for (team of teams(); track team.id) {
                      <option [ngValue]="team.id">{{ team.nom }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-foreground">{{ site.localize(keywordsLabel) }}</label>
                  <input
                    class="input-shell"
                    [placeholder]="site.localize(keywordsPlaceholder)"
                    [(ngModel)]="createForm.motsCles"
                  />
                </div>
              </div>
            </section>

            <!-- Messages d'état -->
            @if (createStatusMessage()) {
              <div class="mx-5 mb-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">
                {{ createStatusMessage() }}
              </div>
            }
            @if (createErrorMessage()) {
              <div class="mx-5 mb-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">
                {{ createErrorMessage() }}
              </div>
            }
          </div>

          <!-- Footer sticky -->
          <footer class="shrink-0 border-t border-border bg-card px-5 py-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-xs text-muted-foreground">
                <span class="text-rose-500">*</span>
                {{ site.localize({ fr: 'Champs obligatoires', en: 'Required fields', ar: 'حقول إلزامية' }) }}
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="btn-outline"
                  (click)="closeCreateModal()"
                  [disabled]="creatingArticle()"
                >
                  {{ site.localize(cancelLabel) }}
                </button>
                <button
                  type="button"
                  class="btn-outline"
                  (click)="submitCreateArticle('BROUILLON')"
                  [disabled]="creatingArticle()"
                >
                  @if (creatingArticle()) {
                    <span class="mr-1.5 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></span>
                  }
                  {{ site.localize(saveDraftLabel) }}
                </button>
                <button
                  type="button"
                  class="btn-secondary"
                  (click)="submitCreateArticle('SOUMETTRE')"
                  [disabled]="creatingArticle()"
                >
                  @if (creatingArticle()) {
                    <span class="mr-1.5 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
                  }
                  {{ site.localize(submitForReviewLabel) }}
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    }

    @if (showUploadPdfModal()) {
      <div class="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-4" (click)="closeUploadPdfModal()">
        <div class="w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-elevated" (click)="$event.stopPropagation()">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold text-foreground">{{ site.localize(uploadPdfQuickLabel) }}</h3>
              <p class="text-sm text-muted-foreground">{{ site.localize(uploadPdfQuickSubtitle) }}</p>
            </div>
            <button type="button" class="btn-outline" (click)="closeUploadPdfModal()">{{ site.localize(closeLabel) }}</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground">{{ site.localize(selectArticleLabel) }}</label>
              <select class="select-shell" [ngModel]="uploadTargetArticleId()" (ngModelChange)="setUploadTargetArticleId($event)">
                <option [ngValue]="null">{{ site.localize(selectArticlePlaceholder) }}</option>
                @for (article of uploadableArticles(); track article.id) {
                  <option [ngValue]="article.id">#{{ article.id }} - {{ article.titre }}</option>
                }
              </select>
            </div>

            @if (!uploadableArticles().length) {
              <div class="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                {{ site.localize(noUploadableArticleLabel) }}
              </div>
            }

            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground">{{ site.localize(pdfAttachmentLabel) }}</label>
              <input
                type="file"
                class="input-shell file:mr-3 file:rounded-lg file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary"
                accept="application/pdf"
                (change)="onQuickUploadPdfSelected($event)"
              />
              @if (quickUploadPdfName()) {
                <p class="mt-1 text-xs text-muted-foreground">{{ quickUploadPdfName() }}</p>
              }
            </div>

            @if (uploadPdfModalMessage()) {
              <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">
                {{ uploadPdfModalMessage() }}
              </div>
            }

            @if (uploadPdfModalError()) {
              <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">
                {{ uploadPdfModalError() }}
              </div>
            }
          </div>

          <div class="mt-5 flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" class="btn-outline" (click)="closeUploadPdfModal()" [disabled]="uploadingPdfQuick()">{{ site.localize(cancelLabel) }}</button>
            <button type="button" class="btn-secondary" (click)="submitQuickPdfUpload()" [disabled]="uploadingPdfQuick()">{{ site.localize(uploadPdfQuickConfirmLabel) }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ArticlesPageComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly roleService = inject(RoleService);
  readonly site = inject(SitePreferencesService);
  readonly sanitizer = inject(DomSanitizer);
  readonly icons = sharedIcons;
  readonly formatDate = formatDate;

  readonly loading = signal(false);
  readonly processing = signal(false);
  readonly articles = signal<Article[]>([]);
  readonly ownArticles = signal<Article[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly statistiques = signal<LabHeadArticlesData['statistiques'] | null>(null);
  readonly references = signal<RegistrationReferences | null>(null);
  readonly members = signal<UtilisateurComplet[]>([]);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<DashboardStatusFilter>('TOUS');
  readonly page = signal(1);
  readonly limit = signal(9);

  readonly showDetailModal = signal(false);
  readonly selectedArticle = signal<Article | null>(null);
  readonly detailFullscreen = signal(false);
  readonly detailPreviewMode = signal<DetailPreviewMode>('content');
  readonly detailSearchTerm = signal('');
  readonly detailPdfUrl = signal<string | null>(null);
  readonly detailPdfLoading = signal(false);
  readonly detailPdfError = signal('');
  readonly detailPdfPage = signal(1);
  readonly detailPdfZoom = signal(100);
  readonly showRejectModal = signal(false);
  readonly rejectTarget = signal<Article | null>(null);
  readonly rejectReason = signal('');

  readonly showCreateModal = signal(false);
  readonly creatingArticle = signal(false);
  readonly createStatusMessage = signal('');
  readonly createErrorMessage = signal('');
  readonly coAuthorSearch = signal('');
  readonly selectedPdfName = signal('');

  readonly showUploadPdfModal = signal(false);
  readonly uploadingPdfQuick = signal(false);
  readonly uploadTargetArticleId = signal<number | null>(null);
  readonly quickUploadPdfName = signal('');
  readonly uploadPdfModalMessage = signal('');
  readonly uploadPdfModalError = signal('');

  readonly statusMessage = signal('');
  readonly errorMessage = signal('');

  selectedPdfFile: File | null = null;
  quickUploadPdfFile: File | null = null;
  private detailPdfObjectUrl: string | null = null;
  private detailPdfRequestId = 0;

  createForm: CreateArticleForm = this.buildInitialCreateForm();

  readonly detailHasPdf = computed(() => Boolean(this.selectedArticle()?.articlePdf));
  readonly detailPdfViewerSrc = computed<SafeResourceUrl | null>(() => {
    const url = this.detailPdfUrl();
    if (!url) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `${url}#toolbar=0&navpanes=0&statusbar=0&page=${this.detailPdfPage()}&zoom=${this.detailPdfZoom()}`,
    );
  });
  readonly detailSearchMatchCount = computed(() => {
    const article = this.selectedArticle();
    const query = this.detailSearchTerm().trim();

    if (!article || !query) {
      return 0;
    }

    return [
      article.titre,
      article.resume,
      article.contenu,
      article.lienDoi || '',
      article.deposant?.nomComplet || '',
      ...article.coAuteurs.map((item) => item.utilisateur?.nomComplet || ''),
    ].reduce((total, segment) => total + countOccurrences(segment || '', query), 0);
  });

  readonly moduleLabel = {
    fr: 'Workflow de modération',
    en: 'Moderation workflow',
    ar: 'سير عمل المراجعة',
  };
  readonly pageTitle = {
    fr: 'Articles scientifiques',
    en: 'Scientific Articles',
    ar: 'المقالات العلمية',
  };
  readonly pageSubtitle = {
    fr: 'Consultez, filtrez, validez, refusez et publiez les soumissions scientifiques dans une file de décision unifiée.',
    en: 'Review, filter, validate, reject, and publish scientific submissions in a unified decision queue.',
    ar: 'راجع وصفِّ واعتمد وارفض وانشر المساهمات العلمية ضمن سير عمل موحّد.',
  };
  readonly uploadPdfQuickLabel = {
    fr: 'Upload PDF',
    en: 'Upload PDF',
    ar: 'رفع PDF',
  };
  readonly uploadPdfQuickSubtitle = {
    fr: 'Téléverser un PDF sur un article brouillon ou rejeté dont vous êtes déposant.',
    en: 'Upload a PDF to one of your draft or rejected articles.',
    ar: 'ارفع ملف PDF إلى مقال مسودة أو مرفوض تملكه.',
  };
  readonly uploadPdfQuickConfirmLabel = {
    fr: 'Upload PDF',
    en: 'Upload PDF',
    ar: 'رفع PDF',
  };
  readonly newArticleButtonLabel = {
    fr: 'Nouvel article',
    en: 'New article',
    ar: 'مقال جديد',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher par titre, résumé, auteur, DOI ou contenu...',
    en: 'Search by title, abstract, author, DOI, or content...',
    ar: 'ابحث بالعنوان أو الملخص أو المؤلف أو DOI أو المحتوى...',
  };
  readonly resultMetaLabel = {
    fr: 'Résultats',
    en: 'Results',
    ar: 'النتائج',
  };
  readonly pageLabel = {
    fr: 'Page',
    en: 'Page',
    ar: 'الصفحة',
  };
  readonly loadingLabel = {
    fr: 'Chargement des articles...',
    en: 'Loading articles...',
    ar: 'جار تحميل المقالات...',
  };
  readonly emptyStateLabel = {
    fr: 'Aucun article ne correspond aux filtres actuels.',
    en: 'No article matches the current filters.',
    ar: 'لا توجد مقالات مطابقة للفلاتر الحالية.',
  };
  readonly authorLabel = {
    fr: 'Auteur',
    en: 'Author',
    ar: 'المؤلف',
  };
  readonly submittedLabel = {
    fr: 'Soumis',
    en: 'Submitted',
    ar: 'تاريخ الإرسال',
  };
  readonly validatedLabel = {
    fr: 'Validé',
    en: 'Validated',
    ar: 'تاريخ الاعتماد',
  };
  readonly publishedLabel = {
    fr: 'Publié',
    en: 'Published',
    ar: 'تاريخ النشر',
  };
  readonly unknownAuthorLabel = {
    fr: 'Membre inconnu',
    en: 'Unknown member',
    ar: 'عضو غير معروف',
  };
  readonly notAvailableLabel = {
    fr: 'N/A',
    en: 'N/A',
    ar: 'غير متوفر',
  };
  readonly viewDetailsLabel = {
    fr: 'Détails',
    en: 'Details',
    ar: 'تفاصيل',
  };
  readonly viewPdfLabel = {
    fr: 'Voir PDF',
    en: 'View PDF',
    ar: 'عرض PDF',
  };
  readonly downloadPdfLabel = {
    fr: 'Télécharger PDF',
    en: 'Download PDF',
    ar: 'تنزيل PDF',
  };
  readonly validateLabel = {
    fr: 'Valider',
    en: 'Validate',
    ar: 'اعتماد',
  };
  readonly rejectLabel = {
    fr: 'Refuser',
    en: 'Reject',
    ar: 'رفض',
  };
  readonly publishLabel = {
    fr: 'Publier',
    en: 'Publish',
    ar: 'نشر',
  };
  readonly closeLabel = {
    fr: 'Fermer',
    en: 'Close',
    ar: 'إغلاق',
  };
  readonly fullscreenLabel = {
    fr: 'Plein écran',
    en: 'Fullscreen',
    ar: 'ملء الشاشة',
  };
  readonly exitFullscreenLabel = {
    fr: 'Quitter le plein écran',
    en: 'Exit fullscreen',
    ar: 'الخروج من ملء الشاشة',
  };
  readonly documentPreviewLabel = {
    fr: 'Document',
    en: 'Document',
    ar: 'المستند',
  };
  readonly contentPreviewLabel = {
    fr: 'Lecture',
    en: 'Reading view',
    ar: 'عرض القراءة',
  };
  readonly searchInArticleLabel = {
    fr: 'Rechercher dans l’article',
    en: 'Search article',
    ar: 'ابحث داخل المقال',
  };
  readonly searchResultsLabel = {
    fr: 'occurrences',
    en: 'matches',
    ar: 'مطابقات',
  };
  readonly noSearchResultsLabel = {
    fr: 'Aucune occurrence trouvée dans le contenu affiché.',
    en: 'No match found in the displayed content.',
    ar: 'لم يتم العثور على مطابقات في المحتوى المعروض.',
  };
  readonly detailHeaderMetaLabel = {
    fr: 'Vue détaillée orientée document',
    en: 'Document-oriented detail view',
    ar: 'عرض تفصيلي موجه للمستند',
  };
  readonly referenceLabel = {
    fr: 'Réf.',
    en: 'Ref.',
    ar: 'مرجع',
  };
  readonly versionLabel = {
    fr: 'Version',
    en: 'Version',
    ar: 'الإصدار',
  };
  readonly fileTypeLabel = {
    fr: 'Type',
    en: 'Type',
    ar: 'النوع',
  };
  readonly readerToolsLabel = {
    fr: 'Outils de lecture',
    en: 'Reading tools',
    ar: 'أدوات القراءة',
  };
  readonly pageNavigationLabel = {
    fr: 'Page',
    en: 'Page',
    ar: 'الصفحة',
  };
  readonly zoomLabel = {
    fr: 'Zoom',
    en: 'Zoom',
    ar: 'تكبير',
  };
  readonly resetViewLabel = {
    fr: 'Réinitialiser',
    en: 'Reset',
    ar: 'إعادة الضبط',
  };
  readonly previewPanelLabel = {
    fr: 'Aperçu principal',
    en: 'Main preview',
    ar: 'المعاينة الرئيسية',
  };
  readonly metadataPanelLabel = {
    fr: 'Informations de l’article',
    en: 'Article information',
    ar: 'معلومات المقال',
  };
  readonly authorsPanelLabel = {
    fr: 'Auteurs et contributions',
    en: 'Authors and contributors',
    ar: 'المؤلفون والمساهمون',
  };
  readonly assetsPanelLabel = {
    fr: 'Document et ressources',
    en: 'Document and resources',
    ar: 'المستند والموارد',
  };
  readonly actionsPanelLabel = {
    fr: 'Actions utiles',
    en: 'Useful actions',
    ar: 'الإجراءات المفيدة',
  };
  readonly noPdfPreviewLabel = {
    fr: 'Aucun PDF n’est associé à cet article pour le moment.',
    en: 'No PDF is currently attached to this article.',
    ar: 'لا يوجد ملف PDF مرفق بهذا المقال حالياً.',
  };
  readonly pdfPreviewLoadingLabel = {
    fr: 'Chargement du document en cours...',
    en: 'Loading document preview...',
    ar: 'جارٍ تحميل معاينة المستند...',
  };
  readonly pdfPreviewUnavailableLabel = {
    fr: 'Le document intégré n’a pas pu être affiché. Vous pouvez toujours ouvrir ou télécharger le PDF.',
    en: 'The embedded document could not be displayed. You can still open or download the PDF.',
    ar: 'تعذر عرض المستند المدمج. لا يزال بإمكانك فتح ملف PDF أو تنزيله.',
  };
  readonly pdfViewerHintLabel = {
    fr: 'Le document reste interactif dans le cadre intégré. Utilisez les contrôles ci-dessus pour ajuster la page et le zoom.',
    en: 'The document remains interactive in the embedded frame. Use the controls above to adjust page and zoom.',
    ar: 'يبقى المستند تفاعلياً داخل الإطار المدمج. استخدم الأدوات أعلاه لتعديل الصفحة والتكبير.',
  };
  readonly openInBrowserLabel = {
    fr: 'Ouvrir dans un onglet',
    en: 'Open in tab',
    ar: 'فتح في علامة تبويب',
  };
  readonly summaryLabel = {
    fr: 'Résumé',
    en: 'Abstract',
    ar: 'الملخص',
  };
  readonly articleTitleLabel = {
    fr: 'Titre de l\'article',
    en: 'Article title',
    ar: 'عنوان المقال',
  };
  readonly contentLabel = {
    fr: 'Contenu / Description scientifique',
    en: 'Content / Scientific description',
    ar: 'المحتوى / الوصف العلمي',
  };
  readonly doiLabel = {
    fr: 'Lien DOI',
    en: 'DOI link',
    ar: 'رابط DOI',
  };
  readonly doiPlaceholderLabel = {
    fr: 'Ex: https://doi.org/10.1000/xyz123',
    en: 'Ex: https://doi.org/10.1000/xyz123',
    ar: 'مثال: https://doi.org/10.1000/xyz123',
  };
  readonly requiredFieldsHintLabel = {
    fr: 'Champs obligatoires: titre, résumé, contenu, auteurs, PDF et lien DOI.',
    en: 'Required fields: title, abstract, content, authors, PDF and DOI link.',
    ar: 'الحقول الإلزامية: العنوان والملخص والمحتوى والمؤلفون وملف PDF ورابط DOI.',
  };
  readonly metadataLabel = {
    fr: 'Métadonnées',
    en: 'Metadata',
    ar: 'البيانات الوصفية',
  };
  readonly metadataOptionalLabel = {
    fr: 'Métadonnées (optionnel)',
    en: 'Metadata (optional)',
    ar: 'البيانات الوصفية (اختياري)',
  };
  readonly metadataOptionalHintLabel = {
    fr: 'Date de soumission, domaine/catégorie, équipe de recherche et mots-clés sont facultatifs.',
    en: 'Submission date, domain/category, research team, and keywords are optional.',
    ar: 'تاريخ الإرسال والمجال/الفئة وفريق البحث والكلمات المفتاحية حقول اختيارية.',
  };
  readonly categoryLabel = {
    fr: 'Domaine / Catégorie',
    en: 'Domain / Category',
    ar: 'المجال / الفئة',
  };
  readonly teamLabel = {
    fr: 'Équipe de recherche',
    en: 'Research team',
    ar: 'فريق البحث',
  };
  readonly keywordsLabel = {
    fr: 'Mots-clés',
    en: 'Keywords',
    ar: 'الكلمات المفتاحية',
  };
  readonly submissionDateLabel = {
    fr: 'Date de soumission',
    en: 'Submission date',
    ar: 'تاريخ الإرسال',
  };
  readonly keywordsPlaceholder = {
    fr: 'Ex: dosimetrie, radiochimie, instrumentation',
    en: 'Ex: dosimetry, radiochemistry, instrumentation',
    ar: 'مثال: قياس الجرعات، الكيمياء الإشعاعية، الأجهزة',
  };
  readonly sectionInformationsPrincipales = {
    fr: 'Informations principales',
    en: 'Main information',
    ar: 'المعلومات الأساسية',
  };
  readonly sectionAuteurs = {
    fr: 'Auteurs',
    en: 'Authors',
    ar: 'المؤلفون',
  };
  readonly sectionFichiers = {
    fr: 'Fichiers',
    en: 'Files',
    ar: 'الملفات',
  };
  readonly sectionMetadonnees = {
    fr: 'Métadonnées',
    en: 'Metadata',
    ar: 'البيانات الوصفية',
  };
  readonly mainAuthorLabel = {
    fr: 'Auteur principal',
    en: 'Main author',
    ar: 'المؤلف الرئيسي',
  };
  readonly searchCoAuthorPlaceholder = {
    fr: 'Rechercher un co-auteur...',
    en: 'Search co-author...',
    ar: 'ابحث عن مؤلف مشارك...',
  };
  readonly noCoAuthorCandidateLabel = {
    fr: 'Aucun membre disponible.',
    en: 'No member available.',
    ar: 'لا يوجد عضو متاح.',
  };
  readonly pdfAttachmentLabel = {
    fr: 'Upload PDF',
    en: 'Upload PDF',
    ar: 'رفع PDF',
  };
  readonly newArticleModalTitle = {
    fr: 'Nouvel article scientifique',
    en: 'New scientific article',
    ar: 'مقال علمي جديد',
  };
  readonly newArticleModalSubtitle = {
    fr: 'Renseignez les informations principales et les auteurs, puis ajoutez le PDF requis.',
    en: 'Complete main information and authors, then add the required PDF.',
    ar: 'اكمل المعلومات الاساسية والمؤلفين ثم اضف ملف PDF الالزامي.',
  };
  readonly selectCategoryLabel = {
    fr: 'Sélectionner une catégorie',
    en: 'Select a category',
    ar: 'اختر فئة',
  };
  readonly selectTeamLabel = {
    fr: 'Sélectionner une équipe',
    en: 'Select a team',
    ar: 'اختر فريقا',
  };
  readonly selectArticleLabel = {
    fr: 'Article cible',
    en: 'Target article',
    ar: 'المقال المستهدف',
  };
  readonly selectArticlePlaceholder = {
    fr: 'Choisir un article modifiable',
    en: 'Choose editable article',
    ar: 'اختر مقالًا قابلاً للتعديل',
  };
  readonly noUploadableArticleLabel = {
    fr: 'Aucun article modifiable disponible pour l’upload PDF.',
    en: 'No editable article available for PDF upload.',
    ar: 'لا يوجد مقال قابل للتعديل متاح لرفع PDF.',
  };
  readonly coAuthorsLabel = {
    fr: 'Co-auteurs',
    en: 'Co-authors',
    ar: 'المؤلفون المشاركون',
  };
  readonly authorsSelectionLabel = {
    fr: 'Choix des auteurs / co-auteurs',
    en: 'Authors / co-authors selection',
    ar: 'اختيار المؤلفين / المؤلفين المشاركين',
  };
  readonly authorsSelectionHintLabel = {
    fr: 'Auteur principal prérempli avec votre compte, co-auteurs sélectionnés parmi les membres existants.',
    en: 'Main author is prefilled from your account, co-authors are selected from existing members.',
    ar: 'المؤلف الرئيسي معبأ تلقائيا من حسابك، ويتم اختيار المؤلفين المشاركين من الاعضاء المتاحين.',
  };
  readonly pdfMaxSizeHintLabel = {
    fr: 'Taille maximale autorisee: 5 Mo.',
    en: 'Maximum allowed size: 5 MB.',
    ar: 'الحجم الاقصى المسموح: 5 ميغابايت.',
  };
  readonly noCoAuthorLabel = {
    fr: 'Aucun co-auteur enregistré.',
    en: 'No co-authors recorded.',
    ar: 'لا يوجد مؤلفون مشاركون.',
  };
  readonly rejectModalTitle = {
    fr: 'Refuser la soumission',
    en: 'Reject submission',
    ar: 'رفض المساهمة',
  };
  readonly rejectionReasonLabel = {
    fr: 'Motif du rejet',
    en: 'Rejection reason',
    ar: 'سبب الرفض',
  };
  readonly rejectionPlaceholder = {
    fr: 'Précisez les corrections attendues avant une nouvelle soumission.',
    en: 'Explain required corrections before resubmission.',
    ar: 'اذكر التصحيحات المطلوبة قبل إعادة الإرسال.',
  };
  readonly cancelLabel = {
    fr: 'Annuler',
    en: 'Cancel',
    ar: 'إلغاء',
  };
  readonly confirmRejectionLabel = {
    fr: 'Confirmer le rejet',
    en: 'Confirm rejection',
    ar: 'تأكيد الرفض',
  };
  readonly saveDraftLabel = {
    fr: 'Enregistrer comme brouillon',
    en: 'Save as draft',
    ar: 'حفظ كمسودة',
  };
  readonly submitForReviewLabel = {
    fr: 'Soumettre pour validation',
    en: 'Submit for review',
    ar: 'إرسال للمراجعة',
  };
  readonly previousLabel = {
    fr: 'Précédent',
    en: 'Previous',
    ar: 'السابق',
  };
  readonly nextLabel = {
    fr: 'Suivant',
    en: 'Next',
    ar: 'التالي',
  };

  readonly statusFilters: Array<{ value: DashboardStatusFilter; label: LocalizedCopy }> = [
    { value: 'TOUS', label: { fr: 'Tous', en: 'All', ar: 'الكل' } },
    { value: 'BROUILLON', label: { fr: 'Brouillons', en: 'Drafts', ar: 'المسودات' } },
    { value: 'SOUMIS', label: { fr: 'Soumis', en: 'Submitted', ar: 'قيد المراجعة' } },
    { value: 'VALIDE', label: { fr: 'Validés', en: 'Validated', ar: 'معتمدة' } },
    { value: 'REJETE', label: { fr: 'Refusés', en: 'Rejected', ar: 'مرفوضة' } },
    { value: 'PUBLIE', label: { fr: 'Publiés', en: 'Published', ar: 'منشورة' } },
  ];

  readonly canModerate = computed(() => this.roleService.isChef());
  readonly canPublish = computed(() => this.roleService.isChef());
  readonly canCreateArticle = computed(() => true);

  readonly categories = computed(() => this.references()?.categoriesArticle || []);
  readonly teams = computed(() => this.references()?.equipesRecherche || []);
  readonly currentUser = computed(() => this.auth.session()?.utilisateur || null);

  readonly coAuthorCandidates = computed(() => {
    const currentUserId = this.currentUser()?.id || '';
    const query = this.coAuthorSearch().trim().toLowerCase();

    return this.members()
      .filter((member) => member.id !== currentUserId)
      .filter((member) => {
        if (!query) {
          return true;
        }

        return [member.nomComplet, member.emailInstitutionnel]
          .join(' ')
          .toLowerCase()
          .includes(query);
      });
  });

  readonly uploadableArticles = computed(() =>
    this.ownArticles().filter(
      (article) =>
        article.editableParAuteur ||
        PDF_UPLOADABLE_STATUSES.includes(article.statut),
    ),
  );

  readonly displayedArticles = computed(() => {
    const source = this.articles();

    if (this.canModerate()) {
      return source;
    }

    const query = this.searchTerm().trim().toLowerCase();
    const selectedStatus = this.statusFilter();

    return source.filter((article) => {
      if (selectedStatus !== 'TOUS' && article.statut !== selectedStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        article.titre,
        article.resume,
        article.contenu,
        article.lienDoi || '',
        article.deposant?.nomComplet || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const stats = this.statistiques();
    const source = this.articles();

    const pending = this.canModerate()
      ? Number(stats?.enAttente || 0)
      : source.filter((item) => item.statut === 'SOUMIS').length;
    const validated = this.canModerate()
      ? Number(stats?.valides || 0)
      : source.filter((item) => item.statut === 'VALIDE').length;
    const rejected = this.canModerate()
      ? Number(stats?.rejetes || 0)
      : source.filter((item) => item.statut === 'REJETE').length;
    const published = this.canModerate()
      ? Number(stats?.publies || 0)
      : source.filter((item) => item.statut === 'PUBLIE').length;
    const total = this.canModerate()
      ? Number(stats?.total || pending + validated + rejected + published)
      : source.length;

    return [
      {
        label: this.site.localize({ fr: 'Total', en: 'Total', ar: 'الإجمالي' }),
        value: total,
        meta: this.site.localize({
          fr: 'Articles dans le workflow',
          en: 'Articles in workflow',
          ar: 'المقالات ضمن سير العمل',
        }),
        toneClass: 'app-kpi-card--tone-total',
        icon: this.icons.LayoutDashboard,
      },
      {
        label: this.site.localize({ fr: 'Soumis', en: 'Submitted', ar: 'قيد المراجعة' }),
        value: pending,
        meta: this.site.localize({
          fr: 'En attente de décision',
          en: 'Awaiting decision',
          ar: 'بانتظار القرار',
        }),
        toneClass: 'app-kpi-card--tone-pending',
        icon: this.icons.FileSearch,
      },
      {
        label: this.site.localize({ fr: 'Validés', en: 'Validated', ar: 'معتمدة' }),
        value: validated,
        meta: this.site.localize({
          fr: 'Prêts pour publication',
          en: 'Ready for publication',
          ar: 'جاهزة للنشر',
        }),
        toneClass: 'app-kpi-card--tone-validated',
        icon: this.icons.Check,
      },
      {
        label: this.site.localize({ fr: 'Publiés', en: 'Published', ar: 'منشورة' }),
        value: published,
        meta: this.site.localize({
          fr: 'Disponibles publiquement',
          en: 'Publicly available',
          ar: 'متاحة للعموم',
        }),
        toneClass: 'app-kpi-card--tone-published',
        icon: this.icons.CheckCheck,
      },
    ];
  });

  readonly paginationPages = computed(() => {
    const meta = this.meta();
    if (!meta || meta.totalPages <= 1) {
      return [];
    }

    const current = this.page();
    const start = Math.max(1, current - 2);
    const end = Math.min(meta.totalPages, start + 4);
    const pages: number[] = [];

    for (let index = start; index <= end; index += 1) {
      pages.push(index);
    }

    return pages;
  });

  async ngOnInit() {
    const token = this.token;
    if (!token) {
      return;
    }

    await this.bootstrapLookups(token);
    await Promise.all([this.loadData(), this.loadOwnArticles()]);
  }

  ngOnDestroy() {
    this.clearDetailPdfPreview();
  }

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  resolveDoiUrl(rawDoi: string | null | undefined) {
    const value = (rawDoi || '').trim();
    if (!value) {
      return '#';
    }

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    const normalized = value.replace(/^doi:\s*/i, '').trim();
    return `https://doi.org/${normalized}`;
  }

  private isPdfFileTooLarge(file: File | null) {
    return Boolean(file && file.size > MAX_ARTICLE_PDF_BYTES);
  }

  private buildInitialCreateForm(): CreateArticleForm {
    const sessionUser = this.auth.session()?.utilisateur || null;

    return {
      titre: '',
      resume: '',
      contenu: '',
      lienDoi: '',
      coAuteurIds: [],
      categorieId: null,
      equipeRechercheId: sessionUser?.profil?.equipeRechercheId || null,
      dateSoumission: '',
      motsCles: '',
    };
  }

  private async bootstrapLookups(token: string) {
    const [referencesResult, membersResult] = await Promise.allSettled([
      api.getRegistrationReferences(),
      api.listMembers(token, { limit: 50 }),
    ]);

    if (referencesResult.status === 'fulfilled') {
      this.references.set(referencesResult.value.references);
    }

    if (membersResult.status === 'fulfilled') {
      this.members.set(membersResult.value.elements);
    }
  }

  private mergeArticles(primary: Article[], secondary: Article[]) {
    const map = new Map<number, Article>();

    [...primary, ...secondary].forEach((item) => {
      map.set(item.id, item);
    });

    return Array.from(map.values());
  }

  private buildChefQuery(): LabHeadArticlesQuery {
    const statut = this.statusFilter();

    return {
      q: this.searchTerm().trim() || undefined,
      statut: statut === 'TOUS' ? '' : statut,
      tri: 'modification',
      ordre: 'desc',
      page: this.page(),
      limit: this.limit(),
    };
  }

  async loadData() {
    if (!this.token) {
      return;
    }

    this.errorMessage.set('');

    if (this.canModerate()) {
      await this.loadChefArticles();
      return;
    }

    await this.loadMemberArticles();
  }

  private async loadChefArticles() {
    if (!this.token) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const response = await api.getLabHeadArticles(this.token, this.buildChefQuery());
      const elements =
        response.elements && response.elements.length > 0
          ? response.elements
          : this.mergeArticles(response.articles, response.articlesValides);

      this.articles.set(elements);
      this.statistiques.set(response.statistiques);
      this.meta.set(response.meta || null);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur de chargement des articles.',
              en: 'Unable to load articles.',
              ar: 'تعذر تحميل المقالات.',
            }),
      );
      this.articles.set([]);
      this.meta.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadMemberArticles() {
    if (!this.token) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const response = await api.listMemberArticles(this.token);
      this.articles.set(response.articles);
      this.meta.set(null);
      this.statistiques.set({
        enAttente: response.statistiques.parStatut.SOUMIS || 0,
        valides: response.statistiques.parStatut.VALIDE || 0,
        rejetes: response.statistiques.parStatut.REJETE || 0,
        publies: response.statistiques.parStatut.PUBLIE || 0,
        total: response.statistiques.total,
      });
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur de chargement des articles.',
              en: 'Unable to load articles.',
              ar: 'تعذر تحميل المقالات.',
            }),
      );
      this.articles.set([]);
      this.meta.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadOwnArticles() {
    if (!this.token) {
      return;
    }

    try {
      const response = await api.listMemberArticles(this.token);
      this.ownArticles.set(response.articles || []);
    } catch {
      this.ownArticles.set([]);
    }
  }

  onSearchInput(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);

    if (this.canModerate()) {
      this.page.set(1);
      void this.loadChefArticles();
    }
  }

  setStatusFilter(value: DashboardStatusFilter) {
    this.statusFilter.set(value);

    if (this.canModerate()) {
      this.page.set(1);
      void this.loadChefArticles();
    }
  }

  goToPage(targetPage: number) {
    if (!this.canModerate()) {
      return;
    }

    const meta = this.meta();
    if (!meta) {
      return;
    }

    if (targetPage < 1 || targetPage > meta.totalPages || targetPage === this.page()) {
      return;
    }

    this.page.set(targetPage);
    void this.loadChefArticles();
  }

  goToPreviousPage() {
    this.goToPage(this.page() - 1);
  }

  goToNextPage() {
    this.goToPage(this.page() + 1);
  }

  currentUserFullName() {
    return this.currentUser()?.nomComplet || this.site.localize(this.unknownAuthorLabel);
  }

  currentUserEmail() {
    return this.currentUser()?.emailInstitutionnel || this.site.localize(this.notAvailableLabel);
  }

  articleAuthorsLabel(article: Article) {
    const names = [
      article.deposant?.nomComplet || '',
      ...article.coAuteurs
        .map((coAuthor) => coAuthor.utilisateur?.nomComplet || '')
        .filter((name) => name && name !== article.deposant?.nomComplet),
    ].filter(Boolean);

    return names.length ? names.join(', ') : this.site.localize(this.unknownAuthorLabel);
  }

  articleFileDetails(article: Article) {
    if (!article.articlePdf) {
      return this.site.localize(this.notAvailableLabel);
    }

    const mimeType = article.articlePdf.typeMime || 'application/pdf';
    const sizeLabel = this.formatFileSize(article.articlePdf.tailleOctets);

    if (!sizeLabel) {
      return mimeType;
    }

    return `${mimeType} • ${sizeLabel}`;
  }

  setDetailSearchTerm(event: Event) {
    this.detailSearchTerm.set((event.target as HTMLInputElement).value || '');
  }

  setDetailPreviewMode(mode: DetailPreviewMode) {
    if (mode === 'pdf' && !this.detailHasPdf()) {
      return;
    }

    this.detailPreviewMode.set(mode);

    if (mode === 'pdf' && this.selectedArticle()?.articlePdf && !this.detailPdfUrl() && !this.detailPdfLoading()) {
      void this.loadDetailPdfPreview(this.selectedArticle()!);
    }
  }

  changeDetailPdfPage(delta: number) {
    this.detailPdfPage.update((value) => Math.max(1, value + delta));
  }

  updateDetailPdfPage(event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    this.detailPdfPage.set(Number.isFinite(value) && value > 0 ? Math.trunc(value) : 1);
  }

  increaseDetailPdfZoom() {
    this.detailPdfZoom.update((value) => clamp(value + 10, MIN_DETAIL_PDF_ZOOM, MAX_DETAIL_PDF_ZOOM));
  }

  decreaseDetailPdfZoom() {
    this.detailPdfZoom.update((value) => clamp(value - 10, MIN_DETAIL_PDF_ZOOM, MAX_DETAIL_PDF_ZOOM));
  }

  resetDetailPdfView() {
    this.detailPdfPage.set(1);
    this.detailPdfZoom.set(100);
  }

  toggleDetailFullscreen() {
    this.detailFullscreen.update((value) => !value);
  }

  highlightDetailText(value: string) {
    const safeValue = escapeHtml(value || '');
    const query = this.detailSearchTerm().trim();

    if (!query) {
      return safeValue.replace(/\n/g, '<br />');
    }

    const pattern = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return safeValue.replace(pattern, '<mark class="rounded-md bg-amber-200/80 px-1 text-foreground">$1</mark>').replace(/\n/g, '<br />');
  }

  formatFileSize(bytes?: number | null) {
    if (!bytes || bytes <= 0) {
      return '';
    }

    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    if (bytes >= 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }

    return `${bytes} B`;
  }

  isCoAuthorSelected(userId: string) {
    return this.createForm.coAuteurIds.includes(userId);
  }

  getCoAuthorName(userId: string) {
    return this.members().find((m) => m.id === userId)?.nomComplet || userId;
  }

  removeCoAuthor(userId: string) {
    this.createForm.coAuteurIds = this.createForm.coAuteurIds.filter((id) => id !== userId);
  }

  toggleCoAuthor(userId: string, event: Event) {
    const checked = Boolean((event.target as HTMLInputElement | null)?.checked);

    if (checked) {
      if (!this.createForm.coAuteurIds.includes(userId)) {
        this.createForm.coAuteurIds = [...this.createForm.coAuteurIds, userId];
      }
      return;
    }

    this.createForm.coAuteurIds = this.createForm.coAuteurIds.filter((id) => id !== userId);
  }

  openDetail(article: Article) {
    this.selectedArticle.set(article);
    this.showDetailModal.set(true);
    this.detailFullscreen.set(false);
    this.detailSearchTerm.set('');
    this.detailPdfError.set('');
    this.resetDetailPdfView();
    this.statusMessage.set('');
    this.errorMessage.set('');

    if (article.articlePdf) {
      this.detailPreviewMode.set('pdf');
      void this.loadDetailPdfPreview(article);
      return;
    }

    this.detailPreviewMode.set('content');
    this.clearDetailPdfPreview();
  }

  closeDetailModal() {
    this.showDetailModal.set(false);
    this.detailFullscreen.set(false);
    this.detailSearchTerm.set('');
    this.selectedArticle.set(null);
    this.detailPreviewMode.set('content');
    this.clearDetailPdfPreview();
  }

  private async loadDetailPdfPreview(article: Article) {
    if (!this.token || !article.articlePdf) {
      this.clearDetailPdfPreview();
      return;
    }

    const requestId = ++this.detailPdfRequestId;
    this.clearDetailPdfPreview(false);
    this.detailPdfLoading.set(true);
    this.detailPdfError.set('');

    try {
      const objectUrl = await api.getMemberArticlePdfUrl(this.token, article.id);

      if (requestId !== this.detailPdfRequestId) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      this.detailPdfObjectUrl = objectUrl;
      this.detailPdfUrl.set(objectUrl);
    } catch (error) {
      if (requestId === this.detailPdfRequestId) {
        this.detailPdfError.set(
          error instanceof Error
            ? error.message
            : this.site.localize(this.pdfPreviewUnavailableLabel),
        );
        this.detailPdfUrl.set(null);
      }
    } finally {
      if (requestId === this.detailPdfRequestId) {
        this.detailPdfLoading.set(false);
      }
    }
  }

  private clearDetailPdfPreview(resetRequest = true) {
    if (resetRequest) {
      this.detailPdfRequestId += 1;
    }

    if (this.detailPdfObjectUrl) {
      URL.revokeObjectURL(this.detailPdfObjectUrl);
      this.detailPdfObjectUrl = null;
    }

    this.detailPdfUrl.set(null);
    this.detailPdfLoading.set(false);
    this.detailPdfError.set('');
    this.detailPdfPage.set(1);
    this.detailPdfZoom.set(100);
  }

  async openPdf(article: Article) {
    if (!this.token || !article.articlePdf) {
      return;
    }

    try {
      await api.openMemberArticlePdf(this.token, article.id);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Impossible d\'ouvrir le PDF.',
              en: 'Unable to open PDF.',
              ar: 'تعذر فتح ملف PDF.',
            }),
      );
    }
  }

  async downloadPdf(article: Article) {
    if (!this.token || !article.articlePdf) {
      return;
    }

    try {
      await api.downloadMemberArticlePdf(this.token, article.id);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Impossible de télécharger le PDF.',
              en: 'Unable to download PDF.',
              ar: 'تعذر تنزيل ملف PDF.',
            }),
      );
    }
  }

  openRejectModal(article: Article) {
    this.rejectTarget.set(article);
    this.rejectReason.set(article.motifRejet || '');
    this.showRejectModal.set(true);
  }

  closeRejectModal() {
    this.showRejectModal.set(false);
    this.rejectTarget.set(null);
    this.rejectReason.set('');
  }

  async approveArticle(articleId: number) {
    if (!this.canModerate() || !this.token) {
      return;
    }

    this.processing.set(true);
    this.errorMessage.set('');

    try {
      await api.validateArticle(this.token, articleId);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Article validé avec succès.',
          en: 'Article validated successfully.',
          ar: 'تم اعتماد المقال بنجاح.',
        }),
      );
      await this.loadChefArticles();
      this.refreshSelectedArticle(articleId);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Validation impossible.',
              en: 'Unable to validate article.',
              ar: 'تعذر اعتماد المقال.',
            }),
      );
    } finally {
      this.processing.set(false);
    }
  }

  async submitReject() {
    if (!this.canModerate() || !this.token || !this.rejectTarget()) {
      return;
    }

    const motifRejet = this.rejectReason().trim();
    if (!motifRejet) {
      this.errorMessage.set(
        this.site.localize({
          fr: 'Le motif de rejet est obligatoire.',
          en: 'Rejection reason is required.',
          ar: 'سبب الرفض إلزامي.',
        }),
      );
      return;
    }

    this.processing.set(true);
    this.errorMessage.set('');

    try {
      await api.refuseArticle(this.token, this.rejectTarget()!.id, { motifRejet });
      this.statusMessage.set(
        this.site.localize({
          fr: 'Article refusé avec succès.',
          en: 'Article rejected successfully.',
          ar: 'تم رفض المقال بنجاح.',
        }),
      );
      await this.loadChefArticles();
      this.refreshSelectedArticle(this.rejectTarget()!.id);
      this.closeRejectModal();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Refus impossible.',
              en: 'Unable to reject article.',
              ar: 'تعذر رفض المقال.',
            }),
      );
    } finally {
      this.processing.set(false);
    }
  }

  async publishArticle(articleId: number) {
    if (!this.canPublish() || !this.token) {
      return;
    }

    this.processing.set(true);
    this.errorMessage.set('');

    try {
      await api.publishArticle(this.token, articleId);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Article publié avec succès.',
          en: 'Article published successfully.',
          ar: 'تم نشر المقال بنجاح.',
        }),
      );
      await this.loadChefArticles();
      this.refreshSelectedArticle(articleId);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Publication impossible.',
              en: 'Unable to publish article.',
              ar: 'تعذر نشر المقال.',
            }),
      );
    } finally {
      this.processing.set(false);
    }
  }

  private refreshSelectedArticle(articleId: number) {
    if (!this.showDetailModal()) {
      return;
    }

    const refreshed = this.articles().find((item) => item.id === articleId) || null;
    this.selectedArticle.set(refreshed);

    if (!refreshed) {
      this.closeDetailModal();
      return;
    }

    if (refreshed.articlePdf) {
      if (!this.detailPdfUrl()) {
        void this.loadDetailPdfPreview(refreshed);
      }
    } else {
      this.detailPreviewMode.set('content');
      this.clearDetailPdfPreview();
    }
  }

  openCreateModal() {
    this.showCreateModal.set(true);
    this.createForm = this.buildInitialCreateForm();
    this.coAuthorSearch.set('');
    this.createErrorMessage.set('');
    this.createStatusMessage.set('');
    this.selectedPdfFile = null;
    this.selectedPdfName.set('');
  }

  closeCreateModal() {
    if (this.creatingArticle()) {
      return;
    }

    this.showCreateModal.set(false);
  }

  onCreatePdfSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (this.isPdfFileTooLarge(file)) {
      this.selectedPdfFile = null;
      this.selectedPdfName.set('');
      this.createErrorMessage.set(PDF_SIZE_ERROR_MESSAGE);
      input.value = '';
      return;
    }

    this.selectedPdfFile = file;
    this.selectedPdfName.set(this.selectedPdfFile?.name || '');

    if (this.createErrorMessage() === PDF_SIZE_ERROR_MESSAGE) {
      this.createErrorMessage.set('');
    }
  }

  private validateCreatePayload(action: WorkflowAction) {
    if (!this.currentUser()?.id) {
      return this.site.localize({
        fr: 'Auteur principal introuvable. Veuillez vous reconnecter.',
        en: 'Main author not found. Please sign in again.',
        ar: 'لم يتم العثور على المؤلف الرئيسي. يرجى تسجيل الدخول مجددًا.',
      });
    }

    if (!this.createForm.titre.trim()) {
      return this.site.localize({
        fr: 'Le titre est obligatoire.',
        en: 'Title is required.',
        ar: 'العنوان إلزامي.',
      });
    }

    if (!this.createForm.resume.trim()) {
      return this.site.localize({
        fr: 'Le résumé est obligatoire.',
        en: 'Abstract is required.',
        ar: 'الملخص إلزامي.',
      });
    }

    if (!this.createForm.contenu.trim()) {
      return this.site.localize({
        fr: 'Le contenu est obligatoire.',
        en: 'Content is required.',
        ar: 'المحتوى إلزامي.',
      });
    }

    if (!this.createForm.lienDoi.trim()) {
      return this.site.localize({
        fr: 'Le lien DOI est obligatoire.',
        en: 'DOI link is required.',
        ar: 'رابط DOI إلزامي.',
      });
    }

    if (!this.selectedPdfFile) {
      return this.site.localize({
        fr: 'Le fichier PDF est obligatoire.',
        en: 'PDF file is required.',
        ar: 'ملف PDF إلزامي.',
      });
    }

    if (this.isPdfFileTooLarge(this.selectedPdfFile)) {
      return PDF_SIZE_ERROR_MESSAGE;
    }

    if (action !== 'BROUILLON' && action !== 'SOUMETTRE') {
      return this.site.localize({
        fr: 'Action de workflow invalide.',
        en: 'Invalid workflow action.',
        ar: 'إجراء سير العمل غير صالح.',
      });
    }

    return '';
  }

  async submitCreateArticle(action: WorkflowAction) {
    if (!this.token) {
      return;
    }

    this.createErrorMessage.set('');
    this.createStatusMessage.set('');

    const validationError = this.validateCreatePayload(action);
    if (validationError) {
      this.createErrorMessage.set(validationError);
      return;
    }

    this.creatingArticle.set(true);

    try {
      const payload: ArticlePayload = {
        titre: this.createForm.titre.trim(),
        resume: this.createForm.resume.trim(),
        contenu: this.createForm.contenu.trim(),
        lienDoi: this.createForm.lienDoi.trim(),
        categorieId: this.createForm.categorieId,
        action,
      };

      let article = await api.createArticle(this.token, payload);

      if (this.createForm.coAuteurIds.length > 0) {
        for (const utilisateurId of this.createForm.coAuteurIds) {
          article = await api.addCoAuthor(this.token, article.id, { utilisateurId });
        }
      }

      if (this.selectedPdfFile) {
        article = await api.uploadArticlePdf(this.token, article.id, this.selectedPdfFile);
      }

      this.createStatusMessage.set(
        action === 'SOUMETTRE'
          ? this.site.localize({
              fr: 'Article soumis pour validation avec succès.',
              en: 'Article submitted for review successfully.',
              ar: 'تم إرسال المقال للمراجعة بنجاح.',
            })
          : this.site.localize({
              fr: 'Article enregistré comme brouillon avec succès.',
              en: 'Draft saved successfully.',
              ar: 'تم حفظ المقال كمسودة بنجاح.',
            }),
      );

      this.statusMessage.set(this.createStatusMessage());
      this.showCreateModal.set(false);
      this.createForm = this.buildInitialCreateForm();
      this.selectedPdfFile = null;
      this.selectedPdfName.set('');

      await Promise.all([this.loadData(), this.loadOwnArticles()]);
    } catch (error) {
      this.createErrorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Impossible de créer cet article.',
              en: 'Unable to create this article.',
              ar: 'تعذر إنشاء هذا المقال.',
            }),
      );
    } finally {
      this.creatingArticle.set(false);
    }
  }

  async openUploadPdfModal() {
    this.showUploadPdfModal.set(true);
    this.uploadPdfModalMessage.set('');
    this.uploadPdfModalError.set('');
    this.quickUploadPdfFile = null;
    this.quickUploadPdfName.set('');

    await this.loadOwnArticles();

    const firstEditable = this.uploadableArticles()[0];
    this.uploadTargetArticleId.set(firstEditable ? firstEditable.id : null);
  }

  closeUploadPdfModal() {
    if (this.uploadingPdfQuick()) {
      return;
    }

    this.showUploadPdfModal.set(false);
  }

  setUploadTargetArticleId(value: unknown) {
    if (value === null || value === undefined || value === '') {
      this.uploadTargetArticleId.set(null);
      return;
    }

    this.uploadTargetArticleId.set(Number(value));
  }

  onQuickUploadPdfSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (this.isPdfFileTooLarge(file)) {
      this.quickUploadPdfFile = null;
      this.quickUploadPdfName.set('');
      this.uploadPdfModalError.set(PDF_SIZE_ERROR_MESSAGE);
      input.value = '';
      return;
    }

    this.quickUploadPdfFile = file;
    this.quickUploadPdfName.set(this.quickUploadPdfFile?.name || '');

    if (this.uploadPdfModalError() === PDF_SIZE_ERROR_MESSAGE) {
      this.uploadPdfModalError.set('');
    }
  }

  async submitQuickPdfUpload() {
    if (!this.token) {
      return;
    }

    if (!this.uploadTargetArticleId()) {
      this.uploadPdfModalError.set(
        this.uploadableArticles().length
          ? this.site.localize({
              fr: 'Veuillez sélectionner un article.',
              en: 'Please select an article.',
              ar: 'يرجى اختيار مقال.',
            })
          : this.site.localize(this.noUploadableArticleLabel),
      );
      return;
    }

    const isSelectedArticleUploadable = this.uploadableArticles().some(
      (article) => article.id === this.uploadTargetArticleId(),
    );

    if (!isSelectedArticleUploadable) {
      this.uploadPdfModalError.set(this.site.localize(this.noUploadableArticleLabel));
      return;
    }
    if (!this.quickUploadPdfFile) {
      this.uploadPdfModalError.set(
        this.site.localize({
          fr: 'Veuillez sélectionner un fichier PDF.',
          en: 'Please select a PDF file.',
          ar: 'يرجى اختيار ملف PDF.',
        }),
      );
      return;
    }

    if (this.isPdfFileTooLarge(this.quickUploadPdfFile)) {
      this.uploadPdfModalError.set(PDF_SIZE_ERROR_MESSAGE);
      return;
    }

    this.uploadingPdfQuick.set(true);
    this.uploadPdfModalError.set('');
    this.uploadPdfModalMessage.set('');

    try {
      await api.uploadArticlePdf(this.token, this.uploadTargetArticleId()!, this.quickUploadPdfFile);

      this.uploadPdfModalMessage.set(
        this.site.localize({
          fr: 'PDF téléversé avec succès.',
          en: 'PDF uploaded successfully.',
          ar: 'تم رفع ملف PDF بنجاح.',
        }),
      );
      this.statusMessage.set(this.uploadPdfModalMessage());
      this.showUploadPdfModal.set(false);

      await Promise.all([this.loadData(), this.loadOwnArticles()]);
    } catch (error) {
      this.uploadPdfModalError.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Téléversement du PDF impossible.',
              en: 'Unable to upload PDF.',
              ar: 'تعذر رفع ملف PDF.',
            }),
      );
    } finally {
      this.uploadingPdfQuick.set(false);
    }
  }

  statusLabel(status: ArticleStatus) {
    const labels: Record<ArticleStatus, LocalizedCopy> = {
      BROUILLON: { fr: 'Brouillon', en: 'Draft', ar: 'مسودة' },
      SOUMIS: { fr: 'Soumis', en: 'Submitted', ar: 'قيد المراجعة' },
      VALIDE: { fr: 'Validé', en: 'Validated', ar: 'معتمد' },
      REJETE: { fr: 'Refusé', en: 'Rejected', ar: 'مرفوض' },
      PUBLIE: { fr: 'Publié', en: 'Published', ar: 'منشور' },
    };

    return this.site.localize(labels[status]);
  }

  statusBadgeClass(status: ArticleStatus) {
    if (status === 'PUBLIE') {
      return 'inline-flex h-7 items-center rounded-full bg-emerald-100 px-3 text-xs font-semibold text-emerald-700';
    }

    if (status === 'VALIDE') {
      return 'inline-flex h-7 items-center rounded-full bg-sky-100 px-3 text-xs font-semibold text-sky-700';
    }

    if (status === 'SOUMIS') {
      return 'inline-flex h-7 items-center rounded-full bg-amber-100 px-3 text-xs font-semibold text-amber-700';
    }

    if (status === 'REJETE') {
      return 'inline-flex h-7 items-center rounded-full bg-rose-100 px-3 text-xs font-semibold text-rose-700';
    }

    return 'inline-flex h-7 items-center rounded-full bg-muted px-3 text-xs font-semibold text-muted-foreground';
  }
}



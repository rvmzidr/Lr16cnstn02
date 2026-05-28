import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import type { PurchaseRequest, PurchaseRequestStatus } from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import {
  SiteLanguage,
  SitePreferencesService,
} from '../../core/services/site-preferences.service';
import { sharedIcons } from '../../shared/lucide-icons';

type AttachmentType = 'DEVIS' | 'SPECIFICATIONS_TECHNIQUES' | 'AUTRES';
type DocumentLanguage = Extract<SiteLanguage, 'fr' | 'en' | 'ar'>;

type ExpressionLine = {
  articleService: string;
  quantite: number;
  prixUnitaireTtc: number;
  totalLigne: number;
};

type LocalizedText = {
  fr: string;
  en: string;
  ar: string;
};

type PurchaseFormModel = {
  demandeurNom: string;
  demandeurPrenom: string;
  directionServiceLabo: string;
  dateDemande: string;
  rubriqueBudgetaire: string;
  justificationBesoin: string;
  lignes: ExpressionLine[];
  typesPiecesJointes: AttachmentType[];
  autrePieceJointe: string;
  langueDocument: DocumentLanguage;
};

const EDITABLE_STATUSES = new Set<PurchaseRequestStatus | 'EN_ATTENTE'>([
  'BROUILLON',
  'REJETEE',
  'EN_ATTENTE',
]);

const PENDING_REVIEW_STATUSES = new Set<PurchaseRequestStatus | 'EN_ATTENTE'>([
  'PDF_GENERE',
  'TELECHARGEE',
  'EN_ATTENTE',
]);

const HISTORY_STATUSES = new Set<PurchaseRequestStatus>([
  'ACCEPTEE',
  'REJETEE',
  'EN_COURS_TRAITEMENT',
  'COMMANDEE',
  'LIVREE',
  'EN_ATTENTE_SIGNATURE_CHEF',
  'SIGNEE',
  'TRANSMISE_ADMINISTRATION',
]);

const RUBRIQUE_OPTIONS: Array<{ value: string; label: LocalizedText }> = [
  {
    value: 'EQUIPEMENT',
    label: { fr: 'Equipement', en: 'Equipment', ar: 'معدات' },
  },
  {
    value: 'SOUS_TRAITANCE',
    label: { fr: 'Sous-traitance', en: 'Subcontracting', ar: 'مناولة' },
  },
  {
    value: 'CONSOMMABLES_ET_PETITS_MATERIELS',
    label: {
      fr: 'Consommables et petits matériels',
      en: 'Consumables and small equipment',
      ar: 'مواد استهلاكية ومعدات صغيرة',
    },
  },
  {
    value: 'MISSIONS',
    label: { fr: 'Missions', en: 'Assignments', ar: 'مهام' },
  },
  {
    value: 'STAGES',
    label: { fr: 'Stages', en: 'Internships', ar: 'تربصات' },
  },
  {
    value: 'DEPLACEMENTS_ET_HEBERGEMENT',
    label: {
      fr: 'Déplacements et hébergement',
      en: 'Travel and accommodation',
      ar: 'تنقلات وإقامة',
    },
  },
  {
    value: 'MANIFESTATIONS_SCIENTIFIQUES',
    label: {
      fr: 'Manifestations Scientifiques',
      en: 'Scientific events',
      ar: 'تظاهرات علمية',
    },
  },
  {
    value: 'VACATIONS',
    label: { fr: 'Vacations', en: 'Honorarium sessions', ar: 'حصص عرضية' },
  },
  {
    value: 'DOCUMENTATION_ET_RESEAUX',
    label: {
      fr: 'Documentation et réseaux',
      en: 'Documentation and networks',
      ar: 'توثيق وشبكات',
    },
  },
  {
    value: 'MAINTENANCE_ET_DIVERS',
    label: { fr: 'Maintenance et divers', en: 'Maintenance and miscellaneous', ar: 'صيانة ومتفرقات' },
  },
];

const ATTACHMENT_TYPE_OPTIONS: Array<{ value: AttachmentType; label: LocalizedText }> = [
  { value: 'DEVIS', label: { fr: 'Devis', en: 'Quote', ar: 'عرض سعر' } },
  {
    value: 'SPECIFICATIONS_TECHNIQUES',
    label: {
      fr: 'Spécifications techniques',
      en: 'Technical specifications',
      ar: 'مواصفات تقنية',
    },
  },
  { value: 'AUTRES', label: { fr: 'Autres', en: 'Other', ar: 'أخرى' } },
];

const STATUS_LABELS: Record<string, LocalizedText> = {
  BROUILLON: { fr: 'Brouillon', en: 'Draft', ar: 'مسودة' },
  PDF_GENERE: { fr: 'PDF généré', en: 'PDF generated', ar: 'تم توليد PDF' },
  TELECHARGEE: { fr: 'PDF généré', en: 'PDF ready', ar: 'ملف PDF جاهز' },
  EN_ATTENTE: { fr: 'En attente de validation', en: 'Pending review', ar: 'في انتظار المراجعة' },
  ACCEPTEE: { fr: 'Acceptée', en: 'Accepted', ar: 'مقبولة' },
  REJETEE: { fr: 'Refusée', en: 'Rejected', ar: 'مرفوضة' },
  EN_COURS_TRAITEMENT: { fr: 'En traitement', en: 'In progress', ar: 'قيد المعالجة' },
  COMMANDEE: { fr: 'Commandée', en: 'Ordered', ar: 'تم الطلب' },
  LIVREE: { fr: 'Livrée', en: 'Delivered', ar: 'تم التسليم' },
  EN_ATTENTE_SIGNATURE_CHEF: {
    fr: 'En attente de signature du chef',
    en: 'Awaiting lab head signature',
    ar: 'في انتظار توقيع رئيس المخبر',
  },
  SIGNEE: { fr: 'Signée', en: 'Signed', ar: 'موقعة' },
  TRANSMISE_ADMINISTRATION: {
    fr: "Transmise à l'administration",
    en: 'Sent to administration',
    ar: 'تمت الإحالة إلى الإدارة',
  },
  ANNULEE: { fr: 'Annulée', en: 'Cancelled', ar: 'ملغاة' },
};

const queueCardLabel: LocalizedText = {
  fr: 'En revue',
  en: 'Under review',
  ar: 'قيد المراجعة',
};

const queueCardMeta: LocalizedText = {
  fr: 'PDF prêts pour décision',
  en: 'PDFs ready for decision',
  ar: 'ملفات PDF جاهزة للقرار',
};

const draftsCardLabel: LocalizedText = {
  fr: 'Brouillons',
  en: 'Drafts',
  ar: 'المسودات',
};

const draftsCardMeta: LocalizedText = {
  fr: 'Demandes encore modifiables',
  en: 'Requests still editable',
  ar: 'طلبات ما زالت قابلة للتعديل',
};

const acceptedCardLabel: LocalizedText = {
  fr: 'Acceptées',
  en: 'Accepted',
  ar: 'المقبولة',
};

const acceptedCardMeta: LocalizedText = {
  fr: 'Historique validé',
  en: 'Validated history',
  ar: 'سجل تمت المصادقة عليه',
};

const rejectedCardLabel: LocalizedText = {
  fr: 'Refusées',
  en: 'Rejected',
  ar: 'المرفوضة',
};

const rejectedCardMeta: LocalizedText = {
  fr: 'Demandes conservées en historique',
  en: 'Requests kept in history',
  ar: 'طلبات محفوظة في السجل',
};

const totalCardLabel: LocalizedText = {
  fr: 'Montant cumulé',
  en: 'Cumulative amount',
  ar: 'المبلغ التراكمي',
};

const totalCardMeta: LocalizedText = {
  fr: 'Somme des demandes visibles',
  en: 'Sum of visible requests',
  ar: 'مجموع الطلبات الظاهرة',
};

const loadErrorMessage: LocalizedText = {
  fr: 'Chargement impossible pour le moment.',
  en: 'Unable to load data right now.',
  ar: 'تعذر تحميل البيانات حالياً.',
};

const saveErrorMessage: LocalizedText = {
  fr: 'Enregistrement impossible pour le moment.',
  en: 'Unable to save right now.',
  ar: 'تعذر الحفظ حالياً.',
};

const generateErrorMessage: LocalizedText = {
  fr: 'La génération du PDF a échoué.',
  en: 'PDF generation failed.',
  ar: 'فشل توليد ملف PDF.',
};

const decisionErrorMessage: LocalizedText = {
  fr: 'La décision n’a pas pu être enregistrée.',
  en: 'The decision could not be recorded.',
  ar: 'تعذر تسجيل القرار.',
};

@Component({
  selector: 'app-purchases-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="app-page-header gap-4">
        <div>
          <h2 class="app-page-title">{{ site.localize(pageTitle) }}</h2>
          <p class="app-page-description">{{ site.localize(pageDescription) }}</p>
        </div>

        @if (canCreateRequest()) {
          <button type="button" class="btn-primary" (click)="newRequest()">
            <lucide-icon [img]="icons.Plus" class="h-4 w-4"></lucide-icon>
            <span>{{ site.localize(newRequestLabel) }}</span>
          </button>
        }
      </div>

      <section class="app-kpi-grid">
        @for (card of summaryCards(); track card.label) {
          <article class="app-kpi-card">
            <p class="app-kpi-card__label">{{ card.label }}</p>
            <p class="app-kpi-card__value">{{ card.value }}</p>
            <p class="app-kpi-card__meta">{{ card.meta }}</p>
          </article>
        }
      </section>

      <div class="space-y-6">
        <section class="surface-card space-y-4 p-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="max-w-3xl">
              <h3 class="text-lg font-semibold text-foreground">{{ site.localize(workspaceTitle) }}</h3>
              <p class="mt-1 text-sm text-muted-foreground">{{ site.localize(workspaceDescription) }}</p>
            </div>
          </div>

          @if (!isLabHead()) {
            <div class="rounded-3xl border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
              {{ site.localize(memberHelperMessage) }}
            </div>
          }

          <div class="relative">
            <lucide-icon
              [img]="icons.Search"
              class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            ></lucide-icon>
            <input
              class="input-shell pl-11"
              [placeholder]="site.localize(searchPlaceholder)"
              [ngModel]="search()"
              (ngModelChange)="search.set($event)"
            />
          </div>
        </section>

        @if (isLabHead()) {
          <section class="surface-card space-y-5 p-6">
            <div class="rounded-3xl border border-sky-200 bg-sky-50/85 px-5 py-5 text-sm text-sky-950 shadow-sm">
              <div class="text-sm font-semibold tracking-[0.01em]">{{ site.localize(reviewQueueTitle) }}</div>
              <p class="mt-2 max-w-4xl leading-6 text-sky-800">{{ site.localize(labHeadHelperMessage) }}</p>
            </div>

            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-foreground">{{ site.localize(reviewQueueTitle) }}</h3>
                <p class="text-sm text-muted-foreground">{{ site.localize(reviewQueueSubtitle) }}</p>
              </div>
              <span class="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {{ pendingRequests().length }}
              </span>
            </div>

            <div class="space-y-3">
              @for (request of pendingRequests(); track request.id) {
                <article
                  class="rounded-3xl border p-4 transition"
                  [class.border-primary]="selectedRequestId() === request.id"
                  [class.bg-primary/5]="selectedRequestId() === request.id"
                  [class.border-border]="selectedRequestId() !== request.id"
                  [class.bg-card]="selectedRequestId() !== request.id"
                >
                  <button type="button" class="w-full text-left" (click)="selectRequest(request)">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div class="space-y-1">
                        <div class="text-base font-semibold text-foreground">{{ requestRequesterName(request) }}</div>
                        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>{{ site.localize(dateLabel) }}: {{ displayDate(request.dateDemande || request.creeLe) }}</span>
                          <span>{{ site.localize(categoryLabel) }}: {{ requestRubriqueLabel(request) }}</span>
                        </div>
                      </div>

                      <span [class]="statusBadgeClass(request.statut)">
                        {{ purchaseStatusLabel(request.statut) }}
                      </span>
                    </div>

                    <div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <div class="rounded-2xl bg-muted/50 px-3 py-2 text-sm text-foreground">
                        {{ site.localize(requesterLabel) }}:
                        <strong>{{ requestRequesterName(request) }}</strong>
                      </div>
                      <div class="rounded-2xl bg-muted/50 px-3 py-2 text-sm text-foreground">
                        {{ site.localize(totalLabel) }}:
                        <strong>{{ formatCurrency(requestAmount(request)) }}</strong>
                      </div>
                      <div class="rounded-2xl bg-muted/50 px-3 py-2 text-sm text-foreground">
                        {{ site.localize(categoryLabel) }}:
                        <strong>{{ requestRubriqueLabel(request) }}</strong>
                      </div>
                      <div class="rounded-2xl bg-muted/50 px-3 py-2 text-sm text-foreground">
                        {{ site.localize(attachmentsCountLabel) }}:
                        <strong>{{ requestAttachmentCount(request) }}</strong>
                      </div>
                    </div>

                    <p class="mt-3 text-sm leading-6 text-muted-foreground">{{ helperMessageFor(request) }}</p>
                  </button>

                  @if (selectedRequestId() === request.id) {
                    <div class="mt-4 space-y-4 border-t border-border pt-4">
                      <div class="flex flex-wrap gap-2">
                        @if (request.pdfGenere?.disponible) {
                          <button type="button" class="btn-outline" (click)="previewGeneratedPdf(request)">
                            <lucide-icon [img]="icons.FileSearch" class="h-4 w-4"></lucide-icon>
                            <span>{{ site.localize(previewPdfLabel) }}</span>
                          </button>
                          <button type="button" class="btn-outline" (click)="downloadGeneratedPdf(request)">
                            <lucide-icon [img]="icons.FileText" class="h-4 w-4"></lucide-icon>
                            <span>{{ site.localize(downloadPdfLabel) }}</span>
                          </button>
                        }
                      </div>

                      @if (request.piecesJointes?.length) {
                        <div class="flex flex-wrap gap-2">
                          @for (attachment of request.piecesJointes!; track attachment.id) {
                            <button type="button" class="btn-outline !px-3 !py-2 text-xs" (click)="downloadAttachment(request, attachment.id)">
                              <lucide-icon [img]="icons.Paperclip" class="h-3.5 w-3.5"></lucide-icon>
                              <span>{{ attachment.nomFichier }}</span>
                            </button>
                          }
                        </div>
                      }

                      <div class="rounded-3xl border border-amber-200 bg-amber-50/80 p-4">
                        <label class="mb-2 block text-sm font-medium text-amber-950">{{ site.localize(reviewCommentLabel) }}</label>
                        <textarea
                          class="textarea-shell min-h-[108px] bg-white"
                          [ngModel]="reviewComment()"
                          (ngModelChange)="reviewComment.set($event)"
                          [placeholder]="site.localize(reviewCommentPlaceholder)"
                        ></textarea>

                        <div class="mt-4 flex flex-wrap gap-2">
                          <button type="button" class="btn-primary" (click)="decide(request.id, 'ACCEPTER')">
                            {{ site.localize(acceptLabel) }}
                          </button>
                          <button type="button" class="btn-outline" (click)="decide(request.id, 'REJETER')">
                            {{ site.localize(rejectLabel) }}
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </article>
              } @empty {
                <div class="empty-state">{{ site.localize(emptyPendingState) }}</div>
              }
            </div>
          </section>

          <section class="surface-card space-y-5 p-6">
            <div>
              <h3 class="text-lg font-semibold text-foreground">{{ site.localize(historyTitle) }}</h3>
              <p class="text-sm text-muted-foreground">{{ site.localize(historySubtitle) }}</p>
            </div>

            <div class="space-y-3">
              @for (request of historyRequests(); track request.id) {
                <article
                  class="rounded-3xl border p-4 transition"
                  [class.border-primary]="selectedRequestId() === request.id"
                  [class.bg-primary/5]="selectedRequestId() === request.id"
                  [class.border-border]="selectedRequestId() !== request.id"
                  [class.bg-card]="selectedRequestId() !== request.id"
                >
                  <button type="button" class="w-full text-left" (click)="selectRequest(request)">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div class="space-y-1">
                        <div class="text-base font-semibold text-foreground">{{ requestRequesterName(request) }}</div>
                        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>{{ site.localize(dateLabel) }}: {{ displayDate(request.dateDemande || request.creeLe) }}</span>
                          <span>{{ site.localize(categoryLabel) }}: {{ requestRubriqueLabel(request) }}</span>
                        </div>
                      </div>
                      <span [class]="statusBadgeClass(request.statut)">{{ purchaseStatusLabel(request.statut) }}</span>
                    </div>

                    <div class="mt-3 grid gap-2 sm:grid-cols-2">
                      <div class="rounded-2xl bg-muted/50 px-3 py-2 text-sm text-foreground">
                        {{ site.localize(totalLabel) }}:
                        <strong>{{ formatCurrency(requestAmount(request)) }}</strong>
                      </div>
                      <div class="rounded-2xl bg-muted/50 px-3 py-2 text-sm text-foreground">
                        {{ site.localize(attachmentsCountLabel) }}:
                        <strong>{{ requestAttachmentCount(request) }}</strong>
                      </div>
                    </div>

                    <p class="mt-3 text-sm text-muted-foreground">{{ helperMessageFor(request) }}</p>
                  </button>

                  @if (selectedRequestId() === request.id) {
                    <div class="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                      @if (request.pdfGenere?.disponible) {
                        <button type="button" class="btn-outline" (click)="previewGeneratedPdf(request)">
                          <lucide-icon [img]="icons.FileSearch" class="h-4 w-4"></lucide-icon>
                          <span>{{ site.localize(previewPdfLabel) }}</span>
                        </button>
                        <button type="button" class="btn-outline" (click)="downloadGeneratedPdf(request)">
                          <lucide-icon [img]="icons.FileText" class="h-4 w-4"></lucide-icon>
                          <span>{{ site.localize(downloadPdfLabel) }}</span>
                        </button>
                      }

                      @for (attachment of request.piecesJointes || []; track attachment.id) {
                        <button type="button" class="btn-outline !px-3 !py-2 text-xs" (click)="downloadAttachment(request, attachment.id)">
                          <lucide-icon [img]="icons.Paperclip" class="h-3.5 w-3.5"></lucide-icon>
                          <span>{{ attachment.nomFichier }}</span>
                        </button>
                      }
                    </div>
                  }
                </article>
              } @empty {
                <div class="empty-state">{{ site.localize(emptyHistoryState) }}</div>
              }
            </div>
          </section>
        } @else {
          <section class="surface-card space-y-5 p-6">
            <div>
              <h3 class="text-lg font-semibold text-foreground">{{ site.localize(myRequestsTitle) }}</h3>
              <p class="text-sm text-muted-foreground">{{ site.localize(myRequestsSubtitle) }}</p>
            </div>

            <div class="space-y-3">
              @for (request of filteredRequests(); track request.id) {
                <article
                  class="rounded-3xl border p-4 transition"
                  [class.border-primary]="selectedRequestId() === request.id"
                  [class.bg-primary/5]="selectedRequestId() === request.id"
                  [class.border-border]="selectedRequestId() !== request.id"
                  [class.bg-card]="selectedRequestId() !== request.id"
                >
                  <button type="button" class="w-full text-left" (click)="selectRequest(request)">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div class="space-y-1">
                        <div class="text-base font-semibold text-foreground">{{ requestTitle(request) }}</div>
                        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>{{ site.localize(dateLabel) }}: {{ displayDate(request.dateDemande || request.creeLe) }}</span>
                          <span>{{ site.localize(categoryLabel) }}: {{ requestRubriqueLabel(request) }}</span>
                        </div>
                      </div>
                      <span [class]="statusBadgeClass(request.statut)">{{ purchaseStatusLabel(request.statut) }}</span>
                    </div>

                    <div class="mt-3 grid gap-2 sm:grid-cols-2">
                      <div class="rounded-2xl bg-muted/50 px-3 py-2 text-sm text-foreground">
                        {{ site.localize(totalLabel) }}:
                        <strong>{{ formatCurrency(requestAmount(request)) }}</strong>
                      </div>
                      <div class="rounded-2xl bg-muted/50 px-3 py-2 text-sm text-foreground">
                        {{ site.localize(attachmentsCountLabel) }}:
                        <strong>{{ requestAttachmentCount(request) }}</strong>
                      </div>
                    </div>

                    <p class="mt-3 text-sm text-muted-foreground">{{ helperMessageFor(request) }}</p>
                  </button>

                  @if (selectedRequestId() === request.id) {
                    <div class="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                      @if (canEditRequest(request)) {
                        <button type="button" class="btn-secondary" (click)="openRequestForm(request)">
                          <span>{{ site.localize(editRequestLabel) }}</span>
                        </button>
                      }

                      @if (request.pdfGenere?.disponible) {
                        <button type="button" class="btn-outline" (click)="previewGeneratedPdf(request)">
                          <lucide-icon [img]="icons.FileSearch" class="h-4 w-4"></lucide-icon>
                          <span>{{ site.localize(previewPdfLabel) }}</span>
                        </button>
                        <button type="button" class="btn-outline" (click)="downloadGeneratedPdf(request)">
                          <lucide-icon [img]="icons.FileText" class="h-4 w-4"></lucide-icon>
                          <span>{{ site.localize(downloadPdfLabel) }}</span>
                        </button>
                      }

                      @for (attachment of request.piecesJointes || []; track attachment.id) {
                        <button type="button" class="btn-outline !px-3 !py-2 text-xs" (click)="downloadAttachment(request, attachment.id)">
                          <lucide-icon [img]="icons.Paperclip" class="h-3.5 w-3.5"></lucide-icon>
                          <span>{{ attachment.nomFichier }}</span>
                        </button>
                      }
                    </div>
                  }
                </article>
              } @empty {
                <div class="empty-state">
                  <div>{{ site.localize(emptyRequestsState) }}</div>
                  @if (canCreateRequest()) {
                    <button type="button" class="btn-primary mt-4" (click)="newRequest()">
                      {{ site.localize(createExpressionLabel) }}
                    </button>
                  }
                </div>
              }
            </div>
          </section>
        }
      </div>

      @if (isFormDialogOpen()) {
        <div class="fixed inset-0 z-[80]">
          <button
            type="button"
            class="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            [attr.aria-label]="site.localize(closeDrawerLabel)"
            (click)="closeFormDialog()"
          ></button>

          <div class="absolute inset-0 flex items-center justify-center p-3 sm:p-5 lg:p-8">
            <section class="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-[1040px] flex-col overflow-hidden rounded-[30px] border border-border bg-background shadow-2xl sm:max-h-[calc(100vh-2.5rem)]">
              <div class="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                <div class="max-w-2xl">
                  <h3 class="text-xl font-semibold text-foreground">{{ formDrawerTitle() }}</h3>
                  <p class="mt-1 text-sm text-muted-foreground">{{ formDrawerDescription() }}</p>
                </div>

                <button type="button" class="btn-outline !h-10 !w-10 !rounded-full !px-0" (click)="closeFormDialog()">
                  <lucide-icon [img]="icons.X" class="h-4 w-4"></lucide-icon>
                </button>
              </div>

              <div class="flex-1 overflow-y-auto px-6 py-6">
                @if (isReadOnlyView()) {
                  <div class="mb-4 rounded-3xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
                    {{ readOnlyHelperText() }}
                  </div>
                }

                @if (statusMessage()) {
                  <div class="mb-4 rounded-3xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {{ statusMessage() }}
                  </div>
                }

                @if (errorMessage()) {
                  <div class="mb-4 rounded-3xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {{ errorMessage() }}
                  </div>
                }

                <fieldset class="space-y-4" [disabled]="isReadOnlyView()">
                  <section class="rounded-3xl border border-border bg-card/80 p-5">
                    <div class="mb-4 flex items-center justify-between gap-3">
                      <h4 class="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{{ site.localize(requesterSectionTitle) }}</h4>
                      <span class="text-xs text-muted-foreground">{{ form.demandeurPrenom }} {{ form.demandeurNom }}</span>
                    </div>

                    <div class="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label class="mb-2 block text-sm font-medium text-foreground">{{ site.localize(lastNameLabel) }}</label>
                        <input class="input-shell" [(ngModel)]="form.demandeurNom" [placeholder]="site.localize(lastNamePlaceholder)" />
                      </div>

                      <div>
                        <label class="mb-2 block text-sm font-medium text-foreground">{{ site.localize(firstNameLabel) }}</label>
                        <input class="input-shell" [(ngModel)]="form.demandeurPrenom" [placeholder]="site.localize(firstNamePlaceholder)" />
                      </div>
                    </div>

                    <div class="mt-3">
                      <label class="mb-2 block text-sm font-medium text-foreground">{{ site.localize(directionLabel) }}</label>
                      <input class="input-shell" [(ngModel)]="form.directionServiceLabo" [placeholder]="site.localize(directionPlaceholder)" />
                    </div>
                  </section>

                  <section class="rounded-3xl border border-border bg-card/80 p-5">
                    <h4 class="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{{ site.localize(generalInfoSectionTitle) }}</h4>

                    <div class="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label class="mb-2 block text-sm font-medium text-foreground">{{ site.localize(dateLabel) }}</label>
                        <input type="date" class="input-shell" [(ngModel)]="form.dateDemande" />
                      </div>

                      <div>
                        <label class="mb-2 block text-sm font-medium text-foreground">{{ site.localize(categoryLabel) }}</label>
                        <select class="select-shell" [(ngModel)]="form.rubriqueBudgetaire">
                          <option value="">{{ site.localize(categoryPlaceholder) }}</option>
                          @for (option of rubriqueOptions; track option.value) {
                            <option [value]="option.value">{{ site.localize(option.label) }}</option>
                          }
                        </select>
                      </div>
                    </div>

                    <div class="mt-3">
                      <label class="mb-2 block text-sm font-medium text-foreground">{{ site.localize(justificationLabel) }}</label>
                      <textarea
                        class="textarea-shell min-h-[150px]"
                        [(ngModel)]="form.justificationBesoin"
                        [placeholder]="site.localize(justificationPlaceholder)"
                      ></textarea>
                    </div>
                  </section>

                  <section class="rounded-3xl border border-border bg-card/80 p-5">
                    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 class="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{{ site.localize(itemsSectionTitle) }}</h4>
                        <p class="mt-1 text-sm text-muted-foreground">{{ site.localize(itemsSectionSubtitle) }}</p>
                      </div>

                      <button type="button" class="btn-outline" (click)="addLine()">
                        <lucide-icon [img]="icons.Plus" class="h-4 w-4"></lucide-icon>
                        <span>{{ site.localize(addLineLabel) }}</span>
                      </button>
                    </div>

                    <div class="space-y-3">
                      @for (line of form.lignes; track $index) {
                        <div class="rounded-3xl border border-border bg-background/70 p-4">
                          <div class="grid gap-3 lg:grid-cols-[1.7fr_0.55fr_0.8fr_0.8fr_auto]">
                            <div>
                              <label class="mb-2 block text-sm font-medium text-foreground">{{ site.localize(itemNameLabel) }}</label>
                              <input class="input-shell" [(ngModel)]="line.articleService" [placeholder]="site.localize(itemNamePlaceholder)" />
                            </div>

                            <div>
                              <label class="mb-2 block text-sm font-medium text-foreground">{{ site.localize(quantityLabel) }}</label>
                              <input
                                type="number"
                                min="1"
                                class="input-shell"
                                [(ngModel)]="line.quantite"
                                (ngModelChange)="recomputeLine(line)"
                              />
                            </div>

                            <div>
                              <label class="mb-2 block text-sm font-medium text-foreground">{{ site.localize(unitPriceLabel) }}</label>
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                class="input-shell"
                                [(ngModel)]="line.prixUnitaireTtc"
                                (ngModelChange)="recomputeLine(line)"
                              />
                            </div>

                            <div>
                              <label class="mb-2 block text-sm font-medium text-foreground">{{ site.localize(lineTotalLabel) }}</label>
                              <input class="input-shell" [ngModel]="formatNumber(line.totalLigne)" readonly />
                            </div>

                            <div class="flex items-end">
                              <button type="button" class="btn-outline w-full" (click)="removeLine($index)">
                                {{ site.localize(removeLineLabel) }}
                              </button>
                            </div>
                          </div>
                        </div>
                      }
                    </div>

                    <div class="mt-4 rounded-3xl bg-slate-900 px-4 py-3 text-sm text-white">
                      {{ site.localize(totalLabel) }}:
                      <strong>{{ formatCurrency(totalGeneral()) }}</strong>
                    </div>
                  </section>

                  <section class="rounded-3xl border border-border bg-card/80 p-5">
                    <h4 class="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{{ site.localize(attachmentsSectionTitle) }}</h4>
                    <p class="mb-4 text-sm text-muted-foreground">{{ site.localize(attachmentsHint) }}</p>

                    <div class="grid gap-2 sm:grid-cols-3">
                      @for (type of attachmentTypeOptions; track type.value) {
                        <label class="flex items-center gap-2 rounded-2xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
                          <input
                            type="checkbox"
                            [checked]="isAttachmentTypeChecked(type.value)"
                            (change)="toggleAttachmentType(type.value, $event)"
                          />
                          <span>{{ site.localize(type.label) }}</span>
                        </label>
                      }
                    </div>

                    @if (isAttachmentTypeChecked('AUTRES')) {
                      <div class="mt-3">
                        <label class="mb-2 block text-sm font-medium text-foreground">{{ site.localize(otherAttachmentLabel) }}</label>
                        <input class="input-shell" [(ngModel)]="form.autrePieceJointe" [placeholder]="site.localize(otherAttachmentPlaceholder)" />
                      </div>
                    }

                    <div class="mt-4">
                      <label class="mb-2 block text-sm font-medium text-foreground">{{ site.localize(uploadLabel) }}</label>
                      <input type="file" class="input-shell" multiple (change)="onAttachmentsSelected($event)" />
                    </div>

                    <div class="mt-4 rounded-2xl bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
                      {{ site.localize(attachmentsCountLabel) }}: <strong>{{ effectiveAttachmentCount() }}</strong>
                    </div>

                    @if (selectedFiles().length) {
                      <div class="mt-3 flex flex-wrap gap-2">
                        @for (file of selectedFiles(); track file.name + file.size) {
                          <span class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            <lucide-icon [img]="icons.Paperclip" class="h-3.5 w-3.5"></lucide-icon>
                            {{ file.name }}
                          </span>
                        }
                      </div>
                    }
                  </section>
                </fieldset>

                @if (currentRequest()?.piecesJointes?.length) {
                  <div class="mt-4 rounded-3xl border border-border bg-card/80 p-5">
                    <div class="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{{ site.localize(attachmentsSectionTitle) }}</div>

                    <div class="flex flex-wrap gap-2">
                      @for (attachment of currentRequest()!.piecesJointes!; track attachment.id) {
                        <button type="button" class="btn-outline !px-3 !py-2 text-xs" (click)="downloadAttachment(currentRequest()!, attachment.id)">
                          <lucide-icon [img]="icons.Paperclip" class="h-3.5 w-3.5"></lucide-icon>
                          <span>{{ attachment.nomFichier }}</span>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>

              <div class="border-t border-border bg-background/95 px-6 py-5 backdrop-blur">
                <div class="flex flex-wrap gap-2">
                  @if (!isReadOnlyView()) {
                    <button type="button" class="btn-secondary" (click)="saveDraft()">
                      {{ selectedRequestId() ? site.localize(updateDraftLabel) : site.localize(saveDraftLabel) }}
                    </button>
                    <button type="button" class="btn-primary" (click)="generatePdf()">
                      {{ site.localize(generateLabel) }}
                    </button>
                  }

                  @if (currentRequest()?.pdfGenere?.disponible) {
                    <button type="button" class="btn-outline" (click)="previewGeneratedPdf(currentRequest()!)">
                      <lucide-icon [img]="icons.FileSearch" class="h-4 w-4"></lucide-icon>
                      <span>{{ site.localize(previewPdfLabel) }}</span>
                    </button>
                    <button type="button" class="btn-outline" (click)="downloadGeneratedPdf(currentRequest()!)">
                      <lucide-icon [img]="icons.FileText" class="h-4 w-4"></lucide-icon>
                      <span>{{ site.localize(downloadPdfLabel) }}</span>
                    </button>
                  }
                </div>
              </div>
            </section>
          </div>
        </div>
      }

      @if (statusMessage()) {
        <div class="rounded-3xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {{ statusMessage() }}
        </div>
      }
      @if (errorMessage()) {
        <div class="rounded-3xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ errorMessage() }}
        </div>
      }
    </div>
  `,
})
export class PurchasesPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly route = inject(ActivatedRoute);
  readonly destroyRef = inject(DestroyRef);
  readonly icons = sharedIcons;

  readonly requests = signal<PurchaseRequest[]>([]);
  readonly search = signal('');
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly selectedFiles = signal<File[]>([]);
  readonly selectedRequestId = signal<number | null>(null);
  readonly routeRequestId = signal<number | null>(null);
  readonly reviewComment = signal('');
  readonly existingAttachments = signal<PurchaseRequest['piecesJointes']>([]);
  readonly isFormDialogOpen = signal(false);

  readonly role = computed(() => this.auth.session()?.utilisateur.role || 'MEMBRE');
  readonly isLabHead = computed(() => this.role() === 'CHEF_LABO');
  readonly canCreateRequest = computed(() => ['MEMBRE', 'CHEF_LABO'].includes(this.role()));
  readonly currentRequest = computed(
    () => this.requests().find((item) => item.id === this.selectedRequestId()) || null,
  );
  readonly filteredRequests = computed(() => {
    const query = this.search().trim().toLowerCase();
    const requests = this.requests();
    if (!query) {
      return requests;
    }

    return requests.filter((request) =>
      [
        this.requestTitle(request),
        requestRequesterNameValue(request),
        request.justificationBesoin || request.description || '',
        requestRubriqueValue(request),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  });
  readonly pendingRequests = computed(() =>
    this.filteredRequests().filter((request) => PENDING_REVIEW_STATUSES.has(request.statut)),
  );
  readonly historyRequests = computed(() =>
    this.filteredRequests().filter((request) => HISTORY_STATUSES.has(request.statut)),
  );
  readonly isReadOnlyView = computed(() => {
    const request = this.currentRequest();
    if (!request) {
      return false;
    }

    const isOwner = request.creePar?.id === this.auth.session()?.utilisateur.id;
    return !(isOwner && EDITABLE_STATUSES.has(request.statut));
  });
  readonly showReviewActions = computed(() => {
    const request = this.currentRequest();
    return Boolean(this.isLabHead() && request && PENDING_REVIEW_STATUSES.has(request.statut));
  });
  readonly showReadOnlyHelper = computed(() => Boolean(this.currentRequest() && this.isReadOnlyView()));
  readonly summaryCards = computed(() => {
    const requests = this.requests();
    const draftCount = requests.filter((item) => item.statut === 'BROUILLON').length;
    const pendingCount = requests.filter((item) => PENDING_REVIEW_STATUSES.has(item.statut)).length;
    const acceptedCount = requests.filter((item) => item.statut === 'ACCEPTEE').length;
    const rejectedCount = requests.filter((item) => item.statut === 'REJETEE').length;
    const totalAmount = requests.reduce((sum, item) => sum + requestAmountValue(item), 0);

    return [
      {
        label: this.site.localize(this.isLabHead() ? queueCardLabel : draftsCardLabel),
        value: this.isLabHead() ? pendingCount : draftCount,
        meta: this.site.localize(this.isLabHead() ? queueCardMeta : draftsCardMeta),
      },
      {
        label: this.site.localize(acceptedCardLabel),
        value: acceptedCount,
        meta: this.site.localize(acceptedCardMeta),
      },
      {
        label: this.site.localize(rejectedCardLabel),
        value: rejectedCount,
        meta: this.site.localize(rejectedCardMeta),
      },
      {
        label: this.site.localize(totalCardLabel),
        value: this.formatCurrency(totalAmount),
        meta: this.site.localize(totalCardMeta),
      },
    ];
  });

  readonly pageTitle = {
    fr: 'Demandes d’achat / Expression de besoins',
    en: 'Purchase requests / Needs expression',
    ar: 'طلبات الشراء / التعبير عن الحاجيات',
  };
  readonly pageDescription = {
    fr: 'Formulaire premium LR16-CNSTN-02 avec génération PDF, revue chef de labo et historique conservé.',
    en: 'Premium LR16-CNSTN-02 form with PDF generation, lab-head review, and preserved history.',
    ar: 'نموذج LR16-CNSTN-02 متميز مع توليد PDF ومراجعة رئيس المخبر وحفظ كامل للسجل.',
  };
  readonly newRequestLabel = {
    fr: 'Nouvelle demande',
    en: 'New request',
    ar: 'طلب جديد',
  };
  readonly workspaceTitle = {
    fr: 'Tableau de bord des demandes',
    en: 'Requests workspace',
    ar: 'مساحة عمل الطلبات',
  };
  readonly workspaceDescription = {
    fr: 'Consultez la liste, la file de revue et l\'historique, puis ouvrez le formulaire uniquement lorsque vous souhaitez créer ou modifier une demande.',
    en: 'Review the list, the approval queue, and the history, then open the form only when you want to create or edit a request.',
    ar: 'استعرض القائمة وطابور المراجعة والسجل، ثم افتح الاستمارة فقط عندما تريد إنشاء طلب أو تعديله.',
  };
  readonly createExpressionLabel = {
    fr: 'Créer une expression de besoins',
    en: 'Create a needs expression',
    ar: 'إنشاء تعبير عن الحاجيات',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher une demande, un membre ou une rubrique...',
    en: 'Search a request, member, or budget category...',
    ar: 'ابحث عن طلب أو عضو أو بند ميزانية...',
  };
  readonly memberHelperMessage = {
    fr: 'Retrouvez ici vos demandes, leur statut, le PDF généré et l\'historique des décisions sans afficher le formulaire en permanence.',
    en: 'Find your requests, their status, the generated PDF, and the decision history here without keeping the form permanently visible.',
    ar: 'اعثر هنا على طلباتك وحالتها وملف PDF المولد وسجل القرارات من دون إبقاء الاستمارة ظاهرة بشكل دائم.',
  };
  readonly reviewQueueTitle = {
    fr: 'Table de revue du chef de labo',
    en: 'Lab head review queue',
    ar: 'جدول مراجعة رئيس المخبر',
  };
  readonly reviewQueueSubtitle = {
    fr: 'Demandes générées électroniquement et prêtes à être revues puis signées.',
    en: 'Requests generated electronically and ready to be reviewed then signed.',
    ar: 'طلبات أُنجزت إلكترونياً وأصبحت جاهزة للمراجعة ثم التوقيع.',
  };
  readonly labHeadHelperMessage = {
    fr: 'Cette demande a été remplie électroniquement par le membre. Le PDF est prêt. Merci de le relire, de le signer hors plateforme si nécessaire, puis de la marquer Acceptée ou Refusée.',
    en: 'This request was filled in electronically by the member. The PDF is ready. Please review it, sign it offline if needed, then mark it as Accepted or Rejected.',
    ar: 'تم ملء هذا الطلب إلكترونياً من قبل العضو، والملف PDF جاهز. يرجى مراجعته وتوقيعه خارج المنصة عند الحاجة ثم تحديده كمقبول أو مرفوض.',
  };
  readonly historyTitle = {
    fr: 'Historique',
    en: 'History',
    ar: 'السجل',
  };
  readonly historySubtitle = {
    fr: 'Les décisions restent visibles pour le chef de labo et pour le membre.',
    en: 'Decisions remain visible for both the lab head and the member.',
    ar: 'تظل القرارات مرئية لكل من رئيس المخبر والعضو.',
  };
  readonly myRequestsTitle = {
    fr: 'Mes demandes',
    en: 'My requests',
    ar: 'طلباتي',
  };
  readonly myRequestsSubtitle = {
    fr: 'Historique complet de vos expressions de besoins et de leurs statuts.',
    en: 'Complete history of your needs expressions and their statuses.',
    ar: 'السجل الكامل لتعبيرات الحاجيات الخاصة بك وحالاتها.',
  };
  readonly requesterSectionTitle = {
    fr: 'Demandeur',
    en: 'Requester',
    ar: 'صاحب الطلب',
  };
  readonly generalInfoSectionTitle = {
    fr: 'Informations générales',
    en: 'General information',
    ar: 'معلومات عامة',
  };
  readonly itemsSectionTitle = {
    fr: 'Articles demandés',
    en: 'Requested items',
    ar: 'العناصر المطلوبة',
  };
  readonly itemsSectionSubtitle = {
    fr: 'Le total de chaque ligne et le total général sont calculés automatiquement.',
    en: 'Each line total and the grand total are calculated automatically.',
    ar: 'يتم احتساب مجموع كل سطر والمجموع العام آلياً.',
  };
  readonly attachmentsSectionTitle = {
    fr: 'Pièces jointes',
    en: 'Attachments',
    ar: 'المرفقات',
  };
  readonly attachmentsHint = {
    fr: 'Les pièces jointes sont optionnelles. Vous pouvez générer la demande même sans fichier.',
    en: 'Attachments are optional. You can generate the request even without any file.',
    ar: 'المرفقات اختيارية. يمكنك توليد الطلب حتى بدون أي ملف.',
  };
  readonly requesterLabel = {
    fr: 'Demandeur',
    en: 'Requester',
    ar: 'صاحب الطلب',
  };
  readonly dateLabel = { fr: 'Date', en: 'Date', ar: 'التاريخ' };
  readonly categoryLabel = { fr: 'Rubrique', en: 'Category', ar: 'البند' };
  readonly totalLabel = { fr: 'Total général', en: 'Grand total', ar: 'المجموع العام' };
  readonly attachmentsCountLabel = {
    fr: 'Nombre de pièces jointes',
    en: 'Number of attachments',
    ar: 'عدد المرفقات',
  };
  readonly lastNameLabel = { fr: 'Nom', en: 'Last name', ar: 'اللقب' };
  readonly firstNameLabel = { fr: 'Prénom', en: 'First name', ar: 'الاسم' };
  readonly directionLabel = {
    fr: 'Direction / service / labo',
    en: 'Department / service / lab',
    ar: 'الإدارة / المصلحة / المخبر',
  };
  readonly lastNamePlaceholder = {
    fr: 'Nom du demandeur',
    en: 'Requester last name',
    ar: 'لقب صاحب الطلب',
  };
  readonly firstNamePlaceholder = {
    fr: 'Prénom du demandeur',
    en: 'Requester first name',
    ar: 'اسم صاحب الطلب',
  };
  readonly directionPlaceholder = {
    fr: 'Direction, service ou laboratoire',
    en: 'Department, service, or laboratory',
    ar: 'الإدارة أو المصلحة أو المخبر',
  };
  readonly categoryPlaceholder = {
    fr: 'Choisir une rubrique',
    en: 'Select a category',
    ar: 'اختر بنداً',
  };
  readonly justificationLabel = {
    fr: 'Justification du besoin',
    en: 'Need justification',
    ar: 'مبرر الحاجة',
  };
  readonly justificationPlaceholder = {
    fr: 'Décrire brièvement le besoin, le contexte et l’utilité attendue.',
    en: 'Briefly describe the need, context, and expected usefulness.',
    ar: 'اشرح بإيجاز الحاجة والسياق والفائدة المنتظرة.',
  };
  readonly addLineLabel = { fr: 'Ajouter une ligne', en: 'Add line', ar: 'إضافة سطر' };
  readonly removeLineLabel = { fr: 'Retirer', en: 'Remove', ar: 'حذف' };
  readonly itemNameLabel = {
    fr: 'Article ou service',
    en: 'Item or service',
    ar: 'المادة أو الخدمة',
  };
  readonly itemNamePlaceholder = {
    fr: 'Nom de l’article ou du service',
    en: 'Item or service name',
    ar: 'اسم المادة أو الخدمة',
  };
  readonly quantityLabel = { fr: 'Quantité', en: 'Quantity', ar: 'الكمية' };
  readonly unitPriceLabel = {
    fr: 'Prix estimatif TTC unitaire',
    en: 'Estimated unit price incl. tax',
    ar: 'السعر التقديري للوحدة مع الأداءات',
  };
  readonly lineTotalLabel = { fr: 'Total ligne', en: 'Line total', ar: 'مجموع السطر' };
  readonly otherAttachmentLabel = {
    fr: 'Préciser “Autres”',
    en: 'Specify “Other”',
    ar: 'توضيح “أخرى”',
  };
  readonly otherAttachmentPlaceholder = {
    fr: 'Préciser la pièce jointe',
    en: 'Specify the attachment',
    ar: 'حدد نوع المرفق',
  };
  readonly uploadLabel = {
    fr: 'Téléverser des fichiers si nécessaire',
    en: 'Upload files if needed',
    ar: 'ارفع ملفات عند الحاجة',
  };
  readonly saveDraftLabel = {
    fr: 'Enregistrer le brouillon',
    en: 'Save draft',
    ar: 'حفظ المسودة',
  };
  readonly updateDraftLabel = {
    fr: 'Mettre à jour le brouillon',
    en: 'Update draft',
    ar: 'تحديث المسودة',
  };
  readonly editRequestLabel = {
    fr: 'Modifier',
    en: 'Edit',
    ar: 'تعديل',
  };
  readonly generateLabel = {
    fr: 'Valider / Générer',
    en: 'Validate / Generate',
    ar: 'اعتماد / توليد',
  };
  readonly previewPdfLabel = { fr: 'Prévisualiser PDF', en: 'Preview PDF', ar: 'معاينة PDF' };
  readonly downloadPdfLabel = { fr: 'Télécharger PDF', en: 'Download PDF', ar: 'تنزيل PDF' };
  readonly reviewActionsTitle = {
    fr: 'Décision du chef de labo',
    en: 'Lab head decision',
    ar: 'قرار رئيس المخبر',
  };
  readonly reviewActionsSubtitle = {
    fr: 'Après revue du PDF et signature si nécessaire, enregistrez une décision simple sans faire disparaître la demande de l’historique.',
    en: 'After reviewing the PDF and signing if needed, record a simple decision without removing the request from history.',
    ar: 'بعد مراجعة ملف PDF والتوقيع عند الحاجة، سجّل قراراً بسيطاً دون حذف الطلب من السجل.',
  };
  readonly reviewCommentLabel = {
    fr: 'Note de revue',
    en: 'Review note',
    ar: 'ملاحظة المراجعة',
  };
  readonly reviewCommentPlaceholder = {
    fr: 'Commentaire optionnel pour une acceptation, obligatoire pour un refus.',
    en: 'Optional for acceptance, required for rejection.',
    ar: 'اختياري عند القبول وإجباري عند الرفض.',
  };
  readonly acceptLabel = { fr: 'Acceptée', en: 'Accept', ar: 'قبول' };
  readonly rejectLabel = { fr: 'Refusée', en: 'Reject', ar: 'رفض' };
  readonly emptyPendingState = {
    fr: 'Aucune demande en attente de revue pour le moment.',
    en: 'No request is currently awaiting review.',
    ar: 'لا توجد طلبات في انتظار المراجعة حالياً.',
  };
  readonly emptyHistoryState = {
    fr: 'Aucun historique disponible pour le moment.',
    en: 'No history is available yet.',
    ar: 'لا يوجد سجل متاح حالياً.',
  };
  readonly emptyRequestsState = {
    fr: 'Aucune demande d’achat enregistrée pour le moment.',
    en: 'No purchase request recorded yet.',
    ar: 'لا توجد طلبات شراء مسجلة حالياً.',
  };
  readonly closeDrawerLabel = {
    fr: 'Fermer le formulaire',
    en: 'Close form',
    ar: 'إغلاق الاستمارة',
  };

  form: PurchaseFormModel = this.createEmptyForm();
  readonly rubriqueOptions = RUBRIQUE_OPTIONS;
  readonly attachmentTypeOptions = ATTACHMENT_TYPE_OPTIONS;

  ngOnInit() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const requestId = Number(params.get('demandeId') || 0);
        this.routeRequestId.set(Number.isFinite(requestId) && requestId > 0 ? requestId : null);
        this.selectRouteRequestIfPossible();
      });

    void this.loadData();
  }

  createEmptyForm(profileDirection = '', profileLastName = '', profileFirstName = ''): PurchaseFormModel {
    return {
      demandeurNom: profileLastName,
      demandeurPrenom: profileFirstName,
      directionServiceLabo: profileDirection,
      dateDemande: this.todayDate(),
      rubriqueBudgetaire: '',
      justificationBesoin: '',
      lignes: [this.newLine()],
      typesPiecesJointes: [],
      autrePieceJointe: '',
      langueDocument: this.site.language() as DocumentLanguage,
    };
  }

  closeFormDialog() {
    this.isFormDialogOpen.set(false);
    this.errorMessage.set('');
    this.selectedFiles.set([]);

    const request = this.currentRequest();
    if (request) {
      this.populateFormFromRequest(request);
      return;
    }

    const defaults = this.profileDefaults(this.auth.session()?.utilisateur || {});
    this.form = this.createEmptyForm(
      defaults.directionServiceLabo,
      defaults.demandeurNom,
      defaults.demandeurPrenom,
    );
  }

  todayDate() {
    return new Date().toISOString().slice(0, 10);
  }

  newLine(): ExpressionLine {
    return { articleService: '', quantite: 1, prixUnitaireTtc: 0, totalLigne: 0 };
  }

  formDrawerTitle() {
    if (this.currentRequest()) {
      return this.site.localize({
        fr: 'Expression de besoins',
        en: 'Needs expression',
        ar: 'تعبير عن الحاجيات',
      });
    }

    return this.site.localize({
      fr: 'Nouvelle expression de besoins',
      en: 'New needs expression',
      ar: 'تعبير جديد عن الحاجيات',
    });
  }

  formDrawerDescription() {
    const request = this.currentRequest();
    if (request && this.isReadOnlyView()) {
      return this.helperMessageFor(request);
    }

    if (request) {
      return this.site.localize({
        fr: 'Mettez à jour le brouillon dans ce grand panneau, puis enregistrez-le ou générez directement le PDF officiel.',
        en: 'Update the draft in this large panel, then save it or generate the official PDF directly.',
        ar: 'حدّث المسودة داخل هذه اللوحة الواسعة، ثم احفظها أو ولّد ملف PDF الرسمي مباشرة.',
      });
    }

    return this.site.localize({
      fr: 'Remplissez le formulaire ici, puis utilisez Valider / Générer pour lancer immédiatement le workflow avec le PDF officiel.',
      en: 'Complete the form here, then use Validate / Generate to immediately launch the workflow with the official PDF.',
      ar: 'املأ الاستمارة هنا، ثم استخدم اعتماد / توليد لإطلاق سير العمل مباشرة مع ملف PDF الرسمي.',
    });
  }

  canEditRequest(request: PurchaseRequest) {
    const userId = this.auth.session()?.utilisateur.id;
    return Boolean(
      this.canCreateRequest() &&
        request.creePar?.id === userId &&
        EDITABLE_STATUSES.has(request.statut),
    );
  }

  openRequestForm(request: PurchaseRequest) {
    if (!this.canEditRequest(request)) {
      return;
    }

    this.selectRequest(request);
    this.isFormDialogOpen.set(true);
  }

  detailTitle() {
    if (!this.currentRequest()) {
      return this.site.localize({
        fr: 'Nouvelle expression de besoins',
        en: 'New needs expression',
        ar: 'تعبير جديد عن الحاجيات',
      });
    }

    if (this.showReviewActions()) {
      return this.site.localize({
        fr: 'Revue de la demande',
        en: 'Request review',
        ar: 'مراجعة الطلب',
      });
    }

    return this.isReadOnlyView()
      ? this.site.localize({
          fr: 'Détail de la demande',
          en: 'Request detail',
          ar: 'تفاصيل الطلب',
        })
      : this.site.localize({
          fr: 'Édition du brouillon',
          en: 'Draft edition',
          ar: 'تعديل المسودة',
        });
  }

  detailSubtitle() {
    if (!this.currentRequest()) {
      return this.site.localize({
        fr: 'Remplissez le formulaire puis utilisez Valider / Générer pour enregistrer et créer le PDF officiel.',
        en: 'Fill out the form, then use Validate / Generate to save it and create the official PDF.',
        ar: 'املأ النموذج ثم استخدم اعتماد / توليد للحفظ وإنشاء ملف PDF الرسمي.',
      });
    }

    return this.showReviewActions()
      ? this.site.localize(this.labHeadHelperMessage)
      : this.isReadOnlyView()
        ? this.helperMessageFor(this.currentRequest()!)
        : this.site.localize({
            fr: 'Les modifications restent possibles tant que la demande est encore en brouillon ou revenue en refusée.',
            en: 'Changes remain possible while the request is still a draft or returned as rejected.',
            ar: 'تبقى التعديلات ممكنة ما دام الطلب في حالة مسودة أو عاد في حالة مرفوضة.',
          });
  }

  readOnlyHelperText() {
    const request = this.currentRequest();
    if (!request) {
      return '';
    }

    if (this.showReviewActions()) {
      return this.site.localize(this.labHeadHelperMessage);
    }

    return this.helperMessageFor(request);
  }

  requestTitle(request: PurchaseRequest) {
    return request.objet || this.requestRubriqueLabel(request);
  }

  requestRequesterName(request: PurchaseRequest) {
    return requestRequesterNameValue(request);
  }

  requestRubriqueLabel(request: PurchaseRequest) {
    return requestRubriqueLabelValue(request, this.site);
  }

  requestAmount(request: PurchaseRequest) {
    return requestAmountValue(request);
  }

  requestAttachmentCount(request: PurchaseRequest) {
    return request.piecesJointes?.length || request.nombrePiecesJointes || 0;
  }

  formatCurrency(value: number) {
    return new Intl.NumberFormat(this.localeForUi(), {
      style: 'currency',
      currency: 'TND',
      maximumFractionDigits: 3,
    }).format(Number.isFinite(value) ? value : 0);
  }

  formatNumber(value: number) {
    return new Intl.NumberFormat(this.localeForUi(), {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(Number.isFinite(value) ? value : 0);
  }

  displayDate(value?: string | null) {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat(this.localeForUi(), {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(date);
  }

  localeForUi() {
    const language = this.site.language();
    if (language === 'ar') {
      return 'ar-TN';
    }
    if (language === 'en') {
      return 'en-US';
    }
    return 'fr-TN';
  }

  totalGeneral() {
    return this.form.lignes.reduce((sum, line) => sum + (Number(line.totalLigne) || 0), 0);
  }

  effectiveAttachmentCount() {
    return this.selectedFiles().length > 0
      ? this.selectedFiles().length
      : this.existingAttachments()?.length || 0;
  }

  purchaseStatusLabel(status: string) {
    return this.site.localize(STATUS_LABELS[status] || { fr: status, en: status, ar: status });
  }

  statusBadgeClass(status: string) {
    switch (status) {
      case 'BROUILLON':
        return 'inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700';
      case 'PDF_GENERE':
      case 'TELECHARGEE':
      case 'EN_ATTENTE':
        return 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800';
      case 'ACCEPTEE':
      case 'EN_COURS_TRAITEMENT':
      case 'COMMANDEE':
      case 'LIVREE':
      case 'SIGNEE':
      case 'TRANSMISE_ADMINISTRATION':
        return 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800';
      case 'REJETEE':
      case 'ANNULEE':
        return 'inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800';
      default:
        return 'inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground';
    }
  }

  helperMessageFor(request: PurchaseRequest) {
    switch (request.statut) {
      case 'BROUILLON':
        return this.site.localize({
          fr: 'Brouillon enregistré. Vous pouvez encore modifier les lignes et générer le PDF quand vous êtes prêt.',
          en: 'Draft saved. You can still edit the lines and generate the PDF when you are ready.',
          ar: 'تم حفظ المسودة. ما زال بإمكانك تعديل السطور وتوليد ملف PDF عندما تصبح جاهزاً.',
        });
      case 'PDF_GENERE':
      case 'TELECHARGEE':
      case 'EN_ATTENTE':
        return this.site.localize({
          fr: 'Remplie électroniquement et PDF prêt. Le chef de labo doit maintenant relire, signer si nécessaire, puis choisir Acceptée ou Refusée.',
          en: 'Filled electronically and PDF ready. The lab head now needs to review it, sign if required, then choose Accepted or Rejected.',
          ar: 'تم ملؤها إلكترونياً والملف PDF جاهز. على رئيس المخبر الآن مراجعته والتوقيع عند الحاجة ثم اختيار القبول أو الرفض.',
        });
      case 'ACCEPTEE':
        return this.site.localize({
          fr: 'Décision enregistrée. La demande reste visible dans l’historique côté membre et côté chef de labo.',
          en: 'Decision recorded. The request stays visible in history for both the member and the lab head.',
          ar: 'تم تسجيل القرار. يبقى الطلب ظاهراً في السجل لدى العضو ورئيس المخبر.',
        });
      case 'REJETEE':
        return this.site.localize({
          fr: 'Demande refusée mais conservée dans l’historique. Le motif reste consultable pour un éventuel retour.',
          en: 'Request rejected but kept in history. The reason remains available for follow-up.',
          ar: 'تم رفض الطلب لكنه محفوظ في السجل، ويبقى سبب الرفض متاحاً للمتابعة.',
        });
      case 'EN_COURS_TRAITEMENT':
      case 'COMMANDEE':
      case 'LIVREE':
        return this.site.localize({
          fr: 'La demande poursuit son cycle de traitement tout en restant consultable dans l’historique.',
          en: 'The request continues through processing while remaining visible in history.',
          ar: 'يواصل الطلب دورة المعالجة مع بقائه مرئياً في السجل.',
        });
      default:
        return this.site.localize({
          fr: 'La demande reste archivée et consultable avec son PDF et ses informations principales.',
          en: 'The request remains archived and viewable with its PDF and main information.',
          ar: 'يبقى الطلب محفوظاً وقابلاً للعرض مع ملف PDF والمعلومات الأساسية.',
        });
    }
  }

  async loadData() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    try {
      const [requestsResponse, profileResponse] = await Promise.all([
        api.listPurchaseRequests(token, { limit: 100 }),
        api.getProfile(token),
      ]);

      this.requests.set(requestsResponse.elements);
      const defaults = this.profileDefaults(profileResponse.utilisateur);

      if (!this.selectedRequestId()) {
        this.form = this.createEmptyForm(
          defaults.directionServiceLabo,
          defaults.demandeurNom,
          defaults.demandeurPrenom,
        );
      }

      this.selectRouteRequestIfPossible();
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error, loadErrorMessage));
    }
  }

  profileDefaults(utilisateur: {
    nom?: string | null;
    prenom?: string | null;
    profil?: {
      laboratoireDenomination?: string | null;
      equipeRecherche?: { nom?: string | null } | null;
      institutionAffectation?: { nom?: string | null } | null;
    } | null;
  }) {
    const profile = utilisateur.profil;
    return {
      demandeurNom: utilisateur.nom || '',
      demandeurPrenom: utilisateur.prenom || '',
      directionServiceLabo:
        [
          profile?.laboratoireDenomination,
          profile?.equipeRecherche?.nom,
          profile?.institutionAffectation?.nom,
        ]
          .filter(Boolean)
          .join(' / ') || 'LR16-CNSTN-02',
    };
  }

  selectRouteRequestIfPossible() {
    const requestId = this.routeRequestId();
    if (!requestId) {
      return;
    }

    const request = this.requests().find((item) => item.id === requestId);
    if (request) {
      this.selectRequest(request);
    }
  }

  newRequest() {
    const defaults = this.profileDefaults(this.auth.session()?.utilisateur || {});
    this.selectedRequestId.set(null);
    this.selectedFiles.set([]);
    this.existingAttachments.set([]);
    this.reviewComment.set('');
    this.form = this.createEmptyForm(
      defaults.directionServiceLabo,
      defaults.demandeurNom,
      defaults.demandeurPrenom,
    );
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.isFormDialogOpen.set(true);
  }

  selectRequest(request: PurchaseRequest) {
    this.selectedRequestId.set(request.id);
    this.selectedFiles.set([]);
    this.existingAttachments.set(request.piecesJointes || []);
    this.reviewComment.set('');
    this.populateFormFromRequest(request);
    this.errorMessage.set('');
    this.statusMessage.set('');
  }

  populateFormFromRequest(request: PurchaseRequest) {
    this.form = {
      demandeurNom: request.demandeurNom || request.creePar?.nom || '',
      demandeurPrenom: request.demandeurPrenom || request.creePar?.prenom || '',
      directionServiceLabo: request.directionServiceLabo || '',
      dateDemande: request.dateDemande ? String(request.dateDemande).slice(0, 10) : this.todayDate(),
      rubriqueBudgetaire: request.rubriqueBudgetaire || '',
      justificationBesoin: request.justificationBesoin || request.justificationScientifique || '',
      lignes:
        request.lignes && request.lignes.length
          ? request.lignes.map((line) => ({
              articleService: line.articleService,
              quantite: Number(line.quantite || 1),
              prixUnitaireTtc: Number(line.prixUnitaireTtc || 0),
              totalLigne: Number(line.totalLigne || 0),
            }))
          : [this.newLine()],
      typesPiecesJointes: (request.typesPiecesJointes || []).filter(
        (item): item is AttachmentType =>
          item === 'DEVIS' || item === 'SPECIFICATIONS_TECHNIQUES' || item === 'AUTRES',
      ),
      autrePieceJointe: request.autrePieceJointe || '',
      langueDocument: (request.langueDocument || this.site.language()) as DocumentLanguage,
    };
  }

  addLine() {
    this.form.lignes = [...this.form.lignes, this.newLine()];
  }

  removeLine(index: number) {
    if (this.form.lignes.length <= 1) {
      return;
    }
    this.form.lignes = this.form.lignes.filter((_, lineIndex) => lineIndex !== index);
  }

  recomputeLine(line: ExpressionLine) {
    const quantity = Number(line.quantite || 0);
    const price = Number(line.prixUnitaireTtc || 0);
    line.totalLigne = Math.round(quantity * price * 1000) / 1000;
  }

  isAttachmentTypeChecked(type: AttachmentType) {
    return this.form.typesPiecesJointes.includes(type);
  }

  toggleAttachmentType(type: AttachmentType, event: Event) {
    if (this.isReadOnlyView()) {
      return;
    }

    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.form.typesPiecesJointes = [...new Set([...this.form.typesPiecesJointes, type])];
      return;
    }

    this.form.typesPiecesJointes = this.form.typesPiecesJointes.filter((item) => item !== type);
    if (type === 'AUTRES') {
      this.form.autrePieceJointe = '';
    }
  }

  onAttachmentsSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFiles.set(Array.from(input.files || []));
  }

  buildPayload(modeSoumission: 'BROUILLON' | 'FINALISATION' = 'BROUILLON') {
    const payload = new FormData();
    payload.set('modeSoumission', modeSoumission);
    payload.set('demandeurNom', this.form.demandeurNom.trim());
    payload.set('demandeurPrenom', this.form.demandeurPrenom.trim());
    payload.set('directionServiceLabo', this.form.directionServiceLabo.trim());
    payload.set('dateDemande', this.form.dateDemande);
    payload.set('justificationBesoin', this.form.justificationBesoin.trim());
    payload.set('rubriqueBudgetaire', this.form.rubriqueBudgetaire);
    payload.set('langueDocument', this.form.langueDocument);
    payload.set('lignes', JSON.stringify(this.form.lignes));
    payload.set('typesPiecesJointes', JSON.stringify(this.form.typesPiecesJointes));
    if (this.form.autrePieceJointe.trim()) {
      payload.set('autrePieceJointe', this.form.autrePieceJointe.trim());
    }
    for (const file of this.selectedFiles()) {
      payload.append('piecesJointes', file);
    }
    return payload;
  }

  validateDraftForm() {
    if (this.effectiveAttachmentCount() > 0 && this.form.typesPiecesJointes.length === 0) {
      this.errorMessage.set(this.site.localize({
        fr: 'Sélectionnez au moins un type pour les pièces jointes téléversées.',
        en: 'Select at least one type for the uploaded attachments.',
        ar: 'اختر نوعاً واحداً على الأقل للمرفقات المرفوعة.',
      }));
      return false;
    }

    if (this.form.typesPiecesJointes.includes('AUTRES') && !this.form.autrePieceJointe.trim()) {
      this.errorMessage.set(this.site.localize({
        fr: 'Veuillez préciser la nature de la pièce jointe “Autres”.',
        en: 'Please specify the “Other” attachment type.',
        ar: 'يرجى تحديد طبيعة المرفق ضمن “أخرى”.',
      }));
      return false;
    }

    return true;
  }

  validateForm() {
    if (!this.form.demandeurNom.trim()) {
      this.errorMessage.set(this.site.localize({
        fr: 'Le nom du demandeur est obligatoire.',
        en: 'Requester last name is required.',
        ar: 'لقب صاحب الطلب مطلوب.',
      }));
      return false;
    }

    if (!this.form.demandeurPrenom.trim()) {
      this.errorMessage.set(this.site.localize({
        fr: 'Le prénom du demandeur est obligatoire.',
        en: 'Requester first name is required.',
        ar: 'اسم صاحب الطلب مطلوب.',
      }));
      return false;
    }

    if (!this.form.directionServiceLabo.trim()) {
      this.errorMessage.set(this.site.localize({
        fr: 'La direction / service / labo est obligatoire.',
        en: 'Department / service / lab is required.',
        ar: 'الإدارة / المصلحة / المخبر مطلوبة.',
      }));
      return false;
    }

    if (!this.form.rubriqueBudgetaire) {
      this.errorMessage.set(this.site.localize({
        fr: 'Veuillez sélectionner une rubrique budgétaire.',
        en: 'Please select a budget category.',
        ar: 'يرجى اختيار بند ميزانية.',
      }));
      return false;
    }

    if (!this.form.justificationBesoin.trim()) {
      this.errorMessage.set(this.site.localize({
        fr: 'La justification du besoin est obligatoire.',
        en: 'Need justification is required.',
        ar: 'مبرر الحاجة مطلوب.',
      }));
      return false;
    }

    if (!this.form.lignes.length) {
      this.errorMessage.set(this.site.localize({
        fr: 'Ajoutez au moins une ligne article/service.',
        en: 'Add at least one item/service line.',
        ar: 'أضف سطراً واحداً على الأقل للمادة أو الخدمة.',
      }));
      return false;
    }

    for (const line of this.form.lignes) {
      if (!line.articleService.trim()) {
        this.errorMessage.set(this.site.localize({
          fr: 'Chaque ligne doit contenir un article ou un service.',
          en: 'Each line must contain an item or a service.',
          ar: 'يجب أن يحتوي كل سطر على مادة أو خدمة.',
        }));
        return false;
      }
      if (!Number.isFinite(line.quantite) || line.quantite < 1) {
        this.errorMessage.set(this.site.localize({
          fr: 'La quantité doit être supérieure ou égale à 1.',
          en: 'Quantity must be greater than or equal to 1.',
          ar: 'يجب أن تكون الكمية أكبر من أو تساوي 1.',
        }));
        return false;
      }
      if (!Number.isFinite(line.prixUnitaireTtc) || line.prixUnitaireTtc < 0) {
        this.errorMessage.set(this.site.localize({
          fr: 'Le prix estimatif TTC unitaire est invalide.',
          en: 'Estimated unit price incl. tax is invalid.',
          ar: 'السعر التقديري للوحدة مع الأداءات غير صالح.',
        }));
        return false;
      }
    }

    if (this.effectiveAttachmentCount() > 0 && this.form.typesPiecesJointes.length === 0) {
      this.errorMessage.set(this.site.localize({
        fr: 'Sélectionnez au moins un type pour les pièces jointes téléversées.',
        en: 'Select at least one type for the uploaded attachments.',
        ar: 'اختر نوعاً واحداً على الأقل للمرفقات المرفوعة.',
      }));
      return false;
    }

    if (this.form.typesPiecesJointes.includes('AUTRES') && !this.form.autrePieceJointe.trim()) {
      this.errorMessage.set(this.site.localize({
        fr: 'Veuillez préciser la nature de la pièce jointe “Autres”.',
        en: 'Please specify the “Other” attachment type.',
        ar: 'يرجى تحديد طبيعة المرفق ضمن “أخرى”.',
      }));
      return false;
    }

    return true;
  }

  async saveDraft() {
    if (!this.canCreateRequest()) {
      return;
    }
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');
    if (!this.validateDraftForm()) {
      return;
    }

    try {
      const payload = this.buildPayload('BROUILLON');
      const requestId = this.selectedRequestId();
      const saved = requestId
        ? await api.updatePurchaseRequest(token, requestId, payload)
        : await api.createPurchaseRequest(token, payload);
      this.selectedRequestId.set(saved.id);
      this.selectedFiles.set([]);
      this.statusMessage.set(this.site.localize({
        fr: 'Brouillon enregistré avec succès.',
        en: 'Draft saved successfully.',
        ar: 'تم حفظ المسودة بنجاح.',
      }));
      await this.loadData();
      const refreshed = this.requests().find((item) => item.id === saved.id);
      if (refreshed) {
        this.selectRequest(refreshed);
      }
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error, saveErrorMessage));
    }
  }

  async ensureDraftSaved() {
    await this.saveDraft();
    return Boolean(this.selectedRequestId());
  }

  async generatePdf() {
    if (!this.canCreateRequest()) {
      return;
    }
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');
    if (!this.validateForm()) {
      return;
    }

    const ready = await this.ensureDraftSaved();
    if (!ready || !this.selectedRequestId()) {
      return;
    }

    try {
      await api.generatePurchaseRequestPdf(token, this.selectedRequestId()!);
      this.statusMessage.set(this.site.localize({
        fr: 'La demande a été enregistrée, le PDF officiel a été généré et la revue chef de labo peut commencer.',
        en: 'The request has been saved, the official PDF generated, and the lab-head review can now begin.',
        ar: 'تم حفظ الطلب وتوليد ملف PDF الرسمي ويمكن الآن أن تبدأ مراجعة رئيس المخبر.',
      }));
      await this.loadData();
      const refreshed = this.requests().find((item) => item.id === this.selectedRequestId());
      if (refreshed) {
        this.selectRequest(refreshed);
      }
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error, generateErrorMessage));
    }
  }

  async previewGeneratedPdf(request: PurchaseRequest) {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }
    await api.openPurchaseRequestPdf(token, request.id);
  }

  async downloadGeneratedPdf(request: PurchaseRequest) {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }
    await api.downloadPurchaseRequestPdf(token, request.id);
    await this.loadData();
  }

  async decide(requestId: number, decision: 'ACCEPTER' | 'REJETER') {
    const token = this.auth.session()?.accessToken;
    if (!token || !this.isLabHead()) {
      return;
    }

    const comment = this.reviewComment().trim();
    if (decision === 'REJETER' && !comment) {
      this.errorMessage.set(this.site.localize({
        fr: 'Un motif de refus est obligatoire.',
        en: 'A rejection reason is required.',
        ar: 'سبب الرفض إجباري.',
      }));
      return;
    }

    try {
      await api.decidePurchaseRequest(token, requestId, {
        decision,
        commentaire: comment || undefined,
      });
      this.reviewComment.set('');
      this.statusMessage.set(this.site.localize(
        decision === 'ACCEPTER'
          ? {
              fr: 'La demande a été marquée Acceptée et reste visible dans l’historique.',
              en: 'The request has been marked Accepted and remains visible in history.',
              ar: 'تم وضع علامة مقبولة على الطلب وبقي مرئياً في السجل.',
            }
          : {
              fr: 'La demande a été marquée Refusée et reste visible dans l’historique.',
              en: 'The request has been marked Rejected and remains visible in history.',
              ar: 'تم وضع علامة مرفوضة على الطلب وبقي مرئياً في السجل.',
            },
      ));
      await this.loadData();
      const refreshed = this.requests().find((item) => item.id === requestId);
      if (refreshed) {
        this.selectRequest(refreshed);
      }
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error, decisionErrorMessage));
    }
  }

  async downloadAttachment(request: PurchaseRequest, attachmentId?: number) {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }
    await api.downloadPurchaseAttachment(token, request.id, attachmentId);
  }

  resolveErrorMessage(error: unknown, fallback: LocalizedText) {
    if (error instanceof Error && error.message?.trim()) {
      return error.message;
    }
    return this.site.localize(fallback);
  }
}

function requestAmountValue(request: PurchaseRequest) {
  return request.totalGeneral ?? request.estimationCout ?? 0;
}

function requestRequesterNameValue(request: PurchaseRequest) {
  const name = `${request.demandeurPrenom || request.creePar?.prenom || ''} ${request.demandeurNom || request.creePar?.nom || ''}`.trim();
  return name || request.creePar?.nomComplet || '—';
}

function requestRubriqueValue(request: PurchaseRequest) {
  return request.rubriqueBudgetaire || request.rubriqueBudgetaireLabel || '';
}

function requestRubriqueLabelValue(request: PurchaseRequest, site: SitePreferencesService) {
  const option = RUBRIQUE_OPTIONS.find((item) => item.value === request.rubriqueBudgetaire);
  if (option) {
    return site.localize(option.label);
  }
  return request.rubriqueBudgetaireLabel || '—';
}

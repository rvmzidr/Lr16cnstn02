import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type {
  AccountStatus,
  AdminRegistrationList,
  Role,
  UtilisateurComplet,
} from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { getInitials } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';

type RegistrationStatusFilter = AccountStatus | 'TOUS';
type RegistrationRoleFilter = Role | 'TOUS';
type SortOrder = 'asc' | 'desc';

@Component({
  selector: 'app-admin-registrations-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <section class="app-page-hero">
        <div class="app-page-hero__orb app-page-hero__orb--primary"></div>
        <div class="app-page-hero__orb app-page-hero__orb--secondary"></div>

        <div class="app-page-hero__content">
          <p class="app-page-eyebrow">
            {{ site.localize({ fr: 'Espace administration', en: 'Administration area', ar: 'مساحة الإدارة' }) }}
          </p>

          <div class="app-page-header mt-2">
            <div>
              <h2 class="app-page-title">
                {{ site.localize({ fr: 'Inscriptions utilisateurs', en: 'User registrations', ar: 'تسجيلات المستخدمين' }) }}
              </h2>
              <p class="app-page-description">
                {{
                  site.localize({
                    fr: "Traitez les demandes d'accès avec un workflow complet : filtrage, consultation détaillée, validation par rôle et refus motivé.",
                    en: 'Process access requests with a complete workflow: filtering, detailed review, role validation, and reasoned rejection.',
                    ar: 'عالج طلبات الوصول عبر سير عمل كامل: تصفية ومراجعة تفصيلية واعتماد الدور ورفض مسبب.',
                  })
                }}
              </p>
            </div>

            <button
              type="button"
              class="btn-outline"
              (click)="refresh()"
              [disabled]="loadingList()"
            >
              {{ site.localize({ fr: 'Actualiser', en: 'Refresh', ar: 'تحديث' }) }}
            </button>
          </div>

          <div class="app-page-pills">
            <span class="app-page-pill">
              {{ site.localize({ fr: 'Total dossiers', en: 'Total files', ar: 'إجمالي الملفات' }) }}: {{ registrations()?.meta?.total || 0 }}
            </span>
            <span class="app-page-pill">
              {{ site.localize({ fr: 'En attente', en: 'Pending', ar: 'قيد الانتظار' }) }}: {{ registrations()?.statistiques?.enAttente || 0 }}
            </span>
            <span class="app-page-pill">
              {{ site.localize({ fr: 'Attestations', en: 'Certificates', ar: 'الشهادات' }) }}: {{ registrations()?.statistiques?.attestationsDisponibles || 0 }}
            </span>
          </div>
        </div>
      </section>

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        @for (card of summaryCards(); track card.label) {
          <article class="surface-card p-5">
            <div class="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <lucide-icon [img]="card.icon" class="h-5 w-5"></lucide-icon>
            </div>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {{ card.label }}
            </p>
            <p class="mt-2 text-3xl font-semibold text-foreground">{{ card.value }}</p>
            <p class="mt-2 text-xs text-muted-foreground">{{ card.meta }}</p>
          </article>
        }
      </section>

      <section class="surface-card p-5">
        <div class="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <div class="relative">
            <lucide-icon
              [img]="icons.Search"
              class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            ></lucide-icon>
            <input
              class="input-shell pl-11"
              [placeholder]="
                site.localize({
                  fr: 'Nom, email, rôle demandé...',
                  en: 'Name, email, requested role...',
                  ar: 'الاسم، البريد، الدور المطلوب...',
                })
              "
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              (keyup.enter)="applyFilters()"
            />
          </div>

          <select
            class="select-shell"
            [ngModel]="statusFilter()"
            (ngModelChange)="statusFilter.set($event)"
          >
            @for (option of statusOptions(); track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>

          <select
            class="select-shell"
            [ngModel]="roleFilter()"
            (ngModelChange)="roleFilter.set($event)"
          >
            <option [ngValue]="'TOUS'">
              {{ site.localize({ fr: 'Tous les rôles', en: 'All roles', ar: 'كل الأدوار' }) }}
            </option>
            @for (role of visibleRoles(); track role) {
              <option [ngValue]="role">{{ formatRole(role) }}</option>
            }
          </select>

          <select
            class="select-shell"
            [ngModel]="sortOrder()"
            (ngModelChange)="sortOrder.set($event)"
          >
            <option [ngValue]="'desc'">
              {{ site.localize({ fr: 'Plus récents', en: 'Newest first', ar: 'الأحدث أولا' }) }}
            </option>
            <option [ngValue]="'asc'">
              {{ site.localize({ fr: 'Plus anciens', en: 'Oldest first', ar: 'الأقدم أولا' }) }}
            </option>
          </select>

          <button
            type="button"
            class="btn-secondary w-full justify-center lg:w-auto"
            (click)="applyFilters()"
            [disabled]="loadingList()"
          >
            {{ site.localize({ fr: 'Filtrer', en: 'Filter', ar: 'تصفية' }) }}
          </button>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-muted-foreground">
            {{ pageInfoText() }}
          </p>

          <div class="flex flex-wrap gap-2">
            @if (hasFilters()) {
              <button
                type="button"
                class="btn-outline"
                (click)="resetFilters()"
                [disabled]="loadingList()"
              >
                {{ site.localize({ fr: 'Réinitialiser', en: 'Reset', ar: 'إعادة الضبط' }) }}
              </button>
            }
          </div>
        </div>
      </section>

      <section class="surface-card p-6">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 class="text-xl font-semibold text-foreground">
              {{ site.localize({ fr: 'Dossiers inscription', en: 'Registration files', ar: 'ملفات التسجيل' }) }}
            </h3>
            <p class="text-sm text-muted-foreground">
              {{
                site.localize({
                  fr: (registrations()?.meta?.total || 0) + ' dossier(s) correspondant(s).',
                  en: (registrations()?.meta?.total || 0) + ' matching file(s).',
                  ar: (registrations()?.meta?.total || 0) + ' ملف/ملفات مطابقة.',
                })
              }}
            </p>
          </div>
        </div>

        @if (loadingList()) {
          <div class="empty-state">{{ site.localize({ fr: 'Chargement des inscriptions...', en: 'Loading registrations...', ar: 'جار تحميل التسجيلات...' }) }}</div>
        } @else {
          <div class="space-y-3">
            @for (item of registrations()?.inscriptions || []; track item.id) {
              <article class="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
                      >
                        {{ initials(item.nomComplet) }}
                      </span>

                      <div class="min-w-0">
                        <p class="truncate text-base font-semibold text-foreground">{{ item.nomComplet }}</p>
                        <p class="truncate text-sm text-muted-foreground">{{ item.emailInstitutionnel }}</p>
                      </div>
                    </div>

                    <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span class="rounded-full border border-border px-2 py-1 text-muted-foreground">
                        {{ site.localize({ fr: 'Rôle demandé', en: 'Requested role', ar: 'الدور المطلوب' }) }}: {{ formatRole(item.roleDemande || 'MEMBRE') }}
                      </span>

                      <span [class]="statusBadgeClass(item.statut)">
                        {{ statusLabel(item.statut) }}
                      </span>

                      <span class="rounded-full border border-border px-2 py-1 text-muted-foreground">
                        {{ site.localize({ fr: 'Inscrit le', en: 'Registered on', ar: 'تاريخ التسجيل' }) }} {{ formatDate(item.creeLe) }}
                      </span>

                      @if (item.profil?.estDoctorant) {
                        <span class="rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-700">
                          {{ site.localize({ fr: 'Doctorant', en: 'PhD candidate', ar: 'دكتوراه' }) }}
                        </span>
                      }

                      @if (item.doctorat?.attestation?.disponible) {
                        <span class="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
                          {{ site.localize({ fr: 'Attestation disponible', en: 'Certificate available', ar: 'الشهادة متاحة' }) }}
                        </span>
                      }

                      @if (item.motifRejet) {
                        <span class="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">
                          {{ site.localize({ fr: 'Motif enregistré', en: 'Reason saved', ar: 'تم حفظ السبب' }) }}
                        </span>
                      }
                    </div>
                  </div>

                  <div class="w-full space-y-2 sm:w-auto">
                    <label class="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      {{ site.localize({ fr: 'Rôle attribué', en: 'Assigned role', ar: 'الدور المسند' }) }}
                    </label>
                    <select
                      class="select-shell min-w-[13rem]"
                      [name]="'reg-role-' + item.id"
                      [ngModel]="selectedRoles[item.id]"
                      (ngModelChange)="selectedRoles[item.id] = $any($event)"
                    >
                      @for (role of visibleRoles(); track role) {
                        <option [ngValue]="role">{{ formatRole(role) }}</option>
                      }
                    </select>

                    <div class="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        class="btn-outline"
                        (click)="openDetails(item)"
                        [disabled]="isBusy(item.id)"
                      >
                        {{ site.localize({ fr: 'Détails', en: 'Details', ar: 'التفاصيل' }) }}
                      </button>

                      <button
                        type="button"
                        class="btn-secondary"
                        (click)="validate(item)"
                        [disabled]="item.statut !== 'EN_ATTENTE' || isBusy(item.id)"
                      >
                        {{ site.localize({ fr: 'Valider', en: 'Approve', ar: 'اعتماد' }) }}
                      </button>

                      <button
                        type="button"
                        class="btn-outline"
                        (click)="openRejectModal(item)"
                        [disabled]="item.statut !== 'EN_ATTENTE' || isBusy(item.id)"
                      >
                        {{ site.localize({ fr: 'Refuser', en: 'Reject', ar: 'رفض' }) }}
                      </button>

                      @if (item.doctorat?.attestation?.disponible) {
                        <button
                          type="button"
                          class="btn-outline"
                          (click)="downloadAttestation(item.id)"
                          [disabled]="isBusy(item.id)"
                        >
                          {{ site.localize({ fr: 'Attestation', en: 'Certificate', ar: 'الشهادة' }) }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </article>
            } @empty {
              <div class="empty-state">{{ site.localize({ fr: 'Aucun dossier ne correspond aux filtres.', en: 'No file matches the filters.', ar: 'لا توجد ملفات مطابقة للفلاتر.' }) }}</div>
            }
          </div>

          @if ((pageMeta()?.totalPages || 0) > 1) {
            <div class="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
              <button
                type="button"
                class="btn-outline"
                (click)="goToPreviousPage()"
                [disabled]="loadingList() || !(pageMeta()?.hasPreviousPage)"
              >
                {{ site.localize({ fr: 'Précédent', en: 'Previous', ar: 'السابق' }) }}
              </button>

              <p class="text-sm text-muted-foreground">
                {{ site.localize({ fr: 'Page', en: 'Page', ar: 'صفحة' }) }} {{ pageMeta()?.page || 1 }} / {{ pageMeta()?.totalPages || 1 }}
              </p>

              <button
                type="button"
                class="btn-outline"
                (click)="goToNextPage()"
                [disabled]="loadingList() || !(pageMeta()?.hasNextPage)"
              >
                {{ site.localize({ fr: 'Suivant', en: 'Next', ar: 'التالي' }) }}
              </button>
            </div>
          }
        }
      </section>

      @if (statusMessage()) {
        <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-feedback-success">
          {{ statusMessage() }}
        </div>
      }

      @if (errorMessage()) {
        <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-feedback-error">
          {{ errorMessage() }}
        </div>
      }
    </div>

    @if (loadingDetail() || detailRegistration()) {
      <div class="fixed inset-0 z-40 bg-black/40" (click)="closeDetails()"></div>
      <section
        class="fixed inset-x-4 top-6 z-50 mx-auto max-h-[88vh] max-w-4xl overflow-auto rounded-3xl border border-border bg-card p-6 shadow-2xl"
        (click)="$event.stopPropagation()"
      >
        <div class="mb-4 flex items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {{ site.localize({ fr: 'Fiche inscription', en: 'Registration record', ar: 'سجل التسجيل' }) }}
            </p>
            <h3 class="mt-1 text-xl font-semibold text-foreground">
              {{ detailRegistration()?.nomComplet || site.localize({ fr: 'Chargement...', en: 'Loading...', ar: 'جار التحميل...' }) }}
            </h3>
          </div>

          <button type="button" class="btn-outline" (click)="closeDetails()">
            {{ site.localize({ fr: 'Fermer', en: 'Close', ar: 'إغلاق' }) }}
          </button>
        </div>

        @if (loadingDetail()) {
          <div class="empty-state">{{ site.localize({ fr: 'Chargement du dossier détaillé...', en: 'Loading detailed file...', ar: 'جار تحميل الملف التفصيلي...' }) }}</div>
        } @else {
          @if (detailRegistration(); as detail) {
            <div class="space-y-6">
              <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <article class="rounded-2xl border border-border bg-muted/30 p-3">
                  <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">{{ site.localize({ fr: 'Email institutionnel', en: 'Institutional email', ar: 'البريد المؤسسي' }) }}</p>
                  <p class="mt-1 text-sm font-medium text-foreground">{{ detail.emailInstitutionnel }}</p>
                </article>

                <article class="rounded-2xl border border-border bg-muted/30 p-3">
                  <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">{{ site.localize({ fr: 'Téléphone', en: 'Phone', ar: 'الهاتف' }) }}</p>
                  <p class="mt-1 text-sm font-medium text-foreground">{{ detail.telephone || site.localize({ fr: 'Non renseigné', en: 'Not provided', ar: 'غير متوفر' }) }}</p>
                </article>

                <article class="rounded-2xl border border-border bg-muted/30 p-3">
                  <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">{{ site.localize({ fr: 'Statut', en: 'Status', ar: 'الحالة' }) }}</p>
                  <p class="mt-1 text-sm font-medium text-foreground">{{ statusLabel(detail.statut) }}</p>
                </article>

                <article class="rounded-2xl border border-border bg-muted/30 p-3">
                  <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">{{ site.localize({ fr: 'Rôle demandé', en: 'Requested role', ar: 'الدور المطلوب' }) }}</p>
                  <p class="mt-1 text-sm font-medium text-foreground">{{ formatRole(detail.roleDemande || 'MEMBRE') }}</p>
                </article>

                <article class="rounded-2xl border border-border bg-muted/30 p-3">
                  <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">{{ site.localize({ fr: 'Rôle actuel', en: 'Current role', ar: 'الدور الحالي' }) }}</p>
                  <p class="mt-1 text-sm font-medium text-foreground">{{ detail.role ? formatRole(detail.role) : site.localize({ fr: 'Aucun rôle', en: 'No role', ar: 'بدون دور' }) }}</p>
                </article>

                <article class="rounded-2xl border border-border bg-muted/30 p-3">
                  <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">{{ site.localize({ fr: 'Date inscription', en: 'Registration date', ar: 'تاريخ التسجيل' }) }}</p>
                  <p class="mt-1 text-sm font-medium text-foreground">{{ formatDate(detail.creeLe) }}</p>
                </article>
              </div>

              @if (detail.profil) {
                <section class="rounded-2xl border border-border p-4">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {{ site.localize({ fr: 'Profil académique', en: 'Academic profile', ar: 'الملف الأكاديمي' }) }}
                  </h4>

                  <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <article>
                      <p class="text-xs text-muted-foreground">{{ site.localize({ fr: 'Grade', en: 'Grade', ar: 'الرتبة' }) }}</p>
                      <p class="text-sm font-medium text-foreground">{{ detail.profil.grade || site.localize({ fr: 'Non renseigné', en: 'Not provided', ar: 'غير متوفر' }) }}</p>
                    </article>

                    <article>
                      <p class="text-xs text-muted-foreground">{{ site.localize({ fr: 'Institution', en: 'Institution', ar: 'المؤسسة' }) }}</p>
                      <p class="text-sm font-medium text-foreground">
                        {{ detail.profil.institutionAffectation?.nom || site.localize({ fr: 'Non renseignée', en: 'Not provided', ar: 'غير متوفرة' }) }}
                      </p>
                    </article>

                    <article>
                      <p class="text-xs text-muted-foreground">{{ site.localize({ fr: 'Équipe', en: 'Team', ar: 'الفريق' }) }}</p>
                      <p class="text-sm font-medium text-foreground">
                        {{ detail.profil.equipeRecherche?.nom || site.localize({ fr: 'Non renseignée', en: 'Not provided', ar: 'غير متوفرة' }) }}
                      </p>
                    </article>
                  </div>
                </section>
              }

              @if (detail.doctorat) {
                <section class="rounded-2xl border border-border p-4">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {{ site.localize({ fr: 'Informations doctorat', en: 'PhD information', ar: 'معلومات الدكتوراه' }) }}
                  </h4>

                  <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <article>
                      <p class="text-xs text-muted-foreground">{{ site.localize({ fr: "Université d'inscription", en: 'Enrollment university', ar: 'جامعة التسجيل' }) }}</p>
                      <p class="text-sm font-medium text-foreground">
                        {{ detail.doctorat.universiteInscription || site.localize({ fr: 'Non renseignée', en: 'Not provided', ar: 'غير متوفرة' }) }}
                      </p>
                    </article>

                    <article>
                      <p class="text-xs text-muted-foreground">{{ site.localize({ fr: 'Directeur de thèse', en: 'Thesis advisor', ar: 'المشرف على الأطروحة' }) }}</p>
                      <p class="text-sm font-medium text-foreground">
                        {{ detail.doctorat.directeurThese || site.localize({ fr: 'Non renseigné', en: 'Not provided', ar: 'غير متوفر' }) }}
                      </p>
                    </article>

                    <article>
                      <p class="text-xs text-muted-foreground">{{ site.localize({ fr: 'Avancement', en: 'Progress', ar: 'التقدم' }) }}</p>
                      <p class="text-sm font-medium text-foreground">
                        {{ detail.doctorat.pourcentageAvancement ?? 0 }}%
                      </p>
                    </article>
                  </div>

                  @if (detail.doctorat.attestation?.disponible) {
                    <div class="mt-4">
                      <button
                        type="button"
                        class="btn-outline"
                        (click)="downloadAttestation(detail.id)"
                      >
                        {{ site.localize({ fr: "Télécharger l'attestation doctorant", en: 'Download PhD certificate', ar: 'تنزيل شهادة الدكتوراه' }) }}
                      </button>
                    </div>
                  }
                </section>
              }

              @if (detail.motifRejet) {
                <section class="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.15em] text-rose-700">
                    {{ site.localize({ fr: 'Motif de rejet', en: 'Rejection reason', ar: 'سبب الرفض' }) }}
                  </h4>
                  <p class="mt-2 text-sm text-rose-700">{{ detail.motifRejet }}</p>
                </section>
              }

              <div class="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <button type="button" class="btn-outline" (click)="closeDetails()">{{ site.localize({ fr: 'Fermer', en: 'Close', ar: 'إغلاق' }) }}</button>

                <button
                  type="button"
                  class="btn-outline"
                  (click)="openRejectModal(detail)"
                  [disabled]="detail.statut !== 'EN_ATTENTE' || isBusy(detail.id)"
                >
                  {{ site.localize({ fr: 'Refuser', en: 'Reject', ar: 'رفض' }) }}
                </button>

                <button
                  type="button"
                  class="btn-secondary"
                  (click)="validate(detail)"
                  [disabled]="detail.statut !== 'EN_ATTENTE' || isBusy(detail.id)"
                >
                  {{ site.localize({ fr: 'Valider', en: 'Approve', ar: 'اعتماد' }) }}
                </button>
              </div>
            </div>
          }
        }
      </section>
    }

    @if (rejectTarget(); as target) {
      <div class="fixed inset-0 z-[60] bg-black/45" (click)="closeRejectModal()"></div>
      <section
        class="fixed inset-x-4 top-[15vh] z-[70] mx-auto w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl"
        (click)="$event.stopPropagation()"
      >
        <h3 class="text-xl font-semibold text-foreground">{{ site.localize({ fr: 'Refuser inscription', en: 'Reject registration', ar: 'رفض التسجيل' }) }}</h3>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ site.localize({ fr: 'Fournissez un motif clair pour', en: 'Provide a clear reason for', ar: 'قدّم سببًا واضحًا لـ' }) }} {{ target.nomComplet }}.
        </p>

        <textarea
          class="input-shell mt-4 min-h-28"
          [ngModel]="rejectReason()"
          (ngModelChange)="rejectReason.set($event)"
          [placeholder]="
            site.localize({
              fr: 'Exemple: dossier incomplet, informations identité invalides, documents manquants...',
              en: 'Example: incomplete file, invalid identity information, missing documents...',
              ar: 'مثال: ملف غير مكتمل، معلومات هوية غير صالحة، وثائق ناقصة...',
            })
          "
        ></textarea>

        <div class="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            class="btn-outline"
            (click)="closeRejectModal()"
            [disabled]="rejectSubmitting()"
          >
            {{ site.localize({ fr: 'Annuler', en: 'Cancel', ar: 'إلغاء' }) }}
          </button>

          <button
            type="button"
            class="btn-secondary"
            (click)="confirmReject()"
            [disabled]="rejectSubmitting()"
          >
            {{ site.localize({ fr: 'Confirmer le refus', en: 'Confirm rejection', ar: 'تأكيد الرفض' }) }}
          </button>
        </div>
      </section>
    }
  `,
})
export class AdminRegistrationsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly icons = sharedIcons;
  readonly registrations = signal<AdminRegistrationList | null>(null);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly searchTerm = signal('');
  readonly statusFilter = signal<RegistrationStatusFilter>('EN_ATTENTE');
  readonly roleFilter = signal<RegistrationRoleFilter>('TOUS');
  readonly sortOrder = signal<SortOrder>('desc');
  readonly page = signal(1);
  readonly loadingList = signal(false);
  readonly loadingDetail = signal(false);
  readonly actionUserId = signal<string | null>(null);
  readonly detailRegistration = signal<UtilisateurComplet | null>(null);
  readonly rejectTarget = signal<UtilisateurComplet | null>(null);
  readonly rejectReason = signal('');
  readonly rejectSubmitting = signal(false);
  readonly selectedRoles: Record<string, Role> = {};
  readonly initials = getInitials;
  readonly statusOptions = computed<
    Array<{ value: RegistrationStatusFilter; label: string }>
  >(() => [
    {
      value: 'EN_ATTENTE',
      label: this.site.localize({
        fr: 'Statut: En attente',
        en: 'Status: Pending',
        ar: 'الحالة: قيد الانتظار',
      }),
    },
    {
      value: 'ACTIF',
      label: this.site.localize({
        fr: 'Statut: Actif',
        en: 'Status: Active',
        ar: 'الحالة: نشط',
      }),
    },
    {
      value: 'REJETE',
      label: this.site.localize({
        fr: 'Statut: Rejeté',
        en: 'Status: Rejected',
        ar: 'الحالة: مرفوض',
      }),
    },
    {
      value: 'DESACTIVE',
      label: this.site.localize({
        fr: 'Statut: Désactivé',
        en: 'Status: Disabled',
        ar: 'الحالة: معطل',
      }),
    },
    {
      value: 'TOUS',
      label: this.site.localize({
        fr: 'Tous les statuts',
        en: 'All statuses',
        ar: 'كل الحالات',
      }),
    },
  ]);
  private readonly fallbackRoles: Role[] = [
    'MEMBRE',
    'CHEF_LABO',
    'ADMINISTRATEUR',
  ];
  private readonly pageLimit = 20;

  readonly summaryCards = computed(() => {
    const stats = this.registrations()?.statistiques;

    return [
      {
        label: this.site.localize({ fr: 'En attente', en: 'Pending', ar: 'قيد الانتظار' }),
        value: stats?.enAttente || 0,
        meta: this.site.localize({
          fr: 'Dossiers à traiter immédiatement',
          en: 'Files to process immediately',
          ar: 'ملفات للمعالجة الفورية',
        }),
        icon: this.icons.FileText,
      },
      {
        label: this.site.localize({ fr: 'Comptes actifs', en: 'Active accounts', ar: 'الحسابات النشطة' }),
        value: stats?.actives || 0,
        meta: this.site.localize({
          fr: 'Comptes déjà activés',
          en: 'Already activated accounts',
          ar: 'حسابات تم تفعيلها',
        }),
        icon: this.icons.Check,
      },
      {
        label: this.site.localize({ fr: 'Comptes rejetés', en: 'Rejected accounts', ar: 'الحسابات المرفوضة' }),
        value: stats?.refusees || 0,
        meta: this.site.localize({
          fr: 'Dossiers refusés',
          en: 'Rejected files',
          ar: 'ملفات مرفوضة',
        }),
        icon: this.icons.X,
      },
      {
        label: this.site.localize({
          fr: 'Attestations doctorant',
          en: 'PhD certificates',
          ar: 'شهادات الدكتوراه',
        }),
        value: stats?.attestationsDisponibles || 0,
        meta: this.site.localize({
          fr: 'Pièces jointes téléchargeables',
          en: 'Downloadable attachments',
          ar: 'مرفقات قابلة للتنزيل',
        }),
        icon: this.icons.Shield,
      },
    ];
  });

  readonly visibleRoles = computed<Role[]>(() => {
    const merged: Role[] = [];

    for (const role of this.registrations()?.rolesDisponibles || []) {
      if (!merged.includes(role)) {
        merged.push(role);
      }
    }

    for (const role of this.fallbackRoles) {
      if (!merged.includes(role)) {
        merged.push(role);
      }
    }

    return merged;
  });

  readonly pageMeta = computed(() => this.registrations()?.meta || null);

  readonly hasFilters = computed(() => {
    return (
      this.searchTerm().trim().length > 0 ||
      this.statusFilter() !== 'EN_ATTENTE' ||
      this.roleFilter() !== 'TOUS' ||
      this.sortOrder() !== 'desc'
    );
  });

  async ngOnInit() {
    await this.loadData();
  }

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  private buildQuery() {
    const q = this.searchTerm().trim();

    return {
      page: this.page(),
      limit: this.pageLimit,
      statut: this.statusFilter() === 'TOUS' ? undefined : this.statusFilter(),
      role: this.roleFilter() === 'TOUS' ? undefined : this.roleFilter(),
      ordre: this.sortOrder(),
      q: q || undefined,
    };
  }

  private hydrateSelectedRoles(registrations: UtilisateurComplet[]) {
    for (const registration of registrations) {
      this.selectedRoles[registration.id] = this.resolveSelectedRole(registration);
    }
  }

  private resolveSelectedRole(item: UtilisateurComplet): Role {
    const availableRoles = this.visibleRoles();
    const selected = this.selectedRoles[item.id];

    if (selected && availableRoles.includes(selected)) {
      return selected;
    }

    if (item.roleDemande && availableRoles.includes(item.roleDemande)) {
      return item.roleDemande;
    }

    return availableRoles[0] || 'MEMBRE';
  }

  isBusy(userId: string) {
    return this.actionUserId() === userId || this.rejectSubmitting();
  }

  statusLabel(status: RegistrationStatusFilter) {
    switch (status) {
      case 'EN_ATTENTE':
        return this.site.localize({ fr: 'En attente', en: 'Pending', ar: 'قيد الانتظار' });
      case 'ACTIF':
        return this.site.localize({ fr: 'Actif', en: 'Active', ar: 'نشط' });
      case 'REJETE':
        return this.site.localize({ fr: 'Rejeté', en: 'Rejected', ar: 'مرفوض' });
      case 'DESACTIVE':
        return this.site.localize({ fr: 'Désactivé', en: 'Disabled', ar: 'معطل' });
      default:
        return this.site.localize({ fr: 'Tous', en: 'All', ar: 'الكل' });
    }
  }

  formatRole(role: Role) {
    if (role === 'ADMINISTRATEUR') {
      return this.site.localize({
        fr: 'Administrateur',
        en: 'Administrator',
        ar: 'مسؤول',
      });
    }

    if (role === 'CHEF_LABO') {
      return this.site.localize({
        fr: 'Chef de labo',
        en: 'Lab head',
        ar: 'رئيس المختبر',
      });
    }

    return this.site.localize({ fr: 'Membre', en: 'Member', ar: 'عضو' });
  }

  statusBadgeClass(status: AccountStatus) {
    if (status === 'ACTIF') {
      return 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700';
    }

    if (status === 'EN_ATTENTE') {
      return 'rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700';
    }

    if (status === 'REJETE') {
      return 'rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700';
    }

    return 'rounded-full bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700';
  }

  formatDate(value: string | null | undefined) {
    if (!value) {
      return this.site.localize({
        fr: 'Non renseignée',
        en: 'Not provided',
        ar: 'غير متوفرة',
      });
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return this.site.localize({
        fr: 'Date invalide',
        en: 'Invalid date',
        ar: 'تاريخ غير صالح',
      });
    }

    const locale =
      this.site.language() === 'ar'
        ? 'ar-MA'
        : this.site.language() === 'en'
          ? 'en-GB'
          : 'fr-FR';

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  pageInfoText() {
    const meta = this.pageMeta();

    if (!meta) {
      return this.site.localize({
        fr: 'Chargement...',
        en: 'Loading...',
        ar: 'جار التحميل...',
      });
    }

    if (meta.total === 0) {
      return this.site.localize({
        fr: 'Aucun dossier trouvé.',
        en: 'No files found.',
        ar: 'لم يتم العثور على ملفات.',
      });
    }

    const start = (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.page * meta.limit, meta.total);

    return this.site.localize({
      fr: `${start}-${end} sur ${meta.total} dossier(s)`,
      en: `${start}-${end} of ${meta.total} file(s)`,
      ar: `${start}-${end} من ${meta.total} ملف/ملفات`,
    });
  }

  async loadData() {
    if (!this.token) {
      return;
    }

    this.errorMessage.set('');
    this.loadingList.set(true);

    try {
      const registrations = await api.listAdminRegistrations(
        this.token,
        this.buildQuery(),
      );

      this.registrations.set(registrations);
      this.hydrateSelectedRoles(registrations.inscriptions);
    } catch (error) {
      this.registrations.set(null);
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur chargement inscriptions.',
              en: 'Failed to load registrations.',
              ar: 'فشل تحميل التسجيلات.',
            }),
      );
    } finally {
      this.loadingList.set(false);
    }
  }

  async applyFilters() {
    this.page.set(1);
    await this.loadData();
  }

  async resetFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('EN_ATTENTE');
    this.roleFilter.set('TOUS');
    this.sortOrder.set('desc');
    this.page.set(1);
    await this.loadData();
  }

  async refresh() {
    await this.loadData();
  }

  async goToPreviousPage() {
    const meta = this.pageMeta();
    if (!meta?.hasPreviousPage) {
      return;
    }

    this.page.set(meta.page - 1);
    await this.loadData();
  }

  async goToNextPage() {
    const meta = this.pageMeta();
    if (!meta?.hasNextPage) {
      return;
    }

    this.page.set(meta.page + 1);
    await this.loadData();
  }

  async openDetails(item: UtilisateurComplet) {
    if (!this.token) {
      return;
    }

    this.errorMessage.set('');
    this.loadingDetail.set(true);
    this.detailRegistration.set(item);

    try {
      const details = await api.getAdminRegistrationDetail(this.token, item.id);
      this.detailRegistration.set(details);
      this.selectedRoles[item.id] = this.resolveSelectedRole(details);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur chargement details.',
              en: 'Failed to load details.',
              ar: 'فشل تحميل التفاصيل.',
            }),
      );
    } finally {
      this.loadingDetail.set(false);
    }
  }

  closeDetails() {
    this.loadingDetail.set(false);
    this.detailRegistration.set(null);
  }

  openRejectModal(item: UtilisateurComplet) {
    this.rejectTarget.set(item);
    this.rejectReason.set(item.motifRejet || '');
    this.errorMessage.set('');
  }

  closeRejectModal() {
    this.rejectTarget.set(null);
    this.rejectReason.set('');
    this.rejectSubmitting.set(false);
  }

  async confirmReject() {
    const target = this.rejectTarget();
    if (!target) {
      return;
    }

    const motifRejet = this.rejectReason().trim();
    if (motifRejet.length < 5) {
      this.errorMessage.set(
        this.site.localize({
          fr: 'Le motif de rejet doit contenir au moins 5 caractères.',
          en: 'Rejection reason must contain at least 5 characters.',
          ar: 'يجب أن يحتوي سبب الرفض على 5 أحرف على الأقل.',
        }),
      );
      return;
    }

    this.errorMessage.set('');
    this.rejectSubmitting.set(true);
    this.actionUserId.set(target.id);

    try {
      await api.refuseRegistration(this.token, target.id, { motifRejet });
      this.statusMessage.set(
        this.site.localize({
          fr: `Dossier refusé pour ${target.nomComplet}.`,
          en: `File rejected for ${target.nomComplet}.`,
          ar: `تم رفض الملف الخاص بـ ${target.nomComplet}.`,
        }),
      );

      if (this.detailRegistration()?.id === target.id) {
        this.closeDetails();
      }

      this.closeRejectModal();
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur lors du refus.',
              en: 'Error while rejecting.',
              ar: 'حدث خطأ أثناء الرفض.',
            }),
      );
    } finally {
      this.rejectSubmitting.set(false);
      this.actionUserId.set(null);
    }
  }

  async validate(item: UtilisateurComplet) {
    if (item.statut !== 'EN_ATTENTE') {
      return;
    }

    this.errorMessage.set('');
    this.actionUserId.set(item.id);

    try {
      await api.validateRegistration(this.token, item.id, {
        role: this.resolveSelectedRole(item),
      });

      this.statusMessage.set(
        this.site.localize({
          fr: `Inscription validée pour ${item.nomComplet}.`,
          en: `Registration approved for ${item.nomComplet}.`,
          ar: `تم اعتماد التسجيل الخاص بـ ${item.nomComplet}.`,
        }),
      );

      if (this.detailRegistration()?.id === item.id) {
        this.closeDetails();
      }

      await this.loadData();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur lors de la validation.',
              en: 'Error while approving.',
              ar: 'حدث خطأ أثناء الاعتماد.',
            }),
      );
    } finally {
      this.actionUserId.set(null);
    }
  }

  async downloadAttestation(userId: string) {
    try {
      await api.downloadAdminDoctorantAttestation(this.token, userId);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: "Impossible d'ouvrir l'attestation.",
              en: 'Unable to open the certificate.',
              ar: 'تعذر فتح الشهادة.',
            }),
      );
    }
  }
}

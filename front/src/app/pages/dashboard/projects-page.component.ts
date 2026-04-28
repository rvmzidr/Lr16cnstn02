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
import type { Project, UtilisateurComplet } from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';

type SummaryCard = {
  label: string;
  value: number;
  meta: string;
};

@Component({
  selector: 'app-projects-page',
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
            <span class="inline-flex items-center gap-2">
              <lucide-icon [img]="icons.FolderKanban" class="h-3.5 w-3.5"></lucide-icon>
              {{ isLabHead() ? site.localize(heroEyebrowLabHead) : site.localize(heroEyebrowMember) }}
            </span>
          </p>

          <div class="app-page-header mt-2">
            <div class="space-y-2">
              <h2 class="app-page-title">{{ site.localize(projectsTitle) }}</h2>
              <p class="app-page-description max-w-4xl">
                {{ pageDescription() }}
              </p>
            </div>

            @if (isLabHead()) {
              <button type="button" class="btn-secondary min-w-[12rem]" (click)="startNew()">
                {{ site.localize(newProjectLabel) }}
              </button>
            }
          </div>

          <div class="app-page-pills mt-5">
            <span class="app-page-pill">
              {{ site.localize(totalProjectsPillLabel) }}: {{ projects().length }}
            </span>
            <span class="app-page-pill">
              {{ site.localize(activeProjectsPillLabel) }}: {{ activeProjectsCount() }}
            </span>
            <span class="app-page-pill">
              {{ site.localize(historyProjectsPillLabel) }}: {{ historyProjects().length }}
            </span>
          </div>
        </div>
      </section>

      @if (!isProjectFormOpen() && statusMessage()) {
        <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">
          {{ statusMessage() }}
        </div>
      }

      @if (!isProjectFormOpen() && errorMessage()) {
        <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">
          {{ errorMessage() }}
        </div>
      }

      <section class="app-kpi-grid">
        @for (card of summaryCards(); track card.label) {
          <article class="app-kpi-card">
            <p class="app-kpi-card__label">{{ card.label }}</p>
            <p class="app-kpi-card__value">{{ card.value }}</p>
            <p class="app-kpi-card__meta">{{ card.meta }}</p>
          </article>
        }
      </section>

      <section class="surface-card p-5 lg:p-6">
        <div class="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
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

          <div class="flex items-center justify-between gap-3 text-sm text-muted-foreground xl:justify-end">
            <span class="badge-soft inline-flex">{{ filteredProjects().length }}</span>
            <span>{{ site.localize(searchResultsLabel) }}</span>
          </div>
        </div>
      </section>

      <div class="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <section class="surface-card space-y-4 p-5 lg:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 class="text-xl font-semibold text-foreground">
                {{ site.localize(projectListTitle) }}
              </h3>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ site.localize(projectListSubtitle) }}
              </p>
            </div>
            <span class="tag-chip">{{ site.localize(projectListChipLabel) }}</span>
          </div>

          @if (loading()) {
            <div class="rounded-2xl border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              {{ site.localize(loadingProjectsLabel) }}
            </div>
          } @else if (filteredProjects().length) {
            <div class="space-y-3">
              @for (project of filteredProjects(); track project.id) {
                <button
                  type="button"
                  class="surface-card--interactive w-full rounded-[24px] border border-border bg-card px-4 py-4 text-left transition"
                  [class.border-primary]="selectedProject()?.id === project.id"
                  [class.bg-primary/5]="selectedProject()?.id === project.id"
                  (click)="selectProject(project)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="truncate text-base font-semibold text-foreground">
                        {{ project.titre }}
                      </div>
                      <div class="mt-1 text-xs text-muted-foreground">
                        {{ site.localize(projectLeadLabel) }}:
                        {{ displayCreator(project) }}
                      </div>
                    </div>

                    <span class="badge-soft">{{ projectStatusLabel(project.statut) }}</span>
                  </div>

                  <div class="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div class="flex items-center gap-2">
                      <lucide-icon [img]="icons.Calendar" class="h-3.5 w-3.5"></lucide-icon>
                      <span>{{ projectRangeLabel(project) }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <lucide-icon [img]="icons.Users" class="h-3.5 w-3.5"></lucide-icon>
                      <span>
                        {{ site.localize(membersLabel) }}: {{ projectMemberCount(project) }}
                        •
                        {{ site.localize(objectivesPresenceLabel) }}: {{ project.objectifs?.trim() ? site.localize(yesLabel) : site.localize(noLabel) }}
                      </span>
                    </div>
                  </div>

                  <div class="mt-4">
                    <div class="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{{ site.localize(progressLabel) }}</span>
                      <span>{{ projectProgress(project) }}%</span>
                    </div>
                    <div class="mt-2 h-2 rounded-full bg-muted">
                      <div
                        class="h-2 rounded-full bg-primary transition-all duration-300"
                        [style.width.%]="projectProgress(project)"
                      ></div>
                    </div>
                  </div>

                  <div class="mt-4 line-clamp-3 text-sm text-muted-foreground">
                    {{ project.description || site.localize(noDescriptionLabel) }}
                  </div>
                </button>
              }
            </div>
          } @else {
            <div class="empty-state">
              {{ site.localize(noProjectsLabel) }}
            </div>
          }
        </section>

        <div class="space-y-6">
          @if (selectedProject()) {
            <section class="surface-card space-y-5 p-5 lg:p-6">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="tag-chip">{{ site.localize(projectSummaryChipLabel) }}</div>
                  <h3 class="mt-3 text-2xl font-semibold text-foreground">
                    {{ selectedProject()!.titre }}
                  </h3>
                  <p class="mt-2 text-sm text-muted-foreground">
                    {{ selectedProject()!.description || site.localize(noDescriptionLabel) }}
                  </p>
                </div>

                @if (isLabHead()) {
                  <div class="flex flex-wrap gap-2">
                    <button type="button" class="btn-outline" (click)="openEditModal()">
                      {{ site.localize(editProjectLabel) }}
                    </button>
                    @if (!isHistoricProject(selectedProject()!)) {
                      <button type="button" class="btn-outline" (click)="archiveSelectedProject()">
                        {{ site.localize(archiveProjectLabel) }}
                      </button>
                    }
                  </div>
                }
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="rounded-2xl border border-border bg-card px-4 py-4">
                  <div class="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {{ site.localize(statusLabel) }}
                  </div>
                  <div class="mt-2 badge-soft inline-flex">
                    {{ projectStatusLabel(selectedProject()!.statut) }}
                  </div>
                </div>

                <div class="rounded-2xl border border-border bg-card px-4 py-4">
                  <div class="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {{ site.localize(projectLeadLabel) }}
                  </div>
                  <div class="mt-2 text-foreground">
                    {{ displayCreator(selectedProject()!) }}
                  </div>
                </div>

                <div class="rounded-2xl border border-border bg-card px-4 py-4">
                  <div class="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {{ site.localize(timelineLabel) }}
                  </div>
                  <div class="mt-2 text-foreground">
                    {{ projectRangeLabel(selectedProject()!) }}
                  </div>
                </div>

                <div class="rounded-2xl border border-border bg-card px-4 py-4">
                  <div class="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {{ site.localize(membersLabel) }}
                  </div>
                  <div class="mt-2 text-foreground">
                    {{ projectMemberCount(selectedProject()!) }}
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>{{ site.localize(progressLabel) }}</span>
                  <span>{{ projectProgress(selectedProject()!) }}%</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" [style.width.%]="projectProgress(selectedProject()!)"></div>
                </div>
              </div>

              <div class="surface-muted space-y-3 p-4">
                <div class="text-lg font-semibold text-foreground">
                  {{ site.localize(scientificFrameTitle) }}
                </div>
                <div class="whitespace-pre-line text-sm text-muted-foreground">
                  {{ selectedProject()!.objectifs || site.localize(noObjectivesLabel) }}
                </div>
              </div>

              <div class="surface-muted space-y-3 p-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-lg font-semibold text-foreground">
                    {{ site.localize(assignedMembersTitle) }}
                  </div>
                  <span class="badge-soft inline-flex">{{ projectMemberCount(selectedProject()!) }}</span>
                </div>

                <div class="space-y-3">
                  @for (member of selectedProject()!.membres || []; track member.utilisateur?.id) {
                    <div class="rounded-xl border border-border bg-card px-4 py-3">
                      <div class="font-medium text-foreground">
                        {{ member.utilisateur?.nomComplet || site.localize(memberFallbackLabel) }}
                      </div>
                      <div class="mt-1 text-sm text-muted-foreground">
                        {{ member.roleDansProjet || site.localize(memberRoleFallbackLabel) }}
                      </div>
                    </div>
                  } @empty {
                    <div class="text-sm text-muted-foreground">
                      {{ site.localize(noAssignedMembersLabel) }}
                    </div>
                  }
                </div>
              </div>
            </section>
          } @else {
            <section class="surface-card p-6">
              <div class="empty-state">
                {{ site.localize(selectProjectPromptLabel) }}
              </div>
            </section>
          }

          <section class="surface-card space-y-4 p-5 lg:p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-xl font-semibold text-foreground">
                  {{ site.localize(historyTitle) }}
                </h3>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ site.localize(historySubtitle) }}
                </p>
              </div>
              <span class="tag-chip">{{ historyProjects().length }}</span>
            </div>

            <div class="space-y-3">
              @for (project of historyProjects(); track project.id) {
                <div class="rounded-2xl border border-border bg-card px-4 py-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="truncate font-semibold text-foreground">{{ project.titre }}</div>
                      <div class="mt-1 text-sm text-muted-foreground">
                        {{ project.description || site.localize(noDescriptionLabel) }}
                      </div>
                    </div>
                    <span class="badge-soft">{{ projectStatusLabel(project.statut) }}</span>
                  </div>

                  <div class="mt-3 text-xs text-muted-foreground">
                    {{ site.localize(lastUpdateLabel) }}: {{ historyTimestampLabel(project) }}
                  </div>
                </div>
              } @empty {
                <div class="text-sm text-muted-foreground">
                  {{ site.localize(noHistoryLabel) }}
                </div>
              }
            </div>
          </section>
        </div>
      </div>
    </div>

    @if (isProjectFormOpen()) {
      <div class="fixed inset-0 z-[140]">
        <button
          type="button"
          class="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
          [attr.aria-label]="site.localize(closeProjectFormLabel)"
          (click)="closeProjectForm()"
        ></button>

        <div class="absolute inset-0 flex items-center justify-center p-3 sm:p-5 lg:p-8">
          <section
            role="dialog"
            aria-modal="true"
            [attr.aria-labelledby]="projectDialogTitleId"
            class="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-[1120px] flex-col overflow-hidden rounded-[30px] border border-border bg-background shadow-2xl sm:max-h-[calc(100vh-2.5rem)]"
            (click)="$event.stopPropagation()"
          >
            <header class="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div class="max-w-2xl">
                <p class="app-page-eyebrow app-page-eyebrow--light">
                  {{ site.localize(modalEyebrowLabel) }}
                </p>
                <h3 [id]="projectDialogTitleId" class="mt-2 text-xl font-semibold text-foreground lg:text-2xl">
                  {{ formModalTitle() }}
                </h3>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ formModalDescription() }}
                </p>
              </div>

              <button
                type="button"
                class="btn-outline !h-10 !w-10 !rounded-full !px-0"
                [attr.aria-label]="site.localize(closeProjectFormLabel)"
                (click)="closeProjectForm()"
              >
                <lucide-icon [img]="icons.X" class="h-4 w-4"></lucide-icon>
              </button>
            </header>

            <div class="max-h-[calc(100vh-13.5rem)] space-y-5 overflow-y-auto px-6 py-5 sm:px-7">
              <section class="rounded-[26px] border border-border bg-muted/20 p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="tag-chip">
                    {{ editorProject() ? site.localize(editingChipLabel) : site.localize(createChipLabel) }}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    {{ site.localize(formProgressLabel) }}: {{ completionRate() }}%
                  </div>
                </div>

                <div class="mt-3 progress-track">
                  <div class="progress-fill" [style.width.%]="completionRate()"></div>
                </div>
              </section>

              <section class="rounded-[26px] border border-border bg-muted/20 p-4">
                <div>
                  <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                    {{ site.localize(identificationSectionTitle) }}
                  </h4>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {{ site.localize(identificationSectionSubtitle) }}
                  </p>
                </div>

                <div class="mt-4 grid gap-4 md:grid-cols-2">
                  <div class="md:col-span-2">
                    <label class="mb-1.5 block text-sm font-medium text-foreground">
                      {{ site.localize(projectTitleFieldLabel) }}
                    </label>
                    <input
                      [(ngModel)]="form.titre"
                      [id]="editorTitleFieldId"
                      class="input-shell"
                      [placeholder]="site.localize(projectTitlePlaceholder)"
                    />
                  </div>

                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-foreground">
                      {{ site.localize(statusLabel) }}
                    </label>
                    <select class="select-shell" [(ngModel)]="form.statut">
                      <option value="EN_COURS">{{ projectStatusLabel('EN_COURS') }}</option>
                      <option value="TERMINE">{{ projectStatusLabel('TERMINE') }}</option>
                      <option value="ARCHIVE">{{ projectStatusLabel('ARCHIVE') }}</option>
                    </select>
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label class="mb-1.5 block text-sm font-medium text-foreground">
                        {{ site.localize(startDateLabel) }}
                      </label>
                      <input type="date" class="input-shell" [(ngModel)]="form.dateDebut" />
                    </div>

                    <div>
                      <label class="mb-1.5 block text-sm font-medium text-foreground">
                        {{ site.localize(endDateLabel) }}
                      </label>
                      <input type="date" class="input-shell" [(ngModel)]="form.dateFin" />
                    </div>
                  </div>
                </div>
              </section>

              <section class="rounded-[26px] border border-border bg-muted/20 p-4">
                <div>
                  <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                    {{ site.localize(scientificSectionTitle) }}
                  </h4>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {{ site.localize(scientificSectionSubtitle) }}
                  </p>
                </div>

                <div class="mt-4 space-y-4">
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-foreground">
                      {{ site.localize(descriptionFieldLabel) }}
                    </label>
                    <textarea
                      class="textarea-shell min-h-28"
                      [(ngModel)]="form.description"
                      [placeholder]="site.localize(descriptionPlaceholder)"
                    ></textarea>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-foreground">
                      {{ site.localize(objectivesFieldLabel) }}
                    </label>
                    <textarea
                      class="textarea-shell min-h-28"
                      [(ngModel)]="form.objectifs"
                      [placeholder]="site.localize(objectivesPlaceholder)"
                    ></textarea>
                  </div>
                </div>
              </section>

              @if (editorProject()) {
                <section class="rounded-[26px] border border-border bg-muted/20 p-4">
                  <div>
                    <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                      {{ site.localize(teamSectionTitle) }}
                    </h4>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {{ site.localize(teamSectionSubtitle) }}
                    </p>
                  </div>

                  <div class="mt-4 grid gap-3 md:grid-cols-[1fr_0.8fr_auto]">
                    <select
                      class="select-shell"
                      [ngModel]="selectedMemberId()"
                      (ngModelChange)="selectedMemberId.set($event)"
                    >
                      <option value="">{{ site.localize(selectMemberPlaceholder) }}</option>
                      @for (member of assignableMembers(); track member.id) {
                        <option [value]="member.id">{{ member.nomComplet }}</option>
                      }
                    </select>

                    <input
                      class="input-shell"
                      [ngModel]="memberRoleDraft()"
                      (ngModelChange)="memberRoleDraft.set($event)"
                      [placeholder]="site.localize(memberRolePlaceholder)"
                    />

                    <button type="button" class="btn-outline" (click)="assignMember()">
                      {{ site.localize(assignMemberLabel) }}
                    </button>
                  </div>

                  <div class="mt-4 space-y-3">
                    @for (member of editorProject()!.membres || []; track member.utilisateur?.id) {
                      <div class="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div class="font-medium text-foreground">
                            {{ member.utilisateur?.nomComplet || site.localize(memberFallbackLabel) }}
                          </div>
                          <div class="mt-1 text-sm text-muted-foreground">
                            {{ member.roleDansProjet || site.localize(memberRoleFallbackLabel) }}
                            •
                            {{ site.localize(addedOnLabel) }} {{ formatDate(member.ajouteLe) }}
                          </div>
                        </div>

                        @if (member.utilisateur?.id) {
                          <button
                            type="button"
                            class="btn-outline"
                            (click)="removeMember(member.utilisateur?.id || '')"
                          >
                            {{ site.localize(removeMemberLabel) }}
                          </button>
                        }
                      </div>
                    } @empty {
                      <div class="text-sm text-muted-foreground">
                        {{ site.localize(noAssignedMembersLabel) }}
                      </div>
                    }
                  </div>
                </section>
              } @else {
                <section class="rounded-[26px] border border-dashed border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                  {{ site.localize(teamSectionCreateHint) }}
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

            <footer class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
              <div class="text-xs text-muted-foreground">
                {{ site.localize(modalFooterHint) }}
              </div>

              <div class="flex flex-wrap items-center gap-2">
                @if (editorProject() && !isHistoricProject(editorProject()!)) {
                  <button type="button" class="btn-outline" (click)="archiveSelectedProject()">
                    {{ site.localize(archiveProjectLabel) }}
                  </button>
                }

                <button type="button" class="btn-outline" (click)="closeProjectForm()">
                  {{ site.localize(cancelLabel) }}
                </button>

                <button type="button" class="btn-secondary" (click)="saveProject()">
                  {{ editorProject() ? site.localize(saveChangesLabel) : site.localize(createProjectActionLabel) }}
                </button>
              </div>
            </footer>
          </section>
        </div>
      </div>
    }
  `,
})
export class ProjectsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly icons = sharedIcons;
  readonly loading = signal(false);
  readonly projects = signal<Project[]>([]);
  readonly members = signal<UtilisateurComplet[]>([]);
  readonly selectedProject = signal<Project | null>(null);
  readonly isProjectFormOpen = signal(false);
  readonly editorProjectId = signal<number | null>(null);
  readonly search = signal('');
  readonly selectedMemberId = signal('');
  readonly memberRoleDraft = signal('');
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly formatDate = formatDate;
  readonly editorTitleFieldId = 'project-title-field';
  readonly projectDialogTitleId = 'project-form-dialog-title';

  form = {
    titre: '',
    description: '',
    objectifs: '',
    dateDebut: '',
    dateFin: '',
    statut: 'EN_COURS',
  };

  readonly role = computed(() => this.auth.session()?.utilisateur.role || 'MEMBRE');
  readonly isLabHead = computed(() => this.role() === 'CHEF_LABO');
  readonly editorProject = computed(() => {
    const id = this.editorProjectId();
    if (!id) {
      return null;
    }

    return this.projects().find((project) => project.id === id) || null;
  });

  readonly pageDescription = computed(() =>
    this.isLabHead()
      ? this.site.localize(this.labHeadPageDescription)
      : this.site.localize(this.memberPageDescription),
  );

  readonly filteredProjects = computed(() => {
    const projects = this.projects();
    const q = this.search().trim().toLowerCase();
    if (!q) {
      return projects;
    }

    return projects.filter((project) =>
      [project.titre, project.description, project.objectifs || '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  });

  readonly activeProjectsCount = computed(
    () => this.projects().filter((item) => item.statut === 'EN_COURS' && !item.archive).length,
  );

  readonly historyProjects = computed(() =>
    [...this.projects()]
      .filter((project) => this.isHistoricProject(project))
      .sort((left, right) => this.projectTimestamp(right) - this.projectTimestamp(left))
      .slice(0, 5),
  );

  readonly assignableMembers = computed(() => {
    const assignedIds = new Set(
      (this.editorProject()?.membres || [])
        .map((member) => member.utilisateur?.id)
        .filter(Boolean),
    );

    return this.members().filter((member) => !assignedIds.has(member.id));
  });

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const projects = this.projects();
    const active = projects.filter((item) => item.statut === 'EN_COURS' && !item.archive).length;
    const finished = projects.filter((item) => item.statut === 'TERMINE').length;
    const archived = projects.filter((item) => item.archive || item.statut === 'ARCHIVE').length;
    const membersCount = new Set(
      projects.flatMap((project) =>
        this.safeProjectMembers(project)
          .map((member) => member.utilisateur?.id)
          .filter(Boolean) as string[],
      ),
    ).size;

    return [
      {
        label: this.site.localize(this.activeProjectsCardLabel),
        value: active,
        meta: this.site.localize(this.activeProjectsCardMeta),
      },
      {
        label: this.site.localize(this.finishedProjectsCardLabel),
        value: finished,
        meta: this.site.localize(this.finishedProjectsCardMeta),
      },
      {
        label: this.site.localize(this.archivesCardLabel),
        value: archived,
        meta: this.site.localize(this.archivesCardMeta),
      },
      {
        label: this.site.localize(this.membersCardLabel),
        value: membersCount,
        meta: this.site.localize(this.membersCardMeta),
      },
    ];
  });

  readonly completionRate = computed(() => {
    const checks = [
      this.form.titre.trim().length >= 8,
      this.form.description.trim().length >= 40,
      this.form.objectifs.trim().length >= 20,
      Boolean(this.form.statut),
      Boolean(this.form.dateDebut),
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  });

  readonly heroEyebrowLabHead = {
    fr: 'Pilotage scientifique',
    en: 'Scientific steering',
    ar: 'القيادة العلمية',
  };
  readonly heroEyebrowMember = {
    fr: 'Vue projets',
    en: 'Projects view',
    ar: 'عرض المشاريع',
  };
  readonly projectsTitle = {
    fr: 'Projets de recherche',
    en: 'Research projects',
    ar: 'مشاريع البحث',
  };
  readonly labHeadPageDescription = {
    fr: 'Structurez, suivez et faites évoluer les projets scientifiques du laboratoire dans une interface claire et centrée sur le pilotage.',
    en: 'Structure, monitor, and evolve the laboratory’s research projects in a clear interface focused on stewardship.',
    ar: 'نظّم مشاريع البحث في المختبر وتابعها وطوّرها من خلال واجهة واضحة تركّز على القيادة العلمية.',
  };
  readonly memberPageDescription = {
    fr: 'Consultez les projets de recherche, leurs objectifs, leur calendrier et les membres impliqués.',
    en: 'Review research projects, their goals, their timeline, and the members involved.',
    ar: 'اطّلع على مشاريع البحث وأهدافها وجدولها الزمني والأعضاء المشاركين فيها.',
  };
  readonly newProjectLabel = {
    fr: 'Nouveau projet',
    en: 'New project',
    ar: 'مشروع جديد',
  };
  readonly totalProjectsPillLabel = {
    fr: 'Total projets',
    en: 'Total projects',
    ar: 'إجمالي المشاريع',
  };
  readonly activeProjectsPillLabel = {
    fr: 'Actifs',
    en: 'Active',
    ar: 'النشطة',
  };
  readonly historyProjectsPillLabel = {
    fr: 'Historique',
    en: 'History',
    ar: 'الأرشيف',
  };
  readonly activeProjectsCardLabel = {
    fr: 'Projets actifs',
    en: 'Active projects',
    ar: 'المشاريع النشطة',
  };
  readonly activeProjectsCardMeta = {
    fr: 'En cours de pilotage',
    en: 'Currently being managed',
    ar: 'قيد المتابعة',
  };
  readonly finishedProjectsCardLabel = {
    fr: 'Projets terminés',
    en: 'Finished projects',
    ar: 'المشاريع المنجزة',
  };
  readonly finishedProjectsCardMeta = {
    fr: 'Clôturés ou finalisés',
    en: 'Closed or completed',
    ar: 'المغلقة أو المكتملة',
  };
  readonly archivesCardLabel = {
    fr: 'Archives',
    en: 'Archives',
    ar: 'الأرشيف',
  };
  readonly archivesCardMeta = {
    fr: 'Historique du laboratoire',
    en: 'Laboratory history',
    ar: 'سجل المختبر',
  };
  readonly membersCardLabel = {
    fr: 'Membres engagés',
    en: 'Engaged members',
    ar: 'الأعضاء المشاركون',
  };
  readonly membersCardMeta = {
    fr: 'Participants affectés',
    en: 'Assigned participants',
    ar: 'الأعضاء المعيّنون',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher un projet par titre, description ou objectifs...',
    en: 'Search by title, description, or objectives...',
    ar: 'ابحث عن مشروع حسب العنوان أو الوصف أو الأهداف...',
  };
  readonly searchResultsLabel = {
    fr: 'résultats visibles',
    en: 'visible results',
    ar: 'نتائج ظاهرة',
  };
  readonly projectListTitle = {
    fr: 'Liste des projets',
    en: 'Projects list',
    ar: 'قائمة المشاريع',
  };
  readonly projectListSubtitle = {
    fr: 'Sélectionnez un projet pour afficher son résumé détaillé ou le modifier depuis une fenêtre dédiée.',
    en: 'Select a project to review its detailed summary or edit it from a dedicated modal.',
    ar: 'اختر مشروعًا لعرض ملخصه التفصيلي أو تعديله من خلال نافذة مخصّصة.',
  };
  readonly projectListChipLabel = {
    fr: 'Vue principale',
    en: 'Main view',
    ar: 'العرض الرئيسي',
  };
  readonly loadingProjectsLabel = {
    fr: 'Chargement des projets en cours...',
    en: 'Loading projects...',
    ar: 'جارٍ تحميل المشاريع...',
  };
  readonly projectLeadLabel = {
    fr: 'Chef de projet',
    en: 'Project lead',
    ar: 'قائد المشروع',
  };
  readonly membersLabel = {
    fr: 'Membres',
    en: 'Members',
    ar: 'الأعضاء',
  };
  readonly objectivesPresenceLabel = {
    fr: 'Objectifs',
    en: 'Objectives',
    ar: 'الأهداف',
  };
  readonly yesLabel = {
    fr: 'Oui',
    en: 'Yes',
    ar: 'نعم',
  };
  readonly noLabel = {
    fr: 'Non',
    en: 'No',
    ar: 'لا',
  };
  readonly progressLabel = {
    fr: 'Progression estimée',
    en: 'Estimated progress',
    ar: 'التقدّم التقديري',
  };
  readonly noDescriptionLabel = {
    fr: 'Aucune description renseignée.',
    en: 'No description provided.',
    ar: 'لا يوجد وصف مسجّل.',
  };
  readonly noProjectsLabel = {
    fr: 'Aucun projet ne correspond à votre recherche.',
    en: 'No project matches your search.',
    ar: 'لا يوجد مشروع يطابق بحثك.',
  };
  readonly projectSummaryChipLabel = {
    fr: 'Résumé projet',
    en: 'Project summary',
    ar: 'ملخص المشروع',
  };
  readonly editProjectLabel = {
    fr: 'Modifier',
    en: 'Edit',
    ar: 'تعديل',
  };
  readonly archiveProjectLabel = {
    fr: 'Archiver',
    en: 'Archive',
    ar: 'أرشفة',
  };
  readonly statusLabel = {
    fr: 'Statut',
    en: 'Status',
    ar: 'الحالة',
  };
  readonly timelineLabel = {
    fr: 'Calendrier',
    en: 'Timeline',
    ar: 'الجدول الزمني',
  };
  readonly scientificFrameTitle = {
    fr: 'Cadre scientifique',
    en: 'Scientific scope',
    ar: 'الإطار العلمي',
  };
  readonly noObjectivesLabel = {
    fr: 'Aucun objectif détaillé.',
    en: 'No detailed objective.',
    ar: 'لا توجد أهداف مفصّلة.',
  };
  readonly assignedMembersTitle = {
    fr: 'Membres affectés',
    en: 'Assigned members',
    ar: 'الأعضاء المعيّنون',
  };
  readonly memberFallbackLabel = {
    fr: 'Membre',
    en: 'Member',
    ar: 'عضو',
  };
  readonly memberRoleFallbackLabel = {
    fr: 'Rôle non précisé',
    en: 'Role not specified',
    ar: 'الدور غير محدد',
  };
  readonly noAssignedMembersLabel = {
    fr: 'Aucun membre affecté à ce projet.',
    en: 'No member is assigned to this project.',
    ar: 'لا يوجد أي عضو معيّن لهذا المشروع.',
  };
  readonly selectProjectPromptLabel = {
    fr: 'Sélectionnez un projet pour afficher son résumé, son équipe et son historique.',
    en: 'Select a project to review its summary, team, and history.',
    ar: 'اختر مشروعًا لعرض ملخصه وفريقه وتاريخه.',
  };
  readonly historyTitle = {
    fr: 'Historique et archives',
    en: 'History and archives',
    ar: 'السجل والأرشيف',
  };
  readonly historySubtitle = {
    fr: 'Retrouvez les projets finalisés ou archivés pour garder une vue continue sur l’activité du laboratoire.',
    en: 'Review completed or archived projects to keep a continuous view of the laboratory activity.',
    ar: 'اطّلع على المشاريع المكتملة أو المؤرشفة للحفاظ على رؤية مستمرة لنشاط المختبر.',
  };
  readonly lastUpdateLabel = {
    fr: 'Dernière activité',
    en: 'Last activity',
    ar: 'آخر نشاط',
  };
  readonly noHistoryLabel = {
    fr: 'Aucun projet archivé ou terminé pour le moment.',
    en: 'No archived or completed project yet.',
    ar: 'لا يوجد مشروع مكتمل أو مؤرشف حاليًا.',
  };
  readonly closeProjectFormLabel = {
    fr: 'Fermer le formulaire projet',
    en: 'Close project form',
    ar: 'إغلاق نموذج المشروع',
  };
  readonly modalEyebrowLabel = {
    fr: 'Formulaire projet',
    en: 'Project form',
    ar: 'نموذج المشروع',
  };
  readonly createChipLabel = {
    fr: 'Création',
    en: 'Creation',
    ar: 'إنشاء',
  };
  readonly editingChipLabel = {
    fr: 'Édition',
    en: 'Editing',
    ar: 'تعديل',
  };
  readonly formProgressLabel = {
    fr: 'Progression du formulaire',
    en: 'Form completion',
    ar: 'تقدّم النموذج',
  };
  readonly identificationSectionTitle = {
    fr: 'Identification',
    en: 'Identification',
    ar: 'التعريف',
  };
  readonly identificationSectionSubtitle = {
    fr: 'Définissez le titre, le statut et les dates de référence du projet.',
    en: 'Define the project title, status, and reference dates.',
    ar: 'حدّد عنوان المشروع وحالته وتواريخه المرجعية.',
  };
  readonly projectTitleFieldLabel = {
    fr: 'Titre du projet',
    en: 'Project title',
    ar: 'عنوان المشروع',
  };
  readonly projectTitlePlaceholder = {
    fr: 'Titre officiel du projet',
    en: 'Official project title',
    ar: 'العنوان الرسمي للمشروع',
  };
  readonly startDateLabel = {
    fr: 'Date de début',
    en: 'Start date',
    ar: 'تاريخ البداية',
  };
  readonly endDateLabel = {
    fr: 'Date de fin',
    en: 'End date',
    ar: 'تاريخ النهاية',
  };
  readonly scientificSectionTitle = {
    fr: 'Cadre scientifique',
    en: 'Scientific framework',
    ar: 'الإطار العلمي',
  };
  readonly scientificSectionSubtitle = {
    fr: 'Précisez le contexte, la valeur scientifique et les objectifs du projet.',
    en: 'Clarify the context, scientific value, and objectives of the project.',
    ar: 'وضّح سياق المشروع وقيمته العلمية وأهدافه.',
  };
  readonly descriptionFieldLabel = {
    fr: 'Description',
    en: 'Description',
    ar: 'الوصف',
  };
  readonly descriptionPlaceholder = {
    fr: 'Contexte, périmètre et apport scientifique du projet',
    en: 'Context, scope, and scientific contribution of the project',
    ar: 'سياق المشروع ونطاقه وإسهامه العلمي',
  };
  readonly objectivesFieldLabel = {
    fr: 'Objectifs',
    en: 'Objectives',
    ar: 'الأهداف',
  };
  readonly objectivesPlaceholder = {
    fr: 'Objectifs, livrables et axes de recherche',
    en: 'Objectives, deliverables, and research tracks',
    ar: 'الأهداف والمخرجات ومحاور البحث',
  };
  readonly teamSectionTitle = {
    fr: 'Équipe projet',
    en: 'Project team',
    ar: 'فريق المشروع',
  };
  readonly teamSectionSubtitle = {
    fr: 'Affectez les membres du laboratoire et précisez leur rôle dans le projet.',
    en: 'Assign laboratory members and define their role in the project.',
    ar: 'عيّن أعضاء المختبر وحدّد دور كل منهم داخل المشروع.',
  };
  readonly selectMemberPlaceholder = {
    fr: 'Sélectionner un membre',
    en: 'Select a member',
    ar: 'اختر عضوًا',
  };
  readonly memberRolePlaceholder = {
    fr: 'Rôle dans le projet',
    en: 'Role in the project',
    ar: 'الدور في المشروع',
  };
  readonly assignMemberLabel = {
    fr: 'Affecter',
    en: 'Assign',
    ar: 'تعيين',
  };
  readonly removeMemberLabel = {
    fr: 'Retirer',
    en: 'Remove',
    ar: 'إزالة',
  };
  readonly addedOnLabel = {
    fr: 'Ajouté le',
    en: 'Added on',
    ar: 'أضيف في',
  };
  readonly teamSectionCreateHint = {
    fr: 'Créez d’abord le projet pour pouvoir affecter les membres et gérer leurs rôles.',
    en: 'Create the project first to assign members and manage their roles.',
    ar: 'أنشئ المشروع أولاً حتى تتمكن من تعيين الأعضاء وإدارة أدوارهم.',
  };
  readonly modalFooterHint = {
    fr: 'Les informations sont enregistrées dans le même workflow projet du laboratoire.',
    en: 'Information is saved in the same laboratory project workflow.',
    ar: 'تُحفَظ المعلومات ضمن نفس مسار عمل مشاريع المختبر.',
  };
  readonly cancelLabel = {
    fr: 'Fermer',
    en: 'Close',
    ar: 'إغلاق',
  };
  readonly saveChangesLabel = {
    fr: 'Mettre à jour',
    en: 'Update project',
    ar: 'تحديث المشروع',
  };
  readonly createProjectActionLabel = {
    fr: 'Créer le projet',
    en: 'Create project',
    ar: 'إنشاء المشروع',
  };
  readonly creatorFallbackLabel = {
    fr: 'Non renseigné',
    en: 'Not provided',
    ar: 'غير مذكور',
  };

  async ngOnInit() {
    await this.loadProjects();
  }

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  async loadProjects(preferredProjectId: number | null = this.selectedProject()?.id || null) {
    if (!this.token) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const currentEditorId = this.editorProjectId();
      const [projectsResponse, membersResponse] = await Promise.all([
        api.listProjects(this.token, { limit: 50 }),
        api.listMembers(this.token, { limit: 50 }),
      ]);

      const normalizedProjects = this.normalizeProjects(projectsResponse?.elements);
      const normalizedMembers = Array.isArray(membersResponse?.elements)
        ? membersResponse.elements
        : [];

      this.projects.set(normalizedProjects);
      this.members.set(normalizedMembers);

      let nextSelected: Project | null = null;
      if (preferredProjectId) {
        nextSelected =
          normalizedProjects.find((project) => project.id === preferredProjectId) || null;
      }

      if (!nextSelected && normalizedProjects.length) {
        nextSelected = normalizedProjects[0];
      }

      this.selectedProject.set(nextSelected);

      if (currentEditorId) {
        const refreshedEditor =
          normalizedProjects.find((project) => project.id === currentEditorId) || null;
        if (refreshedEditor) {
          this.editorProjectId.set(refreshedEditor.id);
          this.fillFormFromProject(refreshedEditor);
        } else {
          this.editorProjectId.set(null);
          this.resetForm();
        }
      }
    } catch (error) {
      this.projects.set([]);
      this.members.set([]);
      this.selectedProject.set(null);
      this.editorProjectId.set(null);
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Impossible de charger les projets.',
              en: 'Unable to load projects.',
              ar: 'تعذّر تحميل المشاريع.',
            }),
      );
    } finally {
      this.loading.set(false);
    }
  }

  private normalizeProjects(rawProjects: unknown): Project[] {
    if (!Array.isArray(rawProjects)) {
      return [];
    }

    return rawProjects.map((project) => this.normalizeProject(project as Partial<Project>));
  }

  private normalizeProject(project: Partial<Project>): Project {
    return {
      id: Number(project.id) || 0,
      titre: project.titre || '',
      description: project.description || '',
      objectifs: project.objectifs || null,
      dateDebut: project.dateDebut || null,
      dateFin: project.dateFin || null,
      statut: project.statut || 'EN_COURS',
      archive: Boolean(project.archive),
      creeLe: project.creeLe || '',
      modifieLe: project.modifieLe || '',
      createur: project.createur || null,
      equipes: Array.isArray(project.equipes) ? project.equipes : [],
      membres: this.safeProjectMembers(project),
    };
  }

  private safeProjectMembers(project: Partial<Project> | null | undefined) {
    return Array.isArray(project?.membres) ? project.membres : [];
  }

  projectMemberCount(project: Partial<Project> | null | undefined) {
    return this.safeProjectMembers(project).length;
  }

  selectProject(project: Project) {
    this.selectedProject.set(project);
  }

  startNew() {
    this.editorProjectId.set(null);
    this.resetForm();
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.isProjectFormOpen.set(true);
    this.focusTitleField();
  }

  openEditModal(project: Project | null = this.selectedProject()) {
    if (!project) {
      return;
    }

    this.selectedProject.set(project);
    this.editorProjectId.set(project.id);
    this.fillFormFromProject(project);
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.isProjectFormOpen.set(true);
    this.focusTitleField();
  }

  closeProjectForm() {
    this.isProjectFormOpen.set(false);
    this.editorProjectId.set(null);
    this.errorMessage.set('');
  }

  private fillFormFromProject(project: Project) {
    this.form = {
      titre: project.titre,
      description: project.description,
      objectifs: project.objectifs || '',
      dateDebut: project.dateDebut ? project.dateDebut.slice(0, 10) : '',
      dateFin: project.dateFin ? project.dateFin.slice(0, 10) : '',
      statut: project.statut,
    };
  }

  private resetForm() {
    this.form = {
      titre: '',
      description: '',
      objectifs: '',
      dateDebut: '',
      dateFin: '',
      statut: 'EN_COURS',
    };
    this.selectedMemberId.set('');
    this.memberRoleDraft.set('');
  }

  private focusTitleField() {
    if (typeof document === 'undefined') {
      return;
    }

    window.setTimeout(() => {
      const titleInput = document.getElementById(
        this.editorTitleFieldId,
      ) as HTMLInputElement | null;
      titleInput?.focus({ preventScroll: true });
    }, 220);
  }

  async saveProject() {
    if (!this.token || !this.isLabHead()) {
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');

    if (this.form.titre.trim().length < 8) {
      this.errorMessage.set(
        this.site.localize({
          fr: 'Le titre du projet doit contenir au moins 8 caractères.',
          en: 'The project title must contain at least 8 characters.',
          ar: 'يجب أن يحتوي عنوان المشروع على 8 أحرف على الأقل.',
        }),
      );
      return;
    }

    if (this.form.description.trim().length < 40) {
      this.errorMessage.set(
        this.site.localize({
          fr: 'La description doit contenir au moins 40 caractères.',
          en: 'The description must contain at least 40 characters.',
          ar: 'يجب أن يحتوي الوصف على 40 حرفًا على الأقل.',
        }),
      );
      return;
    }

    if (this.form.objectifs.trim().length < 20) {
      this.errorMessage.set(
        this.site.localize({
          fr: 'Les objectifs doivent contenir au moins 20 caractères.',
          en: 'The objectives must contain at least 20 characters.',
          ar: 'يجب أن تحتوي الأهداف على 20 حرفًا على الأقل.',
        }),
      );
      return;
    }

    if (this.form.dateDebut && this.form.dateFin && this.form.dateDebut > this.form.dateFin) {
      this.errorMessage.set(
        this.site.localize({
          fr: 'La date de fin doit être postérieure ou égale à la date de début.',
          en: 'The end date must be later than or equal to the start date.',
          ar: 'يجب أن يكون تاريخ النهاية بعد تاريخ البداية أو مساويًا له.',
        }),
      );
      return;
    }

    const payload = {
      titre: this.form.titre.trim(),
      description: this.form.description.trim(),
      objectifs: this.form.objectifs.trim(),
      dateDebut: this.form.dateDebut || undefined,
      dateFin: this.form.dateFin || undefined,
      statut: this.form.statut,
    };

    try {
      const editor = this.editorProject();
      const response = editor
        ? await api.updateProject(this.token, editor.id, payload)
        : await api.createProject(this.token, payload);

      const normalized = this.normalizeProject(response);
      this.editorProjectId.set(normalized.id);
      this.selectedProject.set(normalized);
      this.statusMessage.set(
        this.site.localize(
          editor
            ? {
                fr: 'Projet mis à jour.',
                en: 'Project updated.',
                ar: 'تم تحديث المشروع.',
              }
            : {
                fr: 'Projet créé avec succès.',
                en: 'Project created successfully.',
                ar: 'تم إنشاء المشروع بنجاح.',
              },
        ),
      );

      await this.loadProjects(normalized.id);
      this.isProjectFormOpen.set(true);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur lors de l’enregistrement du projet.',
              en: 'Unable to save the project.',
              ar: 'تعذّر حفظ المشروع.',
            }),
      );
    }
  }

  async archiveSelectedProject() {
    const project = this.editorProject() || this.selectedProject();
    if (!this.token || !project || !this.isLabHead()) {
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      await api.archiveProject(this.token, project.id);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Projet archivé.',
          en: 'Project archived.',
          ar: 'تمت أرشفة المشروع.',
        }),
      );
      this.isProjectFormOpen.set(false);
      this.editorProjectId.set(null);
      await this.loadProjects(project.id);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Archivage impossible.',
              en: 'Unable to archive the project.',
              ar: 'تعذّرت أرشفة المشروع.',
            }),
      );
    }
  }

  async assignMember() {
    const project = this.editorProject() || this.selectedProject();
    const memberId = this.selectedMemberId();
    if (!this.token || !project || !this.isLabHead()) {
      return;
    }

    if (!memberId) {
      this.errorMessage.set(
        this.site.localize({
          fr: 'Veuillez sélectionner un membre à affecter.',
          en: 'Please select a member to assign.',
          ar: 'يرجى اختيار عضو لتعيينه.',
        }),
      );
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      await api.assignProjectMember(this.token, project.id, {
        utilisateurId: memberId,
        roleDansProjet: this.memberRoleDraft().trim() || undefined,
      });
      this.statusMessage.set(
        this.site.localize({
          fr: 'Membre affecté au projet.',
          en: 'Member assigned to the project.',
          ar: 'تم تعيين العضو في المشروع.',
        }),
      );
      this.selectedMemberId.set('');
      this.memberRoleDraft.set('');
      await this.loadProjects(project.id);
      this.isProjectFormOpen.set(true);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Affectation impossible.',
              en: 'Unable to assign the member.',
              ar: 'تعذّر تعيين العضو.',
            }),
      );
    }
  }

  async removeMember(userId: string) {
    const project = this.editorProject() || this.selectedProject();
    if (!this.token || !project || !this.isLabHead()) {
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      await api.removeProjectMember(this.token, project.id, userId);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Membre retiré du projet.',
          en: 'Member removed from the project.',
          ar: 'تمت إزالة العضو من المشروع.',
        }),
      );
      await this.loadProjects(project.id);
      this.isProjectFormOpen.set(true);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Suppression impossible.',
              en: 'Unable to remove the member.',
              ar: 'تعذّرت إزالة العضو.',
            }),
      );
    }
  }

  projectProgress(project: Project) {
    if (project.statut === 'TERMINE') {
      return 100;
    }

    if (project.statut === 'ARCHIVE' || project.archive) {
      return 95;
    }

    if (!project.dateDebut || !project.dateFin) {
      return 45;
    }

    const start = new Date(project.dateDebut).getTime();
    const end = new Date(project.dateFin).getTime();
    const now = Date.now();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return 45;
    }

    const value = Math.round(((now - start) / (end - start)) * 100);
    return Math.max(5, Math.min(value, 95));
  }

  isHistoricProject(project: Project) {
    return project.archive || project.statut === 'ARCHIVE' || project.statut === 'TERMINE';
  }

  projectStatusLabel(status: string) {
    const labels: Record<string, string> = {
      EN_COURS: this.site.localize({
        fr: 'En cours',
        en: 'In progress',
        ar: 'قيد التنفيذ',
      }),
      TERMINE: this.site.localize({
        fr: 'Terminé',
        en: 'Completed',
        ar: 'مكتمل',
      }),
      ARCHIVE: this.site.localize({
        fr: 'Archivé',
        en: 'Archived',
        ar: 'مؤرشف',
      }),
    };

    return labels[status] || status;
  }

  displayCreator(project: Project) {
    return project.createur?.nomComplet || this.site.localize(this.creatorFallbackLabel);
  }

  projectRangeLabel(project: Project) {
    const start = project.dateDebut
      ? formatDate(project.dateDebut)
      : this.site.localize({
          fr: 'Début non défini',
          en: 'No start date',
          ar: 'لا يوجد تاريخ بداية',
        });
    const end = project.dateFin
      ? formatDate(project.dateFin)
      : this.site.localize({
          fr: 'Fin non définie',
          en: 'No end date',
          ar: 'لا يوجد تاريخ نهاية',
        });

    return `${start} - ${end}`;
  }

  historyTimestampLabel(project: Project) {
    return formatDate(project.modifieLe || project.creeLe);
  }

  formModalTitle() {
    return this.site.localize(
      this.editorProject()
        ? {
            fr: 'Modifier le projet',
            en: 'Edit project',
            ar: 'تعديل المشروع',
          }
        : {
            fr: 'Nouveau projet de recherche',
            en: 'New research project',
            ar: 'مشروع بحث جديد',
          },
    );
  }

  formModalDescription() {
    return this.site.localize(
      this.editorProject()
        ? {
            fr: 'Mettez à jour les informations scientifiques, le calendrier et l’équipe du projet dans une fenêtre dédiée.',
            en: 'Update the project scientific information, timeline, and team in a dedicated modal.',
            ar: 'حدّث المعلومات العلمية للمشروع وجدوله الزمني وفريقه داخل نافذة مخصّصة.',
          }
        : {
            fr: 'Créez un nouveau projet dans une fenêtre centrée, sans surcharger la page principale.',
            en: 'Create a new project in a centered modal without crowding the main page.',
            ar: 'أنشئ مشروعًا جديدًا داخل نافذة مركزية من دون ازدحام الصفحة الرئيسية.',
          },
    );
  }

  private projectTimestamp(project: Project) {
    const value = new Date(project.modifieLe || project.creeLe || 0).getTime();
    return Number.isFinite(value) ? value : 0;
  }
}

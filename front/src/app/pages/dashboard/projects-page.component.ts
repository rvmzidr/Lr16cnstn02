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

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">{{ site.localize(projectsTitle) }}</h2>
          <p class="app-page-description">
            {{ pageDescription() }}
          </p>
        </div>
        @if (isLabHead()) {
          <button class="btn-primary" (click)="startNew()">
            {{ site.localize(newProjectLabel) }}
          </button>
        }
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

      <div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div class="surface-card space-y-4 p-6">
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

          <div class="space-y-3">
            @for (project of filteredProjects(); track project.id) {
              <button
                type="button"
                class="w-full rounded-2xl border px-4 py-4 text-left transition"
                [class.border-primary]="selectedProject()?.id === project.id"
                [class.bg-primary/5]="selectedProject()?.id === project.id"
                [class.border-border]="selectedProject()?.id !== project.id"
                [class.bg-card]="selectedProject()?.id !== project.id"
                (click)="selectProject(project)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate font-semibold text-foreground">
                      {{ project.titre }}
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      PI: {{ project.createur?.nomComplet || 'Non renseigne' }}
                    </div>
                  </div>
                  <span class="badge-soft">{{ project.statut }}</span>
                </div>

                <div class="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    Timeline:
                    {{ project.dateDebut ? formatDate(project.dateDebut) : 'N/A' }}
                    -
                    {{ project.dateFin ? formatDate(project.dateFin) : 'N/A' }}
                  </div>
                  <div>
                    Membres: {{ project.membres.length }} • Budget: N/A
                  </div>
                </div>

                <div class="mt-3 h-2 rounded-full bg-muted">
                  <div
                    class="h-2 rounded-full bg-primary transition-all duration-300"
                    [style.width.%]="projectProgress(project)"
                  ></div>
                </div>

                <div class="mt-2 text-[11px] text-muted-foreground">
                  Progression estimee: {{ projectProgress(project) }}%
                </div>

                <div class="mt-3 line-clamp-3 text-sm text-muted-foreground">
                  {{ project.description }}
                </div>
              </button>
            } @empty {
              <div class="empty-state">Aucun projet disponible.</div>
            }
          </div>
        </div>

        @if (isLabHead()) {
          <div class="surface-card space-y-5 p-6 lg:p-8">
            <div class="space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="tag-chip">
                  {{ selectedProject() ? 'Pilotage projet' : 'Creation projet' }}
                </div>
                <div class="text-xs text-muted-foreground">
                  Progression formulaire: {{ completionRate() }}%
                </div>
              </div>

              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="completionRate()"></div>
              </div>

              <h3 class="text-2xl font-semibold text-foreground">
                {{ selectedProject() ? 'Modifier le projet' : 'Nouveau projet de recherche' }}
              </h3>
              <p class="text-sm text-muted-foreground">
                Renseignez les informations scientifiques, les dates et l'equipe projet.
              </p>
            </div>

            <div class="surface-muted space-y-4 p-4">
              <div>
                <h4 class="text-lg font-semibold text-foreground">Identification</h4>
                <p class="mt-1 text-sm text-muted-foreground">
                  Nom du projet, statut actuel et calendrier de reference.
                </p>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="md:col-span-2">
                  <label class="mb-2 block">Titre du projet</label>
                  <input
                    [(ngModel)]="form.titre"
                    [id]="editorTitleFieldId"
                    class="input-shell"
                    placeholder="Titre officiel du projet"
                  />
                </div>

                <div>
                  <label class="mb-2 block">Statut</label>
                  <select class="select-shell" [(ngModel)]="form.statut">
                    <option value="EN_COURS">EN_COURS</option>
                    <option value="TERMINE">TERMINE</option>
                    <option value="ARCHIVE">ARCHIVE</option>
                  </select>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label class="mb-2 block">Date debut</label>
                    <input type="date" class="input-shell" [(ngModel)]="form.dateDebut" />
                  </div>
                  <div>
                    <label class="mb-2 block">Date fin</label>
                    <input type="date" class="input-shell" [(ngModel)]="form.dateFin" />
                  </div>
                </div>
              </div>
            </div>

            <div class="surface-muted space-y-4 p-4">
              <div>
                <h4 class="text-lg font-semibold text-foreground">Cadre scientifique</h4>
                <p class="mt-1 text-sm text-muted-foreground">
                  Definissez la finalite du projet et ses objectifs de recherche.
                </p>
              </div>

              <div>
                <label class="mb-2 block">Description</label>
                <textarea
                  class="textarea-shell"
                  [(ngModel)]="form.description"
                  placeholder="Contexte, perimetre et valeur du projet"
                ></textarea>
              </div>

              <div>
                <label class="mb-2 block">Objectifs</label>
                <textarea
                  class="textarea-shell"
                  [(ngModel)]="form.objectifs"
                  placeholder="Objectifs, livrables, axes experimentaux"
                ></textarea>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <button type="button" class="btn-secondary" (click)="saveProject()">
                {{ selectedProject() ? 'Mettre a jour' : 'Creer le projet' }}
              </button>
              <button type="button" class="btn-outline" (click)="startNew()">
                Nouveau formulaire
              </button>
              @if (selectedProject()) {
                <button type="button" class="btn-outline" (click)="archiveSelectedProject()">
                  Archiver
                </button>
              }
            </div>

            @if (selectedProject()) {
              <div class="surface-muted space-y-4 p-4">
                <div>
                  <h4 class="text-lg font-semibold text-foreground">Equipe projet</h4>
                  <p class="mt-1 text-sm text-muted-foreground">
                    Affectez les membres du laboratoire et precisez leur role dans le projet.
                  </p>
                </div>

                <div class="grid gap-3 md:grid-cols-[1fr_0.8fr_auto]">
                  <select
                    class="select-shell"
                    [ngModel]="selectedMemberId()"
                    (ngModelChange)="selectedMemberId.set($event)"
                  >
                    <option value="">Selectionner un membre</option>
                    @for (member of assignableMembers(); track member.id) {
                      <option [value]="member.id">{{ member.nomComplet }}</option>
                    }
                  </select>

                  <input
                    class="input-shell"
                    [ngModel]="memberRoleDraft()"
                    (ngModelChange)="memberRoleDraft.set($event)"
                    placeholder="Role dans le projet"
                  />

                  <button type="button" class="btn-outline" (click)="assignMember()">
                    Affecter
                  </button>
                </div>

                <div class="space-y-3">
                  @for (member of selectedProject()?.membres || []; track member.utilisateur?.id) {
                    <div class="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div class="font-medium text-foreground">
                          {{ member.utilisateur?.nomComplet || 'Membre' }}
                        </div>
                        <div class="mt-1 text-sm text-muted-foreground">
                          {{ member.roleDansProjet || 'Role non precise' }} •
                          ajoute le {{ formatDate(member.ajouteLe) }}
                        </div>
                      </div>

                      @if (member.utilisateur?.id) {
                        <button
                          type="button"
                          class="btn-outline"
                          (click)="removeMember(member.utilisateur?.id || '')"
                        >
                          Retirer
                        </button>
                      }
                    </div>
                  } @empty {
                    <div class="text-sm text-muted-foreground">
                      Aucun membre affecte a ce projet.
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        } @else if (selectedProject()) {
          <div class="surface-card space-y-5 p-6 lg:p-8">
            <div>
              <div class="tag-chip">Consultation projet</div>
              <h3 class="mt-3 text-2xl font-semibold text-foreground">
                {{ selectedProject()?.titre }}
              </h3>
              <p class="mt-2 text-sm text-muted-foreground">
                {{ selectedProject()?.description }}
              </p>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="rounded-2xl border border-border bg-card px-4 py-4">
                <div class="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Statut
                </div>
                <div class="mt-2 badge-soft inline-flex">
                  {{ selectedProject()?.statut }}
                </div>
              </div>

              <div class="rounded-2xl border border-border bg-card px-4 py-4">
                <div class="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Echeance
                </div>
                <div class="mt-2 text-foreground">
                  {{ selectedProject()?.dateFin ? formatDate(selectedProject()?.dateFin) : 'Non definie' }}
                </div>
              </div>
            </div>

            <div class="surface-muted space-y-3 p-4">
              <div class="text-lg font-semibold text-foreground">Objectifs</div>
              <div class="whitespace-pre-line text-sm text-muted-foreground">
                {{ selectedProject()?.objectifs || 'Aucun objectif detaille.' }}
              </div>
            </div>

            <div class="surface-muted space-y-3 p-4">
              <div class="text-lg font-semibold text-foreground">Membres affectes</div>
              <div class="space-y-2">
                @for (member of selectedProject()?.membres || []; track member.utilisateur?.id) {
                  <div class="rounded-xl border border-border bg-card px-4 py-3">
                    <div class="font-medium text-foreground">
                      {{ member.utilisateur?.nomComplet || 'Membre' }}
                    </div>
                    <div class="mt-1 text-sm text-muted-foreground">
                      {{ member.roleDansProjet || 'Role non precise' }}
                    </div>
                  </div>
                } @empty {
                  <div class="text-sm text-muted-foreground">Aucun membre affecte.</div>
                }
              </div>
            </div>
          </div>
        } @else {
          <div class="surface-card">
            <div class="empty-state">Selectionnez un projet pour afficher les details.</div>
          </div>
        }
      </div>

      @if (statusMessage()) {
        <div class="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {{ statusMessage() }}
        </div>
      }
      @if (errorMessage()) {
        <div class="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ errorMessage() }}
        </div>
      }
    </div>
  `,
})
export class ProjectsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly icons = sharedIcons;
  readonly projects = signal<Project[]>([]);
  readonly members = signal<UtilisateurComplet[]>([]);
  readonly selectedProject = signal<Project | null>(null);
  readonly search = signal('');
  readonly selectedMemberId = signal('');
  readonly memberRoleDraft = signal('');
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly formatDate = formatDate;
  readonly editorTitleFieldId = 'project-title-field';

  form = {
    titre: '',
    description: '',
    objectifs: '',
    dateDebut: '',
    dateFin: '',
    statut: 'EN_COURS',
  };

  readonly role = computed(
    () => this.auth.session()?.utilisateur.role || 'MEMBRE',
  );
  readonly isLabHead = computed(() => this.role() === 'CHEF_LABO');
  readonly pageDescription = computed(() =>
    this.isLabHead()
      ? 'Creer, structurer et piloter les projets scientifiques du laboratoire.'
      : 'Consulter les projets de recherche, leurs objectifs et les membres affectes.',
  );

  readonly filteredProjects = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) {
      return this.projects();
    }

    return this.projects().filter((project) =>
      [project.titre, project.description, project.objectifs || '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  });

  readonly assignableMembers = computed(() => {
    const assignedIds = new Set(
      (this.selectedProject()?.membres || [])
        .map((member) => member.utilisateur?.id)
        .filter(Boolean),
    );

    return this.members().filter((member) => !assignedIds.has(member.id));
  });

  readonly summaryCards = computed(() => {
    const projects = this.projects();
    const active = projects.filter((item) => item.statut === 'EN_COURS').length;
    const finished = projects.filter((item) => item.statut === 'TERMINE').length;
    const archived = projects.filter((item) => item.archive || item.statut === 'ARCHIVE').length;
    const membersCount = new Set(
      projects.flatMap((project) =>
        project.membres
          .map((member) => member.utilisateur?.id)
          .filter(Boolean) as string[],
      ),
    ).size;

    return [
      { label: 'Projets actifs', value: active, meta: 'En cours de pilotage' },
      { label: 'Projets termines', value: finished, meta: 'Clotures ou finalises' },
      { label: 'Archives', value: archived, meta: 'Historique laboratoire' },
      { label: 'Membres engages', value: membersCount, meta: 'Participants affectes' },
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

    return Math.round(
      (checks.filter(Boolean).length / checks.length) * 100,
    );
  });

  readonly projectsTitle = {
    fr: 'Projets de recherche',
    en: 'Research projects',
    ar: 'مشاريع البحث',
  };
  readonly newProjectLabel = {
    fr: 'Nouveau projet',
    en: 'New project',
    ar: 'مشروع جديد',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher un projet par titre, objectif ou description...',
    en: 'Search by project title, goal, or description...',
    ar: 'ابحث عن مشروع حسب العنوان أو الهدف أو الوصف...',
  };

  async ngOnInit() {
    await this.loadProjects();
  }

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  async loadProjects() {
    if (!this.token) {
      return;
    }

    this.errorMessage.set('');

    try {
      const currentProjectId = this.selectedProject()?.id || null;
      const [projectsResponse, membersResponse] = await Promise.all([
        api.listProjects(this.token, { limit: 50 }),
        api.listMembers(this.token, { limit: 50 }),
      ]);

      this.projects.set(projectsResponse.elements);
      this.members.set(membersResponse.elements);

      if (currentProjectId) {
        const refreshed = projectsResponse.elements.find(
          (project) => project.id === currentProjectId,
        );
        if (refreshed) {
          this.selectProject(refreshed);
          return;
        }
      }

      if (!this.selectedProject() && projectsResponse.elements.length) {
        this.selectProject(projectsResponse.elements[0]);
      }
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Erreur chargement projets.',
      );
    }
  }

  selectProject(project: Project) {
    this.selectedProject.set(project);
    this.form = {
      titre: project.titre,
      description: project.description,
      objectifs: project.objectifs || '',
      dateDebut: project.dateDebut ? project.dateDebut.slice(0, 10) : '',
      dateFin: project.dateFin ? project.dateFin.slice(0, 10) : '',
      statut: project.statut,
    };
    this.selectedMemberId.set('');
    this.memberRoleDraft.set('');
  }

  startNew() {
    this.selectedProject.set(null);
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
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.focusTitleField();
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
      this.errorMessage.set('Le titre du projet doit contenir au moins 8 caracteres.');
      return;
    }
    if (this.form.description.trim().length < 40) {
      this.errorMessage.set('La description doit contenir au moins 40 caracteres.');
      return;
    }
    if (this.form.objectifs.trim().length < 20) {
      this.errorMessage.set('Les objectifs doivent contenir au moins 20 caracteres.');
      return;
    }
    if (
      this.form.dateDebut &&
      this.form.dateFin &&
      this.form.dateDebut > this.form.dateFin
    ) {
      this.errorMessage.set(
        'La date de fin doit etre posterieure ou egale a la date de debut.',
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
      if (this.selectedProject()) {
        await api.updateProject(this.token, this.selectedProject()!.id, payload);
        this.statusMessage.set('Projet mis a jour.');
      } else {
        await api.createProject(this.token, payload);
        this.statusMessage.set('Projet cree avec succes.');
      }
      await this.loadProjects();
      if (!this.selectedProject()) {
        this.startNew();
      }
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Erreur enregistrement projet.',
      );
    }
  }

  async archiveSelectedProject() {
    const project = this.selectedProject();
    if (!this.token || !project || !this.isLabHead()) {
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      await api.archiveProject(this.token, project.id);
      this.statusMessage.set('Projet archive.');
      await this.loadProjects();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Archivage impossible.',
      );
    }
  }

  async assignMember() {
    const project = this.selectedProject();
    const memberId = this.selectedMemberId();
    if (!this.token || !project || !this.isLabHead()) {
      return;
    }

    if (!memberId) {
      this.errorMessage.set('Veuillez selectionner un membre a affecter.');
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      await api.assignProjectMember(this.token, project.id, {
        utilisateurId: memberId,
        roleDansProjet: this.memberRoleDraft().trim() || undefined,
      });
      this.statusMessage.set('Membre affecte au projet.');
      this.selectedMemberId.set('');
      this.memberRoleDraft.set('');
      await this.loadProjects();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Affectation impossible.',
      );
    }
  }

  async removeMember(userId: string) {
    const project = this.selectedProject();
    if (!this.token || !project || !this.isLabHead()) {
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      await api.removeProjectMember(this.token, project.id, userId);
      this.statusMessage.set('Membre retire du projet.');
      await this.loadProjects();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Suppression impossible.',
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
}

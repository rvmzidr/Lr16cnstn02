import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  Article,
  ArticlePayload,
  MemberArticlesData,
  RegistrationReferences,
  UtilisateurComplet,
} from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';

type DetailedSections = {
  contexte: string;
  methodologie: string;
  resultats: string;
  impact: string;
  references: string;
};

@Component({
  selector: 'app-articles-management-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-8">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">{{ site.localize(myArticlesTitle) }}</h2>
          <p class="app-page-description">
            {{ site.localize(myArticlesIntro) }}
          </p>
        </div>
        <button type="button" class="btn-secondary" (click)="startNew()">
          {{ site.localize(newArticleLabel) }}
        </button>
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

      <div class="app-split-layout">
        <div class="space-y-4">
          @for (article of data()?.articles || []; track article.id) {
            <button
              type="button"
              class="surface-card surface-card--interactive block w-full p-6 text-left"
              (click)="editArticle(article)"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <span class="badge-soft">{{ article.statut }}</span>
                <span class="text-sm text-muted-foreground">{{
                  formatDate(article.modifieLe)
                }}</span>
              </div>
              <h3 class="mt-4 text-2xl font-semibold text-foreground">
                {{ article.titre }}
              </h3>
              <p class="mt-3 line-clamp-3 text-sm text-muted-foreground">
                {{ article.resume }}
              </p>
            </button>
          } @empty {
            <div class="empty-state">Aucun article personnel pour le moment.</div>
          }
        </div>

        <form
          class="surface-card space-y-5 p-6 lg:p-8"
          [id]="editorFormId"
          (ngSubmit)="saveAsDraft()"
        >
          <div class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="tag-chip">
                {{ editingArticle() ? 'Edition article' : 'Creation article' }}
              </div>
              <div class="text-xs text-muted-foreground">
                Progression formulaire: {{ completionRate() }}%
              </div>
            </div>

            <div class="progress-track">
              <div
                class="progress-fill"
                [style.width.%]="completionRate()"
              ></div>
            </div>

            <h3 class="text-2xl font-semibold text-foreground lg:text-3xl">
              {{
                editingArticle()
                  ? site.localize(editArticleTitle)
                  : site.localize(newArticleLabel)
              }}
            </h3>
          </div>

          <div class="surface-muted space-y-4 p-4">
            <div>
              <h4 class="text-lg font-semibold text-foreground">
                Informations generales
              </h4>
              <p class="mt-1 text-sm text-muted-foreground">
                Identifiez clairement l'article, son resume et sa categorie scientifique.
              </p>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="md:col-span-2">
                <label class="mb-2 block">Titre scientifique</label>
                <input
                  [(ngModel)]="form.titre"
                  name="titre"
                  [id]="editorTitleFieldId"
                  class="input-shell"
                  placeholder="Titre complet de l'article"
                />
                <div class="mt-1 text-xs text-muted-foreground">
                  {{ form.titre.length }} caractere(s)
                </div>
              </div>

              <div class="md:col-span-2">
                <label class="mb-2 block">Resume</label>
                <textarea
                  [(ngModel)]="form.resume"
                  name="resume"
                  class="textarea-shell"
                  placeholder="Contexte, objectif et valeur scientifique"
                ></textarea>
                <div class="mt-1 text-xs text-muted-foreground">
                  {{ form.resume.length }} caractere(s)
                </div>
              </div>

              <div>
                <label class="mb-2 block">Categorie</label>
                <select
                  [(ngModel)]="form.categorieId"
                  name="categorieId"
                  class="select-shell"
                >
                  <option [ngValue]="null">Selectionner</option>
                  @for (item of references()?.categoriesArticle || []; track item.id) {
                    <option [ngValue]="item.id">{{ item.libelle }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="mb-2 block">Mode d'enregistrement</label>
                <select [(ngModel)]="form.action" name="action" class="select-shell">
                  <option value="BROUILLON">Brouillon</option>
                  <option value="SOUMETTRE">Soumission</option>
                </select>
              </div>
            </div>
          </div>

          <div class="surface-muted space-y-4 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 class="text-lg font-semibold text-foreground">
                  Formulaire detaille de redaction
                </h4>
                <p class="mt-1 text-sm text-muted-foreground">
                  Remplissez les sections puis generez le contenu complet.
                </p>
              </div>
              <button
                type="button"
                class="btn-outline"
                (click)="generateStructuredDraft()"
              >
                Generer le contenu
              </button>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-2 block">Contexte et problematique</label>
                <textarea
                  [(ngModel)]="detailed.contexte"
                  name="detailContexte"
                  class="textarea-shell"
                  placeholder="Probleme scientifique traite"
                ></textarea>
              </div>

              <div>
                <label class="mb-2 block">Methodologie</label>
                <textarea
                  [(ngModel)]="detailed.methodologie"
                  name="detailMethodologie"
                  class="textarea-shell"
                  placeholder="Methodes, protocoles, approches"
                ></textarea>
              </div>

              <div>
                <label class="mb-2 block">Resultats et observations</label>
                <textarea
                  [(ngModel)]="detailed.resultats"
                  name="detailResultats"
                  class="textarea-shell"
                  placeholder="Resultats majeurs et preuves"
                ></textarea>
              </div>

              <div>
                <label class="mb-2 block">Impact et perspectives</label>
                <textarea
                  [(ngModel)]="detailed.impact"
                  name="detailImpact"
                  class="textarea-shell"
                  placeholder="Apport pour le laboratoire et pistes futures"
                ></textarea>
              </div>
            </div>

            <div>
              <label class="mb-2 block">References</label>
              <textarea
                [(ngModel)]="detailed.references"
                name="detailReferences"
                class="textarea-shell"
                placeholder="Sources, DOI, bibliographie"
              ></textarea>
            </div>
          </div>

          <div class="surface-muted space-y-4 p-4">
            <div>
              <h4 class="text-lg font-semibold text-foreground">Contenu final</h4>
              <p class="mt-1 text-sm text-muted-foreground">
                Ce champ constitue la version finale enregistree en base et soumise au workflow.
              </p>
            </div>

            <div>
              <label class="mb-2 block">Contenu final de l'article</label>
              <textarea
                [(ngModel)]="form.contenu"
                name="contenu"
                class="textarea-shell min-h-56"
                placeholder="Texte complet pret pour brouillon ou soumission"
              ></textarea>
              <div class="mt-1 text-xs text-muted-foreground">
                {{ form.contenu.length }} caractere(s)
              </div>
            </div>
          </div>

          @if (errorMessage()) {
            <div
              class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error"
            >
              {{ errorMessage() }}
            </div>
          }
          @if (statusMessage()) {
            <div
              class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success"
            >
              {{ statusMessage() }}
            </div>
          }

          <div class="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              class="btn-outline justify-center"
              [disabled]="isSaving()"
              (click)="saveAsDraft()"
            >
              Enregistrer en brouillon
            </button>
            <button
              type="button"
              class="btn-secondary justify-center"
              [disabled]="isSaving()"
              (click)="submitForReview()"
            >
              Soumettre pour validation
            </button>
          </div>

          @if (editingArticle()) {
            <div class="surface-muted space-y-4 p-4">
              <div>
                <h4 class="text-lg font-semibold text-foreground">PDF de l'article</h4>
                <p class="mt-1 text-sm text-muted-foreground">
                  Televersez la version PDF et activez les boutons Voir et
                  Telecharger.
                </p>
              </div>
              <div class="flex flex-col gap-3 sm:flex-row">
                <input
                  type="file"
                  accept="application/pdf"
                  class="input-shell"
                  (change)="onPdfSelected($event)"
                />
                <button
                  type="button"
                  class="btn-outline sm:w-auto"
                  [disabled]="!selectedPdfFile"
                  (click)="uploadPdf()"
                >
                  Televerser PDF
                </button>
              </div>

              @if (selectedPdfName()) {
                <div class="text-xs text-muted-foreground">
                  Fichier selectionne: {{ selectedPdfName() }}
                </div>
              }

              @if (editingArticle()?.articlePdf) {
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="btn-secondary sm:w-auto"
                    (click)="openPdf()"
                  >
                    Voir PDF
                  </button>
                  <button
                    type="button"
                    class="btn-outline sm:w-auto"
                    (click)="downloadPdf()"
                  >
                    Telecharger PDF
                  </button>
                </div>
              }
            </div>

            <div class="surface-muted space-y-4 p-4">
              <div>
                <h4 class="text-lg font-semibold text-foreground">Co-auteurs</h4>
                <p class="mt-1 text-sm text-muted-foreground">
                  Ajoutez ou retirez des co-auteurs actifs.
                </p>
              </div>

              <div class="flex flex-col gap-3 sm:flex-row">
                <select
                  [(ngModel)]="selectedMemberId"
                  name="selectedMemberId"
                  class="select-shell"
                >
                  <option value="">Selectionner un membre</option>
                  @for (member of members(); track member.id) {
                    <option [value]="member.id">{{ member.nomComplet }}</option>
                  }
                </select>
                <button
                  type="button"
                  class="btn-outline sm:w-auto"
                  (click)="addCoAuthor()"
                >
                  Ajouter
                </button>
              </div>

              <div class="space-y-3">
                @for (coAuthor of editingArticle()?.coAuteurs || []; track coAuthor.utilisateurId) {
                  <div
                    class="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
                  >
                    <div class="text-sm text-foreground">
                      {{ coAuthor.utilisateur?.nomComplet || coAuthor.utilisateurId }}
                    </div>
                    <button
                      type="button"
                      class="btn-outline"
                      (click)="removeCoAuthor(coAuthor.utilisateurId)"
                    >
                      Retirer
                    </button>
                  </div>
                } @empty {
                  <div class="text-sm text-muted-foreground">
                    Aucun co-auteur enregistre pour cet article.
                  </div>
                }
              </div>
            </div>
          }
        </form>
      </div>
    </div>
  `,
})
export class ArticlesManagementPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);

  readonly data = signal<MemberArticlesData | null>(null);
  readonly references = signal<RegistrationReferences | null>(null);
  readonly members = signal<UtilisateurComplet[]>([]);
  readonly editingArticle = signal<Article | null>(null);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly statusMessage = signal('');
  readonly selectedPdfName = signal('');
  readonly editorFormId = 'article-editor-form';
  readonly editorTitleFieldId = 'article-title-field';

  selectedMemberId = '';
  selectedPdfFile: File | null = null;

  form: ArticlePayload = {
    titre: '',
    resume: '',
    contenu: '',
    categorieId: null,
    action: 'BROUILLON',
  };

  detailed: DetailedSections = {
    contexte: '',
    methodologie: '',
    resultats: '',
    impact: '',
    references: '',
  };

  readonly formatDate = formatDate;

  readonly myArticlesTitle = {
    fr: 'Mes articles',
    en: 'My articles',
    ar: 'My articles',
  };
  readonly myArticlesIntro = {
    fr: "Creer, modifier et suivre vos publications scientifiques avec un formulaire detaille.",
    en: 'Create, edit, and track your scientific publications with a detailed form.',
    ar: 'Create, edit, and track your scientific publications with a detailed form.',
  };
  readonly newArticleLabel = {
    fr: 'Nouvel article',
    en: 'New article',
    ar: 'New article',
  };
  readonly editArticleTitle = {
    fr: 'Modifier article',
    en: 'Edit article',
    ar: 'Edit article',
  };

  readonly summaryCards = computed(() => {
    const stats = this.data()?.statistiques.parStatut || {};
    return [
      {
        label: 'Total',
        value: this.data()?.statistiques.total || 0,
        meta: 'Articles personnels',
      },
      {
        label: 'Brouillons',
        value: stats.BROUILLON || 0,
        meta: 'Encore editables',
      },
      {
        label: 'Soumis',
        value: stats.SOUMIS || 0,
        meta: 'En attente de moderation',
      },
      {
        label: 'Publies',
        value: stats.PUBLIE || 0,
        meta: 'Visibles publiquement',
      },
    ];
  });

  readonly completionRate = computed(() => {
    const checks = [
      this.form.titre.trim().length >= 10,
      this.form.resume.trim().length >= 30,
      this.form.categorieId !== null,
      this.form.contenu.trim().length >= 120,
      this.detailed.contexte.trim().length > 0,
      this.detailed.methodologie.trim().length > 0,
      this.detailed.resultats.trim().length > 0,
      this.detailed.impact.trim().length > 0,
    ];

    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  });

  async ngOnInit() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    try {
      const [articles, members] = await Promise.all([
        api.listMemberArticles(token),
        api.listMembers(token, { limit: 50 }),
      ]);
      this.data.set(articles);
      this.references.set(articles.references);
      this.members.set(members.elements);
    } catch {
      this.data.set(null);
      this.references.set(null);
      this.members.set([]);
    }
  }

  startNew() {
    this.editingArticle.set(null);
    this.form = {
      titre: '',
      resume: '',
      contenu: '',
      categorieId: null,
      action: 'BROUILLON',
    };
    this.detailed = {
      contexte: '',
      methodologie: '',
      resultats: '',
      impact: '',
      references: '',
    };
    this.selectedMemberId = '';
    this.selectedPdfFile = null;
    this.selectedPdfName.set('');
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.focusEditorField();
  }

  editArticle(article: Article) {
    this.editingArticle.set(article);
    this.form = {
      titre: article.titre,
      resume: article.resume,
      contenu: article.contenu,
      categorieId: article.categorieId,
      action: article.statut === 'BROUILLON' ? 'BROUILLON' : 'SOUMETTRE',
    };
    this.selectedMemberId = '';
    this.selectedPdfFile = null;
    this.selectedPdfName.set('');
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.focusEditorField();
  }

  private focusEditorField() {
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

  generateStructuredDraft() {
    const sections = [
      ['Contexte et problematique', this.detailed.contexte],
      ['Methodologie', this.detailed.methodologie],
      ['Resultats et observations', this.detailed.resultats],
      ['Impact et perspectives', this.detailed.impact],
      ['References', this.detailed.references],
    ] as const;

    const built = sections
      .filter(([, value]) => value.trim().length > 0)
      .map(([title, value]) => `## ${title}\n${value.trim()}`)
      .join('\n\n');

    if (!built) {
      this.errorMessage.set('Remplissez au moins une section detaillee avant generation.');
      return;
    }

    this.form.contenu = built;
    this.errorMessage.set('');
    this.statusMessage.set('Contenu detaille genere dans le champ principal.');
  }

  async saveAsDraft() {
    await this.persistArticle('BROUILLON');
  }

  async submitForReview() {
    await this.persistArticle('SOUMETTRE');
  }

  private validatePayload(action: 'BROUILLON' | 'SOUMETTRE') {
    if (this.form.titre.trim().length < 10) {
      return 'Le titre doit contenir au moins 10 caracteres.';
    }

    if (this.form.resume.trim().length < 30) {
      return 'Le resume doit contenir au moins 30 caracteres.';
    }

    if (this.form.categorieId === null || this.form.categorieId === undefined) {
      return "Veuillez selectionner une categorie d'article.";
    }

    const minContent = action === 'SOUMETTRE' ? 120 : 40;
    if (this.form.contenu.trim().length < minContent) {
      return `Le contenu doit contenir au moins ${minContent} caracteres.`;
    }

    return '';
  }

  private async persistArticle(action: 'BROUILLON' | 'SOUMETTRE') {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    const validationError = this.validatePayload(action);
    if (validationError) {
      this.errorMessage.set(validationError);
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      const payload: ArticlePayload = {
        ...this.form,
        action,
      };

      let savedArticle: Article;
      if (this.editingArticle()) {
        savedArticle = await api.updateArticle(
          token,
          this.editingArticle()!.id,
          payload,
        );
      } else {
        savedArticle = await api.createArticle(token, payload);
      }

      if (this.selectedPdfFile) {
        savedArticle = await api.uploadArticlePdf(
          token,
          savedArticle.id,
          this.selectedPdfFile,
        );
        this.selectedPdfFile = null;
        this.selectedPdfName.set('');
      }

      const successText =
        action === 'SOUMETTRE'
          ? 'Article soumis pour validation avec succes.'
          : 'Article enregistre en brouillon avec succes.';
      this.statusMessage.set(successText);

      await this.ngOnInit();
      this.startNew();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'enregistrement de l'article.",
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  onPdfSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedPdfFile = input.files?.[0] || null;
    this.selectedPdfName.set(this.selectedPdfFile?.name || '');
  }

  async uploadPdf() {
    const token = this.auth.session()?.accessToken;
    const article = this.editingArticle();
    if (!token || !article || !this.selectedPdfFile) {
      return;
    }

    try {
      const updated = await api.uploadArticlePdf(
        token,
        article.id,
        this.selectedPdfFile,
      );
      this.editingArticle.set(updated);
      this.selectedPdfFile = null;
      this.selectedPdfName.set('');
      this.statusMessage.set('PDF televerse avec succes.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Erreur lors du televersement PDF.',
      );
    }
  }

  async openPdf() {
    const token = this.auth.session()?.accessToken;
    const article = this.editingArticle();
    if (!token || !article?.articlePdf) {
      return;
    }

    await api.openMemberArticlePdf(token, article.id);
  }

  async downloadPdf() {
    const token = this.auth.session()?.accessToken;
    const article = this.editingArticle();
    if (!token || !article?.articlePdf) {
      return;
    }

    await api.downloadMemberArticlePdf(token, article.id);
  }

  async addCoAuthor() {
    const token = this.auth.session()?.accessToken;
    const article = this.editingArticle();
    if (!token || !article || !this.selectedMemberId) {
      return;
    }

    try {
      const updated = await api.addCoAuthor(token, article.id, {
        utilisateurId: this.selectedMemberId,
      });
      this.editingArticle.set(updated);
      this.selectedMemberId = '';
      this.statusMessage.set('Co-auteur ajoute avec succes.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : "Impossible d'ajouter le co-auteur.",
      );
    }
  }

  async removeCoAuthor(userId: string) {
    const token = this.auth.session()?.accessToken;
    const article = this.editingArticle();
    if (!token || !article) {
      return;
    }

    try {
      const updated = await api.deleteCoAuthor(token, article.id, userId);
      this.editingArticle.set(updated);
      this.statusMessage.set('Co-auteur retire avec succes.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Impossible de retirer le co-auteur.',
      );
    }
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Article, ArticlePayload, MemberArticlesData, RegistrationReferences, UtilisateurComplet } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import { formatDate } from '../../core/utils/format';

@Component({
  selector: 'app-articles-management-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-8">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">Mes articles</h2>
          <p class="app-page-description">Creer, modifier et suivre vos publications scientifiques sans changer le workflow de soumission existant.</p>
        </div>
        <button type="button" class="btn-secondary" (click)="startNew()">Nouvel article</button>
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
            <button type="button" class="surface-card surface-card--interactive block w-full p-6 text-left" (click)="editArticle(article)">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <span class="badge-soft">{{ article.statut }}</span>
                <span class="text-sm text-muted-foreground">{{ formatDate(article.modifieLe) }}</span>
              </div>
              <h3 class="mt-4 text-2xl font-semibold text-foreground">{{ article.titre }}</h3>
              <p class="mt-3 text-sm text-muted-foreground">{{ article.resume }}</p>
            </button>
          } @empty {
            <div class="empty-state">Aucun article personnel pour le moment.</div>
          }
        </div>

        <form class="surface-card space-y-5 p-6 lg:p-8" (ngSubmit)="saveArticle()">
          <div>
            <div class="tag-chip">{{ editingArticle() ? 'Edition' : 'Creation' }}</div>
            <h3 class="mt-4 text-3xl font-semibold text-foreground">{{ editingArticle() ? 'Modifier l\\'article' : 'Nouvel article' }}</h3>
          </div>

          <div><label class="mb-2 block">Titre</label><input [(ngModel)]="form.titre" name="titre" class="input-shell" /></div>
          <div><label class="mb-2 block">Resume</label><textarea [(ngModel)]="form.resume" name="resume" class="textarea-shell"></textarea></div>
          <div><label class="mb-2 block">Contenu</label><textarea [(ngModel)]="form.contenu" name="contenu" class="textarea-shell min-h-44"></textarea></div>
          <div><label class="mb-2 block">Categorie</label><select [(ngModel)]="form.categorieId" name="categorieId" class="select-shell"><option [ngValue]="null">Selectionner</option>@for (item of references()?.categoriesArticle || []; track item.id) { <option [ngValue]="item.id">{{ item.libelle }}</option> }</select></div>
          <div><label class="mb-2 block">Action</label><select [(ngModel)]="form.action" name="action" class="select-shell"><option value="BROUILLON">Sauvegarder en brouillon</option><option value="SOUMETTRE">Soumettre</option></select></div>
          @if (errorMessage()) { <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">{{ errorMessage() }}</div> }
          @if (statusMessage()) { <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">{{ statusMessage() }}</div> }
          <button type="submit" class="btn-secondary w-full justify-center" [disabled]="isSaving()">{{ isSaving() ? 'Enregistrement...' : 'Enregistrer' }}</button>

          @if (editingArticle()) {
            <div class="surface-muted space-y-4 p-4">
              <div>
                <h4 class="text-lg font-semibold text-foreground">Co-auteurs</h4>
                <p class="mt-1 text-sm text-muted-foreground">Ajoutez ou retirez les co-auteurs deja supportes par l'application.</p>
              </div>
              <div class="flex flex-col gap-3 sm:flex-row">
                <select [(ngModel)]="selectedMemberId" name="selectedMemberId" class="select-shell">
                  <option value="">Selectionner un membre</option>
                  @for (member of members(); track member.id) { <option [value]="member.id">{{ member.nomComplet }}</option> }
                </select>
                <button type="button" class="btn-outline sm:w-auto" (click)="addCoAuthor()">Ajouter</button>
              </div>
              <div class="space-y-3">
                @for (coAuthor of editingArticle()?.coAuteurs || []; track coAuthor.utilisateurId) {
                  <div class="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                    <div class="text-sm text-foreground">{{ coAuthor.utilisateur?.nomComplet || coAuthor.utilisateurId }}</div>
                    <button type="button" class="btn-outline" (click)="removeCoAuthor(coAuthor.utilisateurId)">Retirer</button>
                  </div>
                } @empty {
                  <div class="text-sm text-muted-foreground">Aucun co-auteur enregistre pour cet article.</div>
                }
              </div>
            </div>
          }
        </form>
      </div>
    </div>
  `
})
export class ArticlesManagementPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly data = signal<MemberArticlesData | null>(null);
  readonly references = signal<RegistrationReferences | null>(null);
  readonly members = signal<UtilisateurComplet[]>([]);
  readonly editingArticle = signal<Article | null>(null);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly statusMessage = signal('');
  selectedMemberId = '';
  form: ArticlePayload = { titre: '', resume: '', contenu: '', categorieId: null, action: 'BROUILLON' };
  readonly formatDate = formatDate;

  readonly summaryCards = computed(() => {
    const stats = this.data()?.statistiques.parStatut || {};
    return [
      { label: 'Total', value: this.data()?.statistiques.total || 0, meta: 'Articles personnels' },
      { label: 'Brouillons', value: stats.BROUILLON || 0, meta: 'Encore editables' },
      { label: 'Soumis', value: stats.SOUMIS || 0, meta: 'En attente de moderation' },
      { label: 'Publies', value: stats.PUBLIE || 0, meta: 'Visibles publiquement' }
    ];
  });

  async ngOnInit() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }
    try {
      const [articles, members] = await Promise.all([
        api.listMemberArticles(token),
        api.listMembers(token, { limit: 50 })
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
    this.form = { titre: '', resume: '', contenu: '', categorieId: null, action: 'BROUILLON' };
  }

  editArticle(article: Article) {
    this.editingArticle.set(article);
    this.form = {
      titre: article.titre,
      resume: article.resume,
      contenu: article.contenu,
      categorieId: article.categorieId,
      action: article.statut === 'BROUILLON' ? 'BROUILLON' : 'SOUMETTRE'
    };
  }

  async saveArticle() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }
    this.isSaving.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');
    try {
      if (this.editingArticle()) {
        await api.updateArticle(token, this.editingArticle()!.id, this.form);
      } else {
        await api.createArticle(token, this.form);
      }
      this.statusMessage.set('Article enregistre avec succes.');
      await this.ngOnInit();
      this.startNew();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async addCoAuthor() {
    const token = this.auth.session()?.accessToken;
    const article = this.editingArticle();
    if (!token || !article || !this.selectedMemberId) {
      return;
    }
    try {
      const updated = await api.addCoAuthor(token, article.id, { utilisateurId: this.selectedMemberId });
      this.editingArticle.set(updated);
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Impossible d\'ajouter le co-auteur.');
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
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Impossible de retirer le co-auteur.');
    }
  }
}

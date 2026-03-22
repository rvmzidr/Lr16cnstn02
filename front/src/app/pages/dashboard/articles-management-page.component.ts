import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Article, ArticlePayload, MemberArticlesData, RegistrationReferences, UtilisateurComplet } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import { formatDate } from '../../core/utils/format';

@Component({
  selector: 'app-articles-management-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-4xl font-bold text-foreground">Mes articles</h2>
          <p class="text-lg text-muted-foreground">Creer, modifier et suivre vos publications scientifiques.</p>
        </div>
        <button type="button" class="btn-secondary" (click)="startNew()">Nouvel article</button>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div class="space-y-4">
          @for (article of data()?.articles || []; track article.id) {
            <button type="button" class="surface-card block w-full p-6 text-left transition hover:border-primary/35" (click)="editArticle(article)">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <span class="badge-soft">{{ article.statut }}</span>
                <span class="text-sm text-muted-foreground">{{ formatDate(article.modifieLe) }}</span>
              </div>
              <h3 class="mt-4 text-2xl font-bold text-foreground">{{ article.titre }}</h3>
              <p class="mt-3 text-base leading-7 text-muted-foreground">{{ article.resume }}</p>
            </button>
          }
        </div>

        <form class="surface-card p-8 space-y-5" (ngSubmit)="saveArticle()">
          <h3 class="text-3xl font-bold text-foreground">{{ editingArticle() ? 'Modifier l\\'article' : 'Nouvel article' }}</h3>
          <div><label class="mb-2 block font-semibold">Titre</label><input [(ngModel)]="form.titre" name="titre" class="input-shell" /></div>
          <div><label class="mb-2 block font-semibold">Resume</label><textarea [(ngModel)]="form.resume" name="resume" class="textarea-shell"></textarea></div>
          <div><label class="mb-2 block font-semibold">Contenu</label><textarea [(ngModel)]="form.contenu" name="contenu" class="textarea-shell min-h-44"></textarea></div>
          <div><label class="mb-2 block font-semibold">Categorie</label><select [(ngModel)]="form.categorieId" name="categorieId" class="select-shell"><option [ngValue]="null">Selectionner</option>@for (item of references()?.categoriesArticle || []; track item.id) { <option [ngValue]="item.id">{{ item.libelle }}</option> }</select></div>
          <div><label class="mb-2 block font-semibold">Action</label><select [(ngModel)]="form.action" name="action" class="select-shell"><option value="BROUILLON">Sauvegarder en brouillon</option><option value="SOUMETTRE">Soumettre</option></select></div>
          @if (errorMessage()) { <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">{{ errorMessage() }}</div> }
          @if (statusMessage()) { <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">{{ statusMessage() }}</div> }
          <button type="submit" class="btn-secondary" [disabled]="isSaving()">{{ isSaving() ? 'Enregistrement...' : 'Enregistrer' }}</button>

          @if (editingArticle()) {
            <div class="mt-8 border-t border-border pt-6">
              <h4 class="text-2xl font-bold text-foreground">Co-auteurs</h4>
              <div class="mt-4 flex gap-3">
                <select [(ngModel)]="selectedMemberId" name="selectedMemberId" class="select-shell">
                  <option value="">Selectionner un membre</option>
                  @for (member of members(); track member.id) { <option [value]="member.id">{{ member.nomComplet }}</option> }
                </select>
                <button type="button" class="btn-outline" (click)="addCoAuthor()">Ajouter</button>
              </div>
              <div class="mt-4 space-y-3">
                @for (coAuthor of editingArticle()?.coAuteurs || []; track coAuthor.utilisateurId) {
                  <div class="flex items-center justify-between gap-3 rounded-2xl border border-border/50 px-4 py-3">
                    <div class="text-sm">{{ coAuthor.utilisateur?.nomComplet || coAuthor.utilisateurId }}</div>
                    <button type="button" class="btn-outline" (click)="removeCoAuthor(coAuthor.utilisateurId)">Retirer</button>
                  </div>
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

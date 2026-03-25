
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Actualite, NewsManagementList } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import { formatDate } from '../../core/utils/format';

@Component({
  selector: 'app-lab-head-news-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-8">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">Gestion des actualites</h2>
          <p class="app-page-description">Creer, modifier ou supprimer les actualites du laboratoire en conservant le meme cycle brouillon / publication.</p>
        </div>
        <button type="button" class="btn-secondary" (click)="startNew()">Nouvelle actualite</button>
      </div>

      <div class="app-split-layout">
        <div class="space-y-4">
          @for (item of data()?.actualites || []; track item.id) {
            <button type="button" class="surface-card surface-card--interactive block w-full p-6 text-left" (click)="edit(item)">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <span class="badge-soft">{{ item.statut }}</span>
                <span class="text-sm text-muted-foreground">{{ formatDate(item.modifieLe) }}</span>
              </div>
              <h3 class="mt-4 text-2xl font-semibold text-foreground">{{ item.titre }}</h3>
              <p class="mt-3 text-sm text-muted-foreground">{{ item.resume || item.contenu }}</p>
            </button>
          } @empty {
            <div class="empty-state">Aucune actualite disponible.</div>
          }
        </div>

        <form class="surface-card space-y-5 p-6 lg:p-8" (ngSubmit)="save()">
          <div>
            <div class="tag-chip">{{ editingNews() ? 'Edition' : 'Publication' }}</div>
            <h3 class="mt-4 text-3xl font-semibold text-foreground">{{ editingNews() ? 'Modifier l\\'actualite' : 'Nouvelle actualite' }}</h3>
          </div>
          <div><label class="mb-2 block">Titre</label><input [(ngModel)]="form.titre" name="titre" class="input-shell" /></div>
          <div><label class="mb-2 block">Resume</label><textarea [(ngModel)]="form.resume" name="resume" class="textarea-shell"></textarea></div>
          <div><label class="mb-2 block">Contenu</label><textarea [(ngModel)]="form.contenu" name="contenu" class="textarea-shell min-h-44"></textarea></div>
          <div><label class="mb-2 block">Statut</label><select [(ngModel)]="form.statut" name="statut" class="select-shell"><option value="BROUILLON">BROUILLON</option><option value="PUBLIEE">PUBLIEE</option><option value="ARCHIVEE">ARCHIVEE</option></select></div>
          @if (errorMessage()) { <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">{{ errorMessage() }}</div> }
          @if (statusMessage()) { <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">{{ statusMessage() }}</div> }
          <div class="flex flex-wrap gap-3">
            <button type="submit" class="btn-secondary flex-1 justify-center sm:flex-none">{{ editingNews() ? 'Enregistrer les modifications' : 'Creer l\\'actualite' }}</button>
            @if (editingNews()) { <button type="button" class="btn-outline" (click)="remove(editingNews()!.id)">Supprimer</button> }
          </div>
        </form>
      </div>
    </div>
  `
})
export class LabHeadNewsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly data = signal<NewsManagementList | null>(null);
  readonly editingNews = signal<Actualite | null>(null);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly formatDate = formatDate;
  form: { titre: string; resume?: string; contenu: string; statut: 'BROUILLON' | 'PUBLIEE' | 'ARCHIVEE' } = {
    titre: '',
    resume: '',
    contenu: '',
    statut: 'BROUILLON'
  };

  async ngOnInit() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }
    try {
      this.data.set(await api.listLabHeadNews(token, { limit: 50 }));
    } catch {
      this.data.set(null);
    }
  }

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  startNew() {
    this.editingNews.set(null);
    this.form = { titre: '', resume: '', contenu: '', statut: 'BROUILLON' };
  }

  edit(item: Actualite) {
    this.editingNews.set(item);
    this.form = { titre: item.titre, resume: item.resume || '', contenu: item.contenu, statut: item.statut };
  }

  async save() {
    try {
      if (this.editingNews()) {
        await api.updateLabHeadNews(this.token, this.editingNews()!.id, this.form);
      } else {
        await api.createLabHeadNews(this.token, {
          titre: this.form.titre,
          resume: this.form.resume,
          contenu: this.form.contenu,
          statut: this.form.statut === 'ARCHIVEE' ? 'BROUILLON' : this.form.statut
        });
      }
      this.statusMessage.set('Actualite enregistree.');
      this.startNew();
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement.');
    }
  }

  async remove(newsId: number) {
    try {
      await api.deleteLabHeadNews(this.token, newsId);
      this.statusMessage.set('Actualite supprimee.');
      this.startNew();
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors de la suppression.');
    }
  }
}

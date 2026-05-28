import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import type { Actualite } from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-news-management-page',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <section class="app-page-hero app-page-hero--dashboard">
        <div class="app-page-hero__orb app-page-hero__orb--primary"></div>
        <div class="app-page-hero__orb app-page-hero__orb--secondary"></div>

        <div class="app-page-hero__content">
          <p class="app-page-eyebrow">
            <span class="inline-flex items-center gap-2">
              <lucide-icon [img]="icons.Newspaper" class="h-3.5 w-3.5"></lucide-icon>
              {{ site.localize(moduleLabel) }}
            </span>
          </p>
          <div class="app-page-header mt-2">
            <div>
              <h2 class="app-page-title">{{ site.localize(pageTitle) }}</h2>
              <p class="app-page-description">{{ site.localize(pageSubtitle) }}</p>
            </div>
          </div>
        </div>
      </section>

      @if (loading()) {
        <div class="surface-card p-6 text-sm text-muted-foreground">
          {{ site.localize(loadingLabel) }}
        </div>
      } @else {
        <section class="space-y-3">
          @for (item of news(); track item.id) {
            <article class="surface-card border border-border/70 p-5">
              <div class="grid gap-4 xl:grid-cols-[1fr_auto]">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="inline-flex h-7 items-center rounded-lg border border-border bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground">
                      #{{ item.id }}
                    </span>
                    <span [class]="statusBadgeClass(item.statut)">
                      {{ statusLabel(item.statut) }}
                    </span>
                  </div>

                  <h3 class="mt-3 text-lg font-semibold text-foreground">{{ item.titre }}</h3>

                  @if (item.resume) {
                    <p class="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{{ item.resume }}</p>
                  }

                  <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    @if (item.auteur?.nomComplet) {
                      <span>{{ site.localize(authorLabel) }}: {{ item.auteur!.nomComplet }}</span>
                    }
                    <span>{{ site.localize(createdLabel) }}: {{ formatDate(item.creeLe) }}</span>
                    @if (item.publieeLe) {
                      <span>{{ site.localize(publishedLabel) }}: {{ formatDate(item.publieeLe) }}</span>
                    }
                  </div>
                </div>

                <div class="flex min-w-[160px] flex-col gap-2 xl:items-stretch">
                  <button
                    type="button"
                    class="btn-outline app-action-button h-9 px-3 text-rose-600 hover:border-rose-400 hover:bg-rose-50"
                    (click)="openDeleteConfirm(item)"
                    [disabled]="deletingId() === item.id"
                  >
                    <lucide-icon [img]="icons.Trash2" class="h-4 w-4"></lucide-icon>
                    {{ deletingId() === item.id ? site.localize(deletingLabel) : site.localize(deleteLabel) }}
                  </button>
                </div>
              </div>
            </article>
          } @empty {
            <div class="empty-state py-12">{{ site.localize(emptyStateLabel) }}</div>
          }
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

    @if (deleteTarget()) {
      <div
        class="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4"
        (click)="closeDeleteConfirm()"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-elevated"
          (click)="$event.stopPropagation()"
        >
          <div class="mb-4 flex items-start gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <lucide-icon [img]="icons.Trash2" class="h-5 w-5"></lucide-icon>
            </span>
            <div>
              <h3 class="text-lg font-semibold text-foreground">{{ site.localize(deleteModalTitle) }}</h3>
              <p class="mt-1 text-sm text-muted-foreground">{{ deleteTarget()!.titre }}</p>
            </div>
          </div>

          <p class="rounded-xl bg-rose-50/60 px-4 py-3 text-sm text-rose-700">
            {{ site.localize(deleteModalWarning) }}
          </p>

          <div class="mt-5 flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              class="btn-outline"
              (click)="closeDeleteConfirm()"
              [disabled]="deletingId() !== null"
            >
              {{ site.localize(cancelLabel) }}
            </button>
            <button
              type="button"
              class="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              (click)="confirmDelete()"
              [disabled]="deletingId() !== null"
            >
              <lucide-icon [img]="icons.Trash2" class="h-4 w-4"></lucide-icon>
              {{ site.localize(confirmDeleteLabel) }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class NewsManagementPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly icons = sharedIcons;
  readonly formatDate = formatDate;

  readonly loading = signal(false);
  readonly news = signal<Actualite[]>([]);
  readonly deletingId = signal<number | null>(null);
  readonly deleteTarget = signal<Actualite | null>(null);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');

  readonly moduleLabel = { fr: 'Gestion des actualités', en: 'News management', ar: 'إدارة الأخبار' };
  readonly pageTitle = { fr: 'Actualités', en: 'News', ar: 'الأخبار' };
  readonly pageSubtitle = {
    fr: 'Consultez et supprimez les actualités publiées sur la plateforme.',
    en: 'View and delete news published on the platform.',
    ar: 'عرض وحذف الأخبار المنشورة على المنصة.',
  };
  readonly loadingLabel = { fr: 'Chargement des actualités...', en: 'Loading news...', ar: 'جار تحميل الأخبار...' };
  readonly emptyStateLabel = { fr: 'Aucune actualité disponible.', en: 'No news available.', ar: 'لا توجد أخبار متاحة.' };
  readonly authorLabel = { fr: 'Auteur', en: 'Author', ar: 'المؤلف' };
  readonly createdLabel = { fr: 'Créé le', en: 'Created', ar: 'تاريخ الإنشاء' };
  readonly publishedLabel = { fr: 'Publié le', en: 'Published', ar: 'تاريخ النشر' };
  readonly deleteLabel = { fr: 'Supprimer', en: 'Delete', ar: 'حذف' };
  readonly deletingLabel = { fr: 'Suppression...', en: 'Deleting...', ar: 'جار الحذف...' };
  readonly cancelLabel = { fr: 'Annuler', en: 'Cancel', ar: 'إلغاء' };
  readonly deleteModalTitle = { fr: 'Supprimer cette actualité', en: 'Delete this news', ar: 'حذف هذا الخبر' };
  readonly deleteModalWarning = {
    fr: 'Cette action est irréversible. L\'actualité sera définitivement supprimée.',
    en: 'This action is irreversible. The news item will be permanently deleted.',
    ar: 'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الخبر نهائياً.',
  };
  readonly confirmDeleteLabel = { fr: 'Confirmer la suppression', en: 'Confirm deletion', ar: 'تأكيد الحذف' };

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  async ngOnInit() {
    await this.loadNews();
  }

  statusBadgeClass(statut: string) {
    if (statut === 'PUBLIEE') {
      return 'inline-flex h-7 items-center rounded-full border border-emerald-300 bg-emerald-100 px-2.5 text-[11px] font-semibold text-emerald-700';
    }
    if (statut === 'BROUILLON') {
      return 'inline-flex h-7 items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 text-[11px] font-semibold text-amber-700';
    }
    return 'inline-flex h-7 items-center rounded-full border border-border bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground';
  }

  statusLabel(statut: string) {
    if (statut === 'PUBLIEE') return this.site.localize({ fr: 'Publiée', en: 'Published', ar: 'منشورة' });
    if (statut === 'BROUILLON') return this.site.localize({ fr: 'Brouillon', en: 'Draft', ar: 'مسودة' });
    if (statut === 'ARCHIVEE') return this.site.localize({ fr: 'Archivée', en: 'Archived', ar: 'مؤرشفة' });
    return statut;
  }

  openDeleteConfirm(item: Actualite) {
    this.deleteTarget.set(item);
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteConfirm() {
    if (this.deletingId() !== null) return;
    this.deleteTarget.set(null);
  }

  async confirmDelete() {
    const target = this.deleteTarget();
    if (!target || !this.token) return;

    this.deletingId.set(target.id);
    this.errorMessage.set('');

    try {
      await api.deleteLabHeadNews(this.token, target.id);
      this.news.update((items) => items.filter((item) => item.id !== target.id));
      this.statusMessage.set(
        this.site.localize({
          fr: 'Actualité supprimée avec succès.',
          en: 'News item deleted successfully.',
          ar: 'تم حذف الخبر بنجاح.',
        }),
      );
      this.deleteTarget.set(null);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Impossible de supprimer cette actualité.',
              en: 'Unable to delete this news item.',
              ar: 'تعذر حذف هذا الخبر.',
            }),
      );
    } finally {
      this.deletingId.set(null);
    }
  }

  private async loadNews() {
    if (!this.token) return;

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const response = await api.listLabHeadNews(this.token);
      this.news.set(response.actualites || []);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur de chargement des actualités.',
              en: 'Unable to load news.',
              ar: 'تعذر تحميل الأخبار.',
            }),
      );
      this.news.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}

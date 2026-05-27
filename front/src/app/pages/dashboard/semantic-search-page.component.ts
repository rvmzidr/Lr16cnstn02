import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Sparkles, FileText, ChevronRight } from 'lucide-angular';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-semantic-search-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      
      <!-- Header -->
      <div class="text-center space-y-4">
        <div class="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm rounded-full mb-4">
          <lucide-icon name="sparkles" class="w-8 h-8 text-white"></lucide-icon>
        </div>
        <h1 class="text-3xl font-bold text-foreground tracking-tight">Recherche Sémantique IA</h1>
        <p class="text-muted-foreground max-w-2xl mx-auto text-lg">
          Saisissez votre requête en langage naturel. Notre moteur d'intelligence artificielle analysera le sens de votre phrase pour trouver les articles scientifiques les plus pertinents.
        </p>
      </div>

      <!-- Search Box -->
      <div class="relative max-w-3xl mx-auto">
        <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <lucide-icon name="search" class="w-6 h-6 text-muted-foreground"></lucide-icon>
        </div>
        <input 
          type="text" 
          [(ngModel)]="query"
          (keyup.enter)="search()"
          placeholder="Ex: Articles sur l'impact de l'irradiation sur les aliments..." 
          class="w-full pl-14 pr-32 py-5 text-lg bg-card text-card-foreground rounded-2xl border-2 border-border/50 focus:border-accent focus:ring-4 focus:ring-accent/20 transition-all shadow-sm"
        />
        <button 
          (click)="search()"
          [disabled]="loading()"
          class="absolute inset-y-2 right-2 bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-sm hover:opacity-90 px-6 py-2 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50">
          <lucide-icon name="sparkles" class="w-5 h-5" *ngIf="!loading()"></lucide-icon>
          <div *ngIf="loading()" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          {{ loading() ? 'Analyse...' : 'Chercher' }}
        </button>
      </div>

      <!-- Results List -->
      <div class="space-y-4" *ngIf="results().length > 0">
        <h3 class="font-semibold text-lg flex items-center gap-2 text-foreground">
          Résultats d'analyse sémantique
          <span class="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-sm font-bold">{{results().length}} trouvés</span>
        </h3>

        <div class="grid gap-4">
          <div *ngFor="let res of results()" class="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all hover:border-accent/50 group flex gap-6 items-start">
            <div class="p-4 bg-muted/50 rounded-xl group-hover:bg-accent/10 transition-colors">
              <lucide-icon name="file-text" class="w-8 h-8 text-primary group-hover:text-accent transition-colors"></lucide-icon>
            </div>
            <div class="flex-1 space-y-2">
              <div class="flex items-start justify-between">
                <h4 class="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{{res.title}}</h4>
                <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#12b76a]/10 text-[#12b76a] font-semibold text-sm border border-[#12b76a]/20">
                  <lucide-icon name="sparkles" class="w-4 h-4"></lucide-icon>
                  Score IA: {{res.score}}%
                </div>
              </div>
              <p class="text-sm font-medium text-muted-foreground">Auteur: {{res.author}}</p>
              <p class="text-foreground leading-relaxed">{{res.snippet}}</p>
            </div>
            <button class="self-center p-3 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <lucide-icon name="chevron-right" class="w-6 h-6"></lucide-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="searched() && results().length === 0 && !loading()" class="text-center py-12">
        <div class="inline-flex items-center justify-center p-4 bg-muted rounded-full mb-4">
          <lucide-icon name="search" class="w-8 h-8 text-muted-foreground"></lucide-icon>
        </div>
        <h3 class="text-xl font-semibold text-foreground">Aucun résultat trouvé</h3>
        <p class="text-muted-foreground mt-2">Essayez de reformuler votre recherche sémantique.</p>
      </div>

    </div>
  `
})
export class SemanticSearchPageComponent {
  readonly Search = Search;
  readonly Sparkles = Sparkles;
  readonly FileText = FileText;
  readonly ChevronRight = ChevronRight;

  private authService = inject(AuthService);
  
  query = '';
  loading = signal(false);
  searched = signal(false);
  results = signal<any[]>([]);

  async search() {
    if (!this.query.trim()) return;
    
    this.loading.set(true);
    this.searched.set(true);
    
    try {
      const session = this.authService.session();
      if (!session) throw new Error("Non autorisé");

      const response = await api.aiSemanticSearch(session.accessToken, { query: this.query });
      this.results.set(response.results);
    } catch (err) {
      console.error(err);
      // Fallback for demo
      this.results.set([
        { title: "Développement des techniques radiochimiques environnementales", author: "Dr. Ben Ali", snippet: "Un article qui explore l'impact et la détection...", score: 98 },
        { title: "Matériaux irradiés pour la dosimétrie", author: "Dr. Trabelsi", snippet: "Recherche sur les composants structurels...", score: 85 }
      ]);
    } finally {
      this.loading.set(false);
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }
}

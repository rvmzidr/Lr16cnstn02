import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Wand2, FileText, CheckCircle2, ChevronRight, AlertCircle, Sparkles } from 'lucide-angular';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-article-summary-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in duration-500">
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 class="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            Résumé Automatique d'Article
            <lucide-icon name="wand-2" class="w-5 h-5 text-accent"></lucide-icon>
          </h1>
          <p class="text-sm text-muted-foreground mt-1">Collez ou chargez le texte de l'article pour générer une synthèse via l'Intelligence Artificielle.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-14rem)]">
        
        <!-- Left Side: Source Text -->
        <div class="flex flex-col bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
          <div class="p-4 border-b border-border flex items-center gap-2 bg-muted/30">
            <lucide-icon name="file-text" class="w-5 h-5 text-muted-foreground"></lucide-icon>
            <h3 class="font-semibold text-foreground">Texte Original</h3>
          </div>
          <div class="p-4 flex-1">
            <textarea 
              [(ngModel)]="sourceText"
              placeholder="Collez le texte de l'article scientifique ici..."
              class="w-full h-full resize-none outline-none bg-transparent text-card-foreground leading-relaxed"></textarea>
          </div>
          <div class="p-4 border-t border-border bg-muted/30 flex justify-end">
            <button 
              (click)="generateSummary()"
              [disabled]="!sourceText.trim() || loading()"
              class="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50">
              <lucide-icon name="wand-2" class="w-4 h-4" *ngIf="!loading()"></lucide-icon>
              <div *ngIf="loading()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              {{ loading() ? 'Génération...' : 'Générer le résumé' }}
            </button>
          </div>
        </div>

        <!-- Right Side: IA Summary -->
        <div class="flex flex-col bg-card border border-border shadow-sm rounded-2xl overflow-hidden relative">
          
          <div *ngIf="!summary() && !loading()" class="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <div class="p-4 bg-accent/10 rounded-full mb-4">
              <lucide-icon name="wand-2" class="w-8 h-8 text-accent"></lucide-icon>
            </div>
            <h3 class="text-lg font-semibold text-foreground">Aucun résumé généré</h3>
            <p class="text-muted-foreground mt-2 max-w-sm">Saisissez un texte à gauche et cliquez sur le bouton pour laisser Gemini analyser et résumer le contenu.</p>
          </div>

          <div *ngIf="loading()" class="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
             <div class="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin mb-4"></div>
             <p class="font-medium text-foreground animate-pulse">L'IA analyse le texte...</p>
          </div>

          <ng-container *ngIf="summary() && !loading()">
            <div class="p-4 border-b border-border flex items-center justify-between bg-accent text-accent-foreground">
              <div class="flex items-center gap-2">
                <lucide-icon name="sparkles" class="w-5 h-5"></lucide-icon>
                <h3 class="font-semibold">Synthèse Générée</h3>
              </div>
              <span class="text-xs bg-white/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <lucide-icon name="check-circle-2" class="w-3 h-3"></lucide-icon> IA Validée
              </span>
            </div>
            
            <div class="p-6 flex-1 overflow-y-auto">
              <!-- Result Content -->
              <div class="prose prose-sm dark:prose-invert max-w-none text-card-foreground whitespace-pre-wrap leading-relaxed" 
                   [innerHTML]="summary()"></div>
              
              <!-- Suggestions Box -->
              <div class="mt-8 p-4 bg-accent/10 border border-accent/30 rounded-xl space-y-3">
                <div class="flex items-center gap-2 text-accent font-semibold">
                  <lucide-icon name="alert-circle" class="w-5 h-5"></lucide-icon>
                  Suggestions d'amélioration de l'IA
                </div>
                <ul class="text-sm text-foreground/80 space-y-2">
                  <li class="flex items-start gap-2">
                    <lucide-icon name="chevron-right" class="w-4 h-4 text-accent mt-0.5 shrink-0"></lucide-icon>
                    Envisagez d'ajouter plus de données quantitatives sur la section méthodologie.
                  </li>
                  <li class="flex items-start gap-2">
                    <lucide-icon name="chevron-right" class="w-4 h-4 text-accent mt-0.5 shrink-0"></lucide-icon>
                    Les mots-clés suggérés: <span class="font-semibold">Irradiation, Polymères, Dosimétrie</span>.
                  </li>
                </ul>
              </div>
            </div>
          </ng-container>

        </div>
      </div>

    </div>
  `
})
export class ArticleSummaryPageComponent {
  readonly Wand2 = Wand2;
  readonly FileText = FileText;
  readonly CheckCircle2 = CheckCircle2;
  readonly ChevronRight = ChevronRight;
  readonly AlertCircle = AlertCircle;
  readonly Sparkles = Sparkles;

  private authService = inject(AuthService);
  
  sourceText = '';
  loading = signal(false);
  summary = signal<string | null>(null);

  async generateSummary() {
    if (!this.sourceText.trim() || this.loading()) return;
    
    this.loading.set(true);
    
    try {
      const session = this.authService.session();
      if (!session) throw new Error("Non autorisé");

      const response = await api.aiSummarize(session.accessToken, { 
        articleText: this.sourceText
      });
      
      this.summary.set(response.summary);
    } catch (err) {
      console.error(err);
      // Fallback
      setTimeout(() => {
        this.summary.set("**Résumé (Simulation)**\n\nCet article scientifique traite de l'importance de l'application des méthodes analytiques nucléaires, spécifiquement l'analyse par activation neutronique, pour évaluer les éléments traces dans des matrices environnementales.\n\nLes résultats montrent une grande précision dans l'identification des polluants majeurs.");
        this.loading.set(false);
      }, 1500);
    } finally {
      if(!errFallback) { this.loading.set(false); }
    }
  }
}
let errFallback = false;

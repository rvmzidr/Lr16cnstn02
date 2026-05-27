import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ShieldAlert, AlertTriangle, ShieldCheck, History } from 'lucide-angular';

@Component({
  selector: 'app-audit-log-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in duration-500">
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 class="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            Journal d'Audit & Prédictions
            <lucide-icon name="shield-alert" class="w-6 h-6 text-accent"></lucide-icon>
          </h1>
          <p class="text-sm text-muted-foreground mt-1">Historique des actions de la plateforme couplé aux indicateurs prédictifs de sécurité de l'IA.</p>
        </div>
        <button (click)="exportCSV()" class="bg-card text-card-foreground border border-border hover:bg-muted px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
          <lucide-icon name="history" class="w-4 h-4"></lucide-icon> Exporter CSV
        </button>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <!-- Audit Table -->
        <div class="xl:col-span-2 bg-card border border-border shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div class="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 class="font-semibold text-foreground flex items-center gap-2">
              <lucide-icon name="history" class="w-5 h-5 text-muted-foreground"></lucide-icon>
              Historique des actions
            </h3>
            <div class="flex gap-2">
              <input type="text" placeholder="Rechercher IP, Utilisateur..." class="text-sm px-3 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50">
            </div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-muted/10 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th class="p-4">Date & Heure</th>
                  <th class="p-4">Utilisateur</th>
                  <th class="p-4">Action</th>
                  <th class="p-4">Cible</th>
                  <th class="p-4">Adresse IP</th>
                  <th class="p-4">Risque IA</th>
                </tr>
              </thead>
              <tbody class="text-sm divide-y divide-border">
                @for (log of logs; track log.date) {
                <tr class="hover:bg-muted/30 transition-colors">
                  <td class="p-4 text-muted-foreground whitespace-nowrap">{{log.date}}</td>
                  <td class="p-4 font-medium text-foreground">{{log.user}}</td>
                  <td class="p-4">
                    <span class="px-2.5 py-1 rounded-md text-xs font-medium" 
                          [ngClass]="{
                            'bg-blue-500/10 text-blue-500': log.action === 'CONNEXION',
                            'bg-purple-500/10 text-purple-500': log.action === 'MODIFICATION',
                            'bg-emerald-500/10 text-emerald-500': log.action === 'CREATION',
                            'bg-rose-500/10 text-rose-500': log.action === 'SUPPRESSION'
                          }">
                      {{log.action}}
                    </span>
                  </td>
                  <td class="p-4 text-muted-foreground">{{log.target}}</td>
                  <td class="p-4 text-muted-foreground font-mono text-xs">{{log.ip}}</td>
                  <td class="p-4">
                    <div class="w-full bg-muted rounded-full h-2 mt-1 relative overflow-hidden">
                      <div class="absolute top-0 left-0 h-full rounded-full" 
                           [ngStyle]="{'width': log.risk + '%'}"
                           [ngClass]="{
                              'bg-emerald-500': log.risk < 30,
                              'bg-amber-500': log.risk >= 30 && log.risk < 70,
                              'bg-rose-500': log.risk >= 70
                           }"></div>
                    </div>
                  </td>
                </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="p-4 border-t border-border bg-muted/10 text-xs text-muted-foreground text-center">
            Affichage de 6 enregistrements récents
          </div>
        </div>

        <!-- Predictive Alerts Panel -->
        <div class="flex flex-col gap-4">
          <div class="bg-rose-500/5 border border-rose-500/20 p-5 rounded-2xl shadow-sm">
            <div class="flex items-start gap-3">
              <div class="p-2 bg-rose-500/10 rounded-lg text-rose-500 shrink-0 mt-0.5">
                <lucide-icon name="alert-triangle" class="w-6 h-6"></lucide-icon>
              </div>
              <div>
                <h3 class="font-bold text-rose-500">Alerte Prédictive Critique</h3>
                <p class="text-sm text-foreground/80 mt-1">L'IA détecte une probabilité de <strong>92%</strong> d'accès non autorisé depuis l'IP <code>192.168.1.105</code> (Tentatives multiples hors heures ouvrables).</p>
                <button (click)="bloquerIp()" class="mt-3 bg-rose-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors disabled:opacity-50">
                  {{ ipBlocked ? 'IP Bloquée' : 'Bloquer l\\'IP' }}
                </button>
                <p *ngIf="ipBlocked" class="text-xs text-emerald-500 mt-2 font-medium flex items-center gap-1">
                  <lucide-icon name="shield-check" class="w-3 h-3"></lucide-icon> L'adresse IP a été bloquée avec succès.
                </p>
              </div>
            </div>
          </div>

          <div class="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl shadow-sm">
            <div class="flex items-start gap-3">
              <div class="p-2 bg-amber-500/10 rounded-lg text-amber-500 shrink-0 mt-0.5">
                <lucide-icon name="alert-triangle" class="w-6 h-6"></lucide-icon>
              </div>
              <div>
                <h3 class="font-bold text-amber-500">Avertissement de Tendance</h3>
                <p class="text-sm text-foreground/80 mt-1">Pic d'activité inhabituel sur le module de téléchargement des PDF. L'IA prédit une surcharge possible à 15:00.</p>
              </div>
            </div>
          </div>

          <div class="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl shadow-sm mt-auto">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <lucide-icon name="shield-check" class="w-6 h-6"></lucide-icon>
              </div>
              <div>
                <h3 class="font-bold text-emerald-500">Système Sécurisé</h3>
                <p class="text-xs text-foreground/80">L'IA veille activement sur vos données.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class AuditLogPageComponent {
  readonly ShieldAlert = ShieldAlert;
  readonly AlertTriangle = AlertTriangle;
  readonly ShieldCheck = ShieldCheck;
  readonly History = History;

  logs = [
    { date: '26 Mai 2026 14:32', user: 'yassi@cnstn.rnrt.tn', action: 'CONNEXION', target: 'Système', ip: '10.0.0.42', risk: 5 },
    { date: '26 Mai 2026 14:15', user: 'Inconnu', action: 'CONNEXION', target: 'Système', ip: '192.168.1.105', risk: 92 },
    { date: '26 Mai 2026 13:45', user: 'admin@cnstn.rnrt.tn', action: 'MODIFICATION', target: 'Article #402', ip: '10.0.0.12', risk: 15 },
    { date: '26 Mai 2026 12:20', user: 'ahmed@cnstn.rnrt.tn', action: 'CREATION', target: 'Actualité #88', ip: '10.0.0.18', risk: 8 },
    { date: '26 Mai 2026 11:10', user: 'sarah@cnstn.rnrt.tn', action: 'SUPPRESSION', target: 'Document #11', ip: '10.0.0.22', risk: 45 },
    { date: '26 Mai 2026 09:05', user: 'Inconnu', action: 'CONNEXION', target: 'Système', ip: '192.168.1.105', risk: 88 },
  ];

  ipBlocked = false;

  exportCSV() {
    const headers = ['Date & Heure', 'Utilisateur', 'Action', 'Cible', 'Adresse IP', 'Risque IA'];
    const rows = this.logs.map(log => 
      `"${log.date}","${log.user}","${log.action}","${log.target}","${log.ip}","${log.risk}%"`
    );
    
    const csvContent = [headers.join(','), ...rows].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'audit_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  bloquerIp() {
    this.ipBlocked = true;
    setTimeout(() => {
      alert("L'adresse IP 192.168.1.105 a été bloquée au niveau du pare-feu.");
    }, 300);
  }
}

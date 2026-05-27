import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { LucideAngularModule, Activity, Users, FileText, Database } from 'lucide-angular';

@Component({
  selector: 'app-analytic-dashboard-page',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, LucideAngularModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in duration-500">
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 class="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            Tableau de Bord Analytique
            <lucide-icon name="activity" class="w-6 h-6 text-accent"></lucide-icon>
          </h1>
          <p class="text-sm text-muted-foreground mt-1">Vision globale sur l'utilisation de la plateforme et l'impact de l'IA.</p>
        </div>
        <select class="bg-card text-card-foreground border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 shadow-sm">
          <option>30 derniers jours</option>
          <option>Cette année</option>
          <option>Tout le temps</option>
        </select>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div class="p-3 bg-blue-500/10 rounded-xl text-blue-500"><lucide-icon name="users" class="w-6 h-6"></lucide-icon></div>
          <div>
            <p class="text-sm font-medium text-muted-foreground">Chercheurs Actifs</p>
            <h3 class="text-2xl font-bold text-foreground">1,245</h3>
            <p class="text-xs text-[#12b76a] font-medium">+12% ce mois</p>
          </div>
        </div>
        <div class="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div class="p-3 bg-purple-500/10 rounded-xl text-purple-500"><lucide-icon name="file-text" class="w-6 h-6"></lucide-icon></div>
          <div>
            <p class="text-sm font-medium text-muted-foreground">Articles Indexés IA</p>
            <h3 class="text-2xl font-bold text-foreground">8,930</h3>
            <p class="text-xs text-[#12b76a] font-medium">+540 générés</p>
          </div>
        </div>
        <div class="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div class="p-3 bg-amber-500/10 rounded-xl text-amber-500"><lucide-icon name="database" class="w-6 h-6"></lucide-icon></div>
          <div>
            <p class="text-sm font-medium text-muted-foreground">Requêtes Sémantiques</p>
            <h3 class="text-2xl font-bold text-foreground">42.5K</h3>
            <p class="text-xs text-[#12b76a] font-medium">+25% d'utilisation</p>
          </div>
        </div>
        <div class="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div class="p-3 bg-rose-500/10 rounded-xl text-rose-500"><lucide-icon name="activity" class="w-6 h-6"></lucide-icon></div>
          <div>
            <p class="text-sm font-medium text-muted-foreground">Anomalies Détectées</p>
            <h3 class="text-2xl font-bold text-foreground">12</h3>
            <p class="text-xs text-muted-foreground font-medium">Bloquées par l'IA</p>
          </div>
        </div>
      </div>

      <!-- Charts Area -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Main Line Chart -->
        <div class="lg:col-span-2 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 class="text-lg font-bold text-foreground mb-4">Évolution de l'utilisation de l'IA (Recherche & Résumés)</h3>
          <div class="h-80">
            <canvas baseChart
              [data]="lineChartData"
              [options]="lineChartOptions"
              [type]="'line'">
            </canvas>
          </div>
        </div>

        <!-- Donut Chart -->
        <div class="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col">
          <h3 class="text-lg font-bold text-foreground mb-4">Répartition par Module</h3>
          <div class="flex-1 flex items-center justify-center">
            <div class="w-full h-64">
              <canvas baseChart
                [data]="doughnutChartData"
                [options]="doughnutChartOptions"
                [type]="'doughnut'">
              </canvas>
            </div>
          </div>
        </div>

      </div>

    </div>
  `
})
export class AnalyticDashboardPageComponent {
  readonly Activity = Activity;
  readonly Users = Users;
  readonly FileText = FileText;
  readonly Database = Database;

  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil'],
    datasets: [
      {
        data: [65, 59, 80, 81, 115, 155, 190],
        label: 'Requêtes Sémantiques',
        fill: true,
        tension: 0.4,
        borderColor: '#1d2f4f',
        backgroundColor: 'rgba(29, 47, 79, 0.1)'
      },
      {
        data: [28, 48, 40, 69, 86, 127, 150],
        label: 'Résumés Générés',
        fill: true,
        tension: 0.4,
        borderColor: '#d5a73f',
        backgroundColor: 'rgba(213, 167, 63, 0.1)'
      }
    ]
  };
  
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#5f6f83', font: { family: 'Source Sans 3' } } }
    },
    scales: {
      y: { border: { dash: [4, 4] }, grid: { color: '#d8dfe9' }, ticks: { color: '#5f6f83' } },
      x: { grid: { display: false }, ticks: { color: '#5f6f83' } }
    }
  };

  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Recherche', 'Résumés', 'Assistant Chat', 'Administration'],
    datasets: [
      { 
        data: [350, 450, 200, 100],
        backgroundColor: ['#1d2f4f', '#d5a73f', '#2f6ba6', '#12b76a'],
        borderWidth: 0
      }
    ]
  };

  public doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#5f6f83', font: { family: 'Source Sans 3' }, usePointStyle: true } }
    }
  };
}

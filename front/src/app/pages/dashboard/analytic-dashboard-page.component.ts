import { Component, OnInit, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { LucideAngularModule, Activity, Users, Clock, Bell, AlertTriangle, History } from 'lucide-angular';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import type { AdminDashboardKPIs } from '../../core/models/models';

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
          <p class="text-sm text-muted-foreground mt-1">Vision globale sur l'utilisation de la plateforme.</p>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="flex items-center justify-center py-24">
        <div class="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin"></div>
      </div>

      <!-- Error -->
      <div *ngIf="error() && !loading()" class="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center">
        <p class="text-rose-500 font-medium">{{ error() }}</p>
        <button (click)="loadData()" class="mt-3 bg-rose-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-rose-600 transition-colors">
          Réessayer
        </button>
      </div>

      <ng-container *ngIf="!loading() && !error() && kpis()">

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div class="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <lucide-icon name="users" class="w-6 h-6"></lucide-icon>
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Comptes Actifs</p>
              <h3 class="text-2xl font-bold text-foreground">{{ kpis()!.comptesActifs ?? 0 }}</h3>
              <p class="text-xs text-muted-foreground">sur {{ kpis()!.totalUtilisateurs ?? 0 }} au total</p>
            </div>
          </div>

          <div class="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div class="p-3 bg-amber-500/10 rounded-xl text-amber-500">
              <lucide-icon name="clock" class="w-6 h-6"></lucide-icon>
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Inscriptions en attente</p>
              <h3 class="text-2xl font-bold text-foreground">{{ kpis()!.inscriptionsEnAttente ?? 0 }}</h3>
              <p class="text-xs text-muted-foreground">à valider</p>
            </div>
          </div>

          <div class="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div class="p-3 bg-purple-500/10 rounded-xl text-purple-500">
              <lucide-icon name="bell" class="w-6 h-6"></lucide-icon>
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Notifications non lues</p>
              <h3 class="text-2xl font-bold text-foreground">{{ kpis()!.kpis.unreadNotifications ?? 0 }}</h3>
              <p class="text-xs text-muted-foreground">en attente</p>
            </div>
          </div>

          <div class="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div class="p-3 bg-rose-500/10 rounded-xl text-rose-500">
              <lucide-icon name="alert-triangle" class="w-6 h-6"></lucide-icon>
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Alertes Système</p>
              <h3 class="text-2xl font-bold text-foreground">{{ kpis()!.alertesSysteme }}</h3>
              <p class="text-xs text-muted-foreground">actives</p>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Line Chart -->
          <div class="lg:col-span-2 bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h3 class="text-lg font-bold text-foreground mb-4">Nouveaux comptes par mois</h3>
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
            <h3 class="text-lg font-bold text-foreground mb-4">Répartition par rôle</h3>
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

        <!-- Recent Activity -->
        <div class="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div class="p-4 border-b border-border bg-muted/30">
            <h3 class="font-semibold text-foreground flex items-center gap-2">
              <lucide-icon name="history" class="w-5 h-5 text-muted-foreground"></lucide-icon>
              Activité récente
            </h3>
          </div>
          <div class="divide-y divide-border">
            <div *ngFor="let item of kpis()!.recentActivity" class="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
              <div class="w-2 h-2 rounded-full shrink-0"
                   [ngClass]="{
                     'bg-blue-500': item.type === 'INSCRIPTION',
                     'bg-emerald-500': item.type === 'COMPTE',
                     'bg-purple-500': item.type === 'ROLE',
                     'bg-amber-500': item.type === 'MESSAGE'
                   }">
              </div>
              <p class="text-sm text-foreground flex-1">{{ item.label }}</p>
              <span class="text-xs text-muted-foreground whitespace-nowrap">{{ item.timestamp | date:'dd/MM HH:mm' }}</span>
            </div>
            <div *ngIf="kpis()!.recentActivity.length === 0" class="p-8 text-center text-muted-foreground text-sm">
              Aucune activité récente.
            </div>
          </div>
        </div>

      </ng-container>
    </div>
  `
})
export class AnalyticDashboardPageComponent implements OnInit {
  readonly Activity = Activity;
  readonly Users = Users;
  readonly Clock = Clock;
  readonly Bell = Bell;
  readonly AlertTriangle = AlertTriangle;
  readonly History = History;

  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  error = signal<string | null>(null);
  kpis = signal<AdminDashboardKPIs | null>(null);

  lineChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [{ data: [], label: '' }] };
  doughnutChartData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [{ data: [] }] };

  lineChartOptions: ChartOptions<'line'> = {
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

  doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#5f6f83', usePointStyle: true } }
    }
  };

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const session = this.authService.session();
      if (!session) throw new Error('Non autorisé');

      const data = await api.getAdminDashboardKPIs(session.accessToken);
      this.kpis.set(data);
      this.buildCharts(data);
    } catch (err) {
      console.error('Analytics load error:', err);
      this.error.set(err instanceof Error ? err.message : 'Impossible de charger les données.');
    } finally {
      this.loading.set(false);
    }
  }

  private buildCharts(data: AdminDashboardKPIs) {
    const months = data.charts?.newAccountsPerMonth ?? [];
    const roles  = data.charts?.rolesDistribution ?? [];

    this.lineChartData = {
      labels: months.map(m => m.label),
      datasets: [{
        data: months.map(m => m.value),
        label: 'Nouveaux comptes',
        fill: true,
        tension: 0.4,
        borderColor: '#1d2f4f',
        backgroundColor: 'rgba(29, 47, 79, 0.1)'
      }]
    };

    this.doughnutChartData = {
      labels: roles.map(r => r.label),
      datasets: [{
        data: roles.map(r => r.value),
        backgroundColor: ['#1d2f4f', '#d5a73f', '#2f6ba6', '#12b76a', '#e57373'],
        borderWidth: 0
      }]
    };

    this.cdr.detectChanges();
  }
}

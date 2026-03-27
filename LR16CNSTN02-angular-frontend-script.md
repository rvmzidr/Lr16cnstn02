# LR16CNSTN02 — Script Frontend Angular

## Stack technique

- **Angular 17+** (standalone components)
- **Tailwind CSS 3**
- **Google Fonts** : Playfair Display + Source Sans 3
- **Lucide Angular** (icônes)

---

## 1. Design System — `src/styles.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 220 20% 97%;
    --foreground: 220 30% 12%;
    --card: 0 0% 100%;
    --card-foreground: 220 30% 12%;
    --primary: 220 60% 18%;
    --primary-foreground: 45 100% 96%;
    --secondary: 45 85% 55%;
    --secondary-foreground: 220 60% 12%;
    --muted: 220 15% 92%;
    --muted-foreground: 220 10% 45%;
    --accent: 45 85% 55%;
    --accent-foreground: 220 60% 12%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 220 15% 88%;
    --input: 220 15% 88%;
    --ring: 220 60% 18%;
    --radius: 0.5rem;
    --nav-height: 4.5rem;
    --font-display: 'Playfair Display', serif;
    --font-body: 'Source Sans 3', sans-serif;
    --gradient-hero: linear-gradient(135deg, hsl(220 60% 14%) 0%, hsl(220 50% 22%) 50%, hsl(220 40% 28%) 100%);
    --gradient-gold: linear-gradient(135deg, hsl(45 85% 55%) 0%, hsl(38 90% 48%) 100%);
    --shadow-card: 0 4px 24px -4px hsl(220 60% 18% / 0.08);
    --shadow-elevated: 0 12px 40px -8px hsl(220 60% 18% / 0.15);
  }

  * {
    border-color: hsl(var(--border));
  }
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-family: var(--font-body);
  }
  h1, h2, h3, h4 {
    font-family: var(--font-display);
  }
}

@layer utilities {
  .text-gradient-gold {
    background: var(--gradient-gold);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}
```

---

## 2. Tailwind Config — `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["Source Sans 3", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
```

---

## 3. Composants Angular (Standalone)

### 3.1 `navbar.component.ts`

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-md border-b border-primary-foreground/10">
      <div class="container mx-auto flex items-center justify-between h-[var(--nav-height)] px-4">

        <!-- Logo -->
        <a href="#accueil" class="flex items-center gap-3">
          <img src="assets/lab-logo.png" alt="LR16CNSTN02" class="h-10 w-10 rounded-full object-cover" />
          <span class="font-display text-lg font-bold text-primary-foreground tracking-wide hidden sm:block">
            LR16CNSTN02
          </span>
        </a>

        <!-- Desktop links -->
        <ul class="hidden md:flex items-center gap-8">
          <li *ngFor="let link of navLinks">
            <a [href]="link.href"
               class="text-primary-foreground/80 hover:text-secondary transition-colors text-sm font-medium tracking-wide uppercase">
              {{ link.label }}
            </a>
          </li>
        </ul>

        <!-- Language + mobile toggle -->
        <div class="flex items-center gap-3">
          <button class="flex items-center gap-1 text-primary-foreground/70 hover:text-secondary transition-colors text-sm">
            <span class="hidden sm:inline">FR</span>
          </button>
          <button class="md:hidden text-primary-foreground" (click)="menuOpen = !menuOpen" aria-label="Menu">
            <svg *ngIf="!menuOpen" class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
            <svg *ngIf="menuOpen" class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div *ngIf="menuOpen" class="md:hidden bg-primary border-t border-primary-foreground/10 pb-4">
        <ul class="flex flex-col items-center gap-4 pt-4">
          <li *ngFor="let link of navLinks">
            <a [href]="link.href" (click)="menuOpen = false"
               class="text-primary-foreground/80 hover:text-secondary transition-colors text-sm font-medium uppercase">
              {{ link.label }}
            </a>
          </li>
        </ul>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  menuOpen = false;
  navLinks = [
    { label: 'Accueil', href: '#accueil' },
    { label: 'À propos', href: '#apropos' },
    { label: 'Recherche', href: '#recherche' },
    { label: 'Actualités', href: '#actualites' },
    { label: 'Contact', href: '#contact' },
  ];
}
```

### 3.2 `hero-section.component.ts`

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  template: `
    <section id="accueil" class="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <img src="assets/hero-bg.jpg" alt="" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-primary/70"></div>

      <div class="relative z-10 container mx-auto px-4 text-center max-w-3xl">
        <p class="text-secondary font-body text-sm uppercase tracking-[0.3em] mb-4">
          Centre National des Sciences et Technologies Nucléaires
        </p>
        <h1 class="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6">
          Laboratoire de Recherche
          <span class="text-gradient-gold">LR16CNSTN02</span>
        </h1>
        <p class="text-primary-foreground/80 font-body text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Contribuer à l'avancement des sciences nucléaires et des technologies
          associées à travers la recherche fondamentale et appliquée.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button class="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold px-8 py-3 rounded-lg text-sm">
            Découvrir nos travaux →
          </button>
          <button class="border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 px-8 py-3 rounded-lg text-sm">
            Nous contacter
          </button>
        </div>
      </div>

      <!-- Wave -->
      <div class="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" class="w-full">
          <path d="M0 40C360 80 720 0 1080 40C1260 60 1380 50 1440 40V80H0V40Z" fill="hsl(220 20% 97%)"/>
        </svg>
      </div>
    </section>
  `,
})
export class HeroSectionComponent {}
```

### 3.3 `about-preview.component.ts`

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section id="apropos" class="py-24 bg-background">
      <div class="container mx-auto px-4">
        <div class="grid lg:grid-cols-2 gap-16 items-center">

          <!-- Texte -->
          <div>
            <p class="text-secondary font-semibold text-sm uppercase tracking-widest mb-2">À propos</p>
            <h2 class="font-display text-3xl sm:text-4xl font-bold text-foreground mb-6 leading-snug">
              Un laboratoire au service de la science et de la société
            </h2>
            <p class="text-muted-foreground leading-relaxed mb-8">
              Le LR16CNSTN02 est un laboratoire de recherche rattaché au Centre
              National des Sciences et Technologies Nucléaires. Il regroupe des
              chercheurs, ingénieurs et doctorants engagés dans la production de
              connaissances scientifiques de haut niveau dans le domaine nucléaire.
            </p>

            <div class="space-y-6">
              <div *ngFor="let axe of axes" class="flex gap-4 items-start">
                <div class="flex-shrink-0 w-11 h-11 rounded-lg bg-secondary/15 flex items-center justify-center">
                  <span class="text-secondary text-lg">{{ axe.icon }}</span>
                </div>
                <div>
                  <h3 class="font-display text-lg font-semibold text-foreground">{{ axe.title }}</h3>
                  <p class="text-muted-foreground text-sm">{{ axe.desc }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Logo -->
          <div class="flex justify-center">
            <div class="relative w-72 h-72 sm:w-80 sm:h-80">
              <div class="absolute inset-0 rounded-full bg-primary/5 border-2 border-secondary/20"></div>
              <div class="absolute inset-4 rounded-full bg-card shadow-[var(--shadow-elevated)] flex items-center justify-center">
                <img src="assets/lab-logo.png" alt="Logo LR16CNSTN02" class="w-40 h-40 object-contain" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class AboutPreviewComponent {
  axes = [
    { icon: '⚛️', title: 'Physique Nucléaire', desc: 'Études fondamentales des propriétés nucléaires et interactions atomiques.' },
    { icon: '🧪', title: 'Radioprotection', desc: 'Surveillance environnementale et protection radiologique des personnes.' },
    { icon: '🔬', title: 'Applications Médicales', desc: "Imagerie et thérapie nucléaire pour la santé publique." },
  ];
}
```

### 3.4 `stats-bar.component.ts`

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="py-14 bg-primary">
      <div class="container mx-auto px-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div *ngFor="let s of stats">
            <p class="font-display text-3xl sm:text-4xl font-bold text-secondary">{{ s.value }}</p>
            <p class="text-primary-foreground/70 text-sm mt-1 font-body">{{ s.label }}</p>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class StatsBarComponent {
  stats = [
    { value: '25+', label: 'Chercheurs' },
    { value: '120+', label: 'Publications' },
    { value: '15', label: 'Thèses soutenues' },
    { value: '8', label: 'Projets en cours' },
  ];
}
```

### 3.5 `news-section.component.ts`

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-news-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section id="actualites" class="py-24 bg-muted/40">
      <div class="container mx-auto px-4">
        <div class="text-center mb-14">
          <p class="text-secondary font-semibold text-sm uppercase tracking-widest mb-2">Actualités</p>
          <h2 class="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Dernières nouvelles du laboratoire
          </h2>
        </div>

        <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div *ngFor="let a of articles"
               class="group bg-card rounded-lg border border-border/60 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow cursor-pointer">
            <div class="p-6 flex flex-col h-full">
              <div class="flex items-center justify-between mb-4">
                <span [class]="'text-xs font-semibold px-2.5 py-1 rounded-full ' + tagColor(a.tag)">
                  {{ a.tag }}
                </span>
                <svg class="h-4 w-4 text-muted-foreground group-hover:text-secondary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17L17 7M17 7H7M17 7v10"/>
                </svg>
              </div>
              <h3 class="font-display text-lg font-semibold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
                {{ a.title }}
              </h3>
              <p class="text-muted-foreground text-sm leading-relaxed flex-1">{{ a.excerpt }}</p>
              <div class="flex items-center gap-1.5 text-muted-foreground text-xs mt-4 pt-4 border-t border-border/60">
                📅 {{ a.date }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class NewsSectionComponent {
  articles = [
    {
      date: '15 Mars 2026',
      title: 'Publication dans Nuclear Instruments and Methods',
      excerpt: "Nouvelle étude sur la caractérisation des détecteurs à scintillation pour l'imagerie médicale.",
      tag: 'Publication',
    },
    {
      date: '02 Mars 2026',
      title: 'Séminaire international sur la radioprotection',
      excerpt: "Le laboratoire organise un séminaire avec des experts internationaux sur les nouvelles normes de radioprotection.",
      tag: 'Événement',
    },
    {
      date: '18 Février 2026',
      title: 'Soutenance de thèse – Mme. Fatma Ben Ali',
      excerpt: "Soutenance portant sur l'analyse par activation neutronique pour la surveillance environnementale.",
      tag: 'Thèse',
    },
  ];

  tagColor(tag: string): string {
    const map: Record<string, string> = {
      Publication: 'bg-secondary/15 text-secondary',
      Événement: 'bg-primary/10 text-primary',
      Thèse: 'bg-secondary/15 text-secondary',
    };
    return map[tag] || '';
  }
}
```

### 3.6 `footer-contact.component.ts`

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer-contact',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer id="contact" class="bg-primary text-primary-foreground">
      <div class="container mx-auto px-4 py-16">
        <div class="grid md:grid-cols-3 gap-12">

          <!-- Branding -->
          <div>
            <div class="flex items-center gap-3 mb-4">
              <img src="assets/lab-logo.png" alt="Logo" class="h-10 w-10 rounded-full" loading="lazy" />
              <span class="font-display text-lg font-bold">LR16CNSTN02</span>
            </div>
            <p class="text-primary-foreground/60 text-sm leading-relaxed">
              Laboratoire de recherche rattaché au Centre National des Sciences et
              Technologies Nucléaires, Tunisie.
            </p>
          </div>

          <!-- Liens rapides -->
          <div>
            <h4 class="font-display text-base font-semibold mb-4 text-secondary">Liens rapides</h4>
            <ul class="space-y-2 text-sm text-primary-foreground/70">
              <li *ngFor="let link of quickLinks">
                <a [href]="link.href" class="hover:text-secondary transition-colors">{{ link.label }}</a>
              </li>
            </ul>
          </div>

          <!-- Contact -->
          <div>
            <h4 class="font-display text-base font-semibold mb-4 text-secondary">Contact</h4>
            <ul class="space-y-3 text-sm text-primary-foreground/70">
              <li class="flex items-start gap-2">
                <span class="text-secondary">📍</span>
                Pôle Technologique, 2020 Sidi Thabet, Tunisie
              </li>
              <li class="flex items-center gap-2">
                <span class="text-secondary">📞</span>
                +216 71 537 410
              </li>
              <li class="flex items-center gap-2">
                <span class="text-secondary">✉️</span>
                contact&#64;cnstn.rnrt.tn
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="border-t border-primary-foreground/10 py-4">
        <p class="text-center text-xs text-primary-foreground/40">
          © 2026 LR16CNSTN02 — Tous droits réservés
        </p>
      </div>
    </footer>
  `,
})
export class FooterContactComponent {
  quickLinks = [
    { label: 'Accueil', href: '#accueil' },
    { label: 'À propos', href: '#apropos' },
    { label: 'Recherche', href: '#recherche' },
    { label: 'Actualités', href: '#actualites' },
    { label: 'Contact', href: '#contact' },
  ];
}
```

---

## 4. Page principale — `app.component.ts`

```typescript
import { Component } from '@angular/core';
import { NavbarComponent } from './components/navbar.component';
import { HeroSectionComponent } from './components/hero-section.component';
import { AboutPreviewComponent } from './components/about-preview.component';
import { StatsBarComponent } from './components/stats-bar.component';
import { NewsSectionComponent } from './components/news-section.component';
import { FooterContactComponent } from './components/footer-contact.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NavbarComponent,
    HeroSectionComponent,
    AboutPreviewComponent,
    StatsBarComponent,
    NewsSectionComponent,
    FooterContactComponent,
  ],
  template: `
    <div class="min-h-screen">
      <app-navbar />
      <app-hero-section />
      <app-about-preview />
      <app-stats-bar />
      <app-news-section />
      <app-footer-contact />
    </div>
  `,
})
export class AppComponent {}
```

---

## 5. Assets requis

Placer dans `src/assets/` :
- `lab-logo.png` — logo rond du laboratoire (512×512, fond transparent)
- `hero-bg.jpg` — photo scientifique/laboratoire (1920×1080)

---

## 6. Consignes pour l'agent

1. Créer un projet Angular 17+ avec Tailwind CSS 3
2. Copier le design system dans `src/styles.css`
3. Configurer `tailwind.config.js` avec les tokens
4. Créer chaque composant standalone dans `src/app/components/`
5. Assembler dans `app.component.ts`
6. **Utiliser UNIQUEMENT les tokens sémantiques** (`bg-primary`, `text-secondary`, etc.) — jamais de couleurs en dur
7. Les images (hero-bg, lab-logo) doivent être placées dans `src/assets/`
8. Le site est en **français** par défaut

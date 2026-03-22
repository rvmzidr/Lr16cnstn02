import { Component } from '@angular/core';

@Component({
  selector: 'app-nuclear-background',
  standalone: true,
  template: `
    <div class="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
      <div class="nuclear-motif">
        <svg aria-hidden="true" class="nuclear-motif__canvas" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(320 320)">
            <ellipse class="nuclear-motif__orbit nuclear-motif__orbit--major" cx="0" cy="0" rx="228" ry="92" />
            <ellipse class="nuclear-motif__orbit nuclear-motif__orbit--major nuclear-motif__delay-1" cx="0" cy="0" rx="228" ry="92" transform="rotate(60)" />
            <ellipse class="nuclear-motif__orbit nuclear-motif__orbit--major nuclear-motif__delay-2" cx="0" cy="0" rx="228" ry="92" transform="rotate(-60)" />
            <ellipse class="nuclear-motif__orbit nuclear-motif__orbit--soft" cx="0" cy="0" rx="176" ry="68" />
            <ellipse class="nuclear-motif__orbit nuclear-motif__orbit--soft nuclear-motif__delay-1" cx="0" cy="0" rx="176" ry="68" transform="rotate(60)" />
            <ellipse class="nuclear-motif__orbit nuclear-motif__orbit--soft nuclear-motif__delay-2" cx="0" cy="0" rx="176" ry="68" transform="rotate(-60)" />
            <path class="nuclear-motif__thread" d="M -164 -54 C -112 -38, -52 -16, 0 0 C 58 18, 118 40, 170 56" />
            <path class="nuclear-motif__thread nuclear-motif__delay-1" d="M -44 -172 C -22 -114, -6 -56, 0 0 C 8 54, 24 112, 46 174" />
            <path class="nuclear-motif__thread nuclear-motif__delay-2" d="M 126 -126 C 84 -84, 38 -40, 0 0 C -40 42, -86 86, -130 130" />
            <circle class="nuclear-motif__core-glow" cx="0" cy="0" r="78" />
            <circle class="nuclear-motif__core-ring" cx="0" cy="0" r="56" />
            <circle class="nuclear-motif__core" cx="0" cy="0" r="22" />
            <circle class="nuclear-motif__node" cx="228" cy="0" r="5.5" />
            <circle class="nuclear-motif__node nuclear-motif__node--delay-1" cx="-112" cy="-158" r="4.5" />
            <circle class="nuclear-motif__node nuclear-motif__node--delay-2" cx="-128" cy="152" r="4.5" />
            <circle class="nuclear-motif__node nuclear-motif__node--delay-3" cx="0" cy="-176" r="4" />
          </g>
        </svg>
      </div>
    </div>
  `
})
export class NuclearBackgroundComponent {}

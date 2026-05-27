import { Component, signal, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { api } from '../../../core/services/api';
import { AuthService } from '../../../core/services/auth.service';
import { sharedIcons } from '../../../shared/lucide-icons';

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <!-- Floating Button -->
    <button 
      (click)="toggleChat()"
      class="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl hover:scale-105 transition-all z-50">
      <lucide-icon [img]="isOpen() ? icons.X : icons.Bot" class="w-6 h-6"></lucide-icon>
    </button>

    <!-- Chat Window -->
    <div *ngIf="isOpen()" 
         class="fixed bottom-24 right-6 w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-card border border-border shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
      
      <!-- Header -->
      <div class="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <lucide-icon [img]="icons.Bot" class="w-5 h-5"></lucide-icon>
        </div>
        <div>
          <h3 class="font-bold text-sm">Assistant IA</h3>
          <p class="text-[10px] text-indigo-100 opacity-90">Posez vos questions sur le labo</p>
        </div>
      </div>

      <!-- Messages Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30" #chatScroll>
        
        <!-- Welcome Message -->
        <div class="flex gap-3 max-w-[85%]">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
            <lucide-icon [img]="icons.Bot" class="w-4 h-4 text-white"></lucide-icon>
          </div>
          <div class="bg-card border border-border rounded-2xl rounded-tl-sm p-3 shadow-sm text-sm text-card-foreground">
            <p>Bonjour ! Je peux vous renseigner sur notre laboratoire, nos projets, ou la plateforme. Comment puis-je aider ?</p>
          </div>
        </div>

        <!-- Dynamic Messages -->
        <div *ngFor="let msg of messages()" class="flex gap-3 max-w-[85%]" [ngClass]="{'ml-auto flex-row-reverse': msg.role === 'user'}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" 
               [ngClass]="msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'">
            <lucide-icon [img]="msg.role === 'user' ? icons.UserCircle2 : icons.Bot" class="w-4 h-4"></lucide-icon>
          </div>
          <div class="p-3 shadow-sm text-sm"
               [ngClass]="msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm' 
                  : 'bg-card border border-border text-card-foreground rounded-2xl rounded-tl-sm'">
            <p class="whitespace-pre-wrap">{{msg.content}}</p>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div *ngIf="loading()" class="flex gap-3 max-w-[85%]">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
            <lucide-icon [img]="icons.Bot" class="w-4 h-4 text-white"></lucide-icon>
          </div>
          <div class="bg-card border border-border rounded-2xl rounded-tl-sm p-3 flex gap-1 items-center">
            <div class="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"></div>
            <div class="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
        </div>

      </div>

      <!-- Input Area -->
      <div class="p-3 border-t border-border bg-card">
        <div class="flex items-end gap-2 bg-muted/50 p-1.5 rounded-xl border border-border focus-within:border-primary/50 transition-colors">
          <textarea 
            [(ngModel)]="newMessage" 
            (keydown.enter)="handleEnter($event)"
            placeholder="Écrivez..." 
            class="w-full max-h-24 min-h-[36px] bg-transparent resize-none outline-none p-2 text-sm text-card-foreground"
            rows="1"></textarea>
          
          <button 
            (click)="sendMessage()"
            [disabled]="!newMessage.trim() || loading()"
            class="w-9 h-9 bg-primary text-primary-foreground rounded-lg flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 shrink-0">
            <lucide-icon [img]="icons.Send" class="w-4 h-4"></lucide-icon>
          </button>
        </div>
      </div>

    </div>
  `
})
export class AiChatWidgetComponent implements AfterViewChecked {
  @ViewChild('chatScroll') private chatScrollContainer!: ElementRef;

  private authService = inject(AuthService);
  
  readonly icons = sharedIcons;

  isOpen = signal(false);
  newMessage = '';
  loading = signal(false);
  messages = signal<{role: 'user' | 'model', content: string}[]>([]);

  toggleChat() {
    this.isOpen.update(v => !v);
  }

  ngAfterViewChecked() {
    if (this.isOpen()) {
      this.scrollToBottom();
    }
  }

  scrollToBottom(): void {
    try {
      if (this.chatScrollContainer) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  handleEnter(event: Event) {
    event.preventDefault();
    this.sendMessage();
  }

  async sendMessage() {
    if (!this.newMessage.trim() || this.loading()) return;
    
    const userMsg = this.newMessage.trim();
    this.newMessage = '';
    
    const hist = this.messages();
    this.messages.set([...hist, { role: 'user', content: userMsg }]);
    
    this.loading.set(true);
    
    try {
      // Allow visitors to chat too (public API call), pass token if available
      const session = this.authService.session();
      const token = session ? session.accessToken : '';

      // we use aiChat from api with token (even if empty, we might need a public endpoint or modify api)
      const response = await api.aiChat(token, { 
        message: userMsg, 
        history: hist 
      });
      
      this.messages.set([...this.messages(), { role: 'model', content: response.reply }]);
    } catch (err) {
      console.error(err);
      this.messages.set([...this.messages(), { role: 'model', content: "Désolé, une erreur est survenue lors de la connexion à l'IA." }]);
    } finally {
      this.loading.set(false);
    }
  }
}

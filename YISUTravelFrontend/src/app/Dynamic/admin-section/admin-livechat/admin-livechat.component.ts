import { Component } from '@angular/core';
import {ChatbotService} from "../../../Services/chatbot-service/chatbot.service";
import {FormsModule} from "@angular/forms";
import {NgForOf} from "@angular/common";
import {subscribe} from "node:diagnostics_channel";

@Component({
  selector: 'app-admin-livechat',
  standalone: true,
  imports: [
    FormsModule,
    NgForOf
  ],
  templateUrl: './admin-livechat.component.html',
  styleUrl: './admin-livechat.component.css'
})
export class AdminLivechatComponent {
  public messages: any[] = [];
  public message: string = '';
  public sessionId: string | null = localStorage.getItem('session_id') || null; // Session ID aus LocalStorage holen

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    // Beim Laden eine Nachricht an den Bot senden
  }

  // Methode, um eine Nachricht zu senden
  sendMessage() {
    if (!this.message.trim()) return;

    const msg = this.message.trim();
    
    // ✅ OPTIMISTIC UPDATE: User-Nachricht sofort hinzufügen
    const userMessage = {
      from: 'user',
      text: msg,
      timestamp: new Date(),
      isOptimistic: true
    };

    this.messages = [...this.messages, userMessage];
    this.message = ''; // Eingabefeld sofort leeren

    this.chatbotService.sendMessage(msg).subscribe(
      (response) => {
        // ✅ Entferne optimistische Nachricht und füge echte hinzu
        this.messages = this.messages.filter(m => !(m.isOptimistic && m.from === 'user' && m.text === msg));
        
        // ✅ Füge alle Nachrichten aus Response hinzu
        if (response.new_messages && response.new_messages.length > 0) {
          response.new_messages.forEach((msg: any) => {
            this.messages.push({
              from: msg.from,
              text: msg.text,
              timestamp: new Date(msg.timestamp || Date.now()),
              message_type: msg.message_type
            });
          });
        } else if (response.messages) {
          // Fallback für alte API-Struktur
          this.messages = response.messages.map((msg: any) => ({
            from: msg.from,
            text: msg.text,
            timestamp: new Date(msg.timestamp || Date.now())
          }));
        }
        
        this.sessionId = response.session_id;
        // Session ID im LocalStorage speichern
        if (typeof this.sessionId === "string") {
          localStorage.setItem('session_id', this.sessionId);
        }
      },
      (error) => {
        console.error('Fehler beim Senden der Nachricht:', error);
        
        // ✅ Bei Fehler: Optimistische Nachricht entfernen und Fehlermeldung anzeigen
        this.messages = this.messages.filter(m => !(m.isOptimistic && m.from === 'user' && m.text === msg));
        this.messages.push({
          from: 'bot',
          text: 'Entschuldigung, ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
          timestamp: new Date()
        });
        
        // ✅ Text wieder ins Input-Feld setzen
        this.message = msg;
      }
    );
  }

  // Methode, um anonym zu chatten
  sendAnonymousMessage() {
    if (!this.message.trim()) return;

    const msg = this.message.trim();
    
    // ✅ OPTIMISTIC UPDATE: User-Nachricht sofort hinzufügen
    const userMessage = {
      from: 'user',
      text: msg,
      timestamp: new Date(),
      isOptimistic: true
    };

    this.messages = [...this.messages, userMessage];
    this.message = ''; // Eingabefeld sofort leeren

    this.chatbotService.sendMessageAnonymous(msg).subscribe(
      (response) => {
        // ✅ Entferne optimistische Nachricht und füge echte hinzu
        this.messages = this.messages.filter(m => !(m.isOptimistic && m.from === 'user' && m.text === msg));
        
        // ✅ Füge alle Nachrichten aus Response hinzu
        if (response.new_messages && response.new_messages.length > 0) {
          response.new_messages.forEach((msg: any) => {
            this.messages.push({
              from: msg.from,
              text: msg.text,
              timestamp: new Date(msg.timestamp || Date.now()),
              message_type: msg.message_type
            });
          });
        } else if (response.messages) {
          // Fallback für alte API-Struktur
          this.messages = response.messages.map((msg: any) => ({
            from: msg.from,
            text: msg.text,
            timestamp: new Date(msg.timestamp || Date.now())
          }));
        }
      },
      (error) => {
        console.error('Fehler beim Senden der Nachricht:', error);
        
        // ✅ Bei Fehler: Optimistische Nachricht entfernen und Fehlermeldung anzeigen
        this.messages = this.messages.filter(m => !(m.isOptimistic && m.from === 'user' && m.text === msg));
        this.messages.push({
          from: 'bot',
          text: 'Entschuldigung, ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
          timestamp: new Date()
        });
        
        // ✅ Text wieder ins Input-Feld setzen
        this.message = msg;
      }
    );
  }

  // Methode, um die Sitzung zu beenden
  endSession() {
    if (this.sessionId) {
      this.chatbotService.endSession(this.sessionId).subscribe(
        (response) => {
          this.messages = [];
        },
        (error) => {
          console.error('Fehler beim Beenden der Sitzung:', error);
        }
      );
    }
  }
}

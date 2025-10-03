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
    if (this.message.trim()) {
      this.chatbotService.sendMessage(this.message).subscribe(
        (response) => {
          // Nachrichten im Frontend anzeigen
          this.messages = response.messages;
          this.sessionId = response.session_id;
          // Session ID im LocalStorage speichern
          if (typeof this.sessionId === "string") {
            localStorage.setItem('session_id', this.sessionId);
          }
        },
        (error) => {
          console.error('Fehler beim Senden der Nachricht:', error);
        }
      );
      this.message = ''; // Eingabefeld zurücksetzen
    }
  }

  // Methode, um anonym zu chatten
  sendAnonymousMessage() {
    if (this.message.trim()) {
      this.chatbotService.sendMessageAnonymous(this.message).subscribe(
        (response) => {
          this.messages = response.messages;
        },
        (error) => {
          console.error('Fehler beim Senden der Nachricht:', error);
        }
      );
      this.message = '';
    }
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

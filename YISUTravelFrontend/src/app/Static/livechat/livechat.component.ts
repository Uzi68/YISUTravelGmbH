import {AfterViewInit, Component, ElementRef, Inject, NgZone, PLATFORM_ID, ViewChild} from '@angular/core';
import {isPlatformBrowser, NgClass, NgForOf, NgIf} from "@angular/common";
import {MatFormField} from "@angular/material/form-field";
import {FormsModule} from "@angular/forms";
import {MatIcon} from "@angular/material/icon";
import {MatIconButton} from "@angular/material/button";
import {MatInput} from "@angular/material/input";

@Component({
  selector: 'app-livechat',
  standalone: true,
  imports: [
    MatFormField,
    FormsModule,
    NgClass,
    MatIcon,
    MatIconButton,
    MatInput,
    NgForOf,
    NgIf
  ],
  templateUrl: './livechat.component.html',
  styleUrl: './livechat.component.css'
})
export class LivechatComponent{
/*
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Run the code in the next event loop to ensure the browser environment is ready
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this.add3CXWidget();
          this.load3CXScript();
        }, 0);
      });
    }
  }

  private add3CXWidget(): void {
    const widget = document.createElement('call-us-selector');
    widget.setAttribute('phonesystem-url', 'https://1148.3cx.cloud');
    widget.setAttribute('party', 'yisutravel');
    document.body.appendChild(widget); // Append the widget to the body
  }

  private load3CXScript(): void {
    const scriptId = 'tcx-callus-js';
    if (document.getElementById(scriptId)) return; // Avoid duplicate loading

    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://downloads-global.3cx.com/downloads/livechatandtalk/v1/callus.js';
    script.id = scriptId;
    script.charset = 'utf-8';
    document.body.appendChild(script); // Append the script to the body
  }

*/

  @ViewChild('chatMessages') private chatMessagesContainer!: ElementRef;
  isOpen = false;
  messages = [
    { text: 'Was kann ich für dich tun?', sender: 'bot' },
    { text: 'Hi 👋 Was führt dich heute zu uns?', sender: 'bot' },
    { text: 'Mehr über uns erfahren', sender: 'user' }
  ];
  newMessage = '';

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendMessage() {
    if (this.newMessage.trim()) {
      this.messages.push({ text: this.newMessage, sender: 'user' });
      this.newMessage = '';
      setTimeout(() => {
        this.messages.push({ text: 'Ich werde bald antworten...', sender: 'bot' });
        this.scrollToBottom();
      }, 1000);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.scrollToBottom(), 100);
  }

  private scrollToBottom(): void {
    if (this.chatMessagesContainer) {
      this.chatMessagesContainer.nativeElement.scrollTop =
        this.chatMessagesContainer.nativeElement.scrollHeight;
    }
  }
}


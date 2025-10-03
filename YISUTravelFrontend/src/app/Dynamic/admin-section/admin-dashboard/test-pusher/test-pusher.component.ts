import {Component, NgZone} from '@angular/core';
import {DatePipe, NgForOf, NgIf} from "@angular/common";
import {AuthService} from "../../../../Services/AuthService/auth.service";
import {PusherService} from "../../../../Services/Pusher/pusher.service";

@Component({
  selector: 'app-test-pusher',
  standalone: true,
  imports: [
    DatePipe,
    NgIf,
    NgForOf
  ],
  templateUrl: './test-pusher.component.html',
  styleUrl: './test-pusher.component.css',
})
export class TestPusherComponent {
  messages: ChatMessage[] = [];
  private subscription?: { stop: () => void };

  constructor(private pusherService: PusherService, private ngZone: NgZone) {}

  ngOnInit(): void {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      console.warn('Keine session_id im LocalStorage gefunden');
      return;
    }

    const channel = `chat.${sessionId}`;
    console.log('Subscribing to channel:', channel);

    this.subscription = this.pusherService.listenToChannel<any>(
      channel,
      'message.received', // 👈 Muss exakt dem Event aus Laravel entsprechen
      (data) => {
        console.log('Event empfangen in TestPusherComponent:', data);
        console.log(JSON.stringify(data))
        this.ngZone.run(() => {
          this.messages.push({
            from: data.message.from,
            text: data.message.text,
            created_at: new Date(data.message.created_at)
          });
        });
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.stop();
  }
}
interface ChatMessage {
  from: string;
  text: string;
  created_at: Date;
}

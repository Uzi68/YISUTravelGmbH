/**
 * Pusher-Echtzeit via nativen WebSocket (kein pusher-js nötig).
 * React Native hat WebSocket eingebaut — keine externen Pakete.
 */

const PUSHER_KEY = '1d031260d5bf381a1f39';
const PUSHER_CLUSTER = 'eu';
const WS_URL = `wss://ws-${PUSHER_CLUSTER}.pusher.com/app/${PUSHER_KEY}?protocol=7&client=react-native&version=1.0`;

let ws: WebSocket | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
const subscribers = new Map<string, ((data: any) => void)[]>();

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    // Alle aktiven Subscriptions wiederherstellen
    subscribers.forEach((_, channel) => {
      ws?.send(JSON.stringify({
        event: 'pusher:subscribe',
        data: { channel },
      }));
    });

    // Ping alle 30s um Verbindung aufrechtzuerhalten
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
      }
    }, 30000);
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      const event = msg.event;
      const channel = msg.channel;

      if (!channel || !event) return;

      const handlers = subscribers.get(channel);
      if (!handlers) return;

      let data = msg.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { /* bleibt String */ }
      }

      handlers.forEach((cb) => {
        try { cb({ event, ...data }); } catch { /* */ }
      });
    } catch { /* Parse-Fehler ignorieren */ }
  };

  ws.onclose = () => {
    if (pingInterval) clearInterval(pingInterval);
    // Automatisch neu verbinden nach 3s
    reconnectTimeout = setTimeout(connect, 3000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function subscribeToChat(
  sessionId: string,
  onMessage: (data: any) => void,
  onTyping?: (data: any) => void,
) {
  const channel = `chat.${sessionId}`;

  const handler = (data: any) => {
    const event = data.event;
    if (event === 'message.received') {
      onMessage(data);
    } else if (onTyping && (event === 'bot.typing' || event === 'agent.typing')) {
      onTyping(data);
    }
  };

  const existing = subscribers.get(channel) ?? [];
  subscribers.set(channel, [...existing, handler]);

  connect();

  // Channel abonnieren falls bereits verbunden
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      event: 'pusher:subscribe',
      data: { channel },
    }));
  }

  return () => {
    const current = subscribers.get(channel) ?? [];
    const updated = current.filter((h) => h !== handler);
    if (updated.length === 0) {
      subscribers.delete(channel);
      ws?.send(JSON.stringify({
        event: 'pusher:unsubscribe',
        data: { channel },
      }));
    } else {
      subscribers.set(channel, updated);
    }
  };
}

export function disconnectPusher() {
  if (pingInterval) clearInterval(pingInterval);
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  subscribers.clear();
  ws?.close();
  ws = null;
}

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
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  const socket = new WebSocket(WS_URL);
  ws = socket;

  socket.onopen = () => {
    // Stale socket — a newer connection took over
    if (ws !== socket) { socket.close(); return; }

    // Alle aktiven Subscriptions wiederherstellen
    subscribers.forEach((_, channel) => {
      try {
        socket.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { channel },
        }));
      } catch { /* ignore */ }
    });

    // Ping alle 30s um Verbindung aufrechtzuerhalten
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        try { socket.send(JSON.stringify({ event: 'pusher:ping', data: {} })); } catch { /* ignore */ }
      }
    }, 30000);
  };

  socket.onmessage = (e) => {
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

  socket.onclose = () => {
    if (ws !== socket) return; // stale socket — ignore
    if (pingInterval) clearInterval(pingInterval);
    // Automatisch neu verbinden nach 3s
    reconnectTimeout = setTimeout(connect, 3000);
  };

  socket.onerror = () => {
    try { socket.close(); } catch { /* ignore */ }
  };
}

export function subscribeToChat(
  sessionId: string,
  onMessage: (data: any) => void,
  onTyping?: (data: any) => void,
  onAssigned?: (data: any) => void,
) {
  const channel = `chat.${sessionId}`;

  const handler = (data: any) => {
    const event = data.event;
    if (event === 'message.received') {
      onMessage(data);
    } else if (onTyping && (event === 'bot.typing' || event === 'agent.typing')) {
      onTyping(data);
    } else if (onAssigned && (event === 'chat.assigned' || event === 'assignment.updated')) {
      onAssigned(data);
    } else if (onAssigned && event === 'chat.transferred') {
      // to_agent_name → agent_name normalisieren
      onAssigned({ ...data, agent_name: data.to_agent_name, agent_avatar: data.agent_avatar });
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
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          event: 'pusher:unsubscribe',
          data: { channel },
        }));
      }
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

// src/lib/websocket.ts
export class RecognitionWebSocket {
    private socket: WebSocket | null = null;
    private url: string;
    private onMessage: (data: any) => void;

    constructor(onMessage: (data: any) => void) {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001/ws/recognition';
        this.url = wsUrl;
        this.onMessage = onMessage;
    }

    connect() {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log('WebSocket connected');
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.onMessage(data);
        };

        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            // Reconnect after 2 seconds
            setTimeout(() => this.connect(), 2000);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    sendFrame(base64Image: string) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(base64Image);
        }
    }

    close() {
        if (this.socket) {
            this.socket.close();
        }
    }
}

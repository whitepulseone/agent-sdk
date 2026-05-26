import type {
  AgentClientOptions,
  AgentEventHandlers,
  CreateThreadResponse,
  SendMessageOptions,
  SseEvent,
} from './types';

export class AgentClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: AgentClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
  }

  /**
   * Creates a new conversation thread and returns its ID.
   * Store the threadId to continue the same conversation later.
   */
  async createThread(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/v1/chat/threads`, {
      method: 'POST',
      headers: this.headers(),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Failed to create thread (${res.status}): ${body}`);
    }

    const data: CreateThreadResponse = await res.json();
    return data.threadId;
  }

  /**
   * Sends a message and streams the agent's response via SSE.
   * Returns a promise that resolves when the stream completes.
   *
   * @example
   * await client.sendMessage(
   *   { message: 'Hello!', threadId },
   *   {
   *     onMessageDelta: ({ content }) => process.stdout.write(content),
   *     onDone: ({ threadId }) => console.log('Done, thread:', threadId),
   *     onError: ({ message }) => console.error(message),
   *   }
   * );
   */
  async sendMessage(
    options: SendMessageOptions,
    handlers: AgentEventHandlers = {},
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: options.message,
        threadId: options.threadId,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Stream request failed (${res.status}): ${body}`);
    }

    if (!res.body) {
      throw new Error('Response body is null — SSE not supported in this environment');
    }

    await this.consumeStream(res.body, handlers);
  }

  /**
   * Convenience wrapper: creates a thread, sends the first message, and
   * returns the threadId so you can continue the conversation.
   */
  async startConversation(
    message: string,
    handlers: AgentEventHandlers = {},
  ): Promise<string> {
    const threadId = await this.createThread();
    await this.sendMessage({ message, threadId }, handlers);
    return threadId;
  }

  // ---------- private ----------

  private headers(): Record<string, string> {
    return { 'x-api-key': this.apiKey };
  }

  private async consumeStream(
    body: ReadableStream<Uint8Array>,
    handlers: AgentEventHandlers,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line || line.startsWith(':')) continue; // skip comments/heartbeats

          const dataLine = line.startsWith('data: ') ? line.slice(6) : line;
          try {
            const event: SseEvent = JSON.parse(dataLine);
            this.dispatch(event, handlers);
          } catch {
            // malformed line — ignore
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private dispatch(event: SseEvent, handlers: AgentEventHandlers): void {
    switch (event.type) {
      case 'session.started':
        handlers.onSessionStarted?.(event);
        break;
      case 'message.delta':
        handlers.onMessageDelta?.(event);
        break;
      case 'tool.executing':
        handlers.onToolExecuting?.(event);
        break;
      case 'tool.completed':
        handlers.onToolCompleted?.(event);
        break;
      case 'mcp.progress':
        handlers.onMcpProgress?.(event);
        break;
      case 'done':
        handlers.onDone?.(event);
        break;
      case 'error':
        handlers.onError?.(event);
        break;
    }
  }
}

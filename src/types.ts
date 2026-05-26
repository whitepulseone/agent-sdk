export interface AgentClientOptions {
  /** Base URL of the WhitePulse backend, e.g. "https://api.yoursite.com" */
  baseUrl: string;
  /** Base64-encoded API key from the WhitePulse dashboard */
  apiKey: string;
}

export interface SendMessageOptions {
  message: string;
  /** Reuse an existing thread to continue a conversation */
  threadId?: string;
}

// ---------- SSE event shapes (mirrors backend SseEvent union) ----------

export interface SessionStartedEvent {
  type: 'session.started';
  threadId: string;
  runId: string;
}

export interface MessageDeltaEvent {
  type: 'message.delta';
  content: string;
}

export interface ToolExecutingEvent {
  type: 'tool.executing';
  name: string;
  /** Human-readable status shown in the chat UI, e.g. "Searching knowledge base…" */
  label: string;
  arguments: Record<string, unknown>;
}

export interface ToolCompletedEvent {
  type: 'tool.completed';
  name: string;
  /** Human-readable completion message, e.g. "Found relevant information" */
  label: string;
}

export interface McpProgressEvent {
  type: 'mcp.progress';
  operation: string;
  status: string;
  /** Human-readable progress message, e.g. "Installing packages…" */
  label: string;
  payload: Record<string, unknown>;
}

export interface DoneEvent {
  type: 'done';
  threadId: string;
}

export interface ErrorEvent {
  type: 'error';
  code: string;
  message: string;
}

export type SseEvent =
  | SessionStartedEvent
  | MessageDeltaEvent
  | ToolExecutingEvent
  | ToolCompletedEvent
  | McpProgressEvent
  | DoneEvent
  | ErrorEvent;

// ---------- Event handler map ----------

export interface AgentEventHandlers {
  onSessionStarted?: (event: SessionStartedEvent) => void;
  onMessageDelta?: (event: MessageDeltaEvent) => void;
  onToolExecuting?: (event: ToolExecutingEvent) => void;
  onToolCompleted?: (event: ToolCompletedEvent) => void;
  onMcpProgress?: (event: McpProgressEvent) => void;
  onDone?: (event: DoneEvent) => void;
  onError?: (event: ErrorEvent) => void;
}

export interface CreateThreadResponse {
  threadId: string;
}

# @whitepulse/agent-sdk

Official JavaScript/TypeScript SDK for streaming chat with [WhitePulse](https://whitepulse.ai) AI agents via HTTP + Server-Sent Events (SSE).

Works in **browsers**, **Node.js 18+**, and **edge runtimes** (Cloudflare Workers, Vercel Edge, etc.).

## Installation

```bash
npm install @whitepulse/agent-sdk
# or
yarn add @whitepulse/agent-sdk
# or
pnpm add @whitepulse/agent-sdk
```

## Requirements

- Node.js **18+** (uses native `fetch` and `ReadableStream`)
- A WhitePulse backend URL
- An API key from the WhitePulse dashboard

## Quick Start

```ts
import { AgentClient } from '@whitepulse/agent-sdk';

const client = new AgentClient({
  baseUrl: 'https://api.yoursite.com',
  apiKey: 'your-api-key',
});

// Start a conversation and stream the response
const threadId = await client.startConversation('Hello! What can you help me with?', {
  onMessageDelta: ({ content }) => process.stdout.write(content),
  onDone: () => console.log('\nDone.'),
  onError: ({ code, message }) => console.error(`Error [${code}]: ${message}`),
});

// Continue the same conversation
await client.sendMessage(
  { message: 'Tell me more.', threadId },
  {
    onMessageDelta: ({ content }) => process.stdout.write(content),
    onDone: () => console.log('\nDone.'),
  },
);
```

## API Key Format

API keys are **Base64-encoded JSON** generated from the WhitePulse dashboard. They encode the assistant, user, and permission level:

```ts
// Example of what the dashboard generates for you:
const payload = { assistantId: 'asst_xxx', userId: 'user_yyy', permission: 'full_access' };
const apiKey = btoa(JSON.stringify(payload));
```

You do not need to construct this manually — copy it directly from the WhitePulse dashboard.

## API Reference

### `new AgentClient(options)`

Creates a new client instance.

| Option | Type | Description |
|--------|------|-------------|
| `baseUrl` | `string` | Base URL of your WhitePulse backend, e.g. `"https://api.yoursite.com"` |
| `apiKey` | `string` | Base64-encoded API key from the WhitePulse dashboard |

---

### `client.startConversation(message, handlers?)`

Convenience method that creates a new thread and sends the first message in one call.

```ts
const threadId = await client.startConversation('Hi!', {
  onMessageDelta: ({ content }) => process.stdout.write(content),
  onDone: ({ threadId }) => console.log('Thread:', threadId),
});
```

**Returns:** `Promise<string>` — the `threadId` to use for follow-up messages.

---

### `client.sendMessage(options, handlers?)`

Sends a message to an existing thread and streams the response.

```ts
await client.sendMessage(
  { message: 'Follow-up question', threadId: 'thread_abc123' },
  {
    onMessageDelta: ({ content }) => process.stdout.write(content),
    onDone: () => console.log('Done'),
  },
);
```

| Option | Type | Description |
|--------|------|-------------|
| `message` | `string` | The user message to send |
| `threadId` | `string` (optional) | Reuse an existing thread to continue a conversation |

---

### `client.createThread()`

Creates a new conversation thread and returns its ID. Use this when you want to manage the thread lifecycle yourself.

```ts
const threadId = await client.createThread();
```

**Returns:** `Promise<string>` — the new `threadId`.

---

### Event Handlers

All handlers are optional. Pass only the ones you need.

| Handler | Payload | Description |
|---------|---------|-------------|
| `onSessionStarted` | `{ threadId, runId }` | Fired when the agent run begins |
| `onMessageDelta` | `{ content }` | Fired for each streamed text chunk |
| `onToolExecuting` | `{ name, label, arguments }` | Fired when the agent calls a tool |
| `onToolCompleted` | `{ name, label }` | Fired when a tool call finishes |
| `onMcpProgress` | `{ operation, status, label, payload }` | Fired for MCP tool progress updates |
| `onDone` | `{ threadId }` | Fired when the full response is complete |
| `onError` | `{ code, message }` | Fired on stream or agent errors |

## Examples

### React (streaming into state)

```tsx
import { useState } from 'react';
import { AgentClient } from '@whitepulse/agent-sdk';

const client = new AgentClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  apiKey: import.meta.env.VITE_AGENT_API_KEY,
});

export function Chat() {
  const [response, setResponse] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);

  async function send(message: string) {
    setResponse('');

    if (!threadId) {
      const id = await client.startConversation(message, {
        onMessageDelta: ({ content }) => setResponse(prev => prev + content),
      });
      setThreadId(id);
    } else {
      await client.sendMessage(
        { message, threadId },
        { onMessageDelta: ({ content }) => setResponse(prev => prev + content) },
      );
    }
  }

  return (
    <div>
      <p>{response}</p>
      <button onClick={() => send('Hello!')}>Send</button>
    </div>
  );
}
```

### Node.js (CLI)

```ts
import { AgentClient } from '@whitepulse/agent-sdk';

const client = new AgentClient({
  baseUrl: process.env.API_BASE_URL!,
  apiKey: process.env.AGENT_API_KEY!,
});

process.stdout.write('Agent: ');

await client.startConversation('What services do you offer?', {
  onMessageDelta: ({ content }) => process.stdout.write(content),
  onToolExecuting: ({ label }) => console.log(`\n[${label}]`),
  onDone: () => console.log('\n'),
  onError: ({ code, message }) => console.error(`[${code}] ${message}`),
});
```

### Show tool usage in the UI

```ts
await client.sendMessage(
  { message: 'Search the knowledge base for refund policy', threadId },
  {
    onToolExecuting: ({ label }) => showSpinner(label),  // e.g. "Searching knowledge base…"
    onToolCompleted: ({ label }) => hideSpinner(label),  // e.g. "Found relevant information"
    onMessageDelta: ({ content }) => appendToChat(content),
    onDone: () => console.log('Complete'),
  },
);
```

## TypeScript

The SDK is written in TypeScript and ships its own types — no `@types/` package needed.

```ts
import type {
  AgentClientOptions,
  AgentEventHandlers,
  MessageDeltaEvent,
  DoneEvent,
  ErrorEvent,
  SseEvent,
} from '@whitepulse/agent-sdk';
```

## License

MIT © [WhitePulse](https://whitepulse.ai)

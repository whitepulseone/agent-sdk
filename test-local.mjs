/**
 * Local test script for @whitepulse/agent-sdk
 * Run: node test-local.mjs
 * Requires: backend running on localhost:4000
 */

import { AgentClient } from './dist/index.mjs';

// Generate a test API key (base64 JSON matching the backend's api-key.util.ts format)
const apiKeyPayload = {
  assistantId: 'asst_ZxmHQVUodnloBzoezbjBjx9h',
  userId: '68bbcbbc2a528fd32c99ea50',
  permission: 'full_access',
};
const API_KEY = Buffer.from(JSON.stringify(apiKeyPayload)).toString('base64');

const client = new AgentClient({
  baseUrl: 'http://localhost:4000',
  apiKey: API_KEY,
});

console.log('--- Test 1: createThread ---');
const threadId = await client.createThread();
console.log('Thread created:', threadId);

console.log('\n--- Test 2: sendMessage (streaming) ---');
process.stdout.write('Agent: ');

await client.sendMessage(
  { message: 'Hello! What can you help me with?', threadId },
  {
    onSessionStarted: ({ threadId }) => console.log('[session started] threadId:', threadId),
    onMessageDelta: ({ content }) => process.stdout.write(content),
    onToolExecuting: ({ name }) => console.log('\n[tool executing]', name),
    onToolCompleted: ({ name }) => console.log('[tool completed]', name),
    onMcpProgress: ({ operation, status }) => console.log('[mcp]', operation, status),
    onDone: () => console.log('\n[done]'),
    onError: ({ code, message }) => console.error('\n[error]', code, message),
  },
);

console.log('\n--- Test 3: startConversation (new thread auto-created) ---');
process.stdout.write('Agent: ');

const newThreadId = await client.startConversation('Tell me a one-sentence joke.', {
  onMessageDelta: ({ content }) => process.stdout.write(content),
  onDone: () => console.log('\n[done]'),
  onError: ({ code, message }) => console.error('\n[error]', code, message),
});

console.log('New thread ID:', newThreadId);

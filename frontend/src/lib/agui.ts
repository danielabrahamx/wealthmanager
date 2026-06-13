/**
 * AG-UI SSE client.
 *
 * POSTs a turn (chat message or A2UI button action) to `/api/agui` and consumes
 * the spec-compliant AG-UI event stream:
 *   RUN_STARTED → TEXT_MESSAGE_START/CONTENT/END → [CUSTOM "a2ui"] → [CUSTOM directive] → RUN_FINISHED
 *
 * The backend (@ag-ui/encoder) writes each event as `data: <JSON>\n\n`, with no
 * key transformation, so the wire JSON keys match @ag-ui/core exactly
 * (`type`, `delta`, `name`, `value`).
 */

export interface AguiTurnBody {
  userId: string;
  message?: string;
  action?: { name: string; context?: Record<string, unknown> };
  tier?: string;
  fundsDeposited?: number;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface AguiHandlers {
  /** Called for each TEXT_MESSAGE_CONTENT delta. */
  onText?: (delta: string) => void;
  /** Called with the A2UI v0.9 message array from a CUSTOM "a2ui" event. */
  onA2ui?: (messages: Array<Record<string, unknown>>) => void;
  /** Called for any other CUSTOM event (e.g. "view_report", "invest_complete"). */
  onDirective?: (name: string, value: unknown) => void;
}

interface AguiEvent {
  type: string;
  delta?: string;
  name?: string;
  value?: unknown;
  [k: string]: unknown;
}

function dispatchBlock(block: string, handlers: AguiHandlers): void {
  // An SSE record may carry multiple `data:` lines; concatenate them.
  const payload = block
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
    .join('\n');
  if (!payload) return;

  let event: AguiEvent;
  try {
    event = JSON.parse(payload) as AguiEvent;
  } catch {
    return;
  }

  switch (event.type) {
    case 'TEXT_MESSAGE_CONTENT':
      if (typeof event.delta === 'string') handlers.onText?.(event.delta);
      break;
    case 'CUSTOM':
      if (event.name === 'a2ui' && Array.isArray(event.value)) {
        handlers.onA2ui?.(event.value as Array<Record<string, unknown>>);
      } else if (typeof event.name === 'string') {
        handlers.onDirective?.(event.name, event.value);
      }
      break;
    default:
      break;
  }
}

export async function streamAgui(body: AguiTurnBody, handlers: AguiHandlers): Promise<void> {
  const res = await fetch('/api/agui', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    throw new Error(`AG-UI request failed: ${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep = buffer.indexOf('\n\n');
    while (sep !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (block.trim()) dispatchBlock(block, handlers);
      sep = buffer.indexOf('\n\n');
    }
  }

  // Flush any trailing buffered record.
  buffer += decoder.decode();
  if (buffer.trim()) dispatchBlock(buffer, handlers);
}

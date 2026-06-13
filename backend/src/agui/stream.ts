/**
 * AG-UI streaming.
 *
 * Emits a spec-compliant AG-UI event sequence over SSE using the official
 * @ag-ui/core event types and @ag-ui/encoder. A2UI surfaces are carried as a
 * CUSTOM event (name: "a2ui"), which the frontend extracts and hands to the
 * @copilotkit/a2ui-renderer.
 *
 * Sequence: RUN_STARTED → TEXT_MESSAGE_START/CONTENT/END → [CUSTOM a2ui] → RUN_FINISHED
 */
import type { Response } from 'express';
import { EventType } from '@ag-ui/core';
import { EventEncoder } from '@ag-ui/encoder';
import { randomUUID } from 'node:crypto';
import type { A2uiMessage } from '../a2ui/builder.js';

export interface AguiRunPayload {
  threadId: string;
  text: string;
  a2ui?: A2uiMessage[] | null;
  /** Optional named client directive (e.g. "view_report") sent as a CUSTOM event. */
  directive?: { name: string; value?: unknown } | null;
}

export function streamAguiRun(res: Response, payload: AguiRunPayload): void {
  const encoder = new EventEncoder();
  const runId = randomUUID();
  const messageId = randomUUID();
  const { threadId, text, a2ui, directive } = payload;

  res.setHeader('Content-Type', encoder.getContentType());
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (event: Parameters<EventEncoder['encodeSSE']>[0]) => {
    res.write(encoder.encodeSSE(event));
  };

  send({ type: EventType.RUN_STARTED, threadId, runId } as never);

  send({ type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant' } as never);
  send({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: text } as never);
  send({ type: EventType.TEXT_MESSAGE_END, messageId } as never);

  if (a2ui && a2ui.length > 0) {
    send({ type: EventType.CUSTOM, name: 'a2ui', value: a2ui } as never);
  }

  if (directive) {
    send({ type: EventType.CUSTOM, name: directive.name, value: directive.value ?? null } as never);
  }

  send({ type: EventType.RUN_FINISHED, threadId, runId } as never);
  res.end();
}

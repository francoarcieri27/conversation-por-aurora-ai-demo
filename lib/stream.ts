// Parse complete SSE frames only; network packets may end in the middle of UTF-8 or JSON.
export async function consumeSSE(response: Response, onEvent: (event: Record<string, any>) => void) {
  if (!response.body) throw new Error('Empty response stream')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const frame = (text: string) => {
    const data = text.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
    if (!data || data === '[DONE]') return
    const event = JSON.parse(data)
    if (event.event === 'error' || event.status >= 400) throw new Error('No se pudo completar la respuesta. / Unable to complete the response.')
    onEvent(event)
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      let boundary: RegExpExecArray | null
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        frame(buffer.slice(0, boundary.index))
        buffer = buffer.slice(boundary.index + boundary[0].length)
      }
      if (buffer.length > 1048576) throw new Error('Response frame too large')
      if (done) { if (buffer.trim()) frame(buffer); break }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}

// Remove an optional leading reasoning block even when its tags span chunks.
export function visibleAnswer() {
  let pending = ''
  let phase: 'prefix' | 'thinking' | 'visible' = 'prefix'
  return {
    push(chunk: string) {
      if (phase === 'visible') return chunk
      pending += chunk
      if (phase === 'prefix') {
        const trimmed = pending.trimStart()
        if ('<think>'.startsWith(trimmed)) return ''
        if (!trimmed.startsWith('<think>')) { phase = 'visible'; const out = pending; pending = ''; return out }
        phase = 'thinking'
      }
      const end = pending.indexOf('</think>')
      if (end < 0) {
        // Only the suffix can be part of a split closing tag; do not retain reasoning.
        pending = pending.slice(-8)
        return ''
      }
      phase = 'visible'
      const out = pending.slice(end + 8)
      pending = ''
      return out
    },
    finish() { return phase === 'prefix' && pending.trim() && !'<think>'.startsWith(pending.trimStart()) ? pending : '' },
  }
}

export function cleanAnswer(answer: string) {
  // Dify history contains the complete raw answer, unlike incremental visible chunks.
  const end = answer.toLowerCase().lastIndexOf('</think>')
  if (end >= 0) return answer.slice(end + 8).trimStart()
  const start = answer.toLowerCase().indexOf('<think>')
  return start >= 0 ? answer.slice(0, start).trimEnd() : answer
}

export function publicStream(upstream: Response) {
  const encoder = new TextEncoder()
  let upstreamReaderCancelled = false
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const filter = visibleAnswer()
      let ended = false
      const send = (event: Record<string, any>) => {
        if (!upstreamReaderCancelled) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      try {
        await consumeSSE(upstream, (event) => {
          if (event.event === 'message' || event.event === 'agent_message') {
            send({ event: event.event, id: event.id || event.message_id, message_id: event.message_id || event.id, task_id: event.task_id, conversation_id: event.conversation_id, answer: filter.push(event.answer || '') })
          } else if (event.event === 'message_replace') {
            send({ event: event.event, id: event.id || event.message_id, message_id: event.message_id || event.id, conversation_id: event.conversation_id, answer: cleanAnswer(event.answer || '') })
          } else if (event.event === 'message_file') send(event)
          else if (event.event === 'message_end') {
            ended = true
            // Exclude traces, prompts, annotations and reasoning metadata.
            send({ event: 'message_end', id: event.id || event.message_id, message_id: event.message_id || event.id, conversation_id: event.conversation_id })
          }
        })
        if (!ended) throw new Error('Interrupted stream')
      } catch {
        send({ event: 'error', code: 'response_interrupted', message: 'Respuesta interrumpida. / Response interrupted.' })
      } finally { if (!upstreamReaderCancelled) controller.close() }
    },
    cancel() { upstreamReaderCancelled = true },
  })
}

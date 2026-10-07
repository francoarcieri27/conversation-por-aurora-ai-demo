import { consumeSSE, visibleAnswer } from '@/lib/stream'
import { API_PREFIX } from '@/config'
import Toast from '@/app/components/base/toast'
import type { AnnotationReply, MessageEnd, MessageReplace, ThoughtItem } from '@/app/components/chat/type'
import type { VisionFile } from '@/types/app'

const TIME_OUT = 100000

const ContentType = {
  json: 'application/json',
  stream: 'text/event-stream',
  form: 'application/x-www-form-urlencoded; charset=UTF-8',
  download: 'application/octet-stream', // for download
}

const baseOptions = {
  method: 'GET',
  mode: 'cors',
  credentials: 'include', // always send cookies、HTTP Basic authentication.
  headers: new Headers({
    'Content-Type': ContentType.json,
  }),
  redirect: 'follow',
}

export interface WorkflowStartedResponse {
  task_id: string
  workflow_run_id: string
  event: string
  data: {
    id: string
    workflow_id: string
    sequence_number: number
    created_at: number
  }
}

export interface WorkflowFinishedResponse {
  task_id: string
  workflow_run_id: string
  event: string
  data: {
    id: string
    workflow_id: string
    status: string
    outputs: any
    error: string
    elapsed_time: number
    total_tokens: number
    total_steps: number
    created_at: number
    finished_at: number
  }
}

export interface NodeStartedResponse {
  task_id: string
  workflow_run_id: string
  event: string
  data: {
    id: string
    node_id: string
    node_type: string
    index: number
    predecessor_node_id?: string
    inputs: any
    created_at: number
    extras?: any
  }
}

export interface NodeFinishedResponse {
  task_id: string
  workflow_run_id: string
  event: string
  data: {
    id: string
    node_id: string
    node_type: string
    index: number
    predecessor_node_id?: string
    inputs: any
    process_data: any
    outputs: any
    status: string
    error: string
    elapsed_time: number
    execution_metadata: {
      total_tokens: number
      total_price: number
      currency: string
    }
    created_at: number
  }
}

export interface IOnDataMoreInfo {
  conversationId?: string
  taskId?: string
  messageId: string
  errorMessage?: string
  errorCode?: string
}

export type IOnData = (message: string, isFirstMessage: boolean, moreInfo: IOnDataMoreInfo) => void
export type IOnThought = (though: ThoughtItem) => void
export type IOnFile = (file: VisionFile) => void
export type IOnMessageEnd = (messageEnd: MessageEnd) => void
export type IOnMessageReplace = (messageReplace: MessageReplace) => void
export type IOnAnnotationReply = (messageReplace: AnnotationReply) => void
export type IOnCompleted = (hasError?: boolean) => void
export type IOnError = (msg: string, code?: string) => void
export type IOnWorkflowStarted = (workflowStarted: WorkflowStartedResponse) => void
export type IOnWorkflowFinished = (workflowFinished: WorkflowFinishedResponse) => void
export type IOnNodeStarted = (nodeStarted: NodeStartedResponse) => void
export type IOnNodeFinished = (nodeFinished: NodeFinishedResponse) => void

interface IOtherOptions {
  isPublicAPI?: boolean
  bodyStringify?: boolean
  needAllResponseContent?: boolean
  deleteContentType?: boolean
  onData?: IOnData // for stream
  onThought?: IOnThought
  onFile?: IOnFile
  onMessageEnd?: IOnMessageEnd
  onMessageReplace?: IOnMessageReplace
  onError?: IOnError
  onCompleted?: IOnCompleted // for stream
  getAbortController?: (abortController: AbortController) => void
  onWorkflowStarted?: IOnWorkflowStarted
  onWorkflowFinished?: IOnWorkflowFinished
  onNodeStarted?: IOnNodeStarted
  onNodeFinished?: IOnNodeFinished
}

const handleStream = async (
  response: Response,
  onData: IOnData,
  onCompleted?: IOnCompleted,
  onThought?: IOnThought,
  onMessageEnd?: IOnMessageEnd,
  onMessageReplace?: IOnMessageReplace,
  onFile?: IOnFile,
  onWorkflowStarted?: IOnWorkflowStarted,
  onWorkflowFinished?: IOnWorkflowFinished,
  onNodeStarted?: IOnNodeStarted,
  onNodeFinished?: IOnNodeFinished,
) => {
  const filter = visibleAnswer()
  let first = true
  let ended = false
  let meta: IOnDataMoreInfo = { messageId: '' }
  await consumeSSE(response, (event) => {
    if (event.event === 'message' || event.event === 'agent_message') {
      meta = { conversationId: event.conversation_id, taskId: event.task_id, messageId: event.message_id || event.id }
      const text = filter.push(event.answer || '')
      // Metadata is needed even when the visible answer is still buffered.
      onData(text, first, meta)
      first = false
    } else if (event.event === 'message_end') { ended = true; onMessageEnd?.(event as MessageEnd) }
    else if (event.event === 'message_replace') onMessageReplace?.({ ...event, id: event.id || event.message_id, answer: event.answer.replace(/<think>[\s\S]*?<\/think>/g, '') } as MessageReplace)
    else if (event.event === 'message_file') onFile?.(event as VisionFile)
    // Workflow traces contain internal prompts and customer data; keep them out of the UI.
  })
  if (!ended) throw new Error('Respuesta interrumpida. Inténtalo de nuevo. / Response interrupted. Please retry.')
  const remaining = filter.finish()
  if (remaining) onData(remaining, first, meta)
  onCompleted?.(false)
}

const baseFetch = async (url: string, fetchOptions: any, { needAllResponseContent }: IOtherOptions) => {
  const options = { ...baseOptions, ...fetchOptions }
  let path = `${API_PREFIX}${url.startsWith('/') ? url : `/${url}`}`
  if (options.params) {
    path += `?${new URLSearchParams(options.params)}`
    delete options.params
  }
  if (options.body) options.body = JSON.stringify(options.body)
  const res = await fetch(path, { ...options, signal: AbortSignal.timeout(TIME_OUT) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const error = new Error(data.message || 'No se pudo completar la solicitud. / Request failed.')
    Object.assign(error, { status: res.status })
    throw error
  }
  if (needAllResponseContent) return res
  if (res.status === 204) return { result: 'success' }
  return res.json()
}

export const upload = (fetchOptions: any): Promise<any> => {
  const urlPrefix = API_PREFIX
  const urlWithPrefix = `${urlPrefix}/file-upload`
  const defaultOptions = {
    method: 'POST',
    url: `${urlWithPrefix}`,
    data: {},
  }
  const options = {
    ...defaultOptions,
    ...fetchOptions,
  }
  return new Promise((resolve, reject) => {
    const xhr = options.xhr
    xhr.open(options.method, options.url)
    for (const key in options.headers) { xhr.setRequestHeader(key, options.headers[key]) }

    xhr.withCredentials = true
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) { resolve({ id: xhr.response }) }
        else { reject(xhr) }
      }
    }
    xhr.upload.onprogress = options.onprogress
    xhr.send(options.data)
  })
}

export const ssePost = async (url: string, fetchOptions: any, options: IOtherOptions) => {
  const controller = new AbortController()
  options.getAbortController?.(controller)
  try {
    const res = await fetch(`${API_PREFIX}${url.startsWith('/') ? url : `/${url}`}`, {
      ...baseOptions, ...fetchOptions, method: 'POST',
      body: JSON.stringify(fetchOptions.body), signal: controller.signal,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Servicio no disponible. / Service unavailable.')
    }
    await handleStream(res, options.onData!, options.onCompleted, options.onThought, options.onMessageEnd, options.onMessageReplace, options.onFile)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    Toast.notify({ type: 'error', message })
    options.onError?.(message)
    options.onCompleted?.(true)
  }
}

export const request = (url: string, options = {}, otherOptions?: IOtherOptions) => {
  return baseFetch(url, options, otherOptions || {})
}

export const get = (url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request(url, Object.assign({}, options, { method: 'GET' }), otherOptions)
}

export const post = (url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request(url, Object.assign({}, options, { method: 'POST' }), otherOptions)
}

export const put = (url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request(url, Object.assign({}, options, { method: 'PUT' }), otherOptions)
}

export const del = (url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request(url, Object.assign({}, options, { method: 'DELETE' }), otherOptions)
}

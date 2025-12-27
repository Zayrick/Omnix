type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

type ChatCompletionOptions = {
  apiKey: string
  baseUrl?: string
  model: string
  temperature?: number
  messages: ChatMessage[]
}

export const createChatCompletionStream = async ({
  apiKey,
  baseUrl,
  model,
  temperature = 0.7,
  messages,
}: ChatCompletionOptions) => {
  const endpoint = (baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const aiResponse = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature,
      messages,
    }),
  })

  if (!aiResponse.ok || !aiResponse.body) {
    const detail = await aiResponse.text()
    throw new Error(detail || 'AI 请求失败')
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const reader = aiResponse.body.getReader()

  return new ReadableStream({
    async start(controller) {
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) {
            continue
          }
          const data = trimmed.replace(/^data:\s*/, '')
          if (data === '[DONE]') {
            controller.close()
            return
          }
          try {
            const json = JSON.parse(data)
            const delta = json?.choices?.[0]?.delta?.content ?? ''
            if (delta) {
              controller.enqueue(encoder.encode(delta))
            }
          } catch (error) {
            console.error('stream parse error', error)
          }
        }
      }

      controller.close()
    },
  })
}

import { config } from './config.js'

const API_BASE = `https://api.telegram.org/bot${config.botToken}`

interface TelegramResponse {
	ok: boolean
	description?: string
	result?: {
		message_id: number
	}
}

export async function sendMessage(text: string): Promise<number> {
	const response = await fetch(`${API_BASE}/sendMessage`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			chat_id: config.chatId,
			text,
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		}),
	})

	const data = (await response.json()) as TelegramResponse

	if (!data.ok || !data.result) {
		throw new Error(`Telegram API error: ${data.description ?? 'unknown'}`)
	}

	return data.result.message_id
}

export async function editMessage(messageId: number, text: string): Promise<void> {
	const response = await fetch(`${API_BASE}/editMessageText`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			chat_id: config.chatId,
			message_id: messageId,
			text,
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		}),
	})

	const data = (await response.json()) as TelegramResponse

	if (!data.ok) {
		throw new Error(`Telegram API error: ${data.description ?? 'unknown'}`)
	}
}

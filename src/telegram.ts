import { config } from './config.js'
import { logger } from './logger.js'

const API_BASE = `https://api.telegram.org/bot${config.botToken}`

interface TelegramResponse {
	ok: boolean
	description?: string
	result?: {
		message_id: number
	}
}

export async function sendMessage(chatId: number, text: string, replyToMessageId?: number): Promise<number> {
	const response = await fetch(`${API_BASE}/sendMessage`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			chat_id: chatId,
			text,
			parse_mode: 'HTML',
			disable_web_page_preview: true,
			...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
		}),
	})

	const data = (await response.json()) as TelegramResponse

	if (!data.ok || !data.result) {
		logger.error({ chatId, description: data.description }, 'не удалось отправить сообщение в telegram (sendMessage)')
		throw new Error(`Telegram API error: ${data.description ?? 'unknown'}`)
	}

	logger.debug({ chatId, messageId: data.result.message_id, replyToMessageId }, 'сообщение в telegram отправлено')
	return data.result.message_id
}

export async function editMessage(chatId: number, messageId: number, text: string): Promise<void> {
	const response = await fetch(`${API_BASE}/editMessageText`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			chat_id: chatId,
			message_id: messageId,
			text,
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		}),
	})

	const data = (await response.json()) as TelegramResponse

	if (!data.ok) {
		logger.error({ chatId, messageId, description: data.description }, 'не удалось отредактировать сообщение в telegram (editMessageText)')
		throw new Error(`Telegram API error: ${data.description ?? 'unknown'}`)
	}

	logger.debug({ chatId, messageId }, 'сообщение в telegram отредактировано')
}

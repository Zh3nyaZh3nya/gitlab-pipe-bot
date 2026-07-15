import 'dotenv/config'

function required(name: string): string {
	const value = process.env[name]

	if (!value) {
		throw new Error(`Missing required env variable: ${name}`)
	}

	return value
}

export const config = {
	botToken: required('BOT_TOKEN'),
	chatId: required('CHAT_ID'),
	gitlabWebhookSecret: required('GITLAB_WEBHOOK_SECRET'),
	port: Number(process.env.PORT ?? 3000),
} as const

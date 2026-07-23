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
	gitlabWebhookSecret: required('GITLAB_WEBHOOK_SECRET'),
	gitlabUrl: required('GITLAB_URL'),
	gitlabApiToken: required('GITLAB_API_TOKEN'),
	port: Number(process.env.PORT ?? 3000),
} as const

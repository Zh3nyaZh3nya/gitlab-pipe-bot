import Fastify from 'fastify'
import { config } from './config.js'
import { buildMessage } from './pipeline.js'
import { sendMessage, editMessage } from './telegram.js'
import { isPipelineEvent } from './types/gitlab.js'

const app = Fastify({ logger: true })

const TERMINAL_STATUSES = new Set(['success', 'failed'])
const pipelineMessages = new Map<number, number>()

app.get('/health', () => ({ status: 'ok' }))

app.post('/webhook/gitlab', async (request, reply) => {
	const token = request.headers['x-gitlab-token']

	if (token !== config.gitlabWebhookSecret) {
		return reply.code(401).send({ error: 'Invalid token' })
	}

	if (!isPipelineEvent(request.body)) {
		return reply.code(200).send({
			skipped: 'not a pipeline event',
		})
	}

	const event = request.body
	const message = buildMessage(event)

	if (message === null) {
		return reply.code(200).send({
			skipped: `status ${event.object_attributes.status}`,
		})
	}

	const pipelineId = event.object_attributes.id
	const existingMessageId = pipelineMessages.get(pipelineId)

	try {
		if (existingMessageId) {
			await editMessage(existingMessageId, message)
		} else {
			const messageId = await sendMessage(message)
			pipelineMessages.set(pipelineId, messageId)
		}

		if (TERMINAL_STATUSES.has(event.object_attributes.status)) {
			pipelineMessages.delete(pipelineId)
		}

		app.log.info(
			{
				pipelineId,
				status: event.object_attributes.status,
			},
			'notification sent',
		)
	} catch (error) {
		app.log.error(error, 'failed to send telegram message')
	}

	return reply.code(200).send({ ok: true })
})

app.listen({
	port: config.port,
	host: '0.0.0.0',
}).catch((error) => {
	app.log.error(error)
	process.exit(1)
})

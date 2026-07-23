import Fastify from 'fastify'
import { config } from './config.js'
import { fetchMergeRequestForCommit } from './gitlab-api.js'
import { logger } from './logger.js'
import { getNotifyConfigForProject } from './notify.config.js'
import { buildCancelNotice, buildFailureNotice, buildMessage } from './pipeline.js'
import type { MessageConfig } from './pipeline.js'
import { sendMessage, editMessage } from './telegram.js'
import { isPipelineEvent } from './types/gitlab.js'
import type { GitlabMergeRequestInfo } from './types/gitlab.js'

const app = Fastify({ loggerInstance: logger })

const TERMINAL_STATUSES = new Set(['success', 'failed'])
/** pipelineId → (chatId → messageId уже отправленного/редактируемого сообщения) */
const pipelineMessages = new Map<number, Map<number, number>>()
const mergeRequestCache = new Map<number, GitlabMergeRequestInfo | null>()

app.get('/health', () => ({ status: 'ok' }))

app.post('/webhook/gitlab', async (request, reply) => {
	const token = request.headers['x-gitlab-token']

	if (token !== config.gitlabWebhookSecret) {
		app.log.warn({ ip: request.ip }, 'вебхук отклонен: неверный токен')
		return reply.code(401).send({ error: 'Invalid token' })
	}

	if (!isPipelineEvent(request.body)) {
		app.log.debug('вебхук пропущен: это не pipeline-событие')
		return reply.code(200).send({
			skipped: 'not a pipeline event',
		})
	}

	const event = request.body
	const pipelineId = event.object_attributes.id

	app.log.info(
		{ pipelineId, status: event.object_attributes.status, projectId: event.project.id },
		'получено pipeline-событие',
	)

	const notifyConfig = getNotifyConfigForProject(event.project.path_with_namespace)

	if (!notifyConfig) {
		app.log.debug({ pipelineId, project: event.project.path_with_namespace }, 'вебхук пропущен: нет конфига для этого проекта')
		return reply.code(200).send({
			skipped: `нет конфига для ${event.project.path_with_namespace}`,
		})
	}

	if (!event.merge_request) {
		let mergeRequest = mergeRequestCache.get(pipelineId) ?? null

		if (!mergeRequest) {
			mergeRequest = await fetchMergeRequestForCommit(event.project.id, event.object_attributes.sha)

			if (mergeRequest) {
				mergeRequestCache.set(pipelineId, mergeRequest)
				app.log.info({ pipelineId, mergeRequestIid: mergeRequest.iid }, 'найден merge request для пайплайна')
			}
		}

		event.merge_request = mergeRequest
	}

	const chatMessages = pipelineMessages.get(pipelineId) ?? new Map<number, number>()
	let sentToAnyChat = false

	for (const chatConfig of notifyConfig.chats) {
		const messageConfig: MessageConfig = { ...chatConfig, linkToJira: notifyConfig.linkToJira }
		const message = buildMessage(event, messageConfig)

		if (message === null) {
			continue
		}

		sentToAnyChat = true
		const existingMessageId = chatMessages.get(chatConfig.chat_id)

		try {
			let messageId: number

			if (existingMessageId) {
				await editMessage(chatConfig.chat_id, existingMessageId, message)
				messageId = existingMessageId
			} else {
				messageId = await sendMessage(chatConfig.chat_id, message)
				chatMessages.set(chatConfig.chat_id, messageId)
			}

			if (event.object_attributes.status === 'failed') {
				const notice = buildFailureNotice(event, messageConfig)

				if (notice) {
					await sendMessage(chatConfig.chat_id, notice, messageId)
				}
			}

			if (event.object_attributes.status === 'canceled') {
				const notice = buildCancelNotice(event, messageConfig)

				if (notice) {
					await sendMessage(chatConfig.chat_id, notice, messageId)
				}
			}

			app.log.info(
				{
					pipelineId,
					chatId: chatConfig.chat_id,
					status: event.object_attributes.status,
				},
				'уведомление отправлено',
			)
		} catch (error) {
			app.log.error({ error, chatId: chatConfig.chat_id }, 'не удалось отправить сообщение в telegram')
		}
	}

	if (chatMessages.size > 0) {
		pipelineMessages.set(pipelineId, chatMessages)
	}

	if (TERMINAL_STATUSES.has(event.object_attributes.status)) {
		pipelineMessages.delete(pipelineId)
		mergeRequestCache.delete(pipelineId)
	}

	if (!sentToAnyChat) {
		app.log.debug({ pipelineId, status: event.object_attributes.status }, 'вебхук пропущен: ни один чат не подходит под условия уведомления')
		return reply.code(200).send({
			skipped: `status ${event.object_attributes.status}`,
		})
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

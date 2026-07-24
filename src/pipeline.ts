import { logger } from './logger.js'
import type { GitlabBuild, GitlabBuildStatus, GitlabPipelineEvent, GitlabPipelineStatus } from './types/gitlab.js'
import type { NotifyChatConfig } from './types/notify-config.js'

/** Настройки, нужные для сборки сообщения одному конкретному чату: общая ссылка на Jira + настройки этого чата */
export type MessageConfig = NotifyChatConfig & { linkToJira: string | null }

const STATUS_LABELS: Partial<Record<GitlabPipelineStatus, { smile: string, text: string }>> = {
	created: {
		smile: '🆕',
		text: 'created'
	},
	running: {
		smile: '🔄',
		text: 'process'
	},
	success: {
		smile: '✅',
		text: 'success'
	},
	failed: {
		smile: '‼️',
		text: 'failed'
	},
	canceled: {
		smile: '🔚',
		text: 'canceled',
	}
}

function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
}

function extractJiraProjectKey(linkToJira: string): string | null {
	return linkToJira.match(/\/projects\/([^/]+)\//)?.[1] ?? null
}

function buildBranchLink(ref: string, linkToJira: string | null): string {
	const projectKey = linkToJira ? extractJiraProjectKey(linkToJira) : null

	if (!projectKey || !ref.includes(projectKey)) {
		return escapeHtml(ref)
	}

	const separator = linkToJira!.includes('?') ? '&' : '?'
	const url = `${linkToJira}${separator}selectedIssue=${encodeURIComponent(ref)}`

	return `<b><a href="${escapeHtml(url)}" rel="noreferrer noopener" target="_blank">${escapeHtml(ref)}</a></b>`
}

function passesTargetBuilds(buildNames: string[], targetBuilds: string | null): boolean {
	if (!targetBuilds) {
		return true
	}

	const required = targetBuilds.split(',').map((name) => name.trim()).filter(Boolean)

	return required.every((name) => buildNames.includes(name))
}

function findDeveloperMention(gitlabUsername: string, config: MessageConfig): string | null {
	const developer = config.userNames.developers?.find((dev) => dev.gitlab_name === gitlabUsername)

	return developer ? `@${developer.telegram_name}` : null
}

function buildManagerMentions(config: MessageConfig): string | null {
	if (!config.userNames.managers || config.userNames.managers.length === 0) {
		return null
	}

	return config.userNames.managers.map((manager) => `@${manager.telegram_name}`).join(' ')
}

function formatDuration(seconds: number | null): string | null {
	if (seconds === null || seconds <= 0) {
		return null
	}

	const min = Math.floor(seconds / 60)
	const sec = Math.round(seconds % 60)

	return min > 0 ? `${min} m ${sec} s` : `${sec} s`
}

function findFirstBuildByStatus(builds: GitlabBuild[], status: GitlabBuildStatus): GitlabBuild | null {
	return builds.find((build) => build.status === status) ?? null
}

const INACTIVE_BUILD_STATUSES: GitlabBuildStatus[] = ['manual', 'created', 'skipped']

function findDeployTarget(builds: GitlabBuild[]): { tags: string[], target: string } | null {
	const prioritized = [...builds].sort((a, b) => {
		const aInactive = INACTIVE_BUILD_STATUSES.includes(a.status) ? 1 : 0
		const bInactive = INACTIVE_BUILD_STATUSES.includes(b.status) ? 1 : 0

		return aInactive - bInactive
	})

	for (const build of prioritized) {
		const name = build.name.toLowerCase()

		if (name.includes('prod')) {
			return { tags: ['#deploy_release'], target: 'production' }
		}

		const testMatch = name.match(/test(\d*)/)

		if (testMatch) {
			return { tags: ['#deploy_test'], target: `test${testMatch[1]}` }
		}
	}

	return null
}

function formatBuildLabel(build: GitlabBuild, pipelineUrl: string): string {
	return `<a href="${escapeHtml(pipelineUrl)}" rel="noreferrer noopener" target="_blank">Build</a> ${escapeHtml(build.name)}`
}

function formatBuildDuration(seconds: number | null): string {
	return `${(seconds ?? 0).toFixed(1)} sec`
}

export function buildMessage(event: GitlabPipelineEvent, config: MessageConfig): string | null {
	const {
		object_attributes: pipeline,
		user,
		project,
		merge_request,
		commit,
		builds,
	} = event

	const buildNames = builds.map((build) => build.name)
	if (!passesTargetBuilds(buildNames, config.targetBuilds)) {
		logger.debug(
			{ chatId: config.chat_id, buildNames, targetBuilds: config.targetBuilds },
			'сообщение не собрано: buildNames не покрывают targetBuilds',
		)
		return null
	}

	const label = STATUS_LABELS[pipeline.status]
	if (!label) {
		logger.debug({ chatId: config.chat_id, status: pipeline.status }, 'сообщение не собрано: статус пайплайна не поддерживается')
		return null
	}

	const link = buildBranchLink(merge_request?.source_branch ?? pipeline.ref, config.linkToJira)
	const deployTarget = findDeployTarget(builds)

	const lines = [
		`${deployTarget?.tags.join(', ')}`,
		`Project: <a href="${project.web_url}" target="_blank" rel="noreferrer noopener">${project.name}</a>`,
		`<strong>${escapeHtml(user.name)} ${pipeline.source} to ${deployTarget?.target ?? escapeHtml(merge_request?.target_branch ?? 'master')}</strong>`,
		`Branch: ${link}`,
	]

	if (merge_request) {
		lines.push(
			`<a href="${escapeHtml(merge_request.url)}" target="_blank" rel="noreferrer noopener">!${merge_request.iid} ${escapeHtml(merge_request.title)}</a>`,
		)
	}

	lines.push(
		'',
		`<a href="${commit.url}" target="_blank" rel="noreferrer noopener">${escapeHtml(commit.message)}</a>`,
		'',
		`${label.smile} CI: Deploy <a href="${pipeline.url}" target="_blank" rel="noreferrer noopener">#${pipeline.id}</a> <b>${label.text}</b>`,
	)

	const duration = formatDuration(pipeline.duration)

	if (duration && pipeline.status !== 'running') {
		lines.push(`Time: ${duration}`)
	}

	if (pipeline.status === 'failed') {
		const failedBuild = findFirstBuildByStatus(builds, 'failed')

		if (failedBuild) {
			lines.push(`Failed build: ${formatBuildLabel(failedBuild, pipeline.url)}`)
		}

		const mention = findDeveloperMention(user.username, config)

		if (mention) {
			lines.push('', mention)
		}
	}

	if (pipeline.status === 'success') {
		const mentions = buildManagerMentions(config)

		if (mentions) {
			lines.push('', mentions)
		}
	}

	return lines.join('\n')
}

export function buildFailureNotice(event: GitlabPipelineEvent, config: MessageConfig): string | null {
	const failedBuild = findFirstBuildByStatus(event.builds, 'failed')

	if (!failedBuild) {
		return null
	}

	const duration = formatBuildDuration(failedBuild.duration)
	const lines = [`‼️ CI: ${formatBuildLabel(failedBuild, event.object_attributes.url)} failed after ${duration}`]

	const mention = findDeveloperMention(event.user.username, config)

	if (mention) {
		lines.push('', mention)
	}

	return lines.join('\n')
}

export function buildCancelNotice(event: GitlabPipelineEvent, config: MessageConfig): string | null {
	const canceledBuild = findFirstBuildByStatus(event.builds, 'canceled')

	if (!canceledBuild) {
		return null
	}

	const duration = formatBuildDuration(canceledBuild.duration)
	const lines = [
		`🔚 CI: ${formatBuildLabel(canceledBuild, event.object_attributes.url)} canceled by ${escapeHtml(event.user.name)} after ${duration}`,
	]

	const mention = findDeveloperMention(event.user.username, config)

	if (mention) {
		lines.push('', mention)
	}

	return lines.join('\n')
}

import type { GitlabPipelineEvent, GitlabPipelineStatus } from './types/gitlab.js'

const STATUS_LABELS: Partial<Record<GitlabPipelineStatus, string>> = {
	created: '🆕 Created',
	running: '🔄 Process',
	success: '✅ Success',
	failed: '❌ Failed',
	canceled: '⚪ Cancel',
}

function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp')
		.replaceAll('<', '&lt')
		.replaceAll('>', '&gt')
}

function formatDuration(seconds: number | null): string | null {
	if (seconds === null || seconds <= 0) {
		return null
	}

	const min = Math.floor(seconds / 60)
	const sec = Math.round(seconds % 60)

	return min > 0 ? `${min} m ${sec} s` : `${sec} s`
}

export function buildMessage(event: GitlabPipelineEvent): string | null {
	const {
		object_attributes: pipeline,
		project,
		user,
		merge_request,
		commit,
	} = event

	const label = STATUS_LABELS[pipeline.status]
	if (!label) {
		return null
	}

	let link = pipeline.ref.includes('KP') ? `<b><a href="https://centrasgroup.atlassian.net/jira/software/projects/KP/boards/3?jql=&selectedIssue=${escapeHtml(pipeline.ref)}">${escapeHtml(pipeline.ref)}</a></b>` : pipeline.ref

	const lines = [
		`<em>${escapeHtml(user.name)} pushed to ${escapeHtml(merge_request.target_branch)}</em>`,
		`Branch: ${link}`,
		'',
		`Commit: <a href="${commit.url}">${escapeHtml(commit.message)}</a>`,
		'',
		`<b>${label}</b>`,
		`Pipeline: <a href="${pipeline.url}">#${pipeline.id}</a>`,
	]

	const duration = formatDuration(pipeline.duration)

	if (duration && pipeline.status !== 'running') {
		lines.push(`Time: ${duration}`)
	}

	return lines.join('\n')
}

export type GitlabPipelineStatus = 'created' | 'pending' | 'running' | 'success' | 'failed' | 'canceled'

export interface GitlabPipelineEvent {
	object_kind: 'pipeline'

	object_attributes: {
		id: number
		ref: string
		status: GitlabPipelineStatus
		url: string
		duration: number | null
	}

	user: {
		name: string
		username: string
	}

	merge_request: {
		title: string
		url: string
		target_branch: string
	}

	commit: {
		message: string
		url: string
	}

	project: {
		name: string
		web_url: string
	}

	builds: {
		name: string
	}[]
}

export function isPipelineEvent(body: unknown): body is GitlabPipelineEvent {
	return (
		typeof body === 'object' &&
		body !== null &&
		'object_kind' in body &&
		(body as { object_kind: unknown }).object_kind === 'pipeline'
	)
}

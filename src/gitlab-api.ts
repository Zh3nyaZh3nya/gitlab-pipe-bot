import { config } from './config.js'
import { logger } from './logger.js'
import type { GitlabMergeRequestInfo } from './types/gitlab.js'

interface GitlabApiMergeRequest {
	id: number
	iid: number
	title: string
	source_branch: string
	source_project_id: number
	target_branch: string
	target_project_id: number
	state: string
	merge_status: string
	detailed_merge_status: string
	web_url: string
}

export async function fetchMergeRequestForCommit(projectId: number, sha: string): Promise<GitlabMergeRequestInfo | null> {
	const url = `${config.gitlabUrl}/api/v4/projects/${projectId}/repository/commits/${sha}/merge_requests`

	try {
		const response = await fetch(url, {
			headers: {
				'PRIVATE-TOKEN': config.gitlabApiToken,
			},
		})

		if (!response.ok) {
			logger.warn({ projectId, sha, status: response.status }, 'запрос к gitlab api завершился ошибкой')
			return null
		}

		const mergeRequests = (await response.json()) as GitlabApiMergeRequest[]
		const mergeRequest = mergeRequests[0]

		if (!mergeRequest) {
			return null
		}

		return {
			id: mergeRequest.id,
			iid: mergeRequest.iid,
			title: mergeRequest.title,
			source_branch: mergeRequest.source_branch,
			source_project_id: mergeRequest.source_project_id,
			target_branch: mergeRequest.target_branch,
			target_project_id: mergeRequest.target_project_id,
			state: mergeRequest.state,
			merge_status: mergeRequest.merge_status,
			detailed_merge_status: mergeRequest.detailed_merge_status,
			url: mergeRequest.web_url,
		}
	} catch (error) {
		logger.error({ projectId, sha, error }, 'запрос к gitlab api упал с исключением')
		return null
	}
}
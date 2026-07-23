/** Статусы пайплайна целиком */
export type GitlabPipelineStatus =
	| 'created'
	| 'waiting_for_resource'
	| 'preparing'
	| 'pending'
	| 'running'
	| 'success'
	| 'failed'
	| 'canceled'
	| 'skipped'
	| 'manual'
	| 'scheduled';

/** Статусы отдельной джобы (build) — набор чуть отличается от пайплайна */
export type GitlabBuildStatus =
	| 'created'
	| 'pending'
	| 'running'
	| 'success'
	| 'failed'
	| 'canceled'
	| 'skipped'
	| 'manual';

/** Откуда запущен пайплайн */
export type GitlabPipelineSource =
	| 'push'
	| 'web'
	| 'trigger'
	| 'schedule'
	| 'api'
	| 'external'
	| 'pipeline'
	| 'chat'
	| 'webide'
	| 'merge_request_event'
	| 'external_pull_request_event'
	| 'parent_pipeline'
	| 'ondemand_dast_scan'
	| 'ondemand_dast_validation';

export interface GitlabVariable {
	key: string;
	value: string;
}

export interface GitlabUser {
	id: number;
	name: string;
	username: string;
	avatar_url: string | null;
	email: "[REDACTED]";
}

export interface GitlabProject {
	id: number;
	name: string;
	description: string | null;
	web_url: string;
	avatar_url: string | null;
	git_ssh_url: string;
	git_http_url: string;
	namespace: string;
	visibility_level: number;
	path_with_namespace: string;
	default_branch: string;
	ci_config_path: string | null;
}

export interface GitlabCommit {
	id: string;
	message: string;
	title: string;
	timestamp: string;
	url: string;
	author: {
		name: string;
		email: string;
	};
}

export interface GitlabRunner {
	id: number;
	description: string;
	runner_type: 'instance_type' | 'group_type' | 'project_type';
	active: boolean;
	is_shared: boolean;
	tags: string[];
}

export interface GitlabArtifactsFile {
	filename: string | null;
	size: number | null;
}

export interface GitlabEnvironment {
	name: string;
	action: string;
	deployment_tier: string | null;
}

export interface GitlabBuild {
	id: number;
	stage: string;
	name: string;
	status: GitlabBuildStatus;
	created_at: string;
	/** null, пока джоба не начала выполняться */
	started_at: string | null;
	/** null, пока джоба не завершилась */
	finished_at: string | null;
	duration: number | null;
	queued_duration: number | null;
	failure_reason: string | null;
	when: string;
	manual: boolean;
	allow_failure: boolean;
	user: GitlabUser;
	runner: GitlabRunner | null;
	artifacts_file: GitlabArtifactsFile;
	environment: GitlabEnvironment | null;
}

/** Данные MR — присутствуют только у merge request pipelines */
export interface GitlabMergeRequestInfo {
	id: number;
	iid: number;
	title: string;
	source_branch: string;
	source_project_id: number;
	target_branch: string;
	target_project_id: number;
	state: string;
	merge_status: string;
	detailed_merge_status: string;
	url: string;
}

/** Ссылка на родительский пайплайн (для child/downstream pipelines) */
export interface GitlabSourcePipeline {
	project: {
		id: number;
		web_url: string;
		path_with_namespace: string;
	};
	pipeline_id: number;
	job_id: number;
}

export interface GitlabPipelineAttributes {
	id: number;
	/** Порядковый номер внутри проекта (в url именно он) */
	iid: number;
	/** Имя из workflow:name в .gitlab-ci.yml, если задано */
	name: string | null;
	ref: string;
	/** true, если пайплайн запущен на тег, а не на ветку */
	tag: boolean;
	sha: string;
	before_sha: string;
	source: GitlabPipelineSource;
	status: GitlabPipelineStatus;
	detailed_status: string;
	stages: string[];
	created_at: string;
	/** null, пока пайплайн не завершен */
	finished_at: string | null;
	/** Секунды; null, пока пайплайн не завершен */
	duration: number | null;
	queued_duration: number | null;
	variables: GitlabVariable[];
	url: string;
}

/** Корневой объект Pipeline Hook */
export interface GitlabPipelineEvent {
	object_kind: 'pipeline';
	object_attributes: GitlabPipelineAttributes;
	/** null для обычных branch-пайплайнов, объект — для MR-пайплайнов */
	merge_request: GitlabMergeRequestInfo | null;
	user: GitlabUser;
	project: GitlabProject;
	commit: GitlabCommit;
	/** Присутствует только у child/downstream пайплайнов */
	source_pipeline?: GitlabSourcePipeline;
	builds: GitlabBuild[];
}

export function isPipelineEvent(body: unknown): body is GitlabPipelineEvent {
	return (
		typeof body === 'object' &&
		body !== null &&
		'object_kind' in body &&
		(body as { object_kind: unknown }).object_kind === 'pipeline'
	)
}

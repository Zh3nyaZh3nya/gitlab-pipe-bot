/** Сопоставление разработчика: его gitlab-логин ↔ telegram-ник для тега при провале пайплайна */
export interface DeveloperMapping {
	gitlab_name: string;
	telegram_name: string;
}

/** Telegram-ник менеджера для тега при успешном деплое */
export interface ManagerMapping {
	telegram_name: string;
}

export interface NotifyUserNames {
	developers: DeveloperMapping[] | null;
	managers: ManagerMapping[] | null;
}

/** Настройки уведомлений для одного чата (получателя) */
export interface NotifyChatConfig {
	/** Telegram chat_id, куда отправляется уведомление */
	chat_id: number;

	userNames: NotifyUserNames;

	/**
	 * Список имен джоб через запятую (например "bake-prod,deploy-prod"),
	 * все из которых должны присутствовать в пайплайне, чтобы уведомление отправлялось.
	 * null — фильтрация по джобам не применяется.
	 */
	targetBuilds: string | null;
}

export interface NotifyConfig {
	/**
	 * Список путей GitLab-проектов (project.path_with_namespace из webhook-события,
	 * например "group/kupipolis-front"), к которым применяется этот конфиг.
	 * Входящее событие сопоставляется с конфигом по вхождению его
	 * project.path_with_namespace в этот список (без учета регистра).
	 */
	repositories: string[];

	/**
	 * Базовая ссылка на доску Jira, например
	 * "https://example.atlassian.net/jira/software/projects/NP/boards/3?jql=".
	 * Ключ проекта ("KP") извлекается из сегмента /projects/{key}/... и используется,
	 * чтобы проверить, встречается ли он в имени ветки (pipeline.ref).
	 * null — ссылки на Jira никогда не вставляются.
	 */
	linkToJira: string | null;

	/** Уведомление отправляется отдельно в каждый чат из списка, со своим набором тегов и фильтром джоб */
	chats: NotifyChatConfig[];
}

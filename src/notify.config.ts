import 'dotenv/config'
import type { NotifyConfig } from './types/notify-config.js'

const CONFIG_ENV_SUFFIX = '_CONFIG_JSON'

function loadNotifyConfigs(): NotifyConfig[] {
	const configs: NotifyConfig[] = []

	for (const [key, raw] of Object.entries(process.env)) {
		if (!key.endsWith(CONFIG_ENV_SUFFIX) || !raw) {
			continue
		}

		configs.push(JSON.parse(raw) as NotifyConfig)
	}

	if (configs.length === 0) {
		throw new Error('Missing required env variable: нету переменной *_CONFIG_JSON')
	}

	return configs
}

const notifyConfigs: NotifyConfig[] = loadNotifyConfigs()

export function getNotifyConfigForProject(pathWithNamespace: string): NotifyConfig | null {
	return notifyConfigs.find((config) =>
		config.repositories.some((repository) => repository.toLowerCase() === pathWithNamespace.toLowerCase()),
	) ?? null
}

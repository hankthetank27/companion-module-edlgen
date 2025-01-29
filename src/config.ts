import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	host: string
	port: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			tooltip: 'This is set by default to your local IP and should not have to be adjusted for most cases',
			id: 'host',
			label: 'Base IP',
			width: 8,
			default: '127.0.0.1',
			regex: Regex.IP,
		},
		{
			type: 'number',
			tooltip:
				'This is set to the default port number in the EDLgen app. Make sure that this value matches what you have configured in EDLgen, and is NOT matching any other port in use (ie. Companions port on launch).',
			id: 'port',
			label: 'Target Port',
			width: 4,
			min: 3000,
			max: 9999,
			default: 7890,
		},
	]
}

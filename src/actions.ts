import { CompanionOptionValues, SomeCompanionActionInputField } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		start: {
			name: 'Start',
			description:
				"Build EDL starting from the source's current timecode if available, or wait until a signal is detected.",
			options: editOptions(),
			callback: async ({ options }) => {
				const r = await triggerEdit(options)
				const s = JSON.stringify(r)
				self.log('info', 'EDLgen: start action successful' + s)
			},
		},

		log: {
			name: 'Log',
			description: "Log edit to EDL at the source's current timecode.",
			options: editOptions(),
			callback: async ({ options }) => {
				const s = await triggerEdit(options)
				self.log('info', 'EDLgen: log action successful' + s)
			},
		},

		end: {
			name: 'Stop',
			description: 'Stop recording to EDL, logging final edit.',
			options: editOptions(),
			callback: async ({ options }) => {
				const s = await triggerEdit(options)
				self.log('info', 'EDLgen: end action successful' + s)
			},
		},

		selectSrc: {
			name: 'Select Source',
			description: 'Pre-select source tape for next Start, Log Or End actions.',
			options: [
				{
					id: 'src_tape',
					type: 'textinput',
					label: 'Source Tape',
					tooltip:
						'Specifies the name of the of the tape the edit is being made for. This typically would be the name of the file the source of the video will correspond with in your editing software. The file extension might be needed in such a case depending on the editing software you use.',
					required: true,
				},
			],
			callback: async ({ options }) => {
				const s = await triggerSelectSrc(options)
				self.log('info', 'EDLgen: selectSrc action successful' + s)
			},
		},
	})
}

function editOptions(): SomeCompanionActionInputField[] {
	return [
		{
			id: 'edit_type',
			type: 'dropdown',
			label: 'Edit type',
			choices: [
				{ id: 'cut', label: 'Cut' },
				{ id: 'wipe', label: 'Wipe' },
				{ id: 'dissolve', label: 'Dissolve' },
			],
			default: 'cut',
			tooltip: 'Specifies what the edit type should be.',
		},
		{
			id: 'edit_duration',
			type: 'number',
			label: 'Edit Duration',
			default: 0,
			min: 0,
			max: 999,
			isVisible: (options): boolean => options.edit_type === 'wipe' || options.edit_type === 'dissiolve',
			required: true,
			tooltip: 'Specifies the length of the edit in frames.',
		},
		{
			id: 'wipe_number',
			type: 'number',
			label: 'Wipe Number',
			default: 1,
			min: 1,
			max: 999,
			isVisible: (options): boolean => options.edit_type === 'wipe' || options.edit_type === 'dissiolve',
			tooltip: 'Optionally specifies which wipe should be used by the editing system.',
		},
		{
			id: 'preselect_src',
			type: 'checkbox',
			label: 'Pre-select Source',
			default: true,
			tooltip: 'Specifies if the source tape for the edit will be preselect via the "Select Source" action.',
		},
		{
			id: 'source_tape',
			type: 'textinput',
			label: 'Source Tape',
			isVisible: (options): boolean => !options.preselect_src,
			required: true,
			tooltip:
				'Specifies the name of the of the tape the edit is being made for. This typically would be the name of the file the source of the video will correspond with in your editing software. The file extension might be needed in such a case depending on the editing software you use.',
		},
		{
			id: 'video',
			type: 'checkbox',
			label: 'Contains Video',
			default: true,
			tooltip: 'Specifies if the channel contains video.',
		},
		{
			id: 'audio',
			type: 'number',
			label: 'Audio Channels',
			default: 2,
			min: 1,
			max: 999,
			required: true,
			tooltip: 'Specifies the number of audio channels',
		},
	]
}

async function triggerEdit({
	edit_type,
	video,
	audio,
	wipe_number,
	edit_duration,
	source_tape,
}: CompanionOptionValues): Promise<string | undefined> {
	try {
		const body = {
			edit_type,
			av_channels: { video, audio },
			...(source_tape && { source_tape }),
			...(wipe_number && { wipe_number }),
			...(edit_duration && { edit_duration }),
		}
		return JSON.stringify(body)
	} catch (err) {
		console.log(err)
		return undefined
	}
}

async function triggerSelectSrc({ select_source }: CompanionOptionValues): Promise<string | undefined> {
	try {
		return JSON.stringify({ select_source })
	} catch (err) {
		console.log(err)
		return undefined
	}
}

// export function test() {}

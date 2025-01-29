import { Regex, CompanionOptionValues, InputValue, SomeCompanionActionInputField } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import { got, Response } from 'got'
import { catchErrToString, isError, Result } from './utils.js'

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		start: {
			name: 'Start',
			description:
				"Build EDL starting from the source's current timecode if available, or wait until a signal is detected.",
			options: editOptions(),
			callback: async ({ actionId, options }) => {
				const res = await triggerEdit(self, actionId, options)
				handleResponse(self, actionId, res)
			},
		},

		log: {
			name: 'Log',
			description: "Log edit to EDL at the source's current timecode.",
			options: editOptions(),
			callback: async ({ actionId, options }) => {
				const res = await triggerEdit(self, actionId, options)
				handleResponse(self, actionId, res)
			},
		},

		end: {
			name: 'Stop',
			description: 'Stop recording to EDL, logging final edit.',
			options: editOptions(),
			callback: async ({ actionId, options }) => {
				const res = await triggerEdit(self, actionId, options)
				handleResponse(self, actionId, res)
			},
		},

		selectSrc: {
			name: 'Select Source',
			description: 'Pre-select source tape for next Start, Log Or End actions.',
			options: [
				{
					id: 'source_tape',
					type: 'textinput',
					label: 'Source Tape',
					regex: Regex.SOMETHING,
					tooltip:
						'Specifies the name of the of the tape the edit is being made for. This typically would be the name of the file the source of the video will correspond with in your editing software. The file extension might be needed in such a case depending on the editing software you use.',
					required: true,
				},
			],
			callback: async ({ actionId, options }) => {
				const res = await triggerSelectSrc(self, actionId, options)
				handleResponse(self, actionId, res)
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
			id: 'edit_duration_frames',
			type: 'number',
			label: 'Edit Duration',
			default: 0,
			min: 0,
			max: 999,
			isVisible: (options): boolean => options.edit_type === 'wipe' || options.edit_type === 'dissolve',
			required: true,
			tooltip: 'Specifies the length of the edit in frames.',
		},
		{
			id: 'wipe_num',
			type: 'number',
			label: 'Wipe Number',
			default: 1,
			min: 1,
			max: 999,
			isVisible: (options): boolean => options.edit_type === 'wipe',
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
			regex: Regex.SOMETHING,
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

function handleResponse(self: ModuleInstance, actionId: string, res: Result<Response>) {
	if (isError(res)) {
		self.log('error', res.errMessage)
	} else if (!res.ok) {
		self.log('error', `EDLgen ${actionId.toUpperCase()} unsucessful: ${res.statusCode} -- ${res.body}`)
	} else {
		self.log('info', `EDLgen ${actionId.toUpperCase()} successful`)
	}
}

interface AvChannels {
	video: InputValue
	audio: InputValue
}

interface EditBody {
	edit_type: InputValue
	source_tape?: InputValue
	wipe_num?: InputValue
	edit_duration_frames?: InputValue
	av_channels: AvChannels
}

async function triggerEdit(
	self: ModuleInstance,
	actionId: string,
	{ edit_type, video, audio, wipe_num, edit_duration_frames, source_tape }: CompanionOptionValues,
): Promise<Result<Response<string>>> {
	try {
		if (!edit_type || !video || !audio) {
			throw new Error('Invalid edit')
		}
		const body: EditBody = {
			edit_type,
			av_channels: { video, audio },
		}
		if (source_tape !== undefined) {
			body.source_tape = source_tape
		}
		if (wipe_num !== undefined) {
			body.wipe_num = wipe_num
		}
		if (edit_duration_frames !== undefined) {
			body.edit_duration_frames = edit_duration_frames
		}
		const url = `http://${self.config.host}:${self.config.port}/${actionId}`
		return await got.post(url, { json: body })
	} catch (e) {
		return { errMessage: `EDLgen ${actionId.toUpperCase()} Request aborted: (${catchErrToString(e)})` }
	}
}

async function triggerSelectSrc(
	self: ModuleInstance,
	actionId: string,
	{ source_tape }: CompanionOptionValues,
): Promise<Result<Response<string>>> {
	try {
		if (!source_tape) {
			throw new Error('source_tape is undefined')
		}
		const url = `http://${self.config.host}:${self.config.port}/select-src`
		return await got.post(url, { json: { source_tape } })
	} catch (e: unknown) {
		return { errMessage: `HTTP ${actionId.toUpperCase()} Request aborted: (${catchErrToString(e)})` }
	}
}

// export function test() {}

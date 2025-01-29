import {
	Regex,
	CompanionOptionValues,
	InputValue,
	SomeCompanionActionInputField,
	InstanceStatus,
} from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import { got, Response } from 'got'
import { catchErrToString, isModuleError, Result } from './utils.js'

const PROPS = {
	EDIT_TYPE: 'edit_type',
	SOURCE_TAPE: 'source_tape',
	WIPE_NUM: 'wipe_num',
	EDIT_DURATION_FRAMES: 'edit_duration_frames',
	AV_CHANNELS: 'av_channels',
	AUDIO: 'audio',
	VIDEO: 'video',
} as const

const EDIT_TYPES = {
	CUT: 'cut',
	WIPE: 'wipe',
	DISSOVLE: 'dissolve',
} as const

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
					id: PROPS.SOURCE_TAPE,
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
			id: PROPS.EDIT_TYPE,
			type: 'dropdown',
			label: 'Edit type',
			choices: [
				{ id: EDIT_TYPES.CUT, label: 'Cut' },
				{ id: EDIT_TYPES.WIPE, label: 'Wipe' },
				{ id: EDIT_TYPES.DISSOVLE, label: 'Dissolve' },
			],
			default: EDIT_TYPES.CUT,
			tooltip: 'Specifies what the edit type should be.',
		},
		{
			id: PROPS.EDIT_DURATION_FRAMES,
			type: 'number',
			label: 'Edit Duration',
			default: 0,
			min: 0,
			max: 999,
			isVisible: (options): boolean => {
				// We cant use PROPS or EDIT_TYPES here as isVisible does not bring in definitions from outer scope
				return options.edit_type === 'wipe' || options.edit_type === 'dissolve'
			},
			required: true,
			tooltip: 'Specifies the length of the edit in frames.',
		},
		{
			id: PROPS.WIPE_NUM,
			type: 'number',
			label: 'Wipe Number',
			default: 1,
			min: 1,
			max: 999,
			isVisible: (options): boolean => {
				// We cant use PROPS or EDIT_TYPES here as isVisible does not bring in definitions from outer scope
				return options.edit_type === 'wipe'
			},
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
			id: PROPS.SOURCE_TAPE,
			type: 'textinput',
			label: 'Source Tape',
			regex: Regex.SOMETHING,
			isVisible: (options): boolean => !options.preselect_src,
			required: true,
			tooltip:
				'Specifies the name of the of the tape the edit is being made for. This typically would be the name of the file the source of the video will correspond with in your editing software. The file extension might be needed in such a case depending on the editing software you use.',
		},
		{
			id: PROPS.VIDEO,
			type: 'checkbox',
			label: 'Contains Video',
			default: true,
			tooltip: 'Specifies if the channel contains video.',
		},
		{
			id: PROPS.AUDIO,
			type: 'number',
			label: 'Audio Channels',
			default: 2,
			min: 0,
			max: 999,
			required: true,
			tooltip: 'Specifies the number of audio channels',
		},
	]
}

function handleResponse(self: ModuleInstance, actionId: string, res: Result<Response>) {
	if (isModuleError(res)) {
		self.log('error', res.moduleErrMessage)
		self.updateStatus(InstanceStatus.UnknownError, res.moduleErrMessage)
	} else if (!res.ok) {
		const err = `${actionId.toUpperCase()} unsucessful: ${res.statusCode} -- ${res.body}`
		self.log('error', err)
		self.updateStatus(InstanceStatus.UnknownError, err)
	} else {
		self.log('info', `${actionId.toUpperCase()} successful`)
		self.updateStatus(InstanceStatus.Ok)
	}
}

function validateField(value: InputValue | undefined, key: string, actionId: string) {
	if (value === undefined) {
		throw new Error(`Invalid ${actionId.toUpperCase()}: ${key} is undefined`)
	} else {
		return value
	}
}

interface AvChannels {
	[PROPS.VIDEO]: InputValue
	[PROPS.AUDIO]: InputValue
}

interface EditBody {
	[PROPS.EDIT_TYPE]: InputValue
	[PROPS.SOURCE_TAPE]?: InputValue
	[PROPS.WIPE_NUM]?: InputValue
	[PROPS.EDIT_DURATION_FRAMES]?: InputValue
	[PROPS.AV_CHANNELS]: AvChannels
}

async function triggerEdit(
	self: ModuleInstance,
	actionId: string,
	options: CompanionOptionValues,
): Promise<Result<Response<string>>> {
	self.log('info', JSON.stringify(options))
	const { edit_type, video, audio, wipe_num, edit_duration_frames, source_tape } = options
	try {
		const body: EditBody = {
			edit_type: validateField(edit_type, PROPS.EDIT_TYPE, actionId),
			av_channels: {
				video: validateField(video, PROPS.VIDEO, actionId),
				audio: validateField(audio, PROPS.AUDIO, actionId),
			},
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
		return { moduleErrMessage: `${actionId.toUpperCase()} Request failed: (${catchErrToString(e)})` }
	}
}

async function triggerSelectSrc(
	self: ModuleInstance,
	actionId: string,
	{ source_tape }: CompanionOptionValues,
): Promise<Result<Response<string>>> {
	try {
		const body = { source_tape: validateField(source_tape, PROPS.SOURCE_TAPE, actionId) }
		const url = `http://${self.config.host}:${self.config.port}/select-src`
		return await got.post(url, { json: body })
	} catch (e: unknown) {
		return { moduleErrMessage: `${actionId.toUpperCase()} Request failed: (${catchErrToString(e)})` }
	}
}

// export function test() {}

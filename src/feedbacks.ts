import { combineRgb } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		req_state: {
			name: 'Request Status',
			description: 'Displays if the EDLgen action request succeeded or failed.',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'reset_on_action',
					type: 'checkbox',
					label: 'Reset Feedback On Next EDLgen Action',
					tooltip:
						"Reset's this Feedback's state to success when any EDLgen action from another button is triggered. To allow this option to be trigged by non-EDLgen related actions, you may add the 'Reset Request Status Feedback' action from EDLgen to a button.",
					default: false,
				},
			],
			callback: ({ controlId, options }) => {
				const reset = options.reset_on_action && self.controlLastCalled !== controlId
				if (self.controlReqStatuses[controlId] === undefined || reset) {
					self.controlReqStatuses[controlId] = 'ok'
				}
				return self.controlReqStatuses[controlId] === 'error'
			},
		},
	})
}

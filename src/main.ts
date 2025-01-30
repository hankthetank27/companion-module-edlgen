import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	controlReqStatuses!: Record<string, 'ok' | 'error'>
	controlLastCalled!: string | null

	constructor(internal: unknown) {
		super(internal)
		this.controlReqStatuses = {}
		this.controlLastCalled = null
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateStatus(InstanceStatus.Ok)

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateControlReqStatus(controlId: string, status: 'ok' | 'error'): void {
		this.controlReqStatuses[controlId] = status
		this.controlLastCalled = controlId
		this.checkFeedbacks('req_state')
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)

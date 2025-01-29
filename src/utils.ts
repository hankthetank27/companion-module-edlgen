export type Result<T> = T | ModuleError

interface ModuleError {
	moduleErrMessage: string
}

export function isModuleError(value: unknown): value is ModuleError {
	return typeof value === 'object' && value !== null && (value as ModuleError).moduleErrMessage !== undefined
}

export function catchErrToString(error: unknown): string {
	if (typeof error === 'string') {
		return error
	} else if (error instanceof Error) {
		return error.message
	} else if (isModuleError(error)) {
		return error.moduleErrMessage
	} else {
		return 'unknown error'
	}
}

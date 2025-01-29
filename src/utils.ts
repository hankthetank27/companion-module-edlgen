export type Result<T> = T | Error

interface Error {
	errMessage: string
}

export function isError(value: unknown): value is Error {
	return (value as Error).errMessage !== undefined
}

export function catchErrToString(error: unknown): string {
	if (typeof error === 'string') {
		return error
	} else if (error instanceof Error) {
		return error.message
	} else {
		return 'unknown error'
	}
}

export class OmniError extends Error {
	constructor(
		message: string,
		public context?: Record<string, unknown>
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class ForbiddenError extends OmniError {
	constructor(
		public action: string,
		public resource: string,
		public reason?: string
	) {
		super(`Not authorized to ${action} ${resource}${reason ? ` (${reason})` : ''}`, {
			action,
			resource,
			reason
		});
	}
}

export class RateLimitError extends OmniError {
	constructor(public retryAfter: number) {
		super(`Rate limit exceeded, retry after ${retryAfter}s`, { retryAfter });
	}
}

export class ValidationError extends OmniError {
	constructor(public issues: { path: string[]; message: string }[]) {
		super('Validation failed', { issues });
	}
}

import { AuthDiagnostic } from './diagnostics.js';

export interface BetterAuthField {
	type: 'string' | 'number' | 'boolean' | 'date';
	required?: boolean;
	defaultValue?: unknown;
	input?: boolean;
}

/**
 * Maps an Omni field builder (or raw field definition) into a Better Auth additional field configuration.
 *
 * @param name - The field name (e.g. 'role', 'bio')
 * @param builder - The Omni field builder (e.g. `field.string().default('user')`) or raw field def
 * @returns Standard Better Auth additional field configuration
 * @throws {AuthDiagnostic} AUTH008 if the field type is unsupported by Better Auth
 */
export function toBetterAuthField(name: string, builder: any): BetterAuthField {
	// If it's already a plain Better Auth field definition
	if (
		builder &&
		typeof builder === 'object' &&
		typeof builder.type === 'string' &&
		['string', 'number', 'boolean', 'date'].includes(builder.type) &&
		typeof builder.build !== 'function' &&
		typeof builder.toJSON !== 'function'
	) {
		return {
			type: builder.type,
			required: Boolean(builder.required),
			...(builder.defaultValue !== undefined ? { defaultValue: builder.defaultValue } : {}),
			...(builder.input !== undefined ? { input: builder.input } : {})
		};
	}

	const def =
		typeof builder?.toJSON === 'function'
			? builder.toJSON()
			: typeof builder?.build === 'function'
				? builder.build()
				: (builder?._def ?? builder?.def ?? builder?.config ?? builder);

	if (!def || typeof def !== 'object' || !def.type) {
		throw new AuthDiagnostic(
			'AUTH008',
			`auth.user.additionalFields.${name}: invalid field builder or missing type.`,
			'Pass a field builder, e.g. field.string() or field.integer().'
		);
	}

	const isRequired = Boolean(def.required && !def.optional);
	const defaultValue = def.default !== undefined ? def.default : undefined;

	switch (def.type) {
		case 'string':
		case 'text':
		case 'email':
		case 'enum':
		case 'slug':
		case 'richtext':
		case 'url':
		case 'password':
			return {
				type: 'string',
				required: isRequired,
				...(defaultValue !== undefined ? { defaultValue } : {})
			};

		case 'integer':
		case 'number':
		case 'float':
		case 'serial':
		case 'money':
			return {
				type: 'number',
				required: isRequired,
				...(defaultValue !== undefined ? { defaultValue } : {})
			};

		case 'boolean':
			return {
				type: 'boolean',
				required: isRequired,
				...(defaultValue !== undefined ? { defaultValue } : {})
			};

		case 'date':
		case 'timestamp':
			return {
				type: 'date',
				required: isRequired,
				...(defaultValue !== undefined ? { defaultValue } : {})
			};

		default:
			throw new AuthDiagnostic(
				'AUTH008',
				`auth.user.additionalFields.${name}: unsupported field type "${def.type}".`,
				'Supported: string, text, email, enum, integer, number, float, boolean, date, timestamp.'
			);
	}
}

/**
 * Maps a record of Omni field builders to Better Auth's `user.additionalFields` option dictionary.
 *
 * @param fields - Record of field name to field builder
 * @returns Dictionary of Better Auth field configurations
 */
export function mapAdditionalFields(
	fields: Record<string, any> = {}
): Record<string, BetterAuthField> {
	if (!fields || typeof fields !== 'object') return {};
	return Object.fromEntries(
		Object.entries(fields).map(([name, builder]) => [name, toBetterAuthField(name, builder)])
	);
}

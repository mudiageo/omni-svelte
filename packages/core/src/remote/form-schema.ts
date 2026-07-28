import { z } from 'zod';

export interface FormSchemaOptions {
	pick?: string[];
	omit?: string[];
	partial?: boolean;
	overrides?: Record<string, z.ZodTypeAny>;
}

/**
 * A helper to quickly derive subset schemas (pick/omit/partial) for remote forms 
 * directly from your model's base Zod validation schemas.
 * 
 * @param baseSchema The base ZodObject schema (e.g. Model.validation.create)
 * @param options Form configuration options (pick, omit, partial, overrides)
 * @returns A manipulated ZodObject ready for SvelteKit's form() API
 */
export function formSchema<T extends z.ZodRawShape>(
	baseSchema: z.ZodObject<T>,
	options?: FormSchemaOptions
): z.ZodObject<any> {
	if (options?.pick && options?.omit) {
		throw new Error('Cannot specify both pick and omit options');
	}

	const baseShape = baseSchema.shape;
	const shape: Record<string, z.ZodTypeAny> = {};

	for (const [key, zodFieldRaw] of Object.entries(baseShape)) {
		let zodField = zodFieldRaw as z.ZodTypeAny;

		if (options?.pick && !options.pick.includes(key)) {
			continue;
		}
		if (options?.omit && options.omit.includes(key)) {
			continue;
		}
		
		if (options?.overrides && options.overrides[key]) {
			zodField = options.overrides[key];
		}

		if (options?.partial) {
			zodField = zodField.optional();
		}

		shape[key] = zodField;
	}

	if (options?.pick) {
		for (const key of options.pick) {
			if (!baseShape[key] && (!options.overrides || !options.overrides[key])) {
				throw new Error(`Field '${key}' specified in pick does not exist on the base schema and no override was provided.`);
			}
		}
	}

	return z.object(shape);
}

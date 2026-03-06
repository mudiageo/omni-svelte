import type { FieldDefinition, FieldType, ValidationRules } from './types.js';

/**
 * Fluent field-definition builder.
 *
 * Every method returns a `FieldDefinition` object accepted by `defineSchema`.
 * Modifiers can be chained in any order.
 *
 * @example
 * ```ts
 * import { defineSchema, field } from 'omni-svelte/schema';
 *
 * export default defineSchema('posts', {
 *   id:        field.serial().primaryKey(),
 *   title:     field.string(255).required(),
 *   slug:      field.string().required().unique(),
 *   published: field.boolean().default(false),
 *   content:   field.richtext().required(),
 * }, { timestamps: true });
 * ```
 */
class FieldBuilder {
    private def: FieldDefinition;

    constructor(type: FieldType, length?: number) {
        this.def = { type };
        if (length !== undefined) this.def.length = length;
    }

    // ── Constraints ────────────────────────────────────────────────

    /** Mark the column as the primary key. */
    primaryKey(): this {
        this.def.primary = true;
        return this;
    }

    /** Add a NOT NULL constraint. */
    required(): this {
        this.def.required = true;
        return this;
    }

    /** Make the field optional (nullable / skipped in Zod create schema). */
    optional(): this {
        this.def.optional = true;
        return this;
    }

    /** Add a UNIQUE constraint. */
    unique(): this {
        this.def.unique = true;
        return this;
    }

    /** Set a column default value. */
    default(value: any): this {
        this.def.default = value;
        return this;
    }

    /** Hide this field from `toJSON()` serialisation. */
    hidden(): this {
        this.def.hidden = true;
        return this;
    }

    // ── String / text modifiers ────────────────────────────────────

    /** Set a minimum length for string/password validation. */
    minLength(n: number, message?: string): this {
        this.def.validation = { ...this.def.validation, min: n, ...(message && { message }) };
        return this;
    }

    /** Set a maximum length for string validation. */
    maxLength(n: number, message?: string): this {
        this.def.validation = { ...this.def.validation, max: n, ...(message && { message }) };
        return this;
    }

    /** Require at least one uppercase letter (password fields). */
    requireUppercase(): this {
        this.def.validation = { ...this.def.validation, requireUppercase: true };
        return this;
    }

    /** Require at least one number (password fields). */
    requireNumbers(): this {
        this.def.validation = { ...this.def.validation, requireNumbers: true };
        return this;
    }

    /** Automatically hash this field with bcrypt on create/update. */
    hash(algorithm: 'bcrypt' | 'argon2' = 'bcrypt'): this {
        this.def.hash = algorithm;
        return this;
    }

    /** Attach a custom validation message. */
    message(msg: string): this {
        this.def.validation = { ...this.def.validation, message: msg };
        return this;
    }

    /** Mark field as unsigned (integer / money fields). */
    unsigned(): this {
        this.def.unsigned = true;
        return this;
    }

    /** Attach arbitrary extra validation rules. */
    validate(rules: ValidationRules): this {
        this.def.validation = { ...this.def.validation, ...rules };
        return this;
    }

    /** Return the final FieldDefinition (called implicitly by defineSchema). */
    build(): FieldDefinition {
        return { ...this.def };
    }

    // Allow spreading / Object.assign by making it iterable as a plain object.
    [Symbol.iterator]() {
        return Object.entries(this.build())[Symbol.iterator]();
    }

    toJSON() {
        return this.build();
    }
}

// ── Factory helpers ────────────────────────────────────────────────────────────

function make(type: FieldType, length?: number): FieldBuilder {
    return new FieldBuilder(type, length);
}

/**
 * `field.*` — fluent field-definition builder for `defineSchema`.
 *
 * @see https://omni-svelte.dev/docs/schema#field-builder
 */
export const field = {
    /** Auto-incrementing integer primary key. */
    serial: () => make('serial'),

    /** Variable-length string. Pass `length` to emit `varchar(n)`, otherwise `text`. */
    string: (length?: number) => make('string', length),

    /** Standard integer column. */
    integer: () => make('integer'),

    /** Boolean column. */
    boolean: () => make('boolean'),

    /** Email address — text column with email Zod validation. */
    email: () => make('email'),

    /** Password — text column auto-hidden from serialisation. Chain `.hash()` to enable bcrypt. */
    password: () => make('password'),

    /** URL — text column with URL Zod validation. */
    url: () => make('url'),

    /** Slug — text column, auto-generated from `name` field if empty on create. */
    slug: () => make('slug'),

    /** Timestamp / datetime column. */
    timestamp: () => make('timestamp'),

    /** Date column (maps to timestamp in Drizzle). */
    date: () => make('date'),

    /** JSON / object column. */
    json: () => make('json'),

    /** Monetary value — `decimal(10,2)`. */
    money: () => make('money'),

    /** Rich text content — stored as text. */
    richtext: () => make('richtext'),

    /** Array column — stored as JSON. */
    array: () => make('array'),

    /** File-URL array — stored as JSON, validated as array of URLs. */
    files: () => make('files'),

    /**
     * Enum column. Pass the allowed values as rest arguments.
     *
     * @example field.enum('draft', 'published', 'archived')
     */
    enum: (...values: string[]) => {
        const b = make('enum');
        (b as any).def.values = values;
        return b;
    },
} as const;

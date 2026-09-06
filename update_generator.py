import sys

file_path = "packages/core/src/schema/generators/model.ts"

with open(file_path, "r") as f:
    content = f.read()

target = """	private generateBaseModel(): string {
		const tableName = this.schema.name;
		const className = this.capitalize(tableName);

		const fillable = this.generateFillableArray();
		const hidden = this.generateHiddenArray();
		const casts = this.generateCastsObject();
		const hooks = this.generateHooks();

		return `export class ${className}Model extends Model {
  static tableName = '${tableName}';
  static table = ${tableName};
  static validation = {
     create: ${tableName}CreateSchema,
     update: ${tableName}UpdateSchema,
     base: ${tableName}CreateSchema,
  };
  
  static fillable = ${fillable};
  static hidden = ${hidden};
  static casts = ${casts};${this.generateRealtimeConfig()}
  ${hooks}
}`;
	}"""

replacement = """	private generateBaseModel(): string {
		const tableName = this.schema.name;
		const className = this.capitalize(tableName);
		const fillable = this.generateFillableArray();
		const hidden = this.generateHiddenArray();
		const casts = this.generateCastsObject();
		const hooks = this.generateHooks();
		const relationships = JSON.stringify(generateRelationships(this.schema), null, 2).replace(/\\n/g, '\\n  ');

		return `
export interface ${className}Model extends ${className}Type {}

export class ${className}Model extends Model {
  static tableName = '${tableName}';
  static table = ${tableName};
  static validation = {
     create: ${tableName}CreateSchema,
     update: ${tableName}UpdateSchema,
     base: ${tableName}CreateSchema,
  };
  
  static fillable = ${fillable};
  static hidden = ${hidden};
  static casts = ${casts};${this.generateRealtimeConfig()}
  static relationships = ${relationships};
  
  ${hooks}
}`;
	}"""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")

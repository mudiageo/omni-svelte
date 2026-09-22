import sys

file_path = "packages/core/src/tests/unit/schema-generators.test.ts"

with open(file_path, "r") as f:
    content = f.read()

target = """		it('should generate correct fillable and hidden arrays', () => {
			const generator = new ModelGenerator(mockSchema);
			const content = generator.generate();

			expect(content).toContain("static fillable = ['name', 'email']"); // password should be excluded
			expect(content).toContain("static hidden = ['password']"); // password should be hidden
		});"""

replacement = """		it('should generate correct fillable and hidden arrays', () => {
			const generator = new ModelGenerator(mockSchema);
			const content = generator.generate();

			expect(content).toContain("static fillable = ['name', 'email']"); // password should be excluded
			expect(content).toContain("static hidden = ['password']"); // password should be hidden
		});

		it('should inject relationships and declaration merging', () => {
			const generator = new ModelGenerator(mockSchema);
			const content = generator.generate();

			expect(content).toContain("export interface UsersModel extends UsersType {}");
			expect(content).toContain("static relationships = {}");
		});"""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w") as f:
        f.write(content)
    print("Tests updated successfully")
else:
    print("Target not found")

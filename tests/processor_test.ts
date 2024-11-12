import { assertEquals, assertExists } from "@std/assert";
import { RepoProcessor } from "../src/processor.ts";
import { DEFAULT_CONFIG } from "../src/types/mod.ts";

// Create temporary test directory
async function createTestRepo(): Promise<string> {
	const tmpDir = await Deno.makeTempDir();

	// Create some test files
	await Deno.writeTextFile(`${tmpDir}/test.txt`, "This is a test file");

	await Deno.writeTextFile(
		`${tmpDir}/src/main.ts`,
		"console.log('Hello World');"
	);

	return tmpDir;
}

Deno.test("RepoProcessor - Basic Processing", async () => {
	const tmpDir = await createTestRepo();

	try {
		const processor = new RepoProcessor(DEFAULT_CONFIG);
		const result = await processor.process(tmpDir);

		// Check basic stats
		assertEquals(result.stats.totalFiles > 0, true);
		assertEquals(result.stats.skippedFiles >= 0, true);
		assertEquals(result.stats.totalSize > 0, true);
		assertExists(result.stats.startTime);
		assertExists(result.stats.endTime);

		// Check files were processed
		assertEquals(result.files.length > 0, true);

		// Check file entries have required fields
		const file = result.files[0];
		assertExists(file.path);
		assertExists(file.content);
		assertExists(file.size);
		assertExists(file.type);
		assertExists(file.lastModified);
	} finally {
		// Cleanup
		await Deno.remove(tmpDir, { recursive: true });
	}
});

Deno.test("RepoProcessor - XML Output", async () => {
	const tmpDir = await createTestRepo();

	try {
		const processor = new RepoProcessor(DEFAULT_CONFIG);
		const result = await processor.process(tmpDir);
		const xml = processor.toXml(result);

		// Basic XML validation
		assertEquals(xml.startsWith("<?xml"), true);
		assertEquals(xml.includes("<repository>"), true);
		assertEquals(xml.includes("</repository>"), true);
		assertEquals(xml.includes("<files>"), true);
		assertEquals(xml.includes("</files>"), true);
	} finally {
		// Cleanup
		await Deno.remove(tmpDir, { recursive: true });
	}
});

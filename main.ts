import { exists } from "@std/fs";
import { parseArgs } from "https://deno.land/std@0.220.1/cli/parse_args.ts";
import { RepoProcessor } from "./src/processor.ts";
import { CliOptions, DEFAULT_CONFIG, RepoConfig } from "./src/types/mod.ts";

// ASCII art banner
const BANNER = `
┌─────────────────────────────┐
│        repo-to-xml          │
│  Git Repository → XML Tool  │
└─────────────────────────────┘
`;

async function loadConfig(configPath: string): Promise<Partial<RepoConfig>> {
	try {
		const content = await Deno.readTextFile(configPath);
		return JSON.parse(content);
	} catch (error) {
		console.error(`Error loading config from ${configPath}:`, error);
		Deno.exit(1);
	}
}

async function validatePath(path: string): Promise<void> {
	if (!(await exists(path))) {
		console.error(`Error: Path does not exist: ${path}`);
		Deno.exit(1);
	}

	try {
		const stat = await Deno.stat(path);
		if (!stat.isDirectory) {
			console.error("Error: Path must be a directory");
			Deno.exit(1);
		}
	} catch (error) {
		console.error(`Error accessing path: ${path}`, error);
		Deno.exit(1);
	}
}

function showHelp(): void {
	console.log(`
Usage: repo-to-xml <repository-path> [options]

Options:
  --output, -o    Output file path (default: repo.xml)
  --config, -c    Configuration file path
  --verbose, -v   Enable verbose output
  --help, -h      Show this help message

Example:
  repo-to-xml ./my-repo -o output.xml --verbose
`);
}

async function main() {
	// Parse command line arguments
	const flags = parseArgs(Deno.args, {
		string: ["output", "config"],
		boolean: ["help", "verbose"],
		alias: {
			o: "output",
			c: "config",
			h: "help",
			v: "verbose",
		},
		default: {
			output: "repo.xml",
			verbose: false,
		},
	});

	// Show help if requested or no repository path provided
	if (flags.help || flags._.length === 0) {
		showHelp();
		Deno.exit(0);
	}

	console.log(BANNER);

	const options: CliOptions = {
		repoPath: flags._[0].toString(),
		output: flags.output,
		config: flags.config,
		verbose: flags.verbose,
	};

	// Validate repository path
	await validatePath(options.repoPath);

	// Load custom config if provided
	let config = DEFAULT_CONFIG;
	if (options.config) {
		const customConfig = await loadConfig(options.config);
		config = { ...DEFAULT_CONFIG, ...customConfig };
	}

	try {
		const processor = new RepoProcessor(config);
		const startTime = new Date();

		console.log(`Processing repository: ${options.repoPath}`);
		if (options.verbose) {
			console.log("Configuration:", config);
		}

		const result = await processor.process(options.repoPath);

		// Write output
		const xmlContent = processor.toXml(result);
		await Deno.writeTextFile(options.output, xmlContent);

		const endTime = new Date();
		const duration = (endTime.getTime() - startTime.getTime()) / 1000;

		console.log("\nProcessing complete!");
		console.log(`Files processed: ${result.stats.totalFiles}`);
		console.log(`Files skipped: ${result.stats.skippedFiles}`);
		console.log(
			`Total size: ${(result.stats.totalSize / 1024 / 1024).toFixed(2)} MB`
		);
		console.log(`Duration: ${duration.toFixed(2)} seconds`);
		console.log(`\nOutput written to: ${options.output}`);
	} catch (error) {
		console.error("\nError processing repository:", error);
		Deno.exit(1);
	}
}

if (import.meta.main) {
	main();
}

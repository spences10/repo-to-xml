import { exists } from '@std/fs';
import { parseArgs } from 'https://deno.land/std@0.220.1/cli/parse_args.ts';
import {
	bold,
	green,
	red,
	yellow,
} from 'https://deno.land/std@0.220.1/fmt/colors.ts';
import { RepoProcessor } from './src/processor.ts';
import { DEFAULT_CONFIG, RepoConfig } from './src/types/mod.ts';
import { generate_config } from './src/utils/config.ts';
import {
	format_extensions,
	scan_project_extensions,
} from './src/utils/file.ts';

const BANNER = bold(`
┌─────────────────────────────┐
│     ${green('repo-to-xml')} v1.0.0      │
│  Git Repository → XML Tool  │
└─────────────────────────────┘
`);

function print_step(message: string) {
	console.log(`\n${bold('→')} ${message}`);
}

function print_success(message: string) {
	console.log(`${green('✓')} ${message}`);
}

function print_warning(message: string) {
	console.log(`${yellow('!')} ${message}`);
}

function print_error(message: string) {
	console.error(`${red('✗')} ${message}`);
}

async function loadConfig(
	configPath: string
): Promise<Partial<RepoConfig>> {
	try {
		const content = await Deno.readTextFile(configPath);
		return JSON.parse(content);
	} catch (error: unknown) {
		print_error(`Error loading config from ${configPath}`);
		if (error instanceof Error) {
			print_error(error.message);
		} else {
			print_error(String(error));
		}
		Deno.exit(1);
	}
}

async function validatePath(path: string): Promise<void> {
	if (!(await exists(path))) {
		print_error(`Path does not exist: ${path}`);
		Deno.exit(1);
	}

	try {
		const stat = await Deno.stat(path);
		if (!stat.isDirectory) {
			print_error('Path must be a directory');
			Deno.exit(1);
		}
	} catch (error: unknown) {
		print_error(`Error accessing path: ${path}`);
		if (error instanceof Error) {
			print_error(error.message);
		} else {
			print_error(String(error));
		}
		Deno.exit(1);
	}
}

function showHelp(): void {
	console.log(BANNER);
	console.log(`
${bold('Usage:')}
  repo-to-xml <repository-path> [options]

${bold('Options:')}
  ${green(
		'-o, --output'
	)} <file>        Output XML file (default: <project-name>.xml)
  ${green(
		'-i, --include'
	)} <extensions>  File extensions to include (comma-separated)
  ${green(
		'-l, --list-extensions'
	)}      List available file extensions in the project
  ${green('-c, --config')} <file>        Custom configuration file
  ${green(
		'-g, --generate-config'
	)}      Generate a config file based on project structure
  ${green('-v, --verbose')}              Show verbose output
  ${green('-h, --help')}                 Show this help message

${bold('Examples:')}
  # Generate a config file for your project
  ${yellow('repo-to-xml ./my-repo --generate-config')}

  # List available extensions in the project
  ${yellow('repo-to-xml ./my-repo --list-extensions')}

  # Use the generated config
  ${yellow('repo-to-xml ./my-repo --config my-repo.config.json')}

  # Or specify extensions directly
  ${yellow('repo-to-xml ./my-repo --include ts,svelte,js')}

${bold('Note:')}
  - Config files are git-ignored by default (except example.config.json)
  - Output XML files are named after the project by default
  - Each project can have its own config file (<project-name>.config.json)
`);
}

function get_project_name(path: string): string {
	// Remove trailing slash if present
	const cleaned_path = path.replace(/\/$/, '');
	// Get the last part of the path
	return cleaned_path.split('/').pop() || 'repo';
}

function prompt_yes_no(message: string): boolean {
	const response = prompt(`${message} (Y/n)`);
	// Return true if response is empty (user just hit enter) or starts with 'y'
	return !response || response.toLowerCase().startsWith('y');
}

async function main() {
	const flags = parseArgs(Deno.args, {
		string: ['output', 'config', 'include'],
		boolean: [
			'help',
			'verbose',
			'list-extensions',
			'generate-config',
		],
		alias: {
			o: 'output',
			c: 'config',
			i: 'include',
			l: 'list-extensions',
			g: 'generate-config',
			h: 'help',
			v: 'verbose',
		},
		default: {
			output: 'repo.xml',
			verbose: false,
		},
	});

	// Show help if requested or no repository path provided
	if (flags.help || flags._.length === 0) {
		showHelp();
		Deno.exit(0);
	}

	console.log(BANNER);

	const repoPath = flags._[0].toString();
	const project_name = get_project_name(repoPath);

	print_step(`Processing ${bold(project_name)}`);

	// Update default output name to use project name
	if (!flags.output || flags.output === 'repo.xml') {
		flags.output = `${project_name}.xml`;
	}

	await validatePath(repoPath);

	// Handle special commands first
	if (flags['generate-config']) {
		await generate_config(repoPath, `${project_name}.config.json`);
		Deno.exit(0);
	}

	if (flags['list-extensions']) {
		const extensions = await scan_project_extensions(repoPath);
		console.log(format_extensions(extensions));
		Deno.exit(0);
	}

	// Initialize config with defaults
	let config: RepoConfig = { ...DEFAULT_CONFIG };

	// Check if neither config nor include flags are provided
	if (!flags.config && !flags.include) {
		print_warning('No configuration provided.');

		const should_generate = prompt_yes_no(
			'Would you like to generate a config file for this project?'
		);

		if (should_generate) {
			const config_path = `${project_name}.config.json`;
			await generate_config(repoPath, config_path);

			print_success('\nConfig file generated!');
			console.log(`
${bold('Next steps:')}
1. Review the generated config: ${green(config_path)}
2. Run the converter with your config:
   ${yellow(`deno task start ${repoPath} --config ${config_path}`)}

You can also list available extensions with:
${yellow(`deno task start ${repoPath} --list-extensions`)}
`);
			Deno.exit(0);
		} else {
			print_warning(
				'\nYou can specify extensions directly using --include'
			);
			console.log(
				`Example: ${yellow(
					`deno task start ${repoPath} --include ts,svelte,js`
				)}`
			);
			Deno.exit(1);
		}
	}

	// Load custom config if provided
	if (flags.config) {
		const customConfig = await loadConfig(flags.config);
		config = { ...config, ...customConfig };
	} else if (flags.include) {
		const extensions = flags.include
			.split(',')
			.map((ext) => ext.trim());
		config = {
			...config,
			includeFiles: extensions.map((ext) => `*.${ext}`),
		};
	}

	try {
		const processor = new RepoProcessor(config);
		const startTime = new Date();

		if (flags.verbose) {
			print_step('Configuration:');
			console.log(config);
		}

		const result = await processor.process(repoPath);

		// Write output
		const xmlContent = processor.toXml(result);
		await Deno.writeTextFile(flags.output, xmlContent);

		const endTime = new Date();
		const duration = (endTime.getTime() - startTime.getTime()) / 1000;

		print_success('\nProcessing complete!');
		console.log(`
${bold('Summary:')}
  Files processed: ${green(result.stats.totalFiles.toString())}
  Files skipped:  ${yellow(result.stats.skippedFiles.toString())}
  Total size:     ${(result.stats.totalSize / 1024 / 1024).toFixed(
		2
	)} MB
  Duration:       ${duration.toFixed(2)} seconds

${bold('Output:')} ${green(flags.output)}
`);
	} catch (error: unknown) {
		print_error('\nError processing repository:');
		if (error instanceof Error) {
			print_error(error.message);
		} else {
			print_error(String(error));
		}
		Deno.exit(1);
	}
}

if (import.meta.main) {
	main();
}

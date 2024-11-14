import { exists } from '@std/fs';
import { RepoConfig } from '../types/mod.ts';
import { scan_project_extensions } from './file.ts';

export async function generate_config(
	repoPath: string,
	outputPath = 'repo-to-xml.config.json'
): Promise<void> {
	// Scan project for extensions
	const extensions = await scan_project_extensions(repoPath);

	// Filter out common binary extensions
	const codeExtensions = [...extensions].filter(
		(ext) =>
			![
				'exe',
				'dll',
				'so',
				'dylib',
				'png',
				'jpg',
				'jpeg',
				'gif',
				'mp3',
				'mp4',
				'zip',
				'tar',
				'gz',
				'pdf',
				'woff',
				'woff2',
			].includes(ext)
	);

	// Create config object
	const config: RepoConfig = {
		excludeDirs: [
			'.git',
			'node_modules',
			'.svelte-kit',
			'build',
			'dist',
			'coverage',
			'.turbo',
			'.next',
			'.cache',
			'target',
		],
		excludeFiles: [
			'pnpm-lock.yaml',
			'package-lock.json',
			'yarn.lock',
			'.DS_Store',
			'Thumbs.db',
			'.env',
			'.env.*',
			'*.log',
			'vite.config.js.timestamp-*',
			'vite.config.ts.timestamp-*',
			'*.map',
			'*.min.js',
			'*.min.css',
			'LICENSE',
			'LICENSE.*',
			'*.md',
			'*.lock',
		],
		includeFiles: codeExtensions.map((ext) => `*.${ext}`),
		maxFileSize: 512 * 1024, // 512KB
		minFileSize: 0,
		compressContent: true,
		compressionThreshold: 1024,
	};

	// Check if file exists
	if (await exists(outputPath)) {
		console.log(`Config file already exists at ${outputPath}`);
		const override = prompt('Do you want to override it? (y/N)');
		if (override?.toLowerCase() !== 'y') {
			console.log('Aborted config generation');
			return;
		}
	}

	// Write config file
	await Deno.writeTextFile(
		outputPath,
		JSON.stringify(config, null, 2)
	);

	console.log(`Generated config file at ${outputPath}`);
	console.log('\nDetected file extensions:');
	console.log(codeExtensions.map((ext) => `  *.${ext}`).join('\n'));
}

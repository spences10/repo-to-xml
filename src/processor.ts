import { relative } from '@std/path';
import {
	FileEntry,
	ProcessingResult,
	ProcessingStats,
	RepoConfig,
} from './types/mod.ts';
import { compress_content } from './utils/compression.ts';
import { getFileType, walkFiles } from './utils/file.ts';
import { formatXml, resultsToXml } from './utils/xml.ts';

export class RepoProcessor {
	constructor(private config: RepoConfig) {}

	/**
	 * Process repository and generate XML
	 */
	async process(repoPath: string): Promise<ProcessingResult> {
		const stats: ProcessingStats = {
			totalFiles: 0,
			totalSize: 0,
			skippedFiles: 0,
			startTime: new Date(),
		};

		const files: FileEntry[] = [];

		for await (const path of walkFiles(repoPath, this.config)) {
			try {
				const relativePath = relative(repoPath, path);
				const stat = await Deno.stat(path);
				const content = await Deno.readTextFile(path);

				let processedContent = content;
				let compressed = false;

				// Compress content if enabled and over threshold
				if (
					this.config.compressContent &&
					content.length > this.config.compressionThreshold
				) {
					processedContent = await compress_content(content);
					compressed = true;
				}

				files.push({
					path: relativePath,
					content: processedContent,
					compressed,
					size: stat.size,
					type: getFileType(path),
					lastModified: stat.mtime || new Date(),
				});

				stats.totalFiles++;
				stats.totalSize += stat.size;
			} catch (error) {
				console.warn(`Error processing ${path}:`, error);
				stats.skippedFiles++;
			}
		}

		stats.endTime = new Date();

		return { files, stats };
	}

	/**
	 * Convert processing results to formatted XML
	 */
	toXml(results: ProcessingResult, pretty = false): string {
		return formatXml(resultsToXml(results), pretty);
	}
}

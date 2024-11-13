import { join, relative } from "@std/path";
import {
	FileEntry,
	ProcessingResult,
	ProcessingStats,
	RepoConfig,
} from "./types/mod.ts";
import { compress_content } from "./utils/compression.ts";
import { getFileType, walkFiles } from "./utils/file.ts";
import { formatXml, resultsToXml } from "./utils/xml.ts";

export class RepoProcessor {
	private config: RepoConfig;
	private stats: ProcessingStats;

	constructor(config: RepoConfig) {
		this.config = config;
		this.stats = {
			totalFiles: 0,
			totalSize: 0,
			skippedFiles: 0,
			startTime: new Date(),
		};
	}

	/**
	 * Process a Git repository and generate XML output
	 */
	async process(repoPath: string): Promise<ProcessingResult> {
		const files: FileEntry[] = [];
		let gitInfo = undefined;

		// Process all files
		for await (const filePath of walkFiles(repoPath, this.config)) {
			try {
				const file = await this.processFile(repoPath, filePath);
				if (file) {
					files.push(file);
					this.stats.totalFiles++;
					this.stats.totalSize += file.size;
				} else {
					this.stats.skippedFiles++;
				}
			} catch (error) {
				console.error(`Error processing ${filePath}:`, error);
				this.stats.skippedFiles++;
			}
		}

		// Set end time
		this.stats.endTime = new Date();

		return {
			files,
			stats: this.stats,
			gitInfo,
		};
	}

	/**
	 * Process a single file and return its entry
	 */
	private async processFile(
		repoPath: string,
		filePath: string
	): Promise<FileEntry | null> {
		const relativePath = relative(repoPath, filePath);

		try {
			// Get file stats
			const stat = await Deno.stat(filePath);

			// Skip if file is too large or too small
			if (
				stat.size < this.config.minFileSize ||
				stat.size > this.config.maxFileSize
			) {
				return null;
			}

			// Get file content
			const fileContent = await Deno.readFile(filePath);
			const content = new TextDecoder().decode(fileContent);
			let processedContent = content;
			let compressed = false;

			// Compress content if enabled and above threshold
			if (
				this.config.compressContent &&
				content.length > this.config.compressionThreshold
			) {
				processedContent = await compress_content(content);
				compressed = true;
			}

			// Build file entry
			const entry: FileEntry = {
				path: relativePath,
				content: processedContent,
				compressed,
				size: stat.size,
				type: getFileType(relativePath),
				lastModified: stat.mtime || new Date(),
			};

			// Add git info if enabled
			if (this.config.includeGitInfo) {
				entry.gitInfo = await this.getFileGitInfo(repoPath, relativePath);
			}

			return entry;
		} catch (error) {
			console.error(`Error processing file ${filePath}:`, error);
			return null;
		}
	}

	/**
	 * Get Git repository information
	 */
	private async getGitInfo(repoPath: string) {
		try {
			const gitDir = join(repoPath, ".git");
			const gitConfigPath = join(gitDir, "config");

			// Check if git repository exists
			try {
				await Deno.stat(gitDir);
			} catch {
				return undefined;
			}

			// Read git config
			const configContent = await Deno.readTextFile(gitConfigPath);

			// Extract remote URL
			const remoteMatch = configContent.match(/url = (.+)/);
			const remoteUrl = remoteMatch ? remoteMatch[1].trim() : undefined;

			// Get current branch
			const headPath = join(gitDir, "HEAD");
			const headContent = await Deno.readTextFile(headPath);
			const branchMatch = headContent.match(/ref: refs\/heads\/(.+)/);
			const branch = branchMatch ? branchMatch[1].trim() : undefined;

			// Get last commit hash
			let lastCommit: string | undefined;
			if (branch) {
				const refPath = join(gitDir, "refs", "heads", branch);
				try {
					lastCommit = (await Deno.readTextFile(refPath)).trim();
				} catch {
					// Ignore if ref file doesn't exist
				}
			}

			return {
				remoteUrl,
				branch,
				lastCommit,
			};
		} catch (error) {
			console.error("Error getting git info:", error);
			return undefined;
		}
	}

	/**
	 * Get Git information for a specific file
	 */
	private async getFileGitInfo(repoPath: string, filePath: string) {
		try {
			const gitDir = join(repoPath, ".git");

			// Run git log command
			const command = new Deno.Command("git", {
				args: [
					"-C",
					repoPath,
					"log",
					"-1",
					"--format=%H%n%s%n%an%n%aI",
					"--",
					filePath,
				],
			});

			const output = await command.output();
			if (!output.success) {
				return undefined;
			}

			const [hash, message, author, date] = new TextDecoder()
				.decode(output.stdout)
				.trim()
				.split("\n");

			return {
				lastCommit: hash,
				lastMessage: message,
				lastAuthor: author,
				lastCommitDate: new Date(date),
			};
		} catch {
			return undefined;
		}
	}

	/**
	 * Convert processing results to formatted XML
	 */
	toXml(results: ProcessingResult): string {
		return formatXml(resultsToXml(results));
	}
}

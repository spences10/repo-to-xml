export interface RepoConfig {
	/** Directories to exclude from processing */
	excludeDirs: string[];
	/** File patterns to exclude (supports glob patterns) */
	excludeFiles: string[];
	/** Maximum file size in bytes */
	maxFileSize: number;
	/** Minimum file size in bytes */
	minFileSize: number;
	/** Whether to include git metadata */
	includeGitInfo: boolean;
	/** Whether to include binary files */
	includeBinaryFiles: boolean;
}

export interface FileEntry {
	/** Relative path from repository root */
	path: string;
	/** File content */
	content: string;
	/** File size in bytes */
	size: number;
	/** Detected file type */
	type: string;
	/** Last modified timestamp */
	lastModified: Date;
	/** Git status if available */
	gitInfo?: GitFileInfo;
}

export interface GitFileInfo {
	/** Last commit hash that modified this file */
	lastCommit?: string;
	/** Last commit message */
	lastMessage?: string;
	/** Last commit author */
	lastAuthor?: string;
	/** Last commit date */
	lastCommitDate?: Date;
}

export interface ProcessingStats {
	/** Total number of files processed */
	totalFiles: number;
	/** Total size of all files */
	totalSize: number;
	/** Number of files skipped */
	skippedFiles: number;
	/** Processing start time */
	startTime: Date;
	/** Processing end time */
	endTime?: Date;
}

export interface ProcessingResult {
	/** Repository files */
	files: FileEntry[];
	/** Processing statistics */
	stats: ProcessingStats;
	/** Git repository info if available */
	gitInfo?: {
		/** Remote URL */
		remoteUrl?: string;
		/** Current branch */
		branch?: string;
		/** Last commit hash */
		lastCommit?: string;
	};
}

export interface CliOptions {
	/** Path to repository */
	repoPath: string;
	/** Output file path */
	output: string;
	/** Configuration file path */
	config?: string;
	/** Verbosity level */
	verbose: boolean;
}

export const DEFAULT_CONFIG: RepoConfig = {
	excludeDirs: [
		".git",
		"node_modules",
		"target",
		"dist",
		"build",
		".next",
		".cache",
	],
	excludeFiles: [
		".DS_Store",
		"Thumbs.db",
		"*.lock",
		"*.log",
		"*.map",
		"*.png",
		"*.jpg",
		"*.jpeg",
		"*.gif",
		"*.ico",
		"*.woff",
		"*.woff2",
		"*.ttf",
		"*.eot",
	],
	maxFileSize: 1024 * 1024, // 1MB
	minFileSize: 0,
	includeGitInfo: true,
	includeBinaryFiles: false,
};

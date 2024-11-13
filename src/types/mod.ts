export interface RepoConfig {
	/** Directories to exclude from processing */
	excludeDirs: string[];
	/** File patterns to include (supports glob patterns) */
	includeFiles: string[];
	/** Maximum file size in bytes */
	maxFileSize: number;
	/** Minimum file size in bytes */
	minFileSize: number;
	/** Whether to include git metadata */
	includeGitInfo: boolean;
	/** Whether to compress file contents */
	compressContent: boolean;
	/** Maximum content length before compression (bytes) */
	compressionThreshold: number;
}

export interface FileEntry {
	/** Relative path from repository root */
	path: string;
	/** File content - base64 encoded if binary */
	content: string;
	/** Whether content is compressed */
	compressed?: boolean;
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
	/** File extensions to include */
	extensions?: string[];
	/** Show available extensions */
	listExtensions?: boolean;
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
		".svelte-kit",
		"coverage",
		".turbo",
	],
	includeFiles: ["*.ts", "*.svelte"],
	maxFileSize: 512 * 1024, // 512KB
	minFileSize: 0,
	includeGitInfo: false,
	compressContent: true,
	compressionThreshold: 1024, // Compress files larger than 1KB
};

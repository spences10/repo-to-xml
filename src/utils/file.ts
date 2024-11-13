import { join } from "@std/path";
import { RepoConfig } from "../types/mod.ts";

/**
 * Map of file extensions to their types
 */
const FILE_TYPE_MAP: Record<string, string> = {
	// Programming Languages
	ts: "typescript",
	tsx: "typescript",
	js: "javascript",
	jsx: "javascript",
	py: "python",
	rb: "ruby",
	php: "php",
	java: "java",
	kt: "kotlin",
	go: "go",
	rs: "rust",
	c: "c",
	cpp: "cpp",
	cs: "csharp",
	swift: "swift",
	scala: "scala",

	// Web
	html: "html",
	htm: "html",
	css: "css",
	scss: "scss",
	sass: "sass",
	less: "less",
	json: "json",
	xml: "xml",
	svg: "svg",

	// Documentation
	md: "markdown",
	mdx: "markdown",
	txt: "text",
	rst: "restructuredtext",
	pdf: "pdf",
	doc: "word",
	docx: "word",

	// Configuration
	yml: "yaml",
	yaml: "yaml",
	toml: "toml",
	ini: "ini",
	env: "env",

	// Shell
	sh: "shell",
	bash: "shell",
	zsh: "shell",
	fish: "shell",

	// Data
	csv: "csv",
	tsv: "tsv",
	sql: "sql",
	db: "database",
	sqlite: "database",

	// Other
	lock: "lock",
	log: "log",
	conf: "config",
	cfg: "config",
};

/**
 * Binary file extensions that should typically be excluded
 */
const BINARY_EXTENSIONS = new Set([
	// Images
	"png",
	"jpg",
	"jpeg",
	"gif",
	"bmp",
	"ico",
	"webp",
	"tiff",
	// Audio
	"mp3",
	"wav",
	"ogg",
	"flac",
	"m4a",
	// Video
	"mp4",
	"webm",
	"avi",
	"mov",
	"wmv",
	// Archives
	"zip",
	"tar",
	"gz",
	"7z",
	"rar",
	// Fonts
	"ttf",
	"otf",
	"woff",
	"woff2",
	"eot",
	// Documents
	"pdf",
	"doc",
	"docx",
	"xls",
	"xlsx",
	// Executables
	"exe",
	"dll",
	"so",
	"dylib",
	// Other
	"bin",
	"dat",
	"db",
	"sqlite",
]);

/**
 * Check if a file path matches any of the exclude patterns
 */
export function isExcluded(path: string, patterns: string[]): boolean {
	return patterns.some((pattern) => {
		if (pattern.includes("*")) {
			const regex = new RegExp(
				"^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
			);
			return regex.test(path);
		}
		return path === pattern;
	});
}

/**
 * Detect if a file is likely binary based on its content
 */
export function isBinaryContent(content: Uint8Array): boolean {
	// Check first 512 bytes for null bytes or non-ASCII characters
	const sampleSize = Math.min(512, content.length);
	for (let i = 0; i < sampleSize; i++) {
		const byte = content[i];
		if (byte === 0 || (byte > 127 && byte < 160)) {
			return true;
		}
	}
	return false;
}

/**
 * Check if a file is binary based on extension and/or content
 */
export async function isBinaryFile(
	path: string,
	content?: Uint8Array
): Promise<boolean> {
	const ext = path.split(".").pop()?.toLowerCase() || "";

	// Check extension first
	if (BINARY_EXTENSIONS.has(ext)) {
		return true;
	}

	// If content is provided, check it
	if (content) {
		return isBinaryContent(content);
	}

	// If no content provided, read first 512 bytes
	try {
		const file = await Deno.open(path);
		const buffer = new Uint8Array(512);
		const bytesRead = await file.read(buffer);
		file.close();

		if (bytesRead === null) {
			return false;
		}

		return isBinaryContent(buffer.slice(0, bytesRead));
	} catch {
		return false;
	}
}

/**
 * Get file type based on extension and path
 */
export function getFileType(path: string): string {
	// Check for specific files first
	const basename = path.split("/").pop()?.toLowerCase() || "";
	switch (basename) {
		case "dockerfile":
			return "dockerfile";
		case "makefile":
			return "makefile";
		case ".gitignore":
			return "gitignore";
		case ".env":
			return "env";
		case "license":
		case "licence":
			return "license";
	}

	// Check extension
	const ext = path.split(".").pop()?.toLowerCase() || "";
	return FILE_TYPE_MAP[ext] || "unknown";
}

/**
 * Format file size in bytes to human readable string
 */
export function formatFileSize(bytes: number): string {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Check if a file should be processed based on config
 */
export const should_include_file = (
	path: string,
	patterns: string[]
): boolean => {
	const ext = path.split(".").pop()?.toLowerCase() || "";
	return patterns.some((pattern) => {
		const patternExt = pattern.replace("*.", "");
		return ext === patternExt;
	});
};

export async function shouldProcessFile(
	path: string,
	config: RepoConfig
): Promise<boolean> {
	// Check if file matches include patterns
	if (!should_include_file(path, config.includeFiles)) {
		return false;
	}

	// Check size
	try {
		const stat = await Deno.stat(path);
		return stat.size >= config.minFileSize && stat.size <= config.maxFileSize;
	} catch {
		return false;
	}
}

/**
 * Walk directory and get all file paths
 */
export async function* walkFiles(
	dir: string,
	config: RepoConfig
): AsyncGenerator<string> {
	for await (const entry of Deno.readDir(dir)) {
		const path = join(dir, entry.name);

		if (entry.isDirectory) {
			if (!isExcluded(entry.name, config.excludeDirs)) {
				yield* walkFiles(path, config);
			}
		} else if (entry.isFile) {
			if (await shouldProcessFile(path, config)) {
				yield path;
			}
		}
	}
}

/**
 * Scan directory for unique file extensions
 */
export async function scan_project_extensions(
	dir: string
): Promise<Set<string>> {
	const extensions = new Set<string>();

	async function scan(path: string) {
		for await (const entry of Deno.readDir(path)) {
			const fullPath = join(path, entry.name);

			if (entry.isDirectory) {
				// Skip common exclude dirs
				if (
					!["node_modules", ".git", "dist", "build", ".svelte-kit"].includes(
						entry.name
					)
				) {
					await scan(fullPath);
				}
			} else if (entry.isFile) {
				const ext = entry.name.split(".").pop()?.toLowerCase();
				if (ext) extensions.add(ext);
			}
		}
	}

	await scan(dir);
	return extensions;
}

/**
 * Format extensions list for display
 */
export function format_extensions(extensions: Set<string>): string {
	const groups: Record<string, string[]> = {
		Programming: [
			"ts",
			"js",
			"py",
			"java",
			"cpp",
			"rs",
			"go",
			"rb",
			"php",
			"svelte",
			"vue",
			"jsx",
			"tsx",
		],
		Web: ["html", "css", "scss", "less", "json", "xml"],
		Documentation: ["md", "txt", "rst", "doc", "pdf"],
		Config: ["yml", "yaml", "toml", "ini", "env"],
		Other: [],
	};

	const grouped: Record<string, string[]> = {};
	const found = new Set<string>();

	// Group known extensions
	for (const [group, exts] of Object.entries(groups)) {
		grouped[group] = [];
		for (const ext of exts) {
			if (extensions.has(ext)) {
				grouped[group].push(ext);
				found.add(ext);
			}
		}
	}

	// Add remaining extensions to Other
	for (const ext of extensions) {
		if (!found.has(ext)) {
			grouped["Other"].push(ext);
		}
	}

	// Format output
	const lines: string[] = ["Available file extensions:"];
	for (const [group, exts] of Object.entries(grouped)) {
		if (exts.length > 0) {
			lines.push(`\n${group}:`);
			lines.push(`  ${exts.sort().join(", ")}`);
		}
	}

	return lines.join("\n");
}

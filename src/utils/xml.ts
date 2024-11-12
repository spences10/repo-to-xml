import { ProcessingResult, FileEntry, GitFileInfo } from "../types/mod.ts";

/**
 * Escape special XML characters in a string
 */
export function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Convert a date to ISO string safely
 */
function formatDate(date: Date | undefined): string {
	return date ? date.toISOString() : "";
}

/**
 * Generate XML for git file info
 */
function gitInfoToXml(info: GitFileInfo | undefined, indent: string): string {
	if (!info) return "";

	const parts = [
		`${indent}<git_info>`,
		info.lastCommit
			? `${indent}  <last_commit>${escapeXml(info.lastCommit)}</last_commit>`
			: "",
		info.lastMessage
			? `${indent}  <last_message>${escapeXml(info.lastMessage)}</last_message>`
			: "",
		info.lastAuthor
			? `${indent}  <last_author>${escapeXml(info.lastAuthor)}</last_author>`
			: "",
		info.lastCommitDate
			? `${indent}  <last_commit_date>${formatDate(
					info.lastCommitDate
			  )}</last_commit_date>`
			: "",
		`${indent}</git_info>`,
	];

	return parts.filter(Boolean).join("\n");
}

/**
 * Generate XML for a single file entry
 */
function fileEntryToXml(file: FileEntry, indent: string): string {
	const parts = [
		`${indent}<file>`,
		`${indent}  <path>${escapeXml(file.path)}</path>`,
		`${indent}  <type>${escapeXml(file.type)}</type>`,
		`${indent}  <size>${file.size}</size>`,
		`${indent}  <last_modified>${formatDate(
			file.lastModified
		)}</last_modified>`,
	];

	// Add git info if available
	const gitInfo = gitInfoToXml(file.gitInfo, indent + "  ");
	if (gitInfo) {
		parts.push(gitInfo);
	}

	// Add content
	parts.push(
		`${indent}  <content><![CDATA[${file.content}]]></content>`,
		`${indent}</file>`
	);

	return parts.join("\n");
}

/**
 * Convert processing results to XML string
 */
export function resultsToXml(results: ProcessingResult): string {
	const parts = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		"<repository>",
		"  <stats>",
		`    <total_files>${results.stats.totalFiles}</total_files>`,
		`    <total_size>${results.stats.totalSize}</total_size>`,
		`    <skipped_files>${results.stats.skippedFiles}</skipped_files>`,
		`    <start_time>${formatDate(results.stats.startTime)}</start_time>`,
	];

	if (results.stats.endTime) {
		parts.push(`    <end_time>${formatDate(results.stats.endTime)}</end_time>`);
	}

	parts.push("  </stats>");

	// Add git repository info if available
	if (results.gitInfo) {
		parts.push("  <repository_info>");
		if (results.gitInfo.remoteUrl) {
			parts.push(
				`    <remote_url>${escapeXml(results.gitInfo.remoteUrl)}</remote_url>`
			);
		}
		if (results.gitInfo.branch) {
			parts.push(`    <branch>${escapeXml(results.gitInfo.branch)}</branch>`);
		}
		if (results.gitInfo.lastCommit) {
			parts.push(
				`    <last_commit>${escapeXml(
					results.gitInfo.lastCommit
				)}</last_commit>`
			);
		}
		parts.push("  </repository_info>");
	}

	// Add files
	parts.push("  <files>");
	for (const file of results.files) {
		parts.push(fileEntryToXml(file, "    "));
	}
	parts.push("  </files>");

	parts.push("</repository>");

	return parts.join("\n");
}

/**
 * Format XML string with proper indentation
 */
export function formatXml(xml: string): string {
	let formatted = "";
	let indent = 0;
	const lines = xml.trim().split("\n");

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		// Decrease indent for closing tags
		if (trimmed.startsWith("</")) {
			indent--;
		}

		// Add line with proper indentation
		formatted += "  ".repeat(indent) + trimmed + "\n";

		// Increase indent for opening tags (if not self-closing)
		if (
			trimmed.startsWith("<") &&
			!trimmed.startsWith("</") &&
			!trimmed.endsWith("/>") &&
			!trimmed.endsWith("]]>")
		) {
			indent++;
		}
	}

	return formatted;
}

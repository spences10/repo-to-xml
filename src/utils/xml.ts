import { FileEntry, GitFileInfo, ProcessingResult } from "../types/mod.ts";

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
	if (!date) return "";

	// Check if date is valid
	const timestamp = date.getTime();
	if (isNaN(timestamp)) return "";

	try {
		return date.toISOString();
	} catch (error) {
		console.warn("Invalid date encountered:", date);
		return "";
	}
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
	];

	// Add last commit date if valid
	const commitDate = formatDate(info.lastCommitDate);
	if (commitDate) {
		parts.push(`${indent}  <last_commit_date>${commitDate}</last_commit_date>`);
	}

	parts.push(`${indent}</git_info>`);

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
	];

	if (file.compressed) {
		parts.push(`${indent}  <compressed>true</compressed>`);
	}

	// Add content with compression flag
	parts.push(
		`${indent}  <content${file.compressed ? ' compressed="true"' : ''}><![CDATA[${
			file.content
		}]]></content>`,
	);

	parts.push(`${indent}</file>`);

	return parts.join("\n");
}

/**
 * Convert processing results to XML string
 */
export function resultsToXml(results: ProcessingResult): string {
	const parts = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<repository>',
		'  <stats>',
		`    <total_files>${results.stats.totalFiles}</total_files>`,
		`    <total_size>${results.stats.totalSize}</total_size>`,
		`    <skipped_files>${results.stats.skippedFiles}</skipped_files>`,
		'  </stats>',
		'  <files>',
	];

	// Add files
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

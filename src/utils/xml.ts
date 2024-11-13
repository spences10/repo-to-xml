import { ProcessingResult } from '../types/mod.ts';

/**
 * Escape special XML characters in a string
 */
export function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/**
 * Convert processing results to XML string
 */
export function resultsToXml(results: ProcessingResult): string {
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<repository>',
		'<stats>',
		`<total_files>${results.stats.totalFiles}</total_files>`,
		`<total_size>${results.stats.totalSize}</total_size>`,
		`<skipped_files>${results.stats.skippedFiles}</skipped_files>`,
		'</stats>',
		'<files>',
		...results.files.map((file) =>
			[
				'<file>',
				`<path>${escapeXml(file.path.trim())}</path>`,
				`<type>${escapeXml(file.type.trim())}</type>`,
				`<size>${file.size}</size>`,
				file.compressed ? '<compressed>true</compressed>' : '',
				`<content${
					file.compressed ? ' compressed="true"' : ''
				}><![CDATA[${file.content.trim()}]]></content>`,
				'</file>',
			]
				.filter(Boolean)
				.join('')
		),
		'</files>',
		'</repository>',
	].join('');
}

/**
 * Format XML string with proper indentation
 */
export function formatXml(xml: string, pretty = false): string {
	if (!pretty) return xml;

	let formatted = '';
	let indent = 0;

	// Split on tag boundaries but keep delimiters
	const tokens = xml.split(/(<!\[CDATA\[.*?\]\]>|<[^>]+>)/s);

	for (const token of tokens) {
		if (!token.trim()) continue;

		// Skip indentation for CDATA sections
		if (token.startsWith('<![CDATA[')) {
			formatted += token;
			continue;
		}

		// Decrease indent for closing tags
		if (token.startsWith('</')) {
			indent = Math.max(0, indent - 1);
		}

		// Add line and indent for non-empty tokens
		formatted += '\n' + '  '.repeat(indent) + token.trim();

		// Increase indent for opening tags (if not self-closing)
		if (
			token.startsWith('<') &&
			!token.startsWith('</') &&
			!token.endsWith('/>')
		) {
			indent++;
		}
	}

	return formatted.trim();
}

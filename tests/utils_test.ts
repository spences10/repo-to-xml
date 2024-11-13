import { assertEquals } from '@std/assert';
import {
	formatFileSize,
	getFileType,
	isBinaryContent,
	isExcluded,
} from '../src/utils/file.ts';
import { escapeXml, formatXml } from '../src/utils/xml.ts';

// File utility tests
Deno.test('isExcluded - Basic Patterns', () => {
	const patterns = ['node_modules', '*.log', '.DS_Store'];

	assertEquals(isExcluded('node_modules', patterns), true);
	assertEquals(isExcluded('error.log', patterns), true);
	assertEquals(isExcluded('.DS_Store', patterns), true);
	assertEquals(isExcluded('src/main.ts', patterns), false);
});

Deno.test('getFileType - File Extensions', () => {
	assertEquals(getFileType('main.ts'), 'typescript');
	assertEquals(getFileType('styles.css'), 'css');
	assertEquals(getFileType('data.json'), 'json');
	assertEquals(getFileType('readme.md'), 'markdown');
	assertEquals(getFileType('unknown.xyz'), 'unknown');
});

Deno.test('formatFileSize - Various Sizes', () => {
	assertEquals(formatFileSize(512), '512.00 B');
	assertEquals(formatFileSize(1024), '1.00 KB');
	assertEquals(formatFileSize(1024 * 1024), '1.00 MB');
	assertEquals(formatFileSize(1024 * 1024 * 1024), '1.00 GB');
});

Deno.test('isBinaryContent - Text vs Binary', () => {
	// Text content
	const textContent = new TextEncoder().encode('Hello, World!');
	assertEquals(isBinaryContent(textContent), false);

	// Binary content
	const binaryContent = new Uint8Array([0, 255, 0, 255]);
	assertEquals(isBinaryContent(binaryContent), true);
});

// XML utility tests
Deno.test('escapeXml - Special Characters', () => {
	const input = '<test attr="value">Hello & Goodbye</test>';
	const expected =
		'&lt;test attr=&quot;value&quot;&gt;Hello &amp; Goodbye&lt;/test&gt;';
	assertEquals(escapeXml(input), expected);
});

Deno.test('formatXml - Indentation', () => {
	const input =
		'<root><child><grandchild>value</grandchild></child></root>';
	const formatted = formatXml(input).trim();
	const expected = [
		'<root>',
		'  <child>',
		'    <grandchild>value</grandchild>',
		'  </child>',
		'</root>',
	].join('\n');

	assertEquals(formatted, expected);
});

// Test CDATA handling
Deno.test('formatXml - CDATA Sections', () => {
	const input =
		'<root><content><![CDATA[<test>data</test>]]></content></root>';
	const formatted = formatXml(input).trim();
	const expected = [
		'<root>',
		'  <content><![CDATA[<test>data</test>]]></content>',
		'</root>',
	].join('\n');

	assertEquals(formatted, expected);
});

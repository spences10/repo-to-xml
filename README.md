# Repo to XML

Convert a Git repository to an XML file. This tool is designed to help
prepare repository content for AI analysis by converting code files
into a structured XML format.

## Features

- 🔍 Selectively include specific file types
- 🗜️ Content compression for large files
- 📁 Smart directory exclusion (node_modules, .git, etc.)
- 🛠️ Project-specific configurations
- 📊 File type detection and grouping
- 💡 Interactive config generation

## Installation

```bash
# Clone the repository
git clone https://github.com/spences10/repo-to-xml
cd repo-to-xml

# Install Deno if you haven't already
# macOS or Linux:
curl -fsSL https://deno.land/x/install/install.sh | sh
# Windows:
iwr https://deno.land/x/install/install.ps1 -useb | iex
```

## Usage

```bash
# List available file extensions in a repository
deno task start ./my-repo --list-extensions

# Generate a config file for your project (creates my-repo.config.json)
deno task start ./my-repo --generate-config

# Convert repository using a config file
deno task start ./my-repo --config my-repo.config.json

# Directly specify file extensions to include
deno task start ./my-repo --include ts,svelte,js
```

## Configuration

Each project can have its own config file. When you run the tool
without a config, it will offer to generate one for you.

Example config file (`my-repo.config.json`):

```json
{
	"excludeDirs": [
		".git",
		"node_modules",
		".svelte-kit",
		"build",
		"dist",
		"coverage"
	],
	"includeFiles": ["*.svelte", "*.ts", "*.js"],
	"maxFileSize": 524288,
	"minFileSize": 0,
	"compressContent": true,
	"compressionThreshold": 1024
}
```

## Options

- `-o, --output <file>` - Output XML file (default:
  `<project-name>.xml`)
- `-i, --include <extensions>` - File extensions to include
  (comma-separated)
- `-l, --list-extensions` - List available file extensions in the
  project
- `-c, --config <file>` - Custom configuration file
- `-g, --generate-config` - Generate a config file based on project
  structure
- `-v, --verbose` - Show verbose output
- `-h, --help` - Show help message

## Output Format

The tool generates an XML file with the following structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<repository>
  <stats>
    <total_files>42</total_files>
    <total_size>128000</total_size>
    <skipped_files>5</skipped_files>
  </stats>
  <files>
    <file>
      <path>src/routes/+page.svelte</path>
      <type>svelte</type>
      <size>1024</size>
      <compressed>true</compressed>
      <content compressed="true"><![CDATA[...file content...]]></content>
    </file>
    <!-- More files... -->
  </files>
</repository>
```

## Development

```bash
# Run tests
deno task test

# Build executable
deno task compile
```

## License

MIT

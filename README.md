# Cubox Plugin for Obsidian

The official Cubox plugin for Obsidian allows you to synchronize articles and annotations from Cubox to Obsidian.

## Features

- Automatic Sync: Periodically sync articles and annotations from Cubox to Obsidian
- Filtering: Filter content by folder, type, tags, and status
- Templates: Customize file names, front matter, and content format
- Annotation Sync: Sync highlighted content from Cubox to Obsidian notes

## Installation

### Install from the Community

1. Open Obsidian settings
2. Navigate to the "Community plugins" tab
3. Click the "Browse" button and search for "Cubox"
4. Click Install

### Manual Installation

1. Download the latest `main.js`, `manifest.json`, and `styles.css` files
2. Create a `.obsidian/plugins/obsidian-cubox` folder in your Obsidian vault
3. Copy the downloaded files into this folder
4. Enable the plugin in Obsidian settings

## Configuration

1. Cubox Server Domain: Select the Cubox server domain you use (cubox.cc or cubox.pro)
2. Cubox API Key: Enter your Cubox API key or link (generate it in the Cubox web settings under Extensions & Automation - API Extension)

## Usage

1. Before setting up, ensure you have selected the correct server and entered the API key
2. Only content that meets all filter conditions will be synced
3. Refer to the settings page for reference links to template variables
4. Each item is synced only once from Cubox, updates in Cubox will not be synced to Obsidian unless you change the target folder
5. It is recommended to set a longer sync interval or use manual sync to prevent syncing unfinished annotations

## Dependencies

- [Mustache](https://mustache.github.io/): Template rendering
- [Luxon](https://moment.github.io/luxon/#/formatting?id=table-of-tokens): Date and time handling

## License

This project is licensed under the [MIT License](https://choosealicense.com/licenses/mit/).
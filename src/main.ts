import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFolder } from 'obsidian';
import { CuboxApi, CuboxApiOptions } from './cuboxApi';
import { TemplateProcessor } from './templateProcessor';
import { formatISODateTime, getCurrentFormattedTime } from './utils';
import { FolderSelectModal } from './folderSelectModal';

interface CuboxSyncSettings {
	domain: string;
	apiKey: string;
	folderFilter: string[];
	typeFilter: string;
	statusFilter: 'all' | 'read' | 'starred' | 'annotated';
	syncFrequency: number;
	targetFolder: string;
	filenameTemplate: string;
	frontMatterTemplate: string;
	contentTemplate: string;
	highlightInContent: boolean;
	dateFormat: string;
	lastSyncTime: number;
	lastSyncCardId: string | null;
}

const DEFAULT_SETTINGS: CuboxSyncSettings = {
	domain: 'cubox.cc',
	apiKey: '',
	folderFilter: [],
	typeFilter: '',
	statusFilter: 'all',
	syncFrequency: 30, // 分钟
	targetFolder: 'Cubox',
	filenameTemplate: '{{cardTitle}}-{{createDate}}',
	frontMatterTemplate: 'title: {{cardTitle}}\nurl: {{url}}\ndate: {{createDate}}',
	contentTemplate: '# {{cardTitle}}\n\n{{{content}}}\n\n## Highlights\n{{#highlightsList}}\n- {{{text}}}\n{{/highlightsList}}',
	highlightInContent: true,
	dateFormat: 'YYYY-MM-dd',
	lastSyncTime: 0,
	lastSyncCardId: null
}

export default class CuboxSyncPlugin extends Plugin {
	settings: CuboxSyncSettings;
	cuboxApi: CuboxApi;
	templateProcessor: TemplateProcessor;
	syncIntervalId: number;

	async onload() {
		await this.loadSettings();
		
		// 初始化 API 和模板处理器
		this.cuboxApi = new CuboxApi({
			domain: this.settings.domain,
			apiKey: this.settings.apiKey
		});
		this.templateProcessor = new TemplateProcessor();
		// 设置模板处理器的日期格式
		this.templateProcessor.setDateFormat(this.settings.dateFormat);

		// 添加左侧图标
		const ribbonIconEl = this.addRibbonIcon('download', 'Sync Cubox', async (evt: MouseEvent) => {
			new Notice('开始同步 Cubox 数据...');
			await this.syncCubox();
		});
		ribbonIconEl.addClass('cubox-sync-ribbon-class');

		// 添加状态栏
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText(`上次同步: ${this.formatLastSyncTime()}`);

		// 添加同步命令
		this.addCommand({
			id: 'sync-cubox-data',
			name: '同步 Cubox 数据',
			callback: async () => {
				await this.syncCubox();
			}
		});

		// 添加设置选项卡
		this.addSettingTab(new CuboxSyncSettingTab(this.app, this));

		// 设置自动同步
		this.setupAutoSync();

		// 加载样式
		this.loadStyles();
	}

	onunload() {
		// 清除自动同步定时器
		if (this.syncIntervalId) {
			window.clearInterval(this.syncIntervalId);
		}

		// 移除样式
		const styleEl = document.getElementById('cubox-sync-styles');
		if (styleEl) styleEl.remove();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		
		// 更新 API 配置
		this.cuboxApi = new CuboxApi({
			domain: this.settings.domain,
			apiKey: this.settings.apiKey
		});
		
		// 更新模板处理器的日期格式
		this.templateProcessor.setDateFormat(this.settings.dateFormat);
		
		// 重新设置自动同步
		this.setupAutoSync();
	}

	setupAutoSync() {
		// 清除现有定时器
		if (this.syncIntervalId) {
			window.clearInterval(this.syncIntervalId);
		}
		
		// 如果频率大于0，设置新的定时器
		if (this.settings.syncFrequency > 0) {
			this.syncIntervalId = window.setInterval(
				async () => await this.syncCubox(), 
				this.settings.syncFrequency * 60 * 1000
			);
		}
	}

	async syncCubox(continueLastSync: boolean = false) {
		try {
			// 检查 API 连接
			const isConnected = await this.cuboxApi.testConnection();
			if (!isConnected) {
				return;
			}
			
			// 确保目标文件夹存在
			await this.ensureTargetFolder();
			
			// 如果选择继续上次同步，则使用保存的 lastSyncCardId
			let lastCardId: string | null = continueLastSync ? this.settings.lastSyncCardId : null;
			let hasMore = true;
			let syncCount = 0;
			
			// 分页获取所有文章
			while (hasMore) {
				// 获取文章列表
				const result = await this.cuboxApi.getArticles(
					this.settings.folderFilter,
					this.settings.typeFilter,
					this.settings.statusFilter,
					lastCardId
				);
				
				const { articles, hasMore: moreArticles, lastCardId: newLastCardId } = result;
				
				if (articles.length === 0) {
					break;
				}
				
				// 处理每篇文章
				for (const article of articles) {
					// 获取文章详情和高亮
					const content = await this.cuboxApi.getArticleDetail(article.cardId);
					if (content === null) continue;
					
					// 获取高亮内容
					const highlights = await this.cuboxApi.getHighlights(article.cardId);
					
					// 合并文章基本信息、内容和高亮
					const fullArticle = {
						...article,
						content: content,
						highlights: highlights
					};
					
					// 处理文件名和内容
					const filename = this.templateProcessor.processFilenameTemplate(
						this.settings.filenameTemplate, 
						fullArticle
					);
					
					const frontMatter = this.templateProcessor.processFrontMatterTemplate(
						this.settings.frontMatterTemplate,
						fullArticle
					);
					
					const contentTemplate = this.templateProcessor.processContentTemplate(
						this.settings.contentTemplate,
						fullArticle
					);
					
					// 组合最终内容
					let finalContent = '';
					if (frontMatter) {
						finalContent = `---\n${frontMatter}\n---\n\n`;
					}
					finalContent += contentTemplate;
					
					// 创建或更新文件
					const filePath = `${this.settings.targetFolder}/${filename}.md`;
					await this.app.vault.adapter.write(filePath, finalContent);
					
					syncCount++;
				}
				
				// 更新分页参数
				hasMore = moreArticles;
				lastCardId = newLastCardId;
				
				// 在每次分页循环后保存当前的同步状态
				this.settings.lastSyncCardId = lastCardId;
				this.settings.lastSyncTime = Date.now();
				await this.saveSettings();
				
				// 只在 lastCardId 不为 null 时才继续分页
				if (lastCardId === null) {
					break;
				}
			}
			
			// 同步完成后，清除 lastSyncCardId（表示完整同步已完成）
			this.settings.lastSyncCardId = null;
			await this.saveSettings();
			
			new Notice(`成功同步 ${syncCount} 篇 Cubox 文章`);
		} catch (error) {
			console.error('同步 Cubox 数据失败:', error);
			new Notice('同步 Cubox 数据失败，请检查设置和网络连接');
		}
	}

	async ensureTargetFolder() {
		const folderPath = this.settings.targetFolder;
		
		// 检查文件夹是否存在
		if (!(await this.app.vault.adapter.exists(folderPath))) {
			// 创建文件夹
			await this.app.vault.createFolder(folderPath);
		}
	}

	formatLastSyncTime(): string {
		if (!this.settings.lastSyncTime) {
			return '从未同步';
		}
		
		// 使用新的格式化方法
		return formatISODateTime(new Date(this.settings.lastSyncTime).toISOString(), 'yyyy-MM-dd HH:mm');
	}

	private loadStyles() {
		// 添加自定义样式
		const styleEl = document.createElement('style');
		styleEl.id = 'cubox-sync-styles';
		styleEl.textContent = `
			/* 文件夹选择模态框样式 */
			.folder-list {
				max-height: 300px;
				overflow-y: auto;
				margin: 10px 0;
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
				padding: 5px;
			}

			.modal-footer {
				display: flex;
				justify-content: flex-end;
				margin-top: 20px;
				gap: 10px;
			}

			.modal-footer button {
				padding: 6px 12px;
				border-radius: 4px;
				background-color: var(--interactive-normal);
				color: var(--text-normal);
				cursor: pointer;
			}

			.modal-footer button.mod-cta {
				background-color: var(--interactive-accent);
				color: var(--text-on-accent);
			}
		`;
		document.head.appendChild(styleEl);
	}
}

class CuboxSyncSettingTab extends PluginSettingTab {
	plugin: CuboxSyncPlugin;

	constructor(app: App, plugin: CuboxSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// 连接设置部分
		containerEl.createEl('h2', {text: 'Connect Obsidian to Your Cubox'});

		new Setting(containerEl)
			.setName('Cubox Server Domain')
			.setDesc('Select the correct domain name of the Cubox you are using.')
			.addDropdown(dropdown => dropdown
				.addOption('cubox.cc', 'cubox.cc')
				.setValue(this.plugin.settings.domain)
				.onChange(async (value) => {
					this.plugin.settings.domain = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Your Cubox API Key')
			.setDesc('You can create a key in the settings of Cubox web app.')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		// 过滤器设置部分
		containerEl.createEl('h2', {text: 'Filter'});

		new Setting(containerEl)
			.setName('Manage')
			.setDesc('选择要同步的文件夹')
			.addButton(button => button
				.setButtonText(this.getFolderFilterButtonText())
				.onClick(async () => {
					// 确保 API 已初始化
					if (!this.plugin.settings.apiKey) {
						new Notice('请先设置 API Key');
						return;
					}
					
					// 打开文件夹选择模态框
					const modal = new FolderSelectModal(
						this.app, 
						this.plugin.cuboxApi, 
						this.plugin.settings.folderFilter,
						async (selectedFolders) => {
							this.plugin.settings.folderFilter = selectedFolders;
							await this.plugin.saveSettings();
							// 更新按钮文本
							button.setButtonText(this.getFolderFilterButtonText());
						}
					);
					modal.open();
				}));

		new Setting(containerEl)
			.setName('Type Filter')
			.setDesc('Enter the xxxxx, 0 means manual sync')
			.addDropdown(dropdown => dropdown
				.addOption('', 'Sync all the items')
				.setValue(this.plugin.settings.typeFilter)
				.onChange(async (value) => {
					this.plugin.settings.typeFilter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Status Filter')
			.setDesc('Only the items that match the status will be synced.')
			.addDropdown(dropdown => dropdown
				.addOption('all', 'Sync all the items')
				.addOption('read', 'Sync only read items')
				.addOption('starred', 'Sync only starred items')
				.addOption('annotated', 'Sync only annotated items')
				.setValue(this.plugin.settings.statusFilter || 'all')
				.onChange(async (value) => {
					this.plugin.settings.statusFilter = value as 'all' | 'read' | 'starred' | 'annotated';
					await this.plugin.saveSettings();
				}));

		// 同步设置部分
		containerEl.createEl('h2', {text: 'Sync'});

		new Setting(containerEl)
			.setName('Frequency')
			.setDesc('Enter the xxxxx, 0 means manual sync')
			.addText(text => text
				.setPlaceholder('Enter sync frequency in minutes')
				.setValue(String(this.plugin.settings.syncFrequency))
				.onChange(async (value) => {
					const numValue = parseInt(value);
					this.plugin.settings.syncFrequency = isNaN(numValue) ? 0 : numValue;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Target Folder')
			.setDesc('Select the folder you would like to sync')
			.addText(text => text
				.setPlaceholder('Enter target folder path')
				.setValue(this.plugin.settings.targetFolder)
				.onChange(async (value) => {
					this.plugin.settings.targetFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('File Name Template')
			.setDesc('Enter the file name when the data is stored')
			.addText(text => text
				.setPlaceholder('Enter file name template')
				.setValue(this.plugin.settings.filenameTemplate)
				.onChange(async (value) => {
					this.plugin.settings.filenameTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Front Matter')
			.setDesc('Enter the metadata')
			.addTextArea(text => text
				.setPlaceholder('Enter front matter template')
				.setValue(this.plugin.settings.frontMatterTemplate)
				.onChange(async (value) => {
					this.plugin.settings.frontMatterTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Content Template')
			.setDesc('Enter the file name when the data is stored')
			.addTextArea(text => text
				.setPlaceholder('Enter content template')
				.setValue(this.plugin.settings.contentTemplate)
				.onChange(async (value) => {
					this.plugin.settings.contentTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Highlight Text in Content')
			.setDesc('Highlight text in articles')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.highlightInContent)
				.onChange(async (value) => {
					this.plugin.settings.highlightInContent = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc('Enter the xxxxx, 0 means manual sync')
			.addText(text => text
				.setPlaceholder('Enter date format')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));

		// 状态部分
		containerEl.createEl('h2', {text: 'Status'});
		containerEl.createEl('p', {text: `Last sync: ${this.plugin.formatLastSyncTime()}`});

		// 添加测试连接按钮
		new Setting(containerEl)
			.setName('Test Connection')
			.setDesc('Test your Cubox API connection')
			.addButton(button => button
				.setButtonText('Test')
				.onClick(async () => {
					await this.plugin.cuboxApi.testConnection();
				}));

		// 添加立即同步按钮
		new Setting(containerEl)
			.setName('Sync Now')
			.setDesc('Manually sync Cubox data')
			.addButton(button => button
				.setButtonText('Sync')
				.onClick(async () => {
					await this.plugin.syncCubox();
				}));
	}

	// 获取文件夹过滤器按钮文本
	private getFolderFilterButtonText(): string {
		const count = this.plugin.settings.folderFilter.length;
		if (count === 0) {
			return 'Sync all folders';
		} else {
			return `已选择 ${count} 个文件夹`;
		}
	}
}

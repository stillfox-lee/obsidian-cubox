import { addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFolder } from 'obsidian';
import { CuboxApi, CuboxApiOptions } from './cuboxApi';
import { TemplateProcessor } from './templateProcessor';
import { formatISODateTime, getCurrentFormattedTime } from './utils';
import { FolderSelectModal } from './modal/folderSelectModal';
import { filenameTemplateInstructions, metadataTemplateInstructions, contentTemplateInstructions } from './templateInstructions';
import { TypeSelectModal } from './modal/typeSelectModal';
import { StatusSelectModal } from './modal/statusSelectModal';
import { TagSelectModal } from './modal/tagSelectModal';

interface CuboxSyncSettings {
	domain: string; // 可以是 'cubox.cc' | 'cubox.pro' | ''
	apiKey: string;
	folderFilter: string[];
	typeFilter: string[];
	statusFilter: string[];
	tagsFilter: string[]; // 添加标签过滤
	syncFrequency: number;
	targetFolder: string;
	filenameTemplate: string;
	frontMatterTemplate: string;
	contentTemplate: string;
	highlightInContent: boolean;
	dateFormat: string;
	lastSyncTime: number;
	lastSyncCardId: string | null;
	syncing: boolean; // 添加同步状态标志
}

const DEFAULT_SETTINGS: CuboxSyncSettings = {
	domain: '', // 默认为空，表示未选择
	apiKey: '',
	folderFilter: [],
	typeFilter: [],
	statusFilter: ['all'],
	tagsFilter: [], // 默认为空数组，表示同步所有标签
	syncFrequency: 30, // 分钟
	targetFolder: 'Cubox',
	filenameTemplate: '{{cardTitle}}-{{createDate}}',
	frontMatterTemplate: 'title: {{cardTitle}}\nurl: {{url}}\ndate: {{createDate}}',
	contentTemplate: '# {{cardTitle}}\n\n{{{content}}}\n\n## Highlights\n{{#highlightsList}}\n- {{{text}}}\n{{/highlightsList}}',
	highlightInContent: true,
	dateFormat: 'YYYY-MM-dd',
	lastSyncTime: 0,
	lastSyncCardId: null,
	syncing: false // 默认为非同步状态
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
		const iconId = 'Cubox'
		addIcon(iconId, '<svg viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_832_147)"><path d="M16.4832 14.9619C16.3985 19.9047 13.3129 19.7653 9.40222 19.7653C5.49152 19.7653 3.46973 18.9255 3.46973 14.6576C3.46973 10.2101 5.49152 6.90909 9.40222 6.90909C13.3129 6.90909 16.4832 10.5144 16.4832 14.9619Z" stroke="currentColor" stroke-width="1.72727"/><rect x="0.863636" y="0.863636" width="17.2727" height="17.2727" rx="8.63636" stroke="currentColor" stroke-width="1.72727"/></g><ellipse cx="6.90905" cy="12.2205" rx="0.863636" ry="0.993182" fill="currentColor"/><ellipse cx="9.49987" cy="12.2205" rx="0.863636" ry="0.993182" fill="currentColor"/><defs><clipPath id="clip0_832_147"><rect width="19" height="19" rx="9.5" fill="white"/></clipPath></defs></svg>');

		const ribbonIconEl = this.addRibbonIcon(iconId, iconId, async (evt: MouseEvent) => {
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
		// 保存之前的设置，用于比较
		const oldSettings = { ...this.settings };
		
		// 保存新设置
		await this.saveData(this.settings);
		
		// 更新 API 配置
		if (this.cuboxApi) {
			// 检查域名或 API Key 是否发生变化
			const domainChanged = oldSettings.domain !== this.settings.domain;
			const apiKeyChanged = oldSettings.apiKey !== this.settings.apiKey;
			
			// 如果任一配置发生变化，则更新
			if (domainChanged || apiKeyChanged) {
				// 同时更新域名和 API Key
				this.cuboxApi.updateConfig({
					domain: this.settings.domain,
					apiKey: this.settings.apiKey
				});
			}
		} else {
			// 如果实例不存在，创建新实例
			this.cuboxApi = new CuboxApi({
				domain: this.settings.domain,
				apiKey: this.settings.apiKey
			});
		}
		
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
		// 如果已经在同步中，则跳过
		if (this.settings.syncing) {
			new Notice('同步已在进行中，请等待当前同步完成');
			return;
		}
		
		try {
			// 设置同步状态为 true
			this.settings.syncing = true;
			await this.saveSettings();
			
			// 更新状态栏显示
			const statusBarItemEl = this.addStatusBarItem();
			statusBarItemEl.setText(`正在同步 Cubox...`);
			
			// 测试连接
			const isConnected = await this.cuboxApi.testConnection();
			if (!isConnected) {
				this.settings.syncing = false;
				await this.saveSettings();
				statusBarItemEl.setText(`上次同步: ${this.formatLastSyncTime()}`);
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
					{
						lastCardId: lastCardId,
						folderFilter: this.settings.folderFilter,
						typeFilter: this.settings.typeFilter,
						statusFilter: this.settings.statusFilter,
						tagsFilter: this.settings.tagsFilter,
					}
				);
				
				const { articles, hasMore: moreArticles, lastCardId: newLastCardId } = result;
				
				if (articles.length === 0) {
					break;
				}
				
				// 处理每篇文章
				for (const article of articles) {
					// 获取文章内容
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
					
					// 更新状态栏显示同步进度
					statusBarItemEl.setText(`正在同步 Cubox: ${syncCount} 篇文章已同步`);
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
			this.settings.lastSyncTime = Date.now();
			
			// 设置同步状态为 false
			this.settings.syncing = false;
			await this.saveSettings();
			
			// 更新状态栏
			statusBarItemEl.setText(`上次同步: ${this.formatLastSyncTime()}`);
			
			new Notice(`成功同步 ${syncCount} 篇 Cubox 文章`);
		} catch (error) {
			console.error('同步 Cubox 数据失败:', error);
			new Notice('同步 Cubox 数据失败，请检查设置和网络连接');
			
			// 出错时也要重置同步状态
			this.settings.syncing = false;
			await this.saveSettings();
			
			// 更新状态栏
			const statusBarItemEl = this.addStatusBarItem();
			statusBarItemEl.setText(`上次同步: ${this.formatLastSyncTime()} (失败)`);
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
}

class CuboxSyncSettingTab extends PluginSettingTab {
	plugin: CuboxSyncPlugin;
	apiKeySetting: Setting; // 添加一个属性来存储 API Key 设置

	constructor(app: App, plugin: CuboxSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// 添加 Cubox 标题和版本信息
		new Setting(containerEl)
			.setName('Cubox')
			.setDesc(`Created by Cubox, version ${this.plugin.manifest.version}`)
			//.setClass('cubox-header-setting');
		
		// 连接设置部分
		containerEl.createEl('h3', {text: 'Connect Obsidian to Your Cubox'});

		// 修改域名选择下拉框
		new Setting(containerEl)
			.setName('Cubox Server Domain')
			.setDesc('Select the correct domain name of the Cubox you are using.')
			.addDropdown(dropdown => dropdown
				.addOption('', 'Choose Region')
				.addOption('cubox.cc', 'cubox.cc (international)')
				.addOption('cubox.pro', 'cubox.pro')
				.setValue(this.plugin.settings.domain)
				.onChange(async (value) => {
					this.plugin.settings.domain = value;
					await this.plugin.saveSettings();
					
					// 更新 API Key 设置的描述和状态
					this.updateApiKeySetting();
				}));

		// 添加 API Key 设置
		this.apiKeySetting = new Setting(containerEl)
			.setName('Your Cubox API Key')
			.setDesc('Please select a region first')
			.addText(text => {
				text.setPlaceholder('Enter your API key')
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					});
				
				// 如果未选择域名，则禁用输入框
				if (!this.plugin.settings.domain) {
					text.inputEl.disabled = true;
				}
				
				return text;
			});
		
		// 初始化 API Key 设置的描述和状态
		this.updateApiKeySetting();

		// 过滤器设置部分
		containerEl.createEl('h3', {text: 'Filter'});

		new Setting(containerEl)
			.setName('Folder Filter')
			.setDesc('Manage Cubox folders to be synced')
			.addButton(button => button
				.setButtonText(this.getFolderFilterButtonText())
				.setCta()
				.onClick(async () => {
					// 确保 API 已初始化
					if (!this.plugin.settings.apiKey) {
						new Notice('请先设置 API Key');
						return;
					}
					
					// 显示加载状态
					button.setButtonText('Loading folders...');
					
					try {
						// 先获取文件夹数据
						const folders = await this.plugin.cuboxApi.getFolders();
						
						// 打开文件夹选择模态框，传入已获取的文件夹数据
						const modal = new FolderSelectModal(
							this.app, 
							folders, // 直接传入获取到的文件夹数据
							this.plugin.settings.folderFilter,
							async (selectedFolders) => {
								this.plugin.settings.folderFilter = selectedFolders;
								await this.plugin.saveSettings();
								// 更新按钮文本
								button.setButtonText(this.getFolderFilterButtonText());
							}
						);
						modal.open();
					} catch (error) {
						console.error('获取文件夹列表失败:', error);
						new Notice('获取文件夹列表失败，请检查网络连接和 API Key');
						// 恢复按钮文本
						button.setButtonText(this.getFolderFilterButtonText());
					}
				}));

		new Setting(containerEl)
			.setName('Tag Filter')	
			.setDesc('Manage Cubox tags to be synced')
			.addButton(button => button
				.setButtonText(this.getTagFilterButtonText())
				.setCta()
				.onClick(async () => {
					// 确保 API 已初始化
					if (!this.plugin.settings.apiKey) {
						new Notice('请先设置 API Key');
						return;
					}
					
					// 显示加载状态
					button.setButtonText('Loading tags...');
					
					try {
						// 先获取标签数据
						const tags = await this.plugin.cuboxApi.getTags();
						
						// 打开标签选择模态框，传入已获取的标签数据
						const modal = new TagSelectModal(
							this.app, 
							tags, // 直接传入获取到的标签数据
							this.plugin.settings.tagsFilter,
							async (selectedTags) => {
								this.plugin.settings.tagsFilter = selectedTags;
								await this.plugin.saveSettings();
								// 更新按钮文本
								button.setButtonText(this.getTagFilterButtonText());
							}
						);
						modal.open();
					} catch (error) {
						console.error('获取标签列表失败:', error);
						new Notice('获取标签列表失败，请检查网络连接和 API Key');
						// 恢复按钮文本
						button.setButtonText(this.getTagFilterButtonText());
					}
				}));

		new Setting(containerEl)
			.setName('Type Filter')
			.setDesc('Manage Cubox content types to be synced')
			.addButton(button => button
				.setButtonText(this.getTypeFilterButtonText())
				.setCta()
				.onClick(async () => {
					// 确保 API 已初始化
					if (!this.plugin.settings.apiKey) {
						new Notice('请先设置 API Key');
						return;
					}
					
					// 打开类型选择模态框
					const modal = new TypeSelectModal(
						this.app, 
						this.plugin.settings.typeFilter,
						async (selectedTypes) => {
							this.plugin.settings.typeFilter = selectedTypes;
							await this.plugin.saveSettings();
							// 更新按钮文本
							button.setButtonText(this.getTypeFilterButtonText());
						}
					);
					modal.open();
				}));

		new Setting(containerEl)
			.setName('Status Filter')
			.setDesc('Manage Cubox content status to be synced')
			.addButton(button => button
				.setButtonText(this.getStatusFilterButtonText())
				.setCta()
				.onClick(async () => {
					// 确保 API 已初始化
					if (!this.plugin.settings.apiKey) {
						new Notice('请先设置 API Key');
						return;
					}
					
					// 打开状态选择模态框
					const modal = new StatusSelectModal(
						this.app, 
						this.plugin.settings.statusFilter,
						async (selectedStatuses) => {
							this.plugin.settings.statusFilter = selectedStatuses;
							await this.plugin.saveSettings();
							// 更新按钮文本
							button.setButtonText(this.getStatusFilterButtonText());
						}
					);
					modal.open();
				}));

		// 同步设置部分
		containerEl.createEl('h3', {text: 'Sync'});

		new Setting(containerEl)
			.setName('Sync Interval')
			.setDesc('Auto sync interval (in minutes). 0 means manual sync. Each item syncs only once. Subsequent updates won\'t be synced, and modifications in Obsidian won\'t affect Cubox. We recommend avoiding frequent updates.')
			.addText(text => text
				.setPlaceholder('Enter sync frequency in minutes')
				.setValue(String(this.plugin.settings.syncFrequency))
				.onChange(async (value) => {
					const numValue = parseInt(value);
					this.plugin.settings.syncFrequency = isNaN(numValue) ? 0 : numValue;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Folder')
			.setDesc('Select the folder you\'d like to sync to')
			.addText(text => text
				.setPlaceholder('Enter target folder path')
				.setValue(this.plugin.settings.targetFolder)
				.onChange(async (value) => {
					this.plugin.settings.targetFolder = value;
					await this.plugin.saveSettings();
				}));

		// 更新文件名模板设置
		const filenameInstructionsFragment = document.createRange().createContextualFragment(filenameTemplateInstructions);

		new Setting(containerEl)
			.setName('File Name Template')
			.setDesc(filenameInstructionsFragment)
			.addText(text => text
				.setPlaceholder('Enter file name template')
				.setValue(this.plugin.settings.filenameTemplate)
				.onChange(async (value) => {
					this.plugin.settings.filenameTemplate = value;
					await this.plugin.saveSettings();
				}))
			.addButton(button => button
				.setIcon('reset')
				.setTooltip('Reset to default')
				.onClick(async () => {
					this.plugin.settings.filenameTemplate = DEFAULT_SETTINGS.filenameTemplate;
					await this.plugin.saveSettings();
					this.display(); // 刷新显示
				}));
		
		// 为参考链接添加事件监听器
		containerEl.querySelectorAll('.reference-link').forEach(el => {
			el.addEventListener('click', (e) => {
				e.preventDefault();
				// 这里可以添加打开参考文档的逻辑
			});
		});

		// 更新前置元数据模板设置
		const metadataInstructionsFragment = document.createRange().createContextualFragment(metadataTemplateInstructions);

		new Setting(containerEl)
			.setName('Metadata Template')
			.setDesc(metadataInstructionsFragment)
			.addTextArea(text => text
				.setPlaceholder('Enter front matter template')
				.setValue(this.plugin.settings.frontMatterTemplate)
				.onChange(async (value) => {
					this.plugin.settings.frontMatterTemplate = value;
					await this.plugin.saveSettings();
				})
				// 设置文本区域的大小
				.then(textArea => {
					textArea.inputEl.rows = 20;
					textArea.inputEl.cols = 30;
				}))
			.addButton(button => button
				.setIcon('reset')
				.setTooltip('Reset to default')
				.onClick(async () => {
					this.plugin.settings.frontMatterTemplate = DEFAULT_SETTINGS.frontMatterTemplate;
					await this.plugin.saveSettings();
					this.display(); // 刷新显示
				}));

		// 更新内容模板设置
		const contentInstructionsFragment = document.createRange().createContextualFragment(contentTemplateInstructions);

		new Setting(containerEl)
			.setName('Content Template')
			.setDesc(contentInstructionsFragment)
			.addTextArea(text => text
				.setPlaceholder('Enter content template')
				.setValue(this.plugin.settings.contentTemplate)
				.onChange(async (value) => {
					this.plugin.settings.contentTemplate = value;
					await this.plugin.saveSettings();
				})
				// 设置文本区域的大小
				.then(textArea => {
					textArea.inputEl.rows = 20;
					textArea.inputEl.cols = 30;
				}))
			.addButton(button => button
				.setIcon('reset')
				.setTooltip('Reset to default')
				.onClick(async () => {
					this.plugin.settings.contentTemplate = DEFAULT_SETTINGS.contentTemplate;
					await this.plugin.saveSettings();
					this.display(); // 刷新显示
				}));

		// 状态部分
		containerEl.createEl('h3', {text: 'Status'});
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

	}

	// 添加一个方法来更新 API Key 设置的描述和状态
	private updateApiKeySetting(): void {
		const domain = this.plugin.settings.domain;
		const textComponent = this.apiKeySetting.components[0] as any;
		
		if (!domain) {
			// 未选择域名
			this.apiKeySetting.setDesc('Please select a region first');
			textComponent.inputEl.disabled = true;
		} else {
			// 已选择域名，更新描述和链接
			const url = `https://${domain}/my/settings/extensions`;
			const descEl = this.apiKeySetting.descEl;
			
			// 清空现有描述
			descEl.empty();
			
			// 添加新的描述文本和链接
			descEl.appendChild(
				createSpan({text: 'You can create a key in the '})
			);
			
			descEl.appendChild(
				createEl('a', {
					text: 'Extension Settings',
					href: url,
					attr: {
						target: '_blank',
						rel: 'noopener'
					}
				})
			);
			
			descEl.appendChild(
				createSpan({text: ' of Cubox web app.'})
			);
			
			// 启用输入框
			textComponent.inputEl.disabled = false;
		}
	}

	// 获取文件夹过滤器按钮文本
	private getFolderFilterButtonText(): string {
		const count = this.plugin.settings.folderFilter.length;
		if (count === 0) {
			return 'Manage';
		} else {
			return `已选择 ${count} 个文件夹`;
		}
	}

	// 修改获取类型过滤器按钮文本的方法
	private getTypeFilterButtonText(): string {
		const typeFilters = this.plugin.settings.typeFilter;
		if (!typeFilters || typeFilters.length === 0) {
			return 'Manage';
		} else {
			// 将类型ID转换为可读名称
			const typeMap: {[key: string]: string} = {
				'article': 'Article',
				'snippet': 'Snippet',
				'memo': 'Memo',
				'image': 'Image',
				'audio': 'Audio',
				'video': 'Video',
				'file': 'File'
			};
			
			// 如果选择了所有类型，显示"All Types"
			if (typeFilters.length === Object.keys(typeMap).length) {
				return 'All Types';
			}
			
			// 否则显示选择的类型数量
			return `已选择 ${typeFilters.length} 个类型`;
		}
	}

	private getStatusFilterButtonText(): string {
		const statusFilters = this.plugin.settings.statusFilter;
		if (!statusFilters || statusFilters.length === 0 || 
			(statusFilters.length === 1 && statusFilters[0] === 'all')) {
			return 'All Items';
		} else {
			return `已选择 ${statusFilters.length} 个状态`;
		}
	}

	private getTagFilterButtonText(): string {
		if (!this.plugin.settings.tagsFilter || this.plugin.settings.tagsFilter.length === 0) {
			return 'All Tags';
		} else if (this.plugin.settings.tagsFilter.includes('')) {
			return 'No Tags';
		} else {
			return `${this.plugin.settings.tagsFilter.length} Tags Selected`;
		}
	}
}

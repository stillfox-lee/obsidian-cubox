import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type CuboxSyncPlugin from './main';
import { FRONT_MATTER_VARIABLES } from './templateProcessor';
import { ALL_FOLDERS_ID, FolderSelectModal } from './modal/folderSelectModal';
import { filenameTemplateInstructions, metadataVariablesInstructions, contentTemplateInstructions, cuboxDateFormat } from './templateInstructions';
import { ALL_CONTENT_TYPES, TypeSelectModal } from './modal/typeSelectModal';
import { ALL_STATUS_ID, StatusSelectModal } from './modal/statusSelectModal';
import { ALL_ITEMS, TagSelectModal } from './modal/tagSelectModal';

export const DEFAULT_CONTENT_TEMPLATE = `# {{{title}}}

{{{description}}}

[Read in Cubox]({{{cubox_url}}})  
[Read Original]({{{url}}})  

---

{{#highlights.length}}
## Annotations  

{{#highlights}}
> {{{text}}}  

{{#note}}
{{{note}}}
{{/note}}
[Link️]({{{cubox_url}}})  

{{/highlights}}
{{/highlights.length}}`

export interface CuboxSyncSettings {
	domain: string; 
	apiKey: string;
	folderFilter: string[];
	typeFilter: string[];
	statusFilter: string[];
	isRead: boolean;
	isStarred: boolean;
	isAnnotated: boolean;
	tagsFilter: string[]; 
	syncFrequency: number;
	targetFolder: string;
	filenameTemplate: string;
	frontMatterVariables: string[];
	contentTemplate: string;
	highlightInContent: boolean;
	dateFormat: string;
	lastSyncTime: number;
	lastSyncCardId: string | null;
	lastCardUpdateTime: string | null;
	syncing: boolean;
}

export const DEFAULT_SETTINGS: CuboxSyncSettings = {
	domain: '', 
	apiKey: '',
	folderFilter: [ALL_FOLDERS_ID],
	typeFilter: ALL_CONTENT_TYPES,
	statusFilter: [ALL_STATUS_ID],
	isRead: true,
	isStarred: true,
	isAnnotated: true,
	tagsFilter: [ALL_ITEMS],
	syncFrequency: 30, // 分钟
	targetFolder: 'Cubox',
	filenameTemplate: '{{title}}-{{create_time}}',
	frontMatterVariables: ['id', 'cubox_url', 'url', 'tags'],
	contentTemplate: DEFAULT_CONTENT_TEMPLATE,
	highlightInContent: true,
	dateFormat: 'yyyy-MM-dd',
	lastSyncTime: 0,
	lastSyncCardId: null,
	lastCardUpdateTime: null,
	syncing: false,
}

export class CuboxSyncSettingTab extends PluginSettingTab {
	plugin: CuboxSyncPlugin;
	apiKeySetting: Setting; 

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

					// 更新 Cubox API 配置
					this.plugin.updateCuboxApiConfig(value, this.plugin.settings.apiKey);
				}));

		// 添加 API Key 设置
		this.apiKeySetting = new Setting(containerEl)
			.setName('Your Cubox API Key')
			.setDesc('Please select a region first')
			.addText(text => {
				text.setPlaceholder('Enter your API key')
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						// 处理用户可能粘贴了完整URL的情况
						let apiKey = value.trim();
        
						// 检查是否是URL格式
						if (apiKey.includes('://')) {
							try {
								// 尝试解析URL或路径
								const url = apiKey.includes('://') ? new URL(apiKey) : null;
								
								// 如果是URL，获取路径的最后一部分
								if (url) {
									const pathParts = url.pathname.split('/').filter(part => part.length > 0);
									if (pathParts.length > 0) {
										apiKey = pathParts[pathParts.length - 1];
									}
								}
								
								// 更新输入框显示提取的API key
								text.setValue(apiKey);
							} catch (e) {
								new Notice('Invalid API key');
							}
						}

						this.plugin.settings.apiKey = apiKey;
						await this.plugin.saveSettings();

						// 更新 Cubox API 配置
						this.plugin.updateCuboxApiConfig(this.plugin.settings.domain, apiKey);
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
					if (!this.plugin.settings.apiKey) {
						new Notice('Please enter the API key first');
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
						new Notice('Failed to get Cubox folders');
						// 恢复按钮文本
						button.setButtonText(this.getFolderFilterButtonText());
					}

					button.setButtonText(this.getFolderFilterButtonText());
				}));

		new Setting(containerEl)
			.setName('Tag Filter')	
			.setDesc('Manage Cubox tags to be synced')
			.addButton(button => button
				.setButtonText(this.getTagFilterButtonText())
				.setCta()
				.onClick(async () => {
					if (!this.plugin.settings.apiKey) {
						new Notice('Please enter the API key first');
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
						new Notice('Failed to get Cubox tags');
						// 恢复按钮文本
						button.setButtonText(this.getTagFilterButtonText());
					}

					button.setButtonText(this.getTagFilterButtonText());
				}));

		new Setting(containerEl)
			.setName('Type Filter')
			.setDesc('Manage Cubox content types to be synced')
			.addButton(button => button
				.setButtonText(this.getTypeFilterButtonText())
				.setCta()
				.onClick(async () => {
					if (!this.plugin.settings.apiKey) {
						new Notice('Please enter the API key first');
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
					if (!this.plugin.settings.apiKey) {
						new Notice('Please enter the API key first');
						return;
					}
					
					// 创建状态值对象
					const statusValues = {
						read: this.plugin.settings.isRead,
						starred: this.plugin.settings.isStarred,
						annotated: this.plugin.settings.isAnnotated
					};
					
					// 打开状态选择模态框
					const modal = new StatusSelectModal(
						this.app, 
						this.plugin.settings.statusFilter,
						statusValues,
						async (selectedStatuses, newStatusValues) => {
							this.plugin.settings.statusFilter = selectedStatuses;
							// 更新状态布尔值
							this.plugin.settings.isRead = newStatusValues.read;
							this.plugin.settings.isStarred = newStatusValues.starred;
							this.plugin.settings.isAnnotated = newStatusValues.annotated;
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
			.addText(text => {
				const textField = text
					.setPlaceholder('Enter the interval')
					.setValue(String(this.plugin.settings.syncFrequency))
					.onChange(async (value) => {
						let frequency = parseInt(value)
						if (isNaN(frequency)) {
						  new Notice('Frequency must be a positive integer')
						  return
						}
					    frequency = Math.min(frequency, 9999); // 最大24小时
						this.plugin.settings.syncFrequency = frequency;
						await this.plugin.saveSettings();
						this.plugin.setupAutoSync();
						
						// 将处理后的值回填到输入框
						text.setValue(String(frequency));
					});
				return textField;
			});

		new Setting(containerEl)
			.setName('Folder')
			.setDesc('Select the folder you\'d like to sync to')
			.addText(text => text
				.setPlaceholder('Enter target folder path')
				.setValue(this.plugin.settings.targetFolder)
				.onChange(async (value) => {
					this.plugin.settings.lastSyncCardId = null;
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
					// 刷新显示
					const textComponent = button.buttonEl.parentElement?.parentElement?.querySelector('input');
					if (textComponent) {
						textComponent.value = DEFAULT_SETTINGS.filenameTemplate;
					}
				}));

		// 更新前置元数据模板设置
		const metadataInstructionsFragment = document.createRange().createContextualFragment(metadataVariablesInstructions);

		new Setting(containerEl)
			.setName('Metadata Variables')
			.setDesc(metadataInstructionsFragment)
			.addTextArea(text => text
				.setPlaceholder('Enter front matter variables')
				.setValue(this.plugin.settings.frontMatterVariables.join(','))
				.onChange(async (value) => {
					this.plugin.settings.frontMatterVariables = value
					.split(',')
					.map((v) => v.trim())
					.filter(
					  (v, i, a) =>
						FRONT_MATTER_VARIABLES.includes(v.split('::')[0]) &&
						a.indexOf(v) === i,
					)
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
					this.plugin.settings.frontMatterVariables = DEFAULT_SETTINGS.frontMatterVariables;
					await this.plugin.saveSettings();
					// 刷新显示
					const textArea = button.buttonEl.parentElement?.parentElement?.querySelector('textarea');
					if (textArea) {
						textArea.value = DEFAULT_SETTINGS.frontMatterVariables.join(',');
					}
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
					// 刷新显示
					const textArea = button.buttonEl.parentElement?.parentElement?.querySelector('textarea');
					if (textArea) {
						textArea.value = DEFAULT_SETTINGS.contentTemplate;
					}
				}));

        // 更新日期格式模板设置
        const dateFormatInstructionsFragment = document.createRange().createContextualFragment(cuboxDateFormat);

        new Setting(containerEl)
            .setName('Date Format')
            .setDesc(dateFormatInstructionsFragment)
            .addText(text => text
				.setPlaceholder('Enter date format')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
					this.plugin.updateTemplateProcessorDateFormat(value);
				}));
				
		// 状态部分
		containerEl.createEl('h3', {text: 'Status'});
		containerEl.createEl('p', {text: `Last sync: ${this.plugin.formatLastSyncTime()}`});

	}

	// 更新 API Key 设置的描述和状态
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
			
			textComponent.inputEl.disabled = false;
		}
	}

	private getFolderFilterButtonText(): string {
		const folderFilters = this.plugin.settings.folderFilter;
		if (!folderFilters || folderFilters.length === 0) {
			return 'Manage';
		} else if (folderFilters.includes(ALL_FOLDERS_ID)) {
			return 'All Folders';
		} else {
			return `${folderFilters.length} selected`;
		}
	}

	private getTypeFilterButtonText(): string {
		const typeFilters = this.plugin.settings.typeFilter;
		if (!typeFilters || typeFilters.length === 0) {
			return 'Manage';
		} else if (typeFilters.length === ALL_CONTENT_TYPES.length) {
			return 'All Types';
		} else {
			return `${typeFilters.length} selected`;
		}
	}

	private getStatusFilterButtonText(): string {
		const statusFilters = this.plugin.settings.statusFilter;
		if (!statusFilters || statusFilters.length === 0) {
			return 'Manage';
		} else if (statusFilters.includes('all')) {
			return 'All Items';
		} else {
			return `${statusFilters.length} selected`;
		}
	}

	private getTagFilterButtonText(): string {
		const tagFilters = this.plugin.settings.tagsFilter;
		if (!tagFilters || tagFilters.length === 0) {
			return 'Manage';
		} else if (tagFilters.includes(ALL_ITEMS)) {
			return 'All Items';
		} else if (tagFilters.includes('')) {
			return 'No Tags';
		} else {
			return `${tagFilters.length} selected`;
		}
	}
}
import { addIcon, Notice, Plugin, TFile } from 'obsidian';
import { CuboxApi } from './cuboxApi';
import { TemplateProcessor } from './templateProcessor';
import { formatDateTime } from './utils';
import { CuboxSyncSettingTab, CuboxSyncSettings, DEFAULT_SETTINGS } from './cuboxSetting';


export default class CuboxSyncPlugin extends Plugin {
	settings: CuboxSyncSettings;
	cuboxApi: CuboxApi;
	templateProcessor: TemplateProcessor;
	syncIntervalId: number;

	async onload() {
		await this.loadSettings();
		
		// 初始化 API 和模板处理器
		this.cuboxApi = new CuboxApi(this.settings.domain, this.settings.apiKey);
		this.templateProcessor = new TemplateProcessor();
		this.templateProcessor.setDateFormat(this.settings.dateFormat);

		// 添加左侧图标
		const iconId = 'Cubox'
		addIcon(iconId, '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_812_101)"><path d="M20.0858 18.3243C19.9877 24.0475 16.415 23.8861 11.8868 23.8861C7.35861 23.8861 5.01758 22.9138 5.01758 17.9719C5.01758 12.8223 7.35861 9 11.8868 9C16.415 9 20.0858 13.1746 20.0858 18.3243Z" stroke="currentColor" stroke-width="2"/><rect x="2" y="2" width="20" height="20" rx="10" stroke="currentColor" stroke-width="2"/></g><ellipse cx="9" cy="15.15" rx="1" ry="1.15" fill="currentColor"/><ellipse cx="12" cy="15.15" rx="1" ry="1.15" fill="currentColor"/><defs> <clipPath id="clip0_812_101"><rect x="1" y="1" width="22" height="22" rx="11" fill="white"/></clipPath></defs></svg>');

		const ribbonIconEl = this.addRibbonIcon(iconId, iconId, async (evt: MouseEvent) => {
			new Notice('Syncing your Cubox…');
			await this.syncCubox();
		});
		ribbonIconEl.addClass('cubox-sync-ribbon-class');

		// 添加同步命令
		this.addCommand({
			id: 'sync-cubox-data',
			name: 'Sync now',
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
		await this.saveData(this.settings);
	}

	async setupAutoSync() {
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
			this.registerInterval(this.syncIntervalId);
		}
	}

	async syncCubox() {
		if (this.settings.syncing) {
			new Notice('Sync is in progress, please wait.');
			return;
		}
		
		try {
			// 设置同步状态为进行中
			this.settings.syncing = true;
			await this.saveSettings();
						
			await this.ensureTargetFolder();
			
			let lastCardId: string | null = this.settings.lastSyncCardId;
			let lastCardUpdateTime: string | null = this.settings.lastCardUpdateTime;
			let hasMore = true;
			let syncCount = 0;
			let errorCount = 0;
			let skipCount = 0;

			// 分页获取所有文章
			while (hasMore) {
				const result = await this.cuboxApi.getArticles(
					{
						lastCardId: lastCardId,
						lastCardUpdateTime: lastCardUpdateTime,
						folderFilter: this.settings.folderFilter,
						typeFilter: this.settings.typeFilter,
						statusFilter: this.settings.statusFilter,
						tagsFilter: this.settings.tagsFilter,
						isRead: this.settings.isRead,
						isStarred: this.settings.isStarred,
						isAnnotated: this.settings.isAnnotated,
					}
				);
				
				const { articles, hasMore: moreArticles} = result;
				
				if (articles.length === 0) {
					break;
				}
				
				// 处理每篇文章
				for (const article of articles) {
					try {
						// 获取文章内容
						const content = await this.cuboxApi.getArticleDetail(article.id);
						if (content === null) continue;
						
						// 合并文章基本信息、内容和高亮
						const fullArticle = {
							...article,
							content: content
						};
						
						// 处理文件名和内容
						const filename = this.templateProcessor.processFilenameTemplate(
							this.settings.filenameTemplate, 
							fullArticle
						);

						const filePath = `${this.settings.targetFolder}/${filename}.md`;
						
						// 检查相同 id 收藏是否存在
						const file = this.app.vault.getAbstractFileByPath(filePath);
						if (file instanceof TFile) {
							let foundMatchingId = false
							await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
								if (frontmatter.id && frontmatter.id === article.id) {
									foundMatchingId = true;
								}
							});

							if (foundMatchingId) {
								skipCount++;
								continue;
							}
						}
									
						const frontMatter = this.templateProcessor.processFrontMatter(
							this.settings.frontMatterVariables,
							fullArticle
						);
						
						const contentTemplate = this.templateProcessor.processContentTemplate(
							this.settings.contentTemplate,
							fullArticle
						);
						
						// 组合最终内容
						let finalContent = '';
						if (frontMatter.length > 0) {
							finalContent = `---\n${frontMatter}\n---\n`;
						}
						finalContent += contentTemplate;
						
						await this.app.vault.adapter.write(filePath, finalContent);
						
						syncCount++;
					
					} catch (error) {
						errorCount++;
						console.error('同步 Cubox 数据失败:', error);
					}
				}
				
				hasMore = moreArticles;

				if (articles.length > 0) {
					lastCardId = articles[articles.length - 1].id;
				    lastCardUpdateTime = articles[articles.length - 1].update_time;
					
					this.settings.lastSyncCardId = lastCardId;
					this.settings.lastCardUpdateTime = lastCardUpdateTime;
					await this.saveSettings();			
				}
			}
			
			this.settings.lastSyncTime = Date.now();
			this.settings.syncing = false;
			await this.saveSettings();
			
			const message = `Cubox sync completed: ${syncCount} new items${skipCount > 0 ? `, ${skipCount} skipped` : ''}${errorCount > 0 ? `, ${errorCount} errors` : ''}`;
			new Notice(message);
		} catch (error) {
			console.error('同步 Cubox 数据失败:', error);
			new Notice('Cubox sync failed. Please check settings or network.');
		} finally {
			this.settings.syncing = false;
			await this.saveSettings();
		}
	}

	async ensureTargetFolder() {
		const folderPath = this.settings.targetFolder;
		if (!(await this.app.vault.adapter.exists(folderPath))) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	formatLastSyncTime(): string {
		if (!this.settings.lastSyncTime) {
			return 'Never';
		}
		
		return formatDateTime(new Date(this.settings.lastSyncTime).toISOString(), 'yyyy-MM-dd HH:mm');
	}

	updateCuboxApiConfig(domain: string, apiKey: string) {
		this.cuboxApi.updateConfig(domain, apiKey);
	}

	updateTemplateProcessorDateFormat(dateFormat: string) {
		this.templateProcessor.setDateFormat(dateFormat);
	}
}



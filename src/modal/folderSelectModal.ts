import { App, Modal, Setting, Notice } from 'obsidian';
import { CuboxApi, CuboxFolder } from '../cuboxApi';

export class FolderSelectModal extends Modal {
    private cuboxApi: CuboxApi;
    private selectedFolders: string[];
    private onConfirm: (selectedFolders: string[]) => void;
    private folders: CuboxFolder[] = [];
    private loading: boolean = true;

    constructor(
        app: App, 
        cuboxApi: CuboxApi, 
        initialSelectedFolders: string[],
        onConfirm: (selectedFolders: string[]) => void
    ) {
        super(app);
        this.cuboxApi = cuboxApi;
        this.selectedFolders = [...initialSelectedFolders];
        this.onConfirm = onConfirm;
    }

    async onOpen() {
        const { contentEl } = this;
        
        // 设置标题
        contentEl.createEl('h2', { text: '选择要同步的文件夹' });
        
        // 添加说明
        contentEl.createEl('p', { 
            text: '选择要从 Cubox 同步的文件夹。不选择任何文件夹将同步所有内容。' 
        });
        
        // 添加加载指示器
        const loadingEl = contentEl.createEl('div', { text: '正在加载文件夹...' });
        
        try {
            // 获取文件夹列表
            this.folders = await this.cuboxApi.getFolders();
            this.loading = false;
            
            // 移除加载指示器
            loadingEl.remove();
            
            // 创建文件夹列表
            const folderListEl = contentEl.createEl('div', { cls: 'folder-list' });
            
            // 添加"全部"选项
            new Setting(folderListEl)
                .setName('全部文件夹')
                .setDesc('同步所有文件夹的内容')
                .addToggle(toggle => toggle
                    .setValue(this.selectedFolders.length === 0)
                    .onChange(value => {
                        if (value) {
                            // 如果选择"全部"，清空已选文件夹
                            this.selectedFolders = [];
                            // 更新所有其他切换按钮
                            folderListEl.querySelectorAll('.folder-toggle').forEach((el: HTMLElement) => {
                                if (el.hasClass('is-enabled')) {
                                    // @ts-ignore
                                    el.click();
                                }
                            });
                        }
                    })
                );
            
            // 添加每个文件夹的选项
            this.folders.forEach(folder => {
                new Setting(folderListEl)
                    .setName(folder.nested_name)
                    .addToggle(toggle => {
                        toggle
                            .setValue(this.selectedFolders.includes(folder.id))
                            .onChange(value => {
                                if (value) {
                                    // 添加到选中列表
                                    this.selectedFolders.push(folder.id);
                                    // 如果有选择具体文件夹，取消"全部"选项
                                    const allToggle = folderListEl.querySelector('.setting:first-child .toggle');
                                    if (allToggle && allToggle.hasClass('is-enabled')) {
                                        // @ts-ignore
                                        allToggle.click();
                                    }
                                } else {
                                    // 从选中列表移除
                                    this.selectedFolders = this.selectedFolders.filter(id => id !== folder.id);
                                }
                            });
                        
                        // 添加类名以便于选择
                        toggle.toggleEl.addClass('folder-toggle');
                        
                        return toggle;
                    });
            });
            
            // 添加确认和取消按钮
            const buttonContainer = contentEl.createEl('div', { cls: 'button-container' });
            
            buttonContainer.createEl('button', { text: '取消' })
                .addEventListener('click', () => {
                    this.close();
                });
            
            buttonContainer.createEl('button', { text: '确认', cls: 'mod-cta' })
                .addEventListener('click', () => {
                    this.onConfirm(this.selectedFolders);
                    this.close();
                });
            
        } catch (error) {
            console.error('获取文件夹列表失败:', error);
            loadingEl.setText('获取文件夹列表失败，请检查网络连接');
            
            // 添加重试按钮
            contentEl.createEl('button', { text: '重试' })
                .addEventListener('click', () => {
                    this.close();
                    new FolderSelectModal(this.app, this.cuboxApi, this.selectedFolders, this.onConfirm).open();
                });
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 
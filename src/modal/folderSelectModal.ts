import { App, Modal, Setting, Notice } from 'obsidian';
import { CuboxApi, CuboxFolder } from '../cuboxApi';

// 定义一个虚拟的 ALL 文件夹 ID
const ALL_FOLDERS_ID = 'all_folders';

export class FolderSelectModal extends Modal {
    private selectedFolders: string[];
    private onConfirm: (selectedFolders: string[]) => void;
    private folders: CuboxFolder[] = [];
    private cuboxApi: CuboxApi;

    constructor(
        app: App, 
        folders: CuboxFolder[], 
        initialSelectedFolders: string[],
        onConfirm: (selectedFolders: string[]) => void
    ) {
        super(app);
        this.folders = folders;
        this.selectedFolders = [...initialSelectedFolders];
        this.onConfirm = onConfirm;
    }

    async onOpen() {
        const { contentEl } = this;
        
        // 设置标题
        contentEl.createEl('h2', { text: 'Manage Cubox folders to be synced' });
        
        // 创建文件夹列表
        const folderListEl = contentEl.createEl('div', { cls: 'folder-list' });
        
        // 添加"All Items"选项
        const allFoldersSetting = new Setting(folderListEl)
            .setName('All Items')
            .addToggle(toggle => {
                // 初始化状态：如果selectedFolders为空或包含ALL_FOLDERS_ID，则选中
                const isAllSelected = this.selectedFolders.length === 0 || 
                                     this.selectedFolders.includes(ALL_FOLDERS_ID);
                
                toggle
                    .setValue(isAllSelected)
                    .onChange(value => {
                        if (value) {
                            // 如果选择"All Items"，清空已选文件夹，只保留ALL_FOLDERS_ID
                            this.selectedFolders = [ALL_FOLDERS_ID];
                            
                            // 更新所有其他切换按钮为选中状态
                            this.updateAllFolderToggles(folderListEl, true);
                        } else {
                            // 从选中列表移除ALL_FOLDERS_ID
                            this.selectedFolders = this.selectedFolders.filter(id => id !== ALL_FOLDERS_ID);
                            
                            // 如果没有其他选中的文件夹，默认选中第一个
                            if (this.selectedFolders.length === 0 && this.folders.length > 0) {
                                this.selectedFolders.push(this.folders[0].id);
                                this.updateFolderToggle(folderListEl, this.folders[0].id, true);
                            }
                        }
                    });
                
                // 添加类名以便于选择
                toggle.toggleEl.addClass('all-folders-toggle');
                
                return toggle;
            });
        
        // 添加每个文件夹的选项
        this.folders.forEach(folder => {
            new Setting(folderListEl)
                .setName(folder.nested_name)
                .addToggle(toggle => {
                    // 初始化状态：如果selectedFolders为空或包含ALL_FOLDERS_ID，则所有文件夹都选中
                    const isSelected = this.selectedFolders.length === 0 || 
                                      this.selectedFolders.includes(ALL_FOLDERS_ID) || 
                                      this.selectedFolders.includes(folder.id);
                    
                    toggle
                        .setValue(isSelected)
                        .onChange(value => {
                            if (value) {
                                // 添加到选中列表
                                if (!this.selectedFolders.includes(folder.id)) {
                                    this.selectedFolders.push(folder.id);
                                }
                                
                                // 检查是否所有文件夹都被选中，如果是，自动选中"All Items"
                                if (this.areAllFoldersSelected()) {
                                    if (!this.selectedFolders.includes(ALL_FOLDERS_ID)) {
                                        this.selectedFolders.push(ALL_FOLDERS_ID);
                                    }
                                    this.updateAllFoldersToggle(folderListEl, true);
                                }
                            } else {
                                // 从选中列表移除
                                this.selectedFolders = this.selectedFolders.filter(id => id !== folder.id);
                                
                                // 如果取消选中任何文件夹，取消"All Items"选项
                                if (this.selectedFolders.includes(ALL_FOLDERS_ID)) {
                                    this.selectedFolders = this.selectedFolders.filter(id => id !== ALL_FOLDERS_ID);
                                    this.updateAllFoldersToggle(folderListEl, false);
                                }
                                
                                // 如果没有选中的文件夹，默认选中"All Items"
                                if (this.selectedFolders.length === 0) {
                                    this.selectedFolders.push(ALL_FOLDERS_ID);
                                    this.updateAllFoldersToggle(folderListEl, true);
                                    this.updateAllFolderToggles(folderListEl, true);
                                }
                            }
                        });
                    
                    // 添加类名以便于选择
                    toggle.toggleEl.addClass('folder-toggle');
                    toggle.toggleEl.setAttribute('data-folder-id', folder.id);
                    
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
                // 如果选中了ALL_FOLDERS_ID，则传递空数组表示同步所有内容
                const resultFolders = this.selectedFolders.includes(ALL_FOLDERS_ID) 
                    ? [] 
                    : this.selectedFolders;
                
                this.onConfirm(resultFolders);
                this.close();
            });
    }

    // 检查是否所有文件夹都被选中
    private areAllFoldersSelected(): boolean {
        // 如果没有文件夹，返回false
        if (this.folders.length === 0) return false;
        
        // 检查每个文件夹是否都在selectedFolders中
        return this.folders.every(folder => this.selectedFolders.includes(folder.id));
    }
    
    // 更新"All Items"切换按钮的状态
    private updateAllFoldersToggle(containerEl: HTMLElement, value: boolean): void {
        const allToggle = containerEl.querySelector('.all-folders-toggle') as HTMLElement;
        if (allToggle) {
            const isEnabled = allToggle.hasClass('is-enabled');
            if (value && !isEnabled) {
                // @ts-ignore
                allToggle.click();
            } else if (!value && isEnabled) {
                // @ts-ignore
                allToggle.click();
            }
        }
    }
    
    // 更新所有文件夹切换按钮的状态
    private updateAllFolderToggles(containerEl: HTMLElement, value: boolean): void {
        containerEl.querySelectorAll('.folder-toggle').forEach((el: HTMLElement) => {
            const isEnabled = el.hasClass('is-enabled');
            if (value && !isEnabled) {
                // @ts-ignore
                el.click();
            } else if (!value && isEnabled) {
                // @ts-ignore
                el.click();
            }
        });
    }
    
    // 更新特定文件夹切换按钮的状态
    private updateFolderToggle(containerEl: HTMLElement, folderId: string, value: boolean): void {
        const folderToggle = containerEl.querySelector(`.folder-toggle[data-folder-id="${folderId}"]`) as HTMLElement;
        if (folderToggle) {
            const isEnabled = folderToggle.hasClass('is-enabled');
            if (value && !isEnabled) {
                // @ts-ignore
                folderToggle.click();
            } else if (!value && isEnabled) {
                // @ts-ignore
                folderToggle.click();
            }
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 
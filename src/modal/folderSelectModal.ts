import { App, Modal, Setting, Notice } from 'obsidian';
import { CuboxFolder } from '../cuboxApi';

export const ALL_FOLDERS_ID = 'all_folders';

export class FolderSelectModal extends Modal {
    private selectedFolders: Set<string> = new Set();
    private onConfirm: (selectedFolders: string[]) => void;
    private folders: CuboxFolder[] = [];
    private listEl: HTMLElement;
    private footerEl: HTMLElement;

    constructor(
        app: App, 
        folders: CuboxFolder[], 
        initialSelectedFolders: string[],
        onConfirm: (selectedFolders: string[]) => void
    ) {
        super(app);
        this.folders = folders;
        
        // 初始化已选择的文件夹
        if (initialSelectedFolders && initialSelectedFolders.length > 0) {
            initialSelectedFolders.forEach(id => {
                if (id) this.selectedFolders.add(id);
            });
        } else {
            // 如果没有初始选择，默认选中"All Items"
            this.selectedFolders.add(ALL_FOLDERS_ID);
        }
        
        this.onConfirm = onConfirm;
    }

    async onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Manage Cubox folders to be synced' });
        contentEl.addClass('cubox-modal');
        
        this.listEl = contentEl.createDiv({ cls: 'folder-list-container cubox-list-container' });
        this.footerEl = contentEl.createDiv({ cls: 'modal-footer' });
        
        // 创建文件夹列表
        this.createFolderList();
        
        // 添加确认和取消按钮
        const cancelButton = this.footerEl.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
        
        const confirmButton = this.footerEl.createEl('button', { text: 'Done', cls: 'mod-cta' });
        confirmButton.addEventListener('click', () => {
            // 检查是否至少选择了一个选项
            if (this.selectedFolders.size === 0) {
                new Notice('Please select at least one option.');
                return;
            }
            
            // 如果选中了ALL_FOLDERS_ID，则传递空数组表示同步所有内容
            const resultFolders = this.selectedFolders.has(ALL_FOLDERS_ID) 
                ? [ALL_FOLDERS_ID] 
                : Array.from(this.selectedFolders);
            
            this.onConfirm(resultFolders);
            this.close();
        });
    }

    private createFolderList() {
        this.listEl.empty();
        
        const allItemsSetting = new Setting(this.listEl)
            .setName('All items');
            
        if (this.selectedFolders.has(ALL_FOLDERS_ID)) {
            allItemsSetting.settingEl.addClass('is-selected');
        }
        
        allItemsSetting.settingEl.addEventListener('click', () => {
            const isCurrentlySelected = this.selectedFolders.has(ALL_FOLDERS_ID);
            this.handleFolderToggle(ALL_FOLDERS_ID, !isCurrentlySelected);
            this.redraw();
        });
        
        // 添加每个文件夹的选项
        this.folders.forEach(folder => {
            const folderSetting = new Setting(this.listEl)
                .setName(folder.nested_name);
                
            // 如果"All Items"被选中，禁用其他选项
            if (this.selectedFolders.has(ALL_FOLDERS_ID)) {
                folderSetting.settingEl.addClass('is-disabled');
            } else {
                // 添加选中状态的类
                if (this.selectedFolders.has(folder.id)) {
                    folderSetting.settingEl.addClass('is-selected');
                }
                
                // 添加点击事件
                folderSetting.settingEl.addEventListener('click', () => {
                    const isCurrentlySelected = this.selectedFolders.has(folder.id);
                    this.handleFolderToggle(folder.id, !isCurrentlySelected);
                    this.redraw();
                });
            }

        });
    }
    
    private isFolderSelected(folderId: string): boolean {
        return this.selectedFolders.has(folderId);
    }

    private handleFolderToggle(folderId: string, isSelected: boolean) {
        if (folderId === ALL_FOLDERS_ID) {
            if (isSelected) {
                // 如果选择了"All Items"，清除其他所有选择，只保留ALL_FOLDERS_ID
                this.selectedFolders.clear();
                this.selectedFolders.add(ALL_FOLDERS_ID);
            } else {
                this.selectedFolders.delete(ALL_FOLDERS_ID);
            }
        } else {
            if (isSelected) {
                // 如果选择了特定文件夹，移除"All Items"
                this.selectedFolders.delete(ALL_FOLDERS_ID);
                this.selectedFolders.add(folderId);
            } else {
                this.selectedFolders.delete(folderId);
            }
        }
    }
    
    private redraw() {
        this.createFolderList();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 
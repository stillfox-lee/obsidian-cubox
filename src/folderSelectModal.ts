import { App, Modal, Setting } from 'obsidian';
import { CuboxApi } from './cuboxApi';

export interface CuboxFolder {
    id: string;
    name: string;
}

export class FolderSelectModal extends Modal {
    private folders: CuboxFolder[] = [];
    private selectedFolders: Set<string> = new Set();
    private onSave: (selectedFolders: string[]) => void;
    private cuboxApi: CuboxApi;

    constructor(app: App, cuboxApi: CuboxApi, initialSelected: string[], onSave: (selectedFolders: string[]) => void) {
        super(app);
        this.cuboxApi = cuboxApi;
        this.onSave = onSave;
        
        // 初始化已选择的文件夹
        initialSelected.forEach(id => {
            if (id) this.selectedFolders.add(id);
        });
    }

    async onOpen() {
        const { contentEl } = this;
        
        // 设置标题
        contentEl.createEl('h2', { text: 'Cubox: 管理要同步的文件夹' });
        
        try {
            // 显示加载中提示
            const loadingEl = contentEl.createEl('p', { text: '加载文件夹列表...' });
            
            // 获取文件夹列表
            this.folders = await this.cuboxApi.getFolders();
            
            // 移除加载提示
            loadingEl.remove();
            
            // 如果没有文件夹，显示提示
            if (this.folders.length === 0) {
                contentEl.createEl('p', { text: '没有找到文件夹' });
                return;
            }
            
            // 添加"全选"选项
            new Setting(contentEl)
                .addToggle(toggle => toggle
                    .setValue(this.isAllSelected())
                    .onChange(value => {
                        if (value) {
                            // 全选
                            this.folders.forEach(folder => this.selectedFolders.add(folder.id));
                        } else {
                            // 全不选
                            this.selectedFolders.clear();
                        }
                        // 刷新界面
                        this.redraw();
                    }))
                .setName('全部文件夹');
            
            // 创建文件夹列表
            this.createFolderList();
            
            // 添加底部按钮
            const footerEl = contentEl.createDiv('modal-footer');
            
            // 取消按钮
            const cancelButton = footerEl.createEl('button', { text: '取消' });
            cancelButton.addEventListener('click', () => {
                this.close();
            });
            
            // 保存按钮
            const saveButton = footerEl.createEl('button', { text: '保存', cls: 'mod-cta' });
            saveButton.addEventListener('click', () => {
                this.onSave(Array.from(this.selectedFolders));
                this.close();
            });
        } catch (error) {
            console.error('加载文件夹失败:', error);
            contentEl.createEl('p', { text: '加载文件夹失败，请检查网络连接和 API 密钥' });
        }
    }

    private createFolderList() {
        const { contentEl } = this;
        
        // 清除现有列表
        const existingList = contentEl.querySelector('.folder-list');
        if (existingList) existingList.remove();
        
        // 创建新列表容器
        const listEl = contentEl.createDiv({ cls: 'folder-list' });
        
        // 添加每个文件夹的选项
        this.folders.forEach(folder => {
            new Setting(listEl)
                .addToggle(toggle => toggle
                    .setValue(this.selectedFolders.has(folder.id))
                    .onChange(value => {
                        if (value) {
                            this.selectedFolders.add(folder.id);
                        } else {
                            this.selectedFolders.delete(folder.id);
                        }
                    }))
                .setName(folder.name);
        });
    }

    private isAllSelected(): boolean {
        return this.folders.length > 0 && this.folders.every(folder => this.selectedFolders.has(folder.id));
    }

    private redraw() {
        this.createFolderList();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 
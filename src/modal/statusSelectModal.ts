import { App, Modal, Setting, Notice } from 'obsidian';
import { ModalStyleManager } from '../utils/modalStyles';

export interface ContentStatus {
    id: string;
    name: string;
}

export class StatusSelectModal extends Modal {
    private statuses: ContentStatus[] = [
        { id: 'all', name: 'All Items' },
        { id: 'read', name: 'Already Read Items' },
        { id: 'starred', name: 'Starred Items' },
        { id: 'archived', name: 'Archived Items' },
        { id: 'annotated', name: 'Annotated Items' }
    ];
    private selectedStatuses: Set<string> = new Set();
    private onSave: (selectedStatuses: string[]) => void;
    private allItemsId: string = 'all';
    private listEl: HTMLElement;
    private footerEl: HTMLElement;

    constructor(app: App, initialSelected: string[], onSave: (selectedStatuses: string[]) => void) {
        super(app);
        this.onSave = onSave;
        
        // 初始化已选择的状态
        if (initialSelected && initialSelected.length > 0) {
            initialSelected.forEach(id => {
                if (id) this.selectedStatuses.add(id);
            });
        } else {
            // 如果没有初始选择，默认选中"All Items"
            this.selectedStatuses.add(this.allItemsId);
        }
    }

    async onOpen() {
        const { contentEl } = this;
        
        // 设置标题和样式
        contentEl.createEl('h2', { text: 'Manage Cubox content status to be synced' });
        contentEl.addClass('cubox-status-select-modal');
        
        // 创建固定的容器结构
        this.listEl = contentEl.createDiv({ cls: 'status-list-container' });
        this.footerEl = contentEl.createDiv({ cls: 'modal-footer' });
        
        // 创建状态列表
        this.createStatusList();
        
        // 添加底部按钮
        // 取消按钮
        const cancelButton = this.footerEl.createEl('button', { text: '取消' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
        
        // 保存按钮
        const saveButton = this.footerEl.createEl('button', { text: '保存', cls: 'mod-cta' });
        saveButton.addEventListener('click', () => {
            // 返回选中的状态
            const selectedIds = Array.from(this.selectedStatuses);
            this.onSave(selectedIds);
            this.close();
        });
        
        // 添加样式以固定底部按钮
        this.addStyles();
    }

    private addStyles() {
        // 使用通用样式管理器添加样式
        ModalStyleManager.addModalStyles(
            'cubox-status-modal-styles',
            'cubox-status-select-modal',
            'status-list-container'
        );
    }

    private createStatusList() {
        // 清除现有列表
        this.listEl.empty();
        
        // 添加每个状态的选项
        this.statuses.forEach(status => {
            new Setting(this.listEl)
                .addToggle(toggle => toggle
                    .setValue(this.selectedStatuses.has(status.id))
                    .onChange(value => {
                        this.handleStatusToggle(status.id, value);
                        this.redraw();
                    }))
                .setName(status.name);
        });
    }

    private handleStatusToggle(statusId: string, isSelected: boolean) {
        if (statusId === this.allItemsId) {
            if (isSelected) {
                // 如果选择了"All Items"，清除其他所有选择
                this.selectedStatuses.clear();
                this.selectedStatuses.add(this.allItemsId);
            } else {
                // 如果取消了"All Items"且没有其他选择，重新选中"All Items"
                if (this.selectedStatuses.size <= 1) {
                    this.selectedStatuses.clear();
                    this.selectedStatuses.add(this.allItemsId);
                }
            }
        } else {
            if (isSelected) {
                // 如果选择了其他选项，移除"All Items"
                this.selectedStatuses.delete(this.allItemsId);
                // 添加新选择的状态
                this.selectedStatuses.add(statusId);
            } else {
                // 移除取消选择的状态
                this.selectedStatuses.delete(statusId);
                // 如果没有任何选择，默认选中"All Items"
                if (this.selectedStatuses.size === 0) {
                    this.selectedStatuses.add(this.allItemsId);
                }
            }
        }
    }

    private redraw() {
        this.createStatusList();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        
        // 使用通用样式管理器移除样式
        ModalStyleManager.removeModalStyles('cubox-status-modal-styles');
    }
} 
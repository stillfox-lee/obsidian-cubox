import { App, Modal, Setting, Notice } from 'obsidian';

export interface ContentStatus {
    id: string;
    name: string;
    value?: boolean;
}

export const ALL_STATUS_ID = 'all';

export class StatusSelectModal extends Modal {
    private statuses: ContentStatus[] = [
        { id: 'all', name: 'All Items' },
        { id: 'read', name: 'Already read items only', value: true },
        { id: 'starred', name: 'Starred items only', value: true },
        { id: 'annotated', name: 'Annotated items only', value: true }
    ];
    private selectedStatuses: Set<string> = new Set();
    private statusValues: Map<string, boolean> = new Map();
    private onSave: (selectedStatuses: string[], statusValues: {[key: string]: boolean}) => void;
    private listEl: HTMLElement;
    private footerEl: HTMLElement;

    constructor(app: App, initialSelected: string[], initialValues: {[key: string]: boolean} = {}, 
                onSave: (selectedStatuses: string[], statusValues: {[key: string]: boolean}) => void) {
        super(app);
        this.onSave = onSave;
        
        // 初始化状态值
        this.statuses.forEach(status => {
            if (status.id !== 'all') {
                // 如果有初始值，使用初始值，否则使用默认值
                const value = initialValues[status.id] !== undefined ? initialValues[status.id] : (status.value || true);
                this.statusValues.set(status.id, value);
            }
        });
        
        // 初始化已选择的状态
        if (initialSelected && initialSelected.length > 0) {
            initialSelected.forEach(id => {
                if (id) this.selectedStatuses.add(id);
            });
        } else {
            this.selectedStatuses.add(ALL_STATUS_ID);
        }
    }

    async onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Manage Cubox content status to be synced' });
        contentEl.addClass('cubox-modal');
        
        this.listEl = contentEl.createDiv({ cls: 'status-list-container cubox-list-container' });
        this.footerEl = contentEl.createDiv({ cls: 'modal-footer' });
        
        // 创建状态列表
        this.createStatusList();
        
        // 添加底部按钮
        const cancelButton = this.footerEl.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
        
        const saveButton = this.footerEl.createEl('button', { text: 'Done', cls: 'mod-cta' });
        saveButton.addEventListener('click', () => {
            // 检查是否至少选择了一个选项
            if (this.selectedStatuses.size === 0) {
                new Notice('Please select at least one option.');
                return;
            }
            
            // 返回选中的状态和状态值
            const selectedIds = Array.from(this.selectedStatuses);
            const statusValues: {[key: string]: boolean} = {};
            this.statusValues.forEach((value, key) => {
                statusValues[key] = value;
            });
            this.onSave(selectedIds, statusValues);
            this.close();
        });
    }

    private createStatusList() {
        this.listEl.empty();
        
        // 添加每个状态的选项
        this.statuses.forEach(status => {
            const statusSetting = new Setting(this.listEl)
                .setName(status.name);
                
            // 如果是"All Items"选项
            if (status.id === ALL_STATUS_ID) {
                // 添加选中状态的类
                if (this.selectedStatuses.has(status.id)) {
                    statusSetting.settingEl.addClass('is-selected');
                }
                
                statusSetting.settingEl.addEventListener('click', () => {
                    const isCurrentlySelected = this.selectedStatuses.has(status.id);
                    this.handleStatusToggle(status.id, !isCurrentlySelected);
                    this.redraw();
                });
            } else {
                // 如果"All Items"被选中，禁用其他选项
                if (this.selectedStatuses.has(ALL_STATUS_ID)) {
                    statusSetting.settingEl.addClass('is-disabled');
                } else {
                    if (this.selectedStatuses.has(status.id)) {
                        statusSetting.settingEl.addClass('is-selected');
                    }
                    
                    statusSetting.settingEl.addEventListener('click', () => {
                        const isCurrentlySelected = this.selectedStatuses.has(status.id);
                        this.handleStatusToggle(status.id, !isCurrentlySelected);
                        this.redraw();
                    });
                }
            }
        });
    }

    private handleStatusToggle(statusId: string, isSelected: boolean) {
        if (statusId === ALL_STATUS_ID) {
            if (isSelected) {
                // 如果选择了"All Items"，清除其他所有选择
                this.selectedStatuses.clear();
                this.selectedStatuses.add(ALL_STATUS_ID);
                
                // 当选择 All 时，所有状态值设为 true
                this.statuses.forEach(status => {
                    if (status.id !== 'all') {
                        this.statusValues.set(status.id, true);
                    }
                });
            } else {
                // 如果取消了"All Items"，清除它
                this.selectedStatuses.delete(ALL_STATUS_ID);
            }
        } else {
            if (isSelected) {
                // 如果选择了其他选项，移除"All Items"
                this.selectedStatuses.delete(ALL_STATUS_ID);
                this.selectedStatuses.add(statusId);
                
                this.statuses.forEach(status => {
                    if (status.id !== 'all') {
                        this.statusValues.set(status.id, status.id === statusId);
                    }
                });
            } else {
                this.selectedStatuses.delete(statusId);
                this.statusValues.set(statusId, false);
            }
        }
    }

    private redraw() {
        this.createStatusList();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 
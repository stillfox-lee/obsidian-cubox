import { App, Modal, Setting, Notice } from 'obsidian';

export const ALL_CONTENT_TYPES = [
    'Article',
    'Snippet',
    'Memo',
    'Image',
    'Audio',
    'Video',
    'File'
];

export class TypeSelectModal extends Modal {
    private onSave: (selectedTypes: string[]) => void;
    private selectedTypes: Set<string> = new Set();
    private listEl: HTMLElement;
    private footerEl: HTMLElement;

    constructor(app: App, initialSelected: string[] = [], onSave: (selectedTypes: string[]) => void) {
        super(app);
        this.onSave = onSave;
        
        // 初始化已选择的类型
        if (initialSelected && initialSelected.length > 0) {
            // 添加初始选择的类型
            initialSelected.forEach(id => {
                if (id) this.selectedTypes.add(id);
            });
        } else {
            // 如果没有初始选择，默认选中所有类型
            ALL_CONTENT_TYPES.forEach(type => {
                this.selectedTypes.add(type);
            });
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        contentEl.createEl('h2', { text: 'Manage Cubox content types to be synced' });
        contentEl.addClass('cubox-modal');
        
        this.listEl = contentEl.createDiv({ cls: 'type-list-container cubox-list-container' });
        this.footerEl = contentEl.createDiv({ cls: 'modal-footer' });
        
        // 创建类型列表
        this.createTypeList();
        
        const cancelButton = this.footerEl.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
        
        const saveButton = this.footerEl.createEl('button', { text: 'Done', cls: 'mod-cta' });
        saveButton.addEventListener('click', () => {
            // 检查是否至少选择了一个选项
            if (this.selectedTypes.size === 0) {
                new Notice('Please select at least one option.');
                return;
            }
            
            const selectedTypes = Array.from(this.selectedTypes);
            this.onSave(selectedTypes);
            this.close();
        });
    }

    private createTypeList() {
        this.listEl.empty();
        
        // 添加每个类型的选项
        ALL_CONTENT_TYPES.forEach(typeId => {
            const typeSetting = new Setting(this.listEl)
                .setName(typeId);
                
            // 添加选中状态的类
            if (this.selectedTypes.has(typeId)) {
                typeSetting.settingEl.addClass('is-selected');
            }
            
            // 添加点击事件
            typeSetting.settingEl.addEventListener('click', () => {
                const isCurrentlySelected = this.selectedTypes.has(typeId);
                this.handleTypeToggle(typeId, !isCurrentlySelected);
                this.redraw();
            });
        });
    }

    private handleTypeToggle(typeId: string, isSelected: boolean) {
        if (isSelected) {
            this.selectedTypes.add(typeId);
        } else {
            this.selectedTypes.delete(typeId);
        }
    }

    private redraw() {
        this.createTypeList();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 
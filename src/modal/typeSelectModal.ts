import { App, Modal, Setting, Notice } from 'obsidian';
import { ModalStyleManager } from '../utils/modalStyles';

// 定义所有可用的内容类型（首字母大写）
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
        
        // 添加标题
        contentEl.createEl('h2', { text: 'Select Content Types' });
        contentEl.addClass('cubox-type-select-modal');
        
        // 创建类型列表容器
        this.listEl = contentEl.createDiv({ cls: 'type-list-container' });
        
        // 创建底部按钮容器
        this.footerEl = contentEl.createDiv({ cls: 'modal-footer' });
        
        // 创建类型列表
        this.createTypeList();
        
        // 添加取消按钮
        const cancelButton = this.footerEl.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
        
        // 添加保存按钮
        const saveButton = this.footerEl.createEl('button', { text: 'Done', cls: 'mod-cta' });
        saveButton.addEventListener('click', () => {
            // 检查是否至少选择了一个选项
            if (this.selectedTypes.size === 0) {
                new Notice('Please select at least one option.');
                return;
            }
            
            // 返回选中的类型
            const selectedTypes = Array.from(this.selectedTypes);
            this.onSave(selectedTypes);
            this.close();
        });
        
        // 添加样式
        this.addStyles();
    }

    private addStyles() {
        // 使用通用样式管理器添加样式
        ModalStyleManager.addModalStyles(
            'cubox-modal-styles',
            'cubox-type-select-modal',
            'type-list-container'
        );
        
        // 添加额外的样式，覆盖第一行字体加粗的样式
        const styleEl = document.createElement('style');
        styleEl.id = 'cubox-type-modal-additional-styles';
        styleEl.textContent = `
            /* 覆盖第一行字体加粗的样式 */
            .type-list-container .setting-item:first-child .setting-item-name {
                font-weight: normal;
            }
        `;
        document.head.appendChild(styleEl);
    }

    private createTypeList() {
        // 清除现有列表
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
        
        // 使用通用样式管理器移除样式
        ModalStyleManager.removeModalStyles('cubox-modal-styles');
        
        // 移除额外的样式
        const additionalStyleEl = document.getElementById('cubox-type-modal-additional-styles');
        if (additionalStyleEl) additionalStyleEl.remove();
    }
} 
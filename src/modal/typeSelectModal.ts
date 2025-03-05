import { App, Modal, Setting, Notice } from 'obsidian';
import { ModalStyleManager } from '../utils/modalStyles';

export interface ContentType {
    id: string;
    name: string;
}

export class TypeSelectModal extends Modal {
    private onSave: (selectedTypes: string[]) => void;
    private selectedTypes: Set<string> = new Set();
    private listEl: HTMLElement;
    private allItemsId: string = 'all';
    
    // 定义可用的类型
    private types = [
        { id: 'article', name: 'Article' },
        { id: 'snippet', name: 'Snippet' },
        { id: 'memo', name: 'Memo' },
        { id: 'image', name: 'Image' },
        { id: 'audio', name: 'Audio' },
        { id: 'video', name: 'Video' },
        { id: 'file', name: 'File' }
    ];

    constructor(app: App, initialSelected: string[] = [], onSave: (selectedTypes: string[]) => void) {
        super(app);
        this.onSave = onSave;
        
        console.log('TypeSelectModal constructor called with initialSelected:', initialSelected);
        
        // 初始化已选择的类型
        if (initialSelected && initialSelected.length > 0) {
            // 添加初始选择的类型
            initialSelected.forEach(id => {
                if (id) this.selectedTypes.add(id);
            });
            
            // 检查是否所有类型都被选中，如果是则也选中"All Items"
            const allTypesSelected = this.types.every(type => 
                initialSelected.includes(type.id)
            );
            
            if (allTypesSelected) {
                this.selectedTypes.add(this.allItemsId);
            }
        } else {
            // 如果没有初始选择，默认选中"All Items"和所有类型
            this.selectedTypes.add(this.allItemsId);
            this.types.forEach(type => {
                this.selectedTypes.add(type.id);
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
        
        // 创建类型列表
        this.createTypeList();
        
        // 添加底部按钮容器 - 使用与 StatusSelectModal 相同的类名
        const footerEl = contentEl.createDiv({ cls: 'modal-footer' });
        
        // 添加取消按钮
        const cancelButton = footerEl.createEl('button', { text: '取消' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
        
        // 添加保存按钮
        const saveButton = footerEl.createEl('button', { text: '确认', cls: 'mod-cta' });
        saveButton.addEventListener('click', () => {
            // 过滤掉"All Items"，只保留实际类型
            const selectedTypes = Array.from(this.selectedTypes)
                .filter(id => id !== this.allItemsId);
            
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
    }

    private createTypeList() {
        // 清除现有列表
        this.listEl.empty();
        
        // 添加"All Items"选项
        new Setting(this.listEl)
            .addToggle(toggle => toggle
                .setValue(this.selectedTypes.has(this.allItemsId))
                .onChange(value => {
                    if (value) {
                        // 选中"All Items"时，选中所有类型
                        this.selectedTypes.add(this.allItemsId);
                        this.types.forEach(type => {
                            this.selectedTypes.add(type.id);
                        });
                    } else {
                        // 取消选中"All Items"时，取消选中所有类型
                        this.selectedTypes.delete(this.allItemsId);
                        this.types.forEach(type => {
                            this.selectedTypes.delete(type.id);
                        });
                    }
                    this.redraw();
                }))
            .setName('All Items');
        
        // 添加每个类型的选项
        this.types.forEach(type => {
            new Setting(this.listEl)
                .addToggle(toggle => toggle
                    .setValue(this.selectedTypes.has(type.id))
                    .onChange(value => {
                        this.handleTypeToggle(type.id, value);
                        this.redraw();
                    }))
                .setName(type.name);
        });
    }

    private handleTypeToggle(typeId: string, isSelected: boolean) {
        if (isSelected) {
            this.selectedTypes.add(typeId);
            
            // 检查是否所有类型都被选中
            const allTypesSelected = this.types.every(type => 
                this.selectedTypes.has(type.id)
            );
            
            // 不再自动选中"All Items"，即使所有类型都被选中
            // 只有当用户手动选择"All Items"时才选中它
        } else {
            this.selectedTypes.delete(typeId);
            
            // 如果有任何类型未被选中，取消选中"All Items"
            this.selectedTypes.delete(this.allItemsId);
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
    }
} 
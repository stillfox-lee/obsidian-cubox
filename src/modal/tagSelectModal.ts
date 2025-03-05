import { App, Modal, Setting, Notice } from 'obsidian';
import { CuboxTag } from '../cuboxApi';
import { ModalStyleManager } from '../utils/modalStyles';

// 定义虚拟的 ALL 标签 ID 和 NO_TAGS 标签 ID
const ALL_TAGS_ID = 'all_tags';
const NO_TAGS_ID = 'no_tags';

export class TagSelectModal extends Modal {
    private selectedTags: Set<string> = new Set();
    private onConfirm: (selectedTags: string[]) => void;
    private tags: CuboxTag[] = [];
    private listEl: HTMLElement;
    private footerEl: HTMLElement;

    constructor(
        app: App, 
        tags: CuboxTag[], 
        initialSelectedTags: string[],
        onConfirm: (selectedTags: string[]) => void
    ) {
        super(app);
        this.tags = tags;
        
        // 初始化已选择的标签
        if (initialSelectedTags && initialSelectedTags.length > 0) {
            initialSelectedTags.forEach(id => {
                // 特殊处理空字符串，将其转换为 NO_TAGS_ID
                if (id === '') {
                    this.selectedTags.add(NO_TAGS_ID);
                } else if (id) {
                    this.selectedTags.add(id);
                }
            });
        } else {
            // 如果没有初始选择，默认选中"All Items"
            this.selectedTags.add(ALL_TAGS_ID);
            this.selectedTags.add(NO_TAGS_ID);
        }
        
        this.onConfirm = onConfirm;
    }

    async onOpen() {
        const { contentEl } = this;
        
        // 设置标题
        contentEl.createEl('h2', { text: 'Manage Cubox tags to be synced' });
        contentEl.addClass('cubox-tag-select-modal');
        
        // 创建固定的容器结构
        this.listEl = contentEl.createDiv({ cls: 'tag-list-container' });
        this.footerEl = contentEl.createDiv({ cls: 'modal-footer' });
        
        // 创建标签列表
        this.createTagList();
        
        // 添加确认和取消按钮
        // 取消按钮
        const cancelButton = this.footerEl.createEl('button', { text: '取消' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
        
        // 确认按钮
        const confirmButton = this.footerEl.createEl('button', { text: '确认', cls: 'mod-cta' });
        confirmButton.addEventListener('click', () => {
            // 处理选中的标签
            let resultTags: string[] = [];
            
            // 如果选中了ALL_TAGS_ID，则传递空数组表示同步所有内容
            if (this.selectedTags.has(ALL_TAGS_ID)) {
                resultTags = [];
            } else {
                // 将选中的标签ID添加到结果中
                resultTags = Array.from(this.selectedTags);
                
                // 特殊处理 NO_TAGS_ID，将其转换为空字符串
                if (resultTags.includes(NO_TAGS_ID)) {
                    // 移除 NO_TAGS_ID
                    resultTags = resultTags.filter(id => id !== NO_TAGS_ID);
                    // 添加空字符串表示无标签
                    resultTags.push('');
                }
            }
            
            this.onConfirm(resultTags);
            this.close();
        });
        
        // 添加样式
        this.addStyles();
    }
    
    private addStyles() {
        // 使用通用样式管理器添加样式
        ModalStyleManager.addModalStyles(
            'cubox-tag-modal-styles',
            'cubox-tag-select-modal',
            'tag-list-container'
        );
    }

    private createTagList() {
        // 清除现有列表
        this.listEl.empty();
        
        // 添加"All Items"选项
        new Setting(this.listEl)
            .setName('All Items')
            .addToggle(toggle => toggle
                .setValue(this.selectedTags.has(ALL_TAGS_ID))
                .onChange(value => {
                    this.handleTagToggle(ALL_TAGS_ID, value);
                    this.redraw();
                }));
        
        // 添加"No Tags"选项
        new Setting(this.listEl)
            .setName('No Tags')
            .addToggle(toggle => toggle
                .setValue(this.selectedTags.has(NO_TAGS_ID))
                .onChange(value => {
                    this.handleTagToggle(NO_TAGS_ID, value);
                    this.redraw();
                }));
        
        // 添加每个标签的选项
        this.tags.forEach(tag => {
            new Setting(this.listEl)
                .setName(tag.nested_name)
                .addToggle(toggle => toggle
                    .setValue(this.isTagSelected(tag.id))
                    .onChange(value => {
                        this.handleTagToggle(tag.id, value);
                        this.redraw();
                    }));
        });
    }
    
    private isTagSelected(tagId: string): boolean {
        // 如果选中了ALL_TAGS_ID，则所有标签都被选中
        if (this.selectedTags.has(ALL_TAGS_ID)) {
            return true;
        }
        // 否则检查特定标签是否被选中
        return this.selectedTags.has(tagId);
    }

    private handleTagToggle(tagId: string, isSelected: boolean) {
        if (tagId === ALL_TAGS_ID) {
            if (isSelected) {
                // 如果选择了"All Items"，清除其他所有选择，只保留ALL_TAGS_ID
                this.selectedTags.clear();
                this.selectedTags.add(ALL_TAGS_ID);
                this.selectedTags.add(NO_TAGS_ID);
            } else {
                // 如果取消了"All Items"且没有其他选择，选中第一个标签
                this.selectedTags.delete(ALL_TAGS_ID);
                if (this.selectedTags.size === 0) {
                    // 如果有标签，选择第一个标签，否则选择"No Tags"
                    if (this.tags.length > 0) {
                        this.selectedTags.add(this.tags[0].id);
                    } else {
                        this.selectedTags.add(NO_TAGS_ID);
                    }
                }
            }
        } else {
            if (isSelected) {
                // 添加新选择的标签
                this.selectedTags.add(tagId);
                
                // 检查是否所有标签都被选中，如果是，自动选中"All Items"
                if (this.areAllTagsSelected()) {
                    this.selectedTags.clear();
                    this.selectedTags.add(ALL_TAGS_ID);
                }
            } else {
                // 如果取消选择某个标签，则取消"All Items"的选择
                this.selectedTags.delete(ALL_TAGS_ID);
                
                // 正常移除取消选择的标签
                this.selectedTags.delete(tagId);
                
                // 如果没有任何选择，默认选中"All Items"
                if (this.selectedTags.size === 0) {
                    this.selectedTags.add(ALL_TAGS_ID);
                }
            }
        }
    }
    
    // 检查是否所有标签都被选中（包括"No Tags"）
    private areAllTagsSelected(): boolean {
        // 如果没有标签，返回false
        if (this.tags.length === 0) return false;
        
        // 检查每个标签是否都在selectedTags中，并且"No Tags"也被选中
        return this.tags.every(tag => this.selectedTags.has(tag.id)) && 
               this.selectedTags.has(NO_TAGS_ID);
    }
    
    private redraw() {
        this.createTagList();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        
        // 使用通用样式管理器移除样式
        ModalStyleManager.removeModalStyles('cubox-tag-modal-styles');
    }
} 
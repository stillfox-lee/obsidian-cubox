import { App, Modal, Setting, Notice } from 'obsidian';
import { CuboxTag } from '../cuboxApi';
import { ModalStyleManager } from '../utils/modalStyles';

// 定义虚拟的 ALL 标签 ID 和 NO_TAGS 标签 ID
export const ALL_TAGS_ID = 'all_tags';
export const NO_TAGS_ID = '';

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
                this.selectedTags.add(id);
            });
        } else {
            // 如果没有初始选择，默认选中"All Items"
            this.selectedTags.add(ALL_TAGS_ID);
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
            // 检查是否至少选择了一个选项
            if (this.selectedTags.size === 0) {
                new Notice('Please select at least one option.');
                return;
            }
            
            const resultTags = this.selectedTags.has(ALL_TAGS_ID) ? [ALL_TAGS_ID] : Array.from(this.selectedTags);

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
        const allItemsSetting = new Setting(this.listEl)
            .setName('All Items');
            
        // 添加选中状态的类
        if (this.selectedTags.has(ALL_TAGS_ID)) {
            allItemsSetting.settingEl.addClass('is-selected');
        }
        
        // 添加点击事件
        allItemsSetting.settingEl.addEventListener('click', () => {
            const isCurrentlySelected = this.selectedTags.has(ALL_TAGS_ID);
            this.handleTagToggle(ALL_TAGS_ID, !isCurrentlySelected);
            this.redraw();
        });
        
        // 保留原有的toggle但隐藏它（通过CSS），以保持原有逻辑
        allItemsSetting.addToggle(toggle => toggle
            .setValue(this.selectedTags.has(ALL_TAGS_ID))
            .onChange(value => {
                this.handleTagToggle(ALL_TAGS_ID, value);
                this.redraw();
            }));
        
        // 添加"No Tags"选项
        const noTagsSetting = new Setting(this.listEl)
            .setName('No Tags');
            
        // 如果"All Items"被选中，禁用其他选项
        if (this.selectedTags.has(ALL_TAGS_ID)) {
            noTagsSetting.settingEl.addClass('is-disabled');
        } else {
            // 添加选中状态的类
            if (this.selectedTags.has(NO_TAGS_ID)) {
                noTagsSetting.settingEl.addClass('is-selected');
            }
            
            // 添加点击事件
            noTagsSetting.settingEl.addEventListener('click', () => {
                const isCurrentlySelected = this.selectedTags.has(NO_TAGS_ID);
                this.handleTagToggle(NO_TAGS_ID, !isCurrentlySelected);
                this.redraw();
            });
        }
        
        // 保留原有的toggle但隐藏它（通过CSS），以保持原有逻辑
        noTagsSetting.addToggle(toggle => toggle
            .setValue(this.selectedTags.has(NO_TAGS_ID))
            .onChange(value => {
                this.handleTagToggle(NO_TAGS_ID, value);
                this.redraw();
            }));
        
        // 添加每个标签的选项
        this.tags.forEach(tag => {
            const tagSetting = new Setting(this.listEl)
                .setName(tag.nested_name);
                
            // 如果"All Items"被选中，禁用其他选项
            if (this.selectedTags.has(ALL_TAGS_ID)) {
                tagSetting.settingEl.addClass('is-disabled');
            } else {
                // 添加选中状态的类
                if (this.selectedTags.has(tag.id)) {
                    tagSetting.settingEl.addClass('is-selected');
                }
                
                // 添加点击事件
                tagSetting.settingEl.addEventListener('click', () => {
                    const isCurrentlySelected = this.selectedTags.has(tag.id);
                    this.handleTagToggle(tag.id, !isCurrentlySelected);
                    this.redraw();
                });
            }
            
            // 保留原有的toggle但隐藏它（通过CSS），以保持原有逻辑
            tagSetting.addToggle(toggle => toggle
                .setValue(this.selectedTags.has(tag.id))
                .onChange(value => {
                    this.handleTagToggle(tag.id, value);
                    this.redraw();
                }));
        });
    }
    
    private isTagSelected(tagId: string): boolean {
        // 检查特定标签是否被选中
        return this.selectedTags.has(tagId);
    }

    private handleTagToggle(tagId: string, isSelected: boolean) {
        if (tagId === ALL_TAGS_ID) {
            if (isSelected) {
                // 如果选择了"All Items"，清除其他所有选择，只保留ALL_TAGS_ID
                this.selectedTags.clear();
                this.selectedTags.add(ALL_TAGS_ID);
            } else {
                // 如果取消了"All Items"，清除它
                this.selectedTags.delete(ALL_TAGS_ID);
                // 不自动选择其他标签，让用户自己选择
            }
        } else {
            if (isSelected) {
                // 如果选择了特定标签，移除"All Items"
                this.selectedTags.delete(ALL_TAGS_ID);
                // 添加新选择的标签
                this.selectedTags.add(tagId);
            } else {
                // 移除取消选择的标签
                this.selectedTags.delete(tagId);
            }
        }
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
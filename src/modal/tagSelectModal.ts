import { App, Modal, Setting, Notice } from 'obsidian';
import { CuboxTag } from '../cuboxApi';
import { ModalStyleManager } from './modalStyles';

export const ALL_ITEMS = 'all_items';
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
            this.selectedTags.add(ALL_ITEMS);
        }
        
        this.onConfirm = onConfirm;
    }

    async onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Manage Cubox tags to be synced' });
        contentEl.addClass('cubox-tag-select-modal');
        
        this.listEl = contentEl.createDiv({ cls: 'tag-list-container' });
        this.footerEl = contentEl.createDiv({ cls: 'modal-footer' });
        
        // 创建标签列表
        this.createTagList();
        
        // 添加确认和取消按钮
        const cancelButton = this.footerEl.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
        
        const confirmButton = this.footerEl.createEl('button', { text: 'Done', cls: 'mod-cta' });
        confirmButton.addEventListener('click', () => {
            // 检查是否至少选择了一个选项
            if (this.selectedTags.size === 0) {
                new Notice('Please select at least one option.');
                return;
            }
            
            const resultTags = this.selectedTags.has(ALL_ITEMS) ? [ALL_ITEMS] : Array.from(this.selectedTags);

            this.onConfirm(resultTags);
            this.close();
        });
        
        this.addStyles();
    }
    
    private addStyles() {
        ModalStyleManager.addModalStyles(
            'cubox-tag-modal-styles',
            'cubox-tag-select-modal',
            'tag-list-container'
        );
    }

    private createTagList() {
        this.listEl.empty();
        
        // 添加"All Items"选项
        const allItemsSetting = new Setting(this.listEl)
            .setName('All Items');
            
        if (this.selectedTags.has(ALL_ITEMS)) {
            allItemsSetting.settingEl.addClass('is-selected');
        }
        
        // 添加点击事件
        allItemsSetting.settingEl.addEventListener('click', () => {
            const isCurrentlySelected = this.selectedTags.has(ALL_ITEMS);
            this.handleTagToggle(ALL_ITEMS, !isCurrentlySelected);
            this.redraw();
        });
        
        // 添加"No Tags"选项
        const noTagsSetting = new Setting(this.listEl)
            .setName('No Tags');
            
        // 如果"All Items"被选中，禁用其他选项
        if (this.selectedTags.has(ALL_ITEMS)) {
            noTagsSetting.settingEl.addClass('is-disabled');
        } else {
            // 添加选中状态的类
            if (this.selectedTags.has(NO_TAGS_ID)) {
                noTagsSetting.settingEl.addClass('is-selected');
            }
            
            noTagsSetting.settingEl.addEventListener('click', () => {
                const isCurrentlySelected = this.selectedTags.has(NO_TAGS_ID);
                this.handleTagToggle(NO_TAGS_ID, !isCurrentlySelected);
                this.redraw();
            });
        }
        
        // 添加每个标签的选项
        this.tags.forEach(tag => {
            const tagSetting = new Setting(this.listEl)
                .setName(tag.nested_name);
                
            // 如果"All Items"被选中，禁用其他选项
            if (this.selectedTags.has(ALL_ITEMS)) {
                tagSetting.settingEl.addClass('is-disabled');
            } else {
                // 添加选中状态的类
                if (this.selectedTags.has(tag.id)) {
                    tagSetting.settingEl.addClass('is-selected');
                }
                
                tagSetting.settingEl.addEventListener('click', () => {
                    const isCurrentlySelected = this.selectedTags.has(tag.id);
                    this.handleTagToggle(tag.id, !isCurrentlySelected);
                    this.redraw();
                });
            }
            
        });
    }
    
    private isTagSelected(tagId: string): boolean {
        return this.selectedTags.has(tagId);
    }

    private handleTagToggle(tagId: string, isSelected: boolean) {
        if (tagId === ALL_ITEMS) {
            if (isSelected) {
                // 如果选择了"All Items"，清除其他所有选择，只保留ALL_TAGS_ID
                this.selectedTags.clear();
                this.selectedTags.add(ALL_ITEMS);
            } else {
                this.selectedTags.delete(ALL_ITEMS);
            }
        } else {
            if (isSelected) {
                this.selectedTags.delete(ALL_ITEMS);
                this.selectedTags.add(tagId);
            } else {
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
        
        ModalStyleManager.removeModalStyles('cubox-tag-modal-styles');
    }
} 
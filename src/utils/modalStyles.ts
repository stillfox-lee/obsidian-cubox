/**
 * 模态框样式工具类，用于管理模态框的通用样式
 */
export class ModalStyleManager {
    /**
     * 为模态框添加通用样式
     * @param styleId 样式元素的ID
     * @param modalClass 模态框的主类名
     * @param listContainerClass 列表容器的类名
     * @returns 创建的样式元素
     */
    public static addModalStyles(
        styleId: string,
        modalClass: string,
        listContainerClass: string
    ): HTMLStyleElement {
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
            .${modalClass} {
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            .${listContainerClass} {
                flex-grow: 1;
                overflow-y: auto;
                padding-top: 20px;
                padding-right: 10px;
            }
            .modal-footer {
                display: flex;
                justify-content: flex-end;
                padding: 16px;
                border-top: 1px solid var(--background-modifier-border);
            }
            .modal-footer button {
                margin-left: 8px;
            }
            /* 隐藏原有的 toggle/switch 控件 */
            .${listContainerClass} .setting-item-control {
                display: none;
            }
            /* 调整设置项的布局，为左侧的 checkbox 腾出空间 */
            .${listContainerClass} .setting-item {
                position: relative;
                padding-left: 36px;
                border-radius: 4px;
                transition: background-color 0.1s ease;
                display: flex;
                align-items: center;
                min-height: 40px;
                box-sizing: border-box;
            }
            .${listContainerClass} .setting-item:hover {
                background-color: var(--background-modifier-hover);
            }
            /* 确保所有设置项的名称垂直居中 */
            .${listContainerClass} .setting-item .setting-item-name {
                display: flex;
                align-items: center;
                padding: 0;
                margin: 0;
            }
            /* 添加自定义 checkbox 样式 - 通用样式 */
            .${listContainerClass} .setting-item::before {
                content: "";
                position: absolute;
                width: 16px;
                height: 16px;
                border: 1px solid var(--checkbox-border-color, var(--background-modifier-border));
                border-radius: 3px;
                background-color: var(--checkbox-color, var(--background-primary));
                box-sizing: border-box;
            }
            
            /* 为第一行和其他行分别设置不同的定位 */
            .${listContainerClass} .setting-item:first-child::before {
                left: 10px;
                top: 12px; /* 为第一行特别调整 */
            }
            
            .${listContainerClass} .setting-item:not(:first-child)::before {
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
            }
            
            /* 选中状态的 checkbox */
            .${listContainerClass} .setting-item.is-selected::before {
                background-color: var(--checkbox-color-checked, var(--interactive-accent));
                border-color: var(--checkbox-border-color-checked, var(--interactive-accent));
            }
            
            /* 添加选中状态的勾选标记 - 通用样式 */
            .${listContainerClass} .setting-item.is-selected::after {
                content: "";
                position: absolute;
                width: 5px;
                height: 9px;
                border-right: 2px solid var(--text-on-accent);
                border-bottom: 2px solid var(--text-on-accent);
            }
            
            /* 为第一行和其他行分别设置不同的定位 */
            .${listContainerClass} .setting-item:first-child.is-selected::after {
                left: 14px;
                top: 13px; /* 为第一行特别调整 */
                transform: rotate(45deg);
            }
            
            .${listContainerClass} .setting-item:not(:first-child).is-selected::after {
                left: 14px;
                top: 50%;
                transform: translateY(-60%) rotate(45deg);
            }
            
            /* 确保第一行和其他行的对齐一致 */
            .${listContainerClass} .setting-item:first-child {
                margin-top: 0;
                padding-top: 0;
            }
            
            /* 确保第一行文本与复选框对齐 */
            .${listContainerClass} .setting-item:first-child .setting-item-name {
                margin-top: 0;
                padding-top: 0;
                position: relative;
                top: 6px; /* 微调第一行文本位置 */
                font-weight: bold; /* 为第一行文字添加加粗样式 */
            }
            
            /* 确保所有行的高度一致 */
            .${listContainerClass} .setting-item-heading,
            .${listContainerClass} .setting-item-name {
                line-height: normal;
                margin: auto 0;
            }
        `;
        document.head.appendChild(styleEl);
        return styleEl;
    }

    /**
     * 移除指定ID的样式元素
     * @param styleId 样式元素的ID
     */
    public static removeModalStyles(styleId: string): void {
        const styleEl = document.getElementById(styleId);
        if (styleEl) styleEl.remove();
    }
} 
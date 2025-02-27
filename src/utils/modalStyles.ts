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
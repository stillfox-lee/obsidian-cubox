import { CuboxArticle, CuboxHighlight } from './cuboxApi';
import { formatISODateTime, generateSafeFileArticleName } from './utils';
import * as Mustache from 'mustache';

export class TemplateProcessor {
    // 存储日期格式
    private dateFormat: string = 'yyyy-MM-dd';
    
    /**
     * 设置日期格式
     * @param format 日期格式
     */
    setDateFormat(format: string): void {
        this.dateFormat = format;
    }

    /**
     * 处理文件名模板
     * @param template 模板字符串
     * @param article 文章数据
     */
    processFilenameTemplate(template: string, article: CuboxArticle): string {
        if (!template) {
            return article.title || 'Untitled';
        }

        // 准备用于 Mustache 的数据
        const data = this.prepareTemplateData(article);
        
        // 使用 Mustache 渲染模板
        const filename = Mustache.render(template, data);
        
        // 处理文件名安全性
        return generateSafeFileArticleName(filename);
    }

    /**
     * 处理前置元数据模板
     * @param template 模板字符串
     * @param article 文章数据
     */
    processFrontMatterTemplate(template: string, article: CuboxArticle): string {
        if (!template) {
            return '';
        }

        // 准备用于 Mustache 的数据
        const data = this.prepareTemplateData(article);
        
        // 使用 Mustache 渲染模板
        return Mustache.render(template, data);
    }

    /**
     * 处理内容模板
     * @param template 模板字符串
     * @param article 文章数据
     */
    processContentTemplate(template: string, article: CuboxArticle): string {
        if (!template) {
            let content = ``;
            
            if (article.content) {
                content += article.content + '\n\n';
            }
            
            if (article.highlights && article.highlights.length > 0) {
                content += '## Highlights\n\n';
                article.highlights.forEach(highlight => {
                    content += `- ${highlight.text}\n`;
                });
            }
            
            return content;
        }

        // 准备用于 Mustache 的数据
        const data = this.prepareTemplateData(article);
        
        // 使用 Mustache 渲染模板
        return Mustache.render(template, data);
    }

    /**
     * 准备用于 Mustache 模板的数据对象
     * @param article 文章数据
     */
    private prepareTemplateData(article: CuboxArticle): any {
        // 格式化日期
        const createDate = article.createTime || '';
        const formattedDate = createDate ? formatISODateTime(createDate, this.dateFormat) : '';
        
        // 格式化高亮内容
        let highlightsText = '';
        if (article.highlights && article.highlights.length > 0) {
            article.highlights.forEach(highlight => {
                highlightsText += `- ${highlight.text}\n`;
            });
        }
        
        // 返回包含所有可用变量的对象
        return {
            cardTitle: article.title || 'Untitled',
            createDate: formattedDate,
            content: article.content || '',
            highlights: highlightsText,
            url: article.url || '',
            domain: article.domain || '',
            // 添加原始对象，以便可以访问所有属性
            article: article,
            // 添加高亮数组，以便可以在模板中循环
            highlightsList: article.highlights || []
        };
    }

    /**
     * 格式化日期 - 使用工具方法
     * @param dateStr 日期字符串
     * @param format 格式模板
     */
    formatDate(dateStr: string, format: string): string {
        return formatISODateTime(dateStr, format);
    }
} 
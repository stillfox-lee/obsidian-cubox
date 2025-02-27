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

        // 使用简单的字符串替换而不是 Mustache
        let filename = template;
        
        // 替换所有支持的模板字段
        if (article.title) {
            filename = filename.replace(/{{{card_title}}}/g, article.title);
            filename = filename.replace(/{{{article_title}}}/g, article.title);
        }
        
        const createDate = article.createTime ? formatISODateTime(article.createTime, this.dateFormat) : '';
        if (createDate) {
            filename = filename.replace(/{{{date_saved}}}/g, createDate);
        }
        
        const updateDate = article.updateTime ? formatISODateTime(article.updateTime, this.dateFormat) : '';
        if (updateDate) {
            filename = filename.replace(/{{{date_updated}}}/g, updateDate);
        }
        
        if (article.domain) {
            filename = filename.replace(/{{{site_domain}}}/g, article.domain);
        }
        
        if (article.type) {
            filename = filename.replace(/{{{type}}}/g, article.type);
        }
        
        // 移除任何未被替换的模板标记 (如果某些字段不存在)
        filename = filename.replace(/{{{[^}]+}}}/g, '');
        
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
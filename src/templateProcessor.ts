import { CuboxArticle, CuboxHighlight } from './cuboxApi';
import { formatISODateTime, generateSafeFileArticleName } from './utils';
import * as Mustache from 'mustache';
import { parseYaml, stringifyYaml } from 'obsidian';

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

        try {
            // 首先尝试将模板解析为 YAML 对象
            // 如果模板已经是 YAML 格式，则直接使用
            const yamlObj = parseYaml(template);
            
            // 准备用于替换的数据
            const data = this.prepareTemplateData(article);
            
            // 递归处理 YAML 对象中的所有字符串值
            const processedYaml = this.processYamlObject(yamlObj, data);
            
            // 将处理后的对象转换回 YAML 字符串
            return stringifyYaml(processedYaml);
        } catch (e) {
            // 如果解析失败，则使用 Mustache 渲染模板
            // 这允许用户直接输入 YAML 格式的字符串
            const data = this.prepareTemplateData(article);
            const renderedTemplate = Mustache.render(template, data);
            
            // 尝试将渲染后的模板解析为 YAML 并重新格式化
            try {
                const yamlObj = parseYaml(renderedTemplate);
                return stringifyYaml(yamlObj);
            } catch (e) {
                // 如果仍然无法解析，则返回原始渲染结果
                return renderedTemplate;
            }
        }
    }

    /**
     * 递归处理 YAML 对象中的所有字符串值
     * @param obj YAML 对象
     * @param data 替换数据
     */
    private processYamlObject(obj: any, data: any): any {
        if (typeof obj === 'string') {
            // 如果是字符串，使用 Mustache 进行模板替换
            return Mustache.render(obj, data);
        } else if (Array.isArray(obj)) {
            // 如果是数组，递归处理每个元素
            return obj.map(item => this.processYamlObject(item, data));
        } else if (obj !== null && typeof obj === 'object') {
            // 如果是对象，递归处理每个属性
            const result: {[key: string]: any} = {};
            for (const key in obj) {
                // 处理键名中的模板变量
                const processedKey = Mustache.render(key, data);
                result[processedKey] = this.processYamlObject(obj[key], data);
            }
            return result;
        }
        // 其他类型（数字、布尔值等）直接返回
        return obj;
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
            highlightsList: article.highlights || [],
            // 添加标签数组
            tags: article.tags || []
        };
    }

    /**
     * 将对象转换为 YAML 格式的 frontmatter
     * @param obj 要转换的对象
     */
    objectToYamlFrontmatter(obj: any): string {
        try {
            return stringifyYaml(obj);
        } catch (e) {
            console.error('将对象转换为 YAML 失败:', e);
            return '';
        }
    }

    /**
     * 解析 YAML 格式的 frontmatter 为对象
     * @param yaml YAML 字符串
     */
    yamlFrontmatterToObject(yaml: string): any {
        try {
            return parseYaml(yaml);
        } catch (e) {
            console.error('解析 YAML 失败:', e);
            return {};
        }
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
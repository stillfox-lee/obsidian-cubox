import { CuboxArticle, CuboxHighlight } from './cuboxApi';
import { formatDateTime, generateSafeFileArticleName } from './utils';
//import * as Mustache from 'mustache';
import Mustache from 'mustache';
import { parseYaml, stringifyYaml } from 'obsidian';

export const FRONT_MATTER_VARIABLES = [
    'title',
    'article_title',
    'tags',
    'create_time',
    'update_time',
    'domain',
    'url',
    'cubox_url',
    'description',
    'description',
    'words_count',
    'type',
    'words_count',
    'id'
]

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

        // 准备用于 Mustache 的视图对象
        const view = {
            title: article.title || '',
            article_title: article.article_title || '',
            create_time: article.create_time ? formatDateTime(article.create_time, this.dateFormat) : '',
            update_time: article.update_time ? formatDateTime(article.update_time, this.dateFormat) : '',
            domain: article.domain || '',
            type: article.type || '',
            id: article.id || '',
            // 可以根据需要添加更多字段
        };
        
        let filename = '';
        try {
            filename = Mustache.render(template, view);
        } catch (error) {
            console.error('模板渲染失败:', error);
            // 使用备用方案
            filename = article.title || 'Untitled';
        }
        
        // 限制文件名长度不超过100个字符
        const MAX_LENGTH = 100;
        if (filename.length > MAX_LENGTH) {
            // 如果超过长度限制，截取前100个字符
            filename = filename.substring(0, MAX_LENGTH);
        }
        
        // 处理文件名安全性
        return generateSafeFileArticleName(filename);
    }

    /**
     * 处理前置元数据模板
     * @param templateVariables 模板字符串
     * @param article 文章数据
     */
    processFrontMatter(templateVariables: string[], article: CuboxArticle): string {
        if (templateVariables.length === 0) {
            return '';
        }

        let frontMatter: { [id: string]: unknown } = {
            id: article.id, // id is required for deduplication
        }

        for (const item of templateVariables) {
            // split the item into variable and alias
            const aliasedVariables = item.split('::')
            const variable = aliasedVariables[0]
            if (
              variable === 'tags' &&
              article.tags &&
              article.tags.length > 0
            ) {
              // tags are handled separately
              // use label names as tags
              frontMatter[variable] = article.tags
              continue
            }
      
            const value = (article as any)[variable]
            if (value) {
              // if variable is in article, use it
              frontMatter[variable] = value
            }
        }
        
        return stringifyYaml(frontMatter)
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
        const createDate = article.create_time || '';
        const formattedDate = createDate ? formatDateTime(createDate, this.dateFormat) : '';
        
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
} 
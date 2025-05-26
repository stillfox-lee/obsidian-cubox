import { CuboxArticle, CuboxHighlight } from './cuboxApi';
import { formatDateTime, generateSafeFileArticleName } from './utils';
import Mustache from 'mustache';
import { stringifyYaml } from 'obsidian';

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

interface HighlightView {
    id: string;
    text: string;
    image_url?: string;
    cubox_url: string;
    note?: string;
    color: string;
    create_time: string;
    formatted_create_time?: string;
}

interface ArticleView {
    id: string;
    title: string;
    article_title: string;
    description: string;
    url: string;
    domain: string;
    create_time: string;
    update_time: string;
    word_count: number;
    content?: string;
    cubox_url: string;
    type: string;
    formatted_create_time?: string;
    formatted_update_time?: string;
    highlights: HighlightView[];
    tags: string[];
    highlights_length: number;
    content_highlighted?: string;
}

export class TemplateProcessor {
    // 存储日期格式
    private dateFormat: string = 'yyyy-MM-dd';
  
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
     * 处理文章数据模板
     * @param templateVariables 模板字符串
     * @param article 文章数据
     */
    processFrontMatter(templateVariables: string[], article: CuboxArticle): string {
        let frontMatter: { [id: string]: unknown } = {
            id: article.id, // id is required for deduplication
        }

        if (templateVariables.length === 0) {
            return stringifyYaml(frontMatter);
        }

        for (const item of templateVariables) {
            const aliasedVariables = item.split('::');
            const variable = aliasedVariables[0];
            const alias = aliasedVariables.length > 1 ? aliasedVariables[1] : variable;
            
            if (
              variable === 'tags' &&
              article.tags &&
              article.tags.length > 0
            ) {
              frontMatter[alias] = article.tags;
              continue;
            }

            if (variable === 'create_time' && article.create_time) {
              frontMatter[alias] = formatDateTime(article.create_time, this.dateFormat);
              continue;
            }

            if (variable === 'update_time' && article.update_time) {
              frontMatter[alias] = formatDateTime(article.update_time, this.dateFormat);
              continue;
            }
      
            const value = this.getArticleProperty(article, variable);
            if (value) {
              frontMatter[alias] = value;
            }
        }
        
        return stringifyYaml(frontMatter);
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

        // 1. 创建 ArticleView 对象
        const articleView = this.createArticleView(article);
        
        // 2. 只有当模板中包含 content_highlighted 字段且文章有内容和高亮时才生成高亮内容
        if (template.includes('content_highlighted') && article.content && article.highlights && article.highlights.length > 0) {
            articleView.content_highlighted = this.generateHighlightedContent(article.content, article.highlights);
        }
        
        // 3. 使用 Mustache 渲染模板
        return Mustache.render(template, articleView);
    }

    /**
     * 创建用于模板渲染的 ArticleView 对象
     * @param article 原始文章数据
     * @returns 用于模板渲染的视图对象
     */
    private createArticleView(article: CuboxArticle): ArticleView {
        // 创建基本的 ArticleView 对象
        const articleView: ArticleView = {
            ...article,
            highlights: [],
            tags: article.tags || [],
            highlights_length: article.highlights?.length || 0,
            create_time: article.create_time ? formatDateTime(article.create_time, this.dateFormat) : '',
            update_time: article.update_time ? formatDateTime(article.update_time, this.dateFormat) : ''
        };

        // 处理高亮内容
        if (article.highlights && article.highlights.length > 0) {
            articleView.highlights = article.highlights.map(highlight => this.createHighlightView(highlight));
        }

        // 确保 Mustache 可以正确处理条件渲染
        if (articleView.highlights.length === 0) {
            articleView.highlights_length = 0;
        } else {
            articleView.highlights_length = articleView.highlights.length;
        }

        return articleView;
    }

    /**
     * 创建高亮视图对象
     * @param highlight 原始高亮数据
     * @returns 用于模板渲染的高亮视图对象
     */
    private createHighlightView(highlight: CuboxHighlight): HighlightView {
        // 确保文本和注释正确处理
        let text = highlight.text || '';
        
        // 检查是否为图片高亮
        if (!text && highlight.image_url) {
            // 如果文本为空但有图片URL，使用图片作为高亮内容
            text = `![](${highlight.image_url})`;
        } else if (text.includes('\n')) {
            // 处理多行文本，确保每行都有引用符号
            // 将文本按换行符分割，然后在每行前添加引用符号，最后重新组合
            const lines = text.split('\n');
            const formattedLines = lines.map((line, index) => {
                // 第一行不需要添加引用符号
                if (index === 0) return line;
                // 非空行添加引用符号
                return line.trim() ? '> ' + line : '>';
            });
            text = formattedLines.join('\n');
        }
        
        // 只有当 note 存在且不为空时才添加换行符
        const note = highlight.note && highlight.note.trim() ? highlight.note.trim() + '\n' : '';
        
        // 创建高亮视图对象
        const highlightView: HighlightView = {
            ...highlight,
            text: text,
            note: note,
            create_time: highlight.create_time ? formatDateTime(highlight.create_time, this.dateFormat) : '',
        };
        
        // 确保所有必要的字段都存在
        if (!highlightView.cubox_url) {
            highlightView.cubox_url = '';
        }
        
        return highlightView;
    }

    private generateHighlightedContent(content: string, highlights: CuboxHighlight[]): string {
        if (!content || !highlights || highlights.length === 0) {
            return content || '';
        }

        // 创建一个标记数组，记录每个字符是否需要高亮
        const contentLength = content.length;
        const highlightMarkers = new Array(contentLength).fill(false);
        
        // 标记所有需要高亮的字符
        for (const highlight of highlights) {
            const highlightText = highlight.text;
            if (!highlightText) continue;
            
            // 查找所有匹配位置
            let startPos = 0;
            let index;
            
            while ((index = content.indexOf(highlightText, startPos)) !== -1) {
                // 标记这段文本需要高亮
                for (let i = 0; i < highlightText.length; i++) {
                    highlightMarkers[index + i] = true;
                }
                
                // 从匹配位置之后继续搜索
                startPos = index + 1;
            }
        }
        
        // 根据标记生成高亮内容
        let highlightedContent = '';
        let inHighlight = false;
        
        for (let i = 0; i < contentLength; i++) {
            const shouldHighlight = highlightMarkers[i];
            
            // 开始高亮
            if (shouldHighlight && !inHighlight) {
                highlightedContent += '==';
                inHighlight = true;
            }
            
            // 结束高亮
            if (!shouldHighlight && inHighlight) {
                highlightedContent += '==';
                inHighlight = false;
            }
            
            // 添加当前字符
            highlightedContent += content[i];
        }
        
        // 如果文章结尾处于高亮状态，添加结束标记
        if (inHighlight) {
            highlightedContent += '==';
        }
        
        return highlightedContent;
    }

    // 类型安全的辅助函数
    private getArticleProperty(article: CuboxArticle, propertyName: string): unknown {
        return (article as unknown as Record<string, unknown>)[propertyName];
    }

    /**
     * 检查模板是否需要文章内容
     * @param template 内容模板
     * @returns 是否需要请求文章内容
     */
    needsArticleContent(template: string): boolean {
        // 如果没有模板，但默认模板会输出文章内容，所以需要内容
        if (!template) {
            return true;
        }
        
        // 检查模板中是否包含需要文章内容的变量
        return template.includes('{{content}}') || 
               template.includes('{{{content}}}') || 
               template.includes('{{content_highlighted}}') || 
               template.includes('{{{content_highlighted}}}');
    }
} 
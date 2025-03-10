import { CuboxArticle, CuboxHighlight } from './cuboxApi';
import { formatDateTime, generateSafeFileArticleName } from './utils';
import Mustache from 'mustache';
//import * as Mustache from 'mustache';
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

// Add these interfaces for the view models
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
     * 处理文章数据模板
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

        // 1. 创建 ArticleView 对象
        const articleView = this.createArticleView(article);
        
        // 2. 检查模板中是否包含 content_highlighted 字段
        if (template.includes('content_highlighted') && article.content && article.highlights && article.highlights.length > 0) {
            // 只有当模板中包含 content_highlighted 字段且文章有内容和高亮时才生成高亮内容
            articleView.content_highlighted = this.generateHighlightedContent(article.content, article.highlights);
        }
        
        // 3. 调试输出 (可以在生产环境中移除)
        console.log('ArticleView for template rendering:', JSON.stringify({
            title: articleView.title,
            highlights_length: articleView.highlights_length,
            highlights_count: articleView.highlights.length,
            has_highlighted_content: 'content_highlighted' in articleView,
            first_highlight: articleView.highlights.length > 0 ? {
                text: articleView.highlights[0].text,
                note: articleView.highlights[0].note,
                cubox_url: articleView.highlights[0].cubox_url
            } : null
        }, null, 2));
        
        // 4. 使用 Mustache 渲染模板
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
            formatted_create_time: article.create_time ? formatDateTime(article.create_time, this.dateFormat) : '',
            formatted_update_time: article.update_time ? formatDateTime(article.update_time, this.dateFormat) : ''
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
        
        // 处理多行文本，确保每行都有引用符号
        // 将文本按换行符分割，然后在每行前添加引用符号，最后重新组合
        if (text.includes('\n')) {
            // 分割文本为多行
            const lines = text.split('\n');
            // 为每行添加引用符号（第一行保持原样，因为模板中已经有 > 符号）
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
            formatted_create_time: highlight.create_time ? formatDateTime(highlight.create_time, this.dateFormat) : ''
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
} 
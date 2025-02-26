import { Notice } from 'obsidian';
import { formatISODateTime } from './utils';

export interface CuboxArticle {
    cardId: string;
    id: string; // 兼容原有接口
    title: string;
    description: string;
    url: string;
    domain: string;
    contentId: string;
    coverKey: string;
    isArchived: boolean;
    hasStar: boolean;
    createTime: string;
    updateTime: string;
    content?: string;
    highlights?: CuboxHighlight[];
    tags?: string[];
    folder?: string;
    type?: string;
}

export interface CuboxHighlight {
    id: string;
    text: string;
    note?: string;
    color?: string;
    createDate: string;
}

export interface CuboxApiOptions {
    domain: string;
    apiKey: string;
}

export interface CuboxFolder {
    id: string;
    name: string;
}

interface ListResponse {
    code: number;
    message: string;
    data: {
        list: CuboxArticle[];
    };
}

interface ContentResponse {
    code: number;
    message: string;
    data: string;
}

interface FoldersResponse {
    code: number;
    message: string;
    data: {
        list: CuboxFolder[];
    };
}

export class CuboxApi {
    private endpoint: string;
    private apiKey: string;

    constructor(options: CuboxApiOptions) {
        this.endpoint = `https://${options.domain}`;
        this.apiKey = options.apiKey;
    }

    /**
     * 测试 API 连接是否有效
     */
    async testConnection(): Promise<boolean> {
        try {
            // 尝试获取一篇文章来测试连接
         //   const result = await this.getArticles(1, 1);
            new Notice('测试 Cubox 连接成功');
            return true;
        } catch (error) {
            console.error('Cubox API 连接测试失败:', error);
            new Notice('Cubox API 连接失败，请检查域名和 API Key');
            return false;
        }
    }

    private async request(path: string, options: RequestInit = {}) {
        const url = `${this.endpoint}${path}`;
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };

        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * 获取文章列表
     * @param folders 文件夹过滤数组
     * @param type 类型过滤 
     * @param status 状态过滤 'all' | 'read' | 'starred' | 'annotated'
     * @param lastCardId 上一页最后一篇文章的ID
     */
    async getArticles(
        folders: string[] = [],
        type?: string,
        status?: string,
        lastCardId: string | null = null,
        pageSize: number = 50
    ): Promise<{
        articles: CuboxArticle[],
        hasMore: boolean,
        lastCardId: string | null
    }> {
        try {
            const searchParams = new URLSearchParams();
            
            if (lastCardId !== null && lastCardId.length > 0) {
                searchParams.append('lastCardId', lastCardId);
            }
            searchParams.append('pageSize', pageSize.toString());
            
            // 如果有选择文件夹，添加文件夹过滤参数
            if (folders && folders.length > 0) {
                searchParams.append('folders', folders.join(','));
            }
            
            // 添加状态过滤参数
            if (status && status !== 'all') {
                switch (status) {
                    case 'read':
                        searchParams.append('isRead', 'true');
                        break;
                    case 'starred':
                        searchParams.append('hasStar', 'true');
                        break;
                    case 'annotated':
                        searchParams.append('hasAnnotation', 'true');
                        break;
                }
            }

            const path = `/c/api/third-party/card/list?${searchParams.toString()}`;
            const response = await this.request(path) as ListResponse;
            
            const articles = response.data.list.map(article => {
                // 添加兼容字段，并格式化日期
                return {
                    ...article,
                    id: article.cardId,
                    createDate: article.createTime ? formatISODateTime(article.createTime) : '',
                    // 其他可能需要的兼容字段
                };
            });
            
            const hasMore = articles.length >= pageSize;
            const newLastCardId = articles.length > 0 ? articles[articles.length - 1].cardId : null;

            return {
                articles,
                hasMore,
                lastCardId: newLastCardId
            };
        } catch (error) {
            console.error('获取 Cubox 文章失败:', error);
            new Notice('获取 Cubox 文章失败');
            throw error;
        }
    }

    /**
     * 获取文章详情，包括内容
     * @param articleId 文章ID
     */
    async getArticleDetail(articleId: string): Promise<string | null> {
        try {
            const path = `/c/api/third-party/card/content?cardId=${articleId}`;
            const response = await this.request(path) as ContentResponse;
            
            // 直接返回文章内容
            return response.data;
        } catch (error) {
            console.error(`获取文章 ${articleId} 详情失败:`, error);
            new Notice(`获取文章详情失败`);
            return null;
        }
    }

    /**
     * 获取文章的高亮内容
     * @param articleId 文章ID
     */
    async getHighlights(articleId: string): Promise<CuboxHighlight[]> {
        try {
            // 这里需要实现获取高亮的API调用
            // 暂时返回空数组
            return [];
        } catch (error) {
            console.error(`获取文章 ${articleId} 高亮内容失败:`, error);
            new Notice(`获取高亮内容失败`);
            return [];
        }
    }

    /**
     * 获取用户的文件夹列表
     */
    async getFolders(): Promise<CuboxFolder[]> {
        try {
            const path = '/c/api/third-party/folder/list';
            const response = await this.request(path) as FoldersResponse;
            
            return response.data.list || [];
        } catch (error) {
            console.error('获取 Cubox 文件夹列表失败:', error);
            new Notice('获取 Cubox 文件夹列表失败');
            throw error;
        }
    }
} 
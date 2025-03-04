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
    nested_name: string;
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

    constructor(options: CuboxApiOptions) {
        this.endpoint = `https://${options.domain}`;
    }

    /**
     * 测试 API 连接是否有效
     */
    async testConnection(apiKey: string): Promise<boolean> {
        try {
            // 尝试获取一篇文章来测试连接
            const result = await this.getArticles(apiKey, { lastCardId: null, pageSize: 1 });
            new Notice('测试 Cubox 连接成功');
            return true;
        } catch (error) {
            console.error('Cubox API 连接测试失败:', error);
            new Notice('Cubox API 连接失败，请检查域名和 API Key');
            return false;
        }
    }

    private async request(path: string, apiKey: string, options: RequestInit = {}) {
        const url = `${this.endpoint}${path}`;
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
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
     * @param apiKey API密钥
     * @param params 请求参数
     */
    async getArticles(
        apiKey: string, 
        params: { 
            lastCardId: string | null; 
            pageSize?: number;
            folderFilter?: string[];
            typeFilter?: string[];
            statusFilter?: string[];
        } = { lastCardId: null }
    ): Promise<{ articles: CuboxArticle[], hasMore: boolean, lastCardId: string | null }> {
        try {
            const searchParams = new URLSearchParams();
            const pageSize = params.pageSize || 50;
            
            if (params.lastCardId !== null && params.lastCardId.length > 0) {
                searchParams.append('lastCardId', params.lastCardId);
            }
            searchParams.append('pageSize', pageSize.toString());
            
            // 添加文件夹过滤
            if (params.folderFilter && params.folderFilter.length > 0) {
                params.folderFilter.forEach(folder => {
                    searchParams.append('folderId', folder);
                });
            }
            
            // 添加类型过滤
            if (params.typeFilter && params.typeFilter.length > 0) {
                params.typeFilter.forEach(type => {
                    searchParams.append('type', type);
                });
            }
            
            // 添加状态过滤
            if (params.statusFilter && params.statusFilter.length > 0) {
                // 如果包含 'all'，则不添加状态过滤
                if (!params.statusFilter.includes('all')) {
                    if (params.statusFilter.includes('read')) searchParams.append('isRead', 'true');
                    if (params.statusFilter.includes('starred')) searchParams.append('isStarred', 'true');
                    if (params.statusFilter.includes('archived')) searchParams.append('isArchived', 'true');
                    if (params.statusFilter.includes('annotated')) searchParams.append('isAnnotated', 'true');
                }
            }

            const path = `/c/api/third-party/card/list?${searchParams.toString()}`;
            const response = await this.request(path, apiKey) as ListResponse;
            
            const articles = response.data.list;
            const hasMore = articles.length >= pageSize;
            const lastCardId = articles.length > 0 ? articles[articles.length - 1].cardId : null;

            return {
                articles,
                hasMore,
                lastCardId
            };
        } catch (error) {
            console.error('获取文章列表失败:', error);
            throw error;
        }
    }

    /**
     * 获取文章详情，包括内容
     * @param apiKey API密钥
     * @param articleId 文章ID
     */
    async getArticleDetail(apiKey: string, articleId: string): Promise<string | null> {
        try {
            const path = `/c/api/third-party/card/content?cardId=${articleId}`;
            const response = await this.request(path, apiKey) as ContentResponse;
            
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
     * @param apiKey API密钥
     * @param articleId 文章ID
     */
    async getHighlights(apiKey: string, articleId: string): Promise<CuboxHighlight[]> {
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
     * @param apiKey API密钥
     */
    async getFolders(apiKey: string): Promise<CuboxFolder[]> {
        try {
            const path = '/c/api/third-party/folder/list';
            const response = await this.request(path, apiKey) as FoldersResponse;
            
            return response.data.list.map(folder => ({
                ...folder,
                nested_name: folder.name
            }));
        } catch (error) {
            console.error('获取 Cubox 文件夹列表失败:', error);
            new Notice('获取 Cubox 文件夹列表失败');
            throw error;
        }
    }
} 
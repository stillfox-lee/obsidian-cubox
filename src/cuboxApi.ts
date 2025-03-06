import { Notice } from 'obsidian';
import { formatISODateTime } from './utils';
import { ALL_FOLDERS_ID } from './modal/folderSelectModal';
import { ALL_TAGS_ID } from './modal/tagSelectModal';
import { ALL_STATUS_ID } from './modal/statusSelectModal';

export interface CuboxArticle {
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
    highlights?: CuboxHighlight[];
    tags?: string[];
    type: string;
}

export interface CuboxHighlight {
    id: string;
    text: string;
    image_url?: string;
    cubox_url: string;
    note?: string;
    color: string;
    create_time: string;
}

export interface CuboxFolder {
    id: string;
    name: string;
    nested_name: string;
    uncategorized: boolean;
}

export interface CuboxTag {
    id: string;
    name: string;
    nested_name: string;
    parent_id: string | null;
}

interface ListResponse {
    code: number;
    message: string;
    data: CuboxArticle[];
}

interface ContentResponse {
    code: number;
    message: string;
    data: string;
}

interface FoldersResponse {
    code: number;
    message: string;
    data: CuboxFolder[];
}

interface TagsResponse {
    code: number;
    message: string;
    data: CuboxTag[];
}

export class CuboxApi {
    private endpoint: string;
    private apiKey: string;

    constructor(domain: string, apiKey: string) {
        this.endpoint =  'https://test.cubox.pro'//`https://${domain}`;
        this.apiKey = apiKey;
    }

    /**
     * 同时更新域名和 API Key
     */
    updateConfig(domain: string, apiKey: string): void {
        this.endpoint = 'https://test.cubox.pro'// `https://${domain}`;
        this.apiKey = apiKey;
    }

    /**
     * 测试 API 连接是否有效
     */
    async testConnection(): Promise<boolean> {
        try {
            // 尝试获取一篇文章来测试连接
            const result = await this.getArticles({ lastCardId: null});
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
     * @param params 请求参数
     */
    async getArticles(
        params: { 
            lastCardId: string | null; 
            folderFilter?: string[];
            typeFilter?: string[];
            statusFilter?: string[];
            tagsFilter?: string[];
            isRead?: boolean;
            isStarred?: boolean;
            isAnnotated?: boolean;
        } = { lastCardId: null }
    ): Promise<{ articles: CuboxArticle[], hasMore: boolean, lastCardId: string | null }> {
        try {
            // 创建请求体对象而不是URL参数
            const requestBody: Record<string, any> = {
                limit: 50
            };
            
            const pageSize = 50;
            
            if (params.lastCardId !== null && params.lastCardId.length > 0) {
                requestBody.lastCardId = params.lastCardId;
            }
            
            // 添加文件夹过滤
            if (params.folderFilter && params.folderFilter.length > 0) {
                // 检查是否包含 ALL_FOLDERS_ID，如果包含则不添加文件夹过滤
                const hasAllFoldersId = params.folderFilter.includes(ALL_FOLDERS_ID);
                if (!hasAllFoldersId) {
                    requestBody.group_filters = params.folderFilter;
                }
            }
            
            // 添加类型过滤
            if (params.typeFilter && params.typeFilter.length > 0) {
                requestBody.type_filters = params.typeFilter;
            }
            
            // 添加状态过滤
            if (params.statusFilter && params.statusFilter.length > 0) {
                const hasAllStatus = params.statusFilter.includes(ALL_STATUS_ID);
                if (!hasAllStatus) {
                    // 使用传入的布尔值参数，只有当参数为true时才添加
                    if (params.isRead === true) requestBody.read = true;
                    if (params.isStarred === true) requestBody.starred = true;
                    if (params.isAnnotated === true) requestBody.annotated = true;
                }
            }
            
            // 添加标签过滤
            if (params.tagsFilter && params.tagsFilter.length > 0) {
                // 检查是否包含 ALL_TAGS_ID，如果包含则不添加标签过滤
                const hasAllTagsId = params.tagsFilter.includes(ALL_TAGS_ID);
                if (!hasAllTagsId) {
                    requestBody.tag_filters = params.tagsFilter;
                }
            }

            const path = `/c/api/third-party/card/filter`;
            const response = await this.request(path, {
                method: 'POST',
                body: JSON.stringify(requestBody)
            }) as ListResponse;
            
            const articles = response.data;
            const hasMore = articles.length >= pageSize;
            const lastCardId = articles.length > 0 ? articles[articles.length - 1].id : null;

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
     * @param articleId 文章ID
     */
    async getArticleDetail(articleId: string): Promise<string | null> {
        try {
            const path = `/c/api/third-party/card/content?id=${articleId}`;
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
            const path = '/c/api/third-party/group/list';
            const response = await this.request(path) as FoldersResponse;
            
            return response.data;
        } catch (error) {
            console.error('获取 Cubox 文件夹列表失败:', error);
            new Notice('获取 Cubox 文件夹列表失败');
            throw error;
        }
    }

    /**
     * 获取用户的标签列表
     */
    async getTags(): Promise<CuboxTag[]> {
        try {
            const path = '/c/api/third-party/tag/list';
            const response = await this.request(path) as TagsResponse;
            
            return response.data;
        } catch (error) {
            console.error('获取 Cubox 标签列表失败:', error);
            new Notice('获取 Cubox 标签列表失败');
            throw error;
        }
    }
}
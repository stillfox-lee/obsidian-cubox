# Cubox API 实现分析

这个 Obsidian Cubox 插件通过以下方式实现从 Cubox API 获取文章和标注内容：

## API 实现架构

### 1. CuboxApi 类 (cuboxApi.ts)

插件使用 `CuboxApi` 类来封装所有与 Cubox API 的交互：

```typescript
export class CuboxApi {
    private endpoint: string;
    private apiKey: string;

    constructor(domain: string, apiKey: string) {
        this.endpoint = `https://${domain}`;
        this.apiKey = apiKey;
    }

    private async request(path: string, options: RequestInit = {}) {
        const url = `${this.endpoint}${path}`;
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };
        // ... 发送请求逻辑
    }
}
```

### 2. 核心 API 方法

#### 获取文章列表
`getArticles` 方法通过 POST 请求到 `/c/api/third-party/card/filter` 端点：

```typescript
async getArticles(params: { 
    lastCardId: string | null; 
    lastCardUpdateTime: string | null;
    folderFilter?: string[];
    typeFilter?: string[];
    statusFilter?: string[];
    tagsFilter?: string[];
    isRead?: boolean;
    isStarred?: boolean;
    isAnnotated?: boolean;
}): Promise<{ articles: CuboxArticle[], hasMore: boolean}> {
    const requestBody: Record<string, any> = {
        limit: 50
    };
    
    // 添加分页参数
    if (params.lastCardId && params.lastCardUpdateTime) {
        requestBody.last_card_id = params.lastCardId;   
        requestBody.last_card_update_time = params.lastCardUpdateTime;
    }
    
    // 添加各种过滤条件
    if (params.folderFilter?.length > 0) {
        requestBody.group_filters = params.folderFilter;
    }
    // ... 其他过滤条件
    
    const response = await this.request('/c/api/third-party/card/filter', {
        method: 'POST',
        body: JSON.stringify(requestBody)
    });
}
```

#### 获取文章详细内容
`getArticleDetail` 方法获取文章的完整内容：

```typescript
async getArticleDetail(articleId: string): Promise<string | null> {
    const path = `/c/api/third-party/card/content?id=${articleId}`;
    const response = await this.request(path) as ContentResponse;
    return response.data;
}
```

### 3. 数据结构定义

插件定义了完整的数据接口来处理 Cubox 返回的数据：

```typescript
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
    highlights?: CuboxHighlight[];  // 标注内容
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
```

## 同步流程实现

在 `main.ts` 中，`syncCubox` 方法实现了完整的同步逻辑：

### 1. 分页获取文章
```typescript
while (hasMore) {
    const result = await this.cuboxApi.getArticles({
        lastCardId: lastCardId,
        lastCardUpdateTime: lastCardUpdateTime,
        folderFilter: this.settings.folderFilter,
        typeFilter: this.settings.typeFilter,
        statusFilter: this.settings.statusFilter,
        tagsFilter: this.settings.tagsFilter,
        isRead: this.settings.isRead,
        isStarred: this.settings.isStarred,
        isAnnotated: this.settings.isAnnotated,
    });
    
    const { articles, hasMore: moreArticles} = result;
    // ... 处理文章
}
```

### 2. 按需获取文章内容
```typescript
// 检查内容模板是否需要文章内容
const needsContent = this.templateProcessor.needsArticleContent(this.settings.contentTemplate);

for (const article of articles) {
    let fullArticle = {...article};
    
    if (needsContent) {
        const content = await this.cuboxApi.getArticleDetail(article.id);
        if (content === null) continue;
        fullArticle.content = content;
    }
    // ... 处理和保存文章
}
```

## 关键特性

1. **增量同步**：使用 `lastCardId` 和 `lastCardUpdateTime` 实现增量同步，避免重复获取
2. **分页处理**：每次获取 50 条记录，支持大量数据的分页获取
3. **多维度过滤**：支持按文件夹、类型、状态、标签等多个维度过滤文章
4. **按需获取内容**：只有当模板需要文章内容时才会调用详情 API
5. **标注数据**：文章数据中包含 `highlights` 字段，包含所有标注信息
6. **错误处理**：完善的错误处理和重试机制

通过这种设计，插件能够高效地从 Cubox API 获取文章列表、详细内容和标注信息，并将其同步到 Obsidian 中。
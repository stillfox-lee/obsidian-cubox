# Obsidian Cubox Sync

![Obsidian Cubox Sync](https://img.shields.io/badge/Obsidian-Cubox%20Sync-7963E6)

> 将 Cubox 中的文章和标注同步到 Obsidian，打造无缝知识管理流程。

Obsidian Cubox Sync 是一个强大的 Obsidian 插件，它允许您将 Cubox 中收藏的文章、网页和标注内容自动同步到 Obsidian 笔记中。通过这个插件，您可以将 Cubox 作为信息收集工具，而 Obsidian 作为知识整理和思考工具，构建完整的个人知识管理系统。

## ✨ 主要功能

- **自动同步**：定时从 Cubox 同步文章和标注到 Obsidian
- **灵活过滤**：支持按文件夹、内容类型、状态和标签过滤同步内容
- **自定义模板**：使用 Mustache 模板语法自定义文件名、前置元数据和内容格式
- **高亮标注**：将 Cubox 中的高亮内容同步到 Obsidian 笔记中
- **增量同步**：智能识别新增和更新的内容，避免重复同步
- **手动触发**：支持通过命令或按钮手动触发同步

## 🚀 安装方法

### 从 Obsidian 社区插件库安装

1. 打开 Obsidian 设置
2. 进入 "第三方插件" 选项卡
3. 关闭 "安全模式"
4. 点击 "浏览" 按钮
5. 搜索 "Cubox Sync"
6. 点击安装

### 手动安装

1. 下载最新版本的 `main.js`、`manifest.json` 和 `styles.css` 文件
2. 在您的 Obsidian 库中创建 `.obsidian/plugins/obsidian-cubox-sync` 文件夹
3. 将下载的文件复制到该文件夹中
4. 在 Obsidian 设置中启用插件

## ⚙️ 配置说明

### 连接设置

1. **Cubox 服务器域名**：选择您使用的 Cubox 服务器域名（cubox.cc 或 cubox.pro）
2. **Cubox API 密钥**：输入您的 Cubox API 密钥（可在 Cubox 网页版设置中创建）

### 过滤设置

- **文件夹过滤**：选择要同步的 Cubox 文件夹
- **类型过滤**：选择要同步的内容类型（文章、视频、图片等）
- **状态过滤**：选择要同步的内容状态（已读、未读等）
- **标签过滤**：选择要同步的标签

### 同步设置

- **同步频率**：设置自动同步的时间间隔（分钟），设为 0 表示仅手动同步
- **目标文件夹**：设置同步内容保存到 Obsidian 的哪个文件夹
- **文件名模板**：设置生成的笔记文件名格式
- **前置元数据**：设置笔记的前置元数据字段
- **内容模板**：设置笔记内容的格式
- **日期格式**：设置日期时间的显示格式

## 🔍 模板变量

### 文件名模板变量

- `{{title}}` - 文章标题
- `{{article_title}}` - 原始文章标题
- `{{create_time}}` - 创建时间
- `{{update_time}}` - 更新时间
- `{{domain}}` - 域名
- `{{type}}` - 内容类型

### 前置元数据变量

- `title` - 文章标题
- `article_title` - 原始文章标题
- `tags` - 标签列表
- `create_time` - 创建时间
- `update_time` - 更新时间
- `domain` - 域名
- `url` - 原始链接
- `cubox_url` - Cubox 链接
- `description` - 描述
- `words_count` - 字数统计
- `type` - 内容类型
- `id` - 文章 ID

### 内容模板变量

- `{{title}}` - 文章标题
- `{{description}}` - 描述
- `{{content}}` - 文章内容
- `{{content_highlighted}}` - 带高亮的文章内容
- `{{highlights.length}}` - 高亮数量
- `{{#highlights}}` ... `{{/highlights}}` - 高亮内容循环
  - `{{text}}` - 高亮文本
  - `{{note}}` - 高亮笔记
  - `{{cubox_url}}` - 高亮链接
  - `{{color}}` - 高亮颜色
  - `{{create_time}}` - 高亮创建时间

## 📝 使用示例

### 基本内容模板示例

```
# {{{title}}}

{{{description}}}

[Read in Cubox]({{{cubox_url}}})
[Read Original]({{{url}}})

{{{content}}}

{{#highlights.length}}
## Annotations

{{#highlights}}
> {{{text}}}
{{{note}}}
[Link️]({{{cubox_url}}})

{{/highlights}}
{{/highlights.length}}
```

### 前置元数据示例

```
title,url,tags,create_time,domain
```

或使用别名：

```
title,url,tags,create_time::date,domain::source
```

## 🔄 同步流程

1. 插件会根据设置的频率自动同步，或者您可以手动触发同步
2. 同步时会根据过滤条件获取 Cubox 中的文章
3. 对于每篇文章，插件会根据模板生成文件名、前置元数据和内容
4. 生成的笔记会保存到指定的目标文件夹中
5. 同步完成后，状态栏会显示最后同步时间

## 🛠️ 开发者信息

### 构建项目

1. 克隆仓库
2. 安装依赖：`npm install`
3. 开发模式：`npm run dev`
4. 构建生产版本：`npm run build`

### 主要依赖

- Mustache：用于模板渲染
- Luxon：用于日期时间处理

## 📄 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Obsidian](https://obsidian.md/) - 知识管理工具
- [Cubox](https://cubox.pro/) - 网络内容收藏工具
- 所有贡献者和用户

---

如有问题或建议，请在 GitHub 仓库中提交 Issue。

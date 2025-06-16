# Obsidian Cubox 插件

Obsidian 官方 Cubox 插件，允许您将 Cubox 中的文章和标注同步到 Obsidian。

## 功能特性

- 自动同步：定期将 Cubox 中的文章和标注同步到 Obsidian
- 内容过滤：按文件夹、类型、标签和状态过滤内容
- 模板定制：自定义文件名、前置属性和内容格式
- 标注同步：将 Cubox 中的高亮内容同步到 Obsidian 笔记

## 安装方法

### 从社区插件安装

1. 打开 Obsidian 设置
2. 导航到"社区插件"选项卡
3. 点击"浏览"按钮并搜索"Cubox"
4. 点击安装

### 手动安装

1. 下载最新的 `main.js`、`manifest.json` 和 `styles.css` 文件
2. 在您的 Obsidian 库中创建 `.obsidian/plugins/obsidian-cubox` 文件夹
3. 将下载的文件复制到此文件夹中
4. 在 Obsidian 设置中启用插件

## 配置设置

1. Cubox 服务器域名：选择您使用的 Cubox 服务器域名（cubox.cc 或 cubox.pro）
2. Cubox API 密钥：输入您的 Cubox API 密钥或链接（在 Cubox 网页设置的扩展与自动化 - API 扩展中生成）

## 使用说明

1. 设置前，请确保您已选择正确的服务器并输入了 API 密钥
2. 只有满足所有过滤条件的内容才会被同步
3. 请参考设置页面中的模板变量参考链接
4. 每个项目只会从 Cubox 同步一次，Cubox 中的更新不会同步到 Obsidian，除非您更改目标文件夹
5. 建议设置较长的同步间隔或使用手动同步，以防止同步未完成的标注

## 依赖项

- [Mustache](https://mustache.github.io/)：模板渲染
- [Luxon](https://moment.github.io/luxon/#/formatting?id=table-of-tokens)：日期和时间处理

## 许可证

本项目采用 [MIT 许可证](https://choosealicense.com/licenses/mit/) 授权。
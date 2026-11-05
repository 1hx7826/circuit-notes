# 部署与维护

使用独立仓库 1hx7826/circuit-notes 和 GitHub Pages；不覆盖 STM32 与 CET6 的仓库。

本机开发副本为 web-app；唯一正文维护源为 content/course.md。修改 Markdown 后运行 npm test、npm run build，内容解析同时重新生成 docs/CONTENT_INVENTORY.md。课次 ID 为稳定的 L001—L078，增删课次需同步调整解析器的内容约束和测试。

发布准备脚本 scripts/prepare-release.mjs 只复制明确选取的必要源文件到 publish/circuit-notes 并生成 output/release-manifest.json，不创建远程仓库或部署。检查副本、哈希和测试后，在发布副本内提交并推送，再手动触发 pages.yml。工作流仅 workflow_dispatch，普通推送不会部署。

Pages 的 base 为 /circuit-notes/，路由使用 #/lesson/L005，因此分享链接及刷新不依赖服务器路由回退。若更改仓库名，需同步修改 web-app/vite.config.ts 的 base 并重建。

发布目录只含源码、Markdown 内容、必要文档、锁文件及工作流。原始输入文件名副本、output、.npm-cache、node_modules、截图、导出进度与私密环境变量不在发布范围。

个人记录不上传 GitHub。自动跨设备同步和离线 PWA 均不在本版范围内。

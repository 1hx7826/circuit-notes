# 电路手记 · STM32 硬件与 PCB

8 章、78 课完整笔记，以目录、正文和手机阅读为核心。全文本地搜索、快速复习、手动学习状态、收藏、最近阅读、明暗主题、大字号、进度 JSON 导入导出。

在线地址：https://1hx7826.github.io/circuit-notes/
源码仓库：https://github.com/1hx7826/circuit-notes

## 本地运行

在 web-app 目录运行 npm ci、npm run dev。开发地址为 http://127.0.0.1:5178/circuit-notes/ 。

生产检查：npm test 和 npm run build。生产预览 npm run preview，地址 http://127.0.0.1:4178/circuit-notes/ 。

正文唯一维护源为 content/course.md。构建时生成目录、搜索索引及各课 JSON，生成目录不提交。原始输入 Markdown 在本机根目录保留，发布副本只收录 content/course.md。

## 使用边界

第 01—05 课初始已掌握，第 06—78 课未开始。打开一课只更新最近阅读，不改变掌握状态。自检不是自动考试。

进度和收藏存于当前浏览器 localStorage，不自动跨设备同步；本地预览和线上也互相独立。导出 JSON 后在另一设备导入即可迁移。导入有格式校验、预览、自动导出当前备份及本次会话内撤销。浏览器数据清理会删除本机记录，应保留备份。

未启用离线 PWA；首次打开及按需加载新课程需要网络。实物电路与器件参数仍以对应厂商资料为准。工具箱保留原始资料链接，并补充嘉立创 EDA 专业版官方指南。

## 发布

按此前学习台流程使用独立发布副本和手动 GitHub Pages 工作流。参阅 docs/DEPLOYMENT.md；验收范围与限制见 docs/ACCEPTANCE.md。本机 output、浏览器测试记录和个人进度不会进入发布仓库。

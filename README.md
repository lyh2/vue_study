# vue_study

study three.js

### ===========================gstack 各角色功能说明===========================================

#### 🧠 gstack Skills 总表（中文说明版）

Skill 角色（中文） 核心作用
/office-hours 产品拷问官（YC导师） 从源头拷问你的需求，重构问题，输出设计文档
/plan-ceo-review CEO / 创始人 重新定义问题，找到更高价值方向（10倍产品）
/plan-eng-review 架构负责人 设计系统架构、数据流、边界情况和测试方案
/plan-design-review 设计评审官 给设计打分并优化，避免“AI拼接感”
/plan-devex-review 开发体验设计师 优化开发者使用体验（API/SDK/工具）
/autoplan 自动规划器 一键生成完整方案（CEO→设计→工程→DX）

#### 🏗 开发与实现阶段

Skill 角色（中文） 核心作用
/review 代码审查专家 找 CI 漏掉的 bug，自动修复简单问题
/investigate 问题侦探（Debugger） 深入排查 bug 根因，禁止盲目修复
/design-review UI 修复专家 检查并直接修复界面问题
/devex-review 开发体验测试员 实测开发流程是否顺畅（真实走一遍）

#### 🎨 设计工具链

Skill 角色（中文） 核心作用
/design-shotgun 设计探索器 一次生成多个设计方案供选择
/design-consultation 设计顾问 从0构建设计系统 + 创意方案
/design-html UI落地工程师 将设计稿转成可上线HTML代码

#### 🧪 测试与发布

Skill 角色（中文） 核心作用
/qa QA负责人 测试 + 修复 + 回归验证
/qa-only QA报告员 只报告问题，不修改代码
/ship 发布工程师 跑测试、检查、提交PR
/land-and-deploy 上线工程师 合并代码并部署到生产环境
/canary 运维监控（SRE） 监控线上错误、性能和稳定性
/benchmark 性能工程师 分析页面性能和优化效果
/document-release 技术文档工程师 更新项目文档，避免过时
/retro 项目复盘经理 分析项目表现，持续改进

#### 🔧 高级能力 / 辅助工具

Skill 角色（中文） 核心作用
/cso 安全负责人 检测漏洞（OWASP + 威胁建模）
/pair-agent 多AI协同调度 同时调用多个AI协作开发
/browse 浏览器执行器 让AI真实操作网页
/setup-browser-cookies 会话管理器 导入登录态测试真实用户场景
/learn 记忆系统 记录经验，让系统越用越聪明

#### ⚙️ 系统与工具类

Skill 角色（中文） 核心作用
/codex 第二意见专家 用不同模型做独立代码评审
/careful 安全提醒 危险操作前提醒
/freeze 编辑锁 限制修改范围
/guard 安全模式 careful + freeze
/unfreeze 解锁 解除限制
/open-gstack-browser GStack浏览器 启动带AI能力的浏览器
/setup-deploy 部署配置器 初始化部署流程
/setup-gbrain 知识系统初始化 配置记忆系统（gbrain）
/gstack-upgrade 自更新工具 更新 gstack

#### 🧪 独立 CLI 工具（非 skill）

命令 作用
gstack-model-benchmark 多模型性能/成本/效果对比
gstack-taste-update 学习你的设计偏好（UI风格进化）

#### 🧩 使用建议（关键）

场景 推荐
做产品/UI /plan-design-review
做API/SDK /plan-devex-review
做系统架构 /plan-eng-review
全流程 /autoplan

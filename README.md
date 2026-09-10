# 屋顶上的共富路——整村光伏建设全周期操作方案与数智治理研究（网站）

「沐光共富 Solar Common」品牌站点，屋顶上的共富路项目组出品。面向政府、企业、村集体、农户四类读者的整村光伏展示与实用工具网站。

## 访问方式

**线上访问（推荐）**：本站已通过 GitHub Pages 上线，浏览器直接打开即可，无须下载安装。

**本地浏览**：下载本仓库后，直接双击 `index.html`，或在本目录运行 `python -m http.server 8080` 后访问 `http://localhost:8080/`。全部样式、脚本、数据均本地化，无外部依赖。

## 关闭动画（可选）

- 在网址后加参数 `?static=1`（如 `index.html?static=1`），或
- 操作系统开启“减少动态效果”（prefers-reduced-motion，代码已支持该媒体查询）。

两种情况下所有滚动动效、粒子与数字滚动自动降级，内容完整呈现；打印时全部区块强制可见、文字强制转黑。

## 架构

静态前端＋Supabase 云数据库＋离线缓存回退：

- **前端**：原生 HTML＋CSS＋JS（无框架、无外部 CDN），GitHub Pages 托管。
- **云端**：Supabase（PostgreSQL＋PostgREST），政策库 `gf_policies`（119 条）、项目库 `gf_projects`（62 条）实时读取，预约登记 `bookings` 实时写入；行级安全策略下匿名角色只读数据表、只能写入预约表。
- **回退**：`assets/js/config.js` 未配置或连接失败时，所有接口返回 `null`，页面自动回退到 `assets/js/data.js` 内置的离线缓存数据（口径与云端一致），演示永不中断；页面右下角自动显示连接状态徽标（实时数据库／离线缓存）。

## 目录结构

```
gongfulu/
├── index.html          # 首页（Hero＋四角色入口＋东高垣数据速览）
├── model.html          # 模式页（东高垣范式图解）
├── gov.html            # 政府视图（政策检索库 119 条，云端优先＋本地回退）
├── ent.html            # 企业视图
├── village.html        # 村干部视图（明白纸生成、M-1~M-20 空白模板预览与打印）
├── farmer.html         # 农户视图（骗局识别器、租金对比）
├── pension.html        # 光伏养老（养老计算器、25 年现金流表、累计面积图）
├── eval.html           # 五维评估（产业/生态/治理/文化/生活）
├── tools.html          # 工具箱（收益测算、项目匹配 62 项〔云端优先＋本地回退〕、
│                       #   合同条款生成器、风险扫描、健康评级、租金公示、
│                       #   明白纸生成、骗局识别、办事指引、术语词典、FAQ 检索）
├── cases.html          # 案例页（实景与人物故事）
├── trust.html          # 背书页（村两委回函、成果清单）
├── booking.html        # 预约调研（在线写入云端 bookings 表，离线回退本机编号）
├── assets/
│   ├── css/main.css    # 全站样式（含打印样式与动画降级规则）
│   ├── js/config.js    # 数据库连接配置（Project URL 与 anon public key）
│   ├── js/api.js       # 数据接入层 window.MG（政策/项目读取、预约写入、状态徽标）
│   ├── js/data.js      # 静态业务数据资源文件（云端数据的离线缓存，口径与云端一致）：
│   │                   #   window.PVDATA（政策 119 条、项目 62 项、FAQ 60 条、
│   │                   #   术语 60 条、案例 11 条、模板 20 张）＋测算常量 window.PVCONST
│   ├── js/main.js      # 共享逻辑（导航/页脚注入、动效、术语自动标注、
│   │                   #   打印隔离 PV.printZone、对比条形图 PV.cmpBars）
│   └── js/effects.js   # 动效（粒子、3D 柱图、流水线动画）
└── README.md           # 本说明
```

## 互链关系

- 页脚（`assets/js/main.js` 注入）含外链「相关工具：东高垣数字治理工作站」→ `https://lx-marx.github.io/donggaoyuan-workstation/`。
- 两站共用同一 Supabase 项目：本站使用 `gf_` 前缀数据表，工作站使用 `ws_` 前缀数据表；预约登记共用 `bookings` 表，以 `site` 字段（`gongfulu`／`workstation`）区分来源。

## 数据口径声明

- 东高垣村数据：2026 年 2 月企业访谈与入户访谈口径。
- 全县数据：均标注“大荔县全县（含东高垣村），截至 2025 年 7—8 月企业台账”。
- 企业与人物均按调研规范匿名化；评分与测算类数据均已注明主观或测算属性。

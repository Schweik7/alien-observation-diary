# 地球人观察日记 · 卡牌画廊（三国杀风格）

为桌游《地球人观察日记》设计的卡牌 UI，用 **Vite + React** 实现。把游戏里所有卡牌渲染成一个响应式画廊，三国杀风格（华丽边框、卡名横幅、左上角角标、底部描述框）。

现阶段不接真实美术：每张卡的**配图区**放一段自动生成的**图像提示语（art prompt）**作为占位，描述这张卡应该画什么，符合「外星观测档案 / 复古科幻」的视觉调性。

## 运行

```bash
cd card-app
npm install
npm run dev      # 本地开发，默认 http://localhost:5173 自动打开
npm run build    # 生产构建，产物在 dist/
npm run preview  # 预览构建产物
```

## 三种卡牌类型与版式

| 类型 | 模式 | 版式重点 |
|---|---|---|
| **事件卡** | 模式甲（外星观测报告） | 档案感：观测记录框 + 提问框，按暴露度配色 |
| **反应卡** | 模式乙的反应指示卡 | 大号情绪 emoji 图标 + 发光光晕 + 四色系标签 |
| **场景卡** | 模式乙的场景 | 第二人称画面感：斜体引号 + 归属反应 |

## 配色方案

- **暴露度色系**（事件卡 / 场景卡的主题色）：
  - 🟢 绿 = 轻松（青绿）
  - 🟡 黄 = 真实小事（琥珀金）
  - 🔴 红 = 掏心窝高暴露（赤橙）
- **反应卡四色系**（按卡名 emoji 自动映射，见 `src/data/cardTheme.js` 的 `REACTION_SERIES`）：
  - 💧 求抱系（绿）、🔥 炸毛系（红）、🧊 躲开系（青蓝）、😌 正向（金）
  - 另含扩展情绪：😰 焦虑（紫）、😔 失落（灰蓝）、😤 委屈（玫红）

配色统一由 CSS 自定义属性驱动（`--accent / --glow / --band / --ink-bg`），在各卡组件里按主题注入。

## 关键组件

```
src/
├── main.jsx                  入口
├── App.jsx                   容器：加载数据、筛选状态、画廊网格
├── styles/global.css         全部视觉样式（三国杀风格边框、扫描线、光晕）
├── components/
│   ├── FilterBar.jsx         顶部筛选条（按卡牌类型 / 暴露度）
│   ├── GameCard.jsx          分发器：按 type 选版式
│   ├── EventCard.jsx         事件卡版式
│   ├── ReactionCard.jsx      反应卡版式（大号 emoji）
│   ├── SceneCard.jsx         场景卡版式（第二人称）
│   └── ArtPlaceholder.jsx    配图占位框（渲染 art prompt）
└── data/
    ├── sampleCards.js        内置 14 张示例卡（摘自 v0.1），保证离线可跑
    ├── parseCsv.js           稳健 CSV 解析 + loadCards（带回退）
    └── cardTheme.js          配色 / 角标 / art prompt 生成逻辑
```

## 接入完整 120 张 CSV

加载器 `loadCards()` 会先尝试抓取外部 CSV，失败则**自动回退**到内置示例卡——应用永远能跑。

接入步骤（任选其一）：

1. **拷文件（推荐）**：把完整 CSV（如 `外星观察日记_高年级版卡牌库_v0.2.csv`）复制到 `card-app/public/` 目录，并重命名为 **`cards.csv`**。
   - 加载点在 `src/App.jsx` 顶部：`const CSV_URL = \`${import.meta.env.BASE_URL}cards.csv\``
   - 刷新页面，顶部状态会从「内置示例」变为「外部 CSV」，卡数变为 120。

2. **改文件名**：若不想重命名 CSV，把 `public/` 里的实际文件名填进 `App.jsx` 的 `CSV_URL` 即可（URL 里中文需 `encodeURIComponent`，故仍建议用英文名 `cards.csv`）。

### CSV 列要求

解析器按**表头名**匹配列（不依赖列顺序），支持的列：

```
卡牌ID,卡牌类型,暴露度,子类,卡名,外星观测/场景描述,提问或归属,备注
```

`parseCsv.js` 已处理：引号包裹字段、字段内逗号、字段内换行、转义双引号 `""`、CRLF/LF、UTF-8 BOM、脏行过滤。v0.1 与并行生成的 v0.2（列结构相同）都能直接吃。

- `卡牌类型` 取值：`事件卡` / `反应卡` / `场景卡`
- `暴露度` 取值：`绿` / `黄` / `红`（驱动主题色）
- 反应卡的四色系由卡名里的 emoji（💧🔥🧊😌😰😔😤）自动推断，无需额外列。

## art prompt 如何生成

见 `cardTheme.js` 的 `buildArtPrompt(card)`：按卡牌类型与暴露度定制画面、视角与情绪，统一加上「复古科幻外星观测档案风，冷色调监控扫描线，胶片颗粒」前缀。将来接真实美术时，把 `ArtPlaceholder` 换成 `<img>` 即可，prompt 可直接喂给绘图模型。

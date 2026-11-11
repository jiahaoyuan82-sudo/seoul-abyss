# 서울: 심연 · SEOUL ABYSS（首尔·深渊感染）

> A first-person zombie survival web game by **Yuan Jiahao**
> 第一人称丧尸末日生存网页游戏 —— 躲避丧尸、搜集物资、活过首尔的这一夜。

## 故事背景 / Story

某个港口进口了一批携带未知病毒的深海生物，供某研究所研究。防疫人员检查时病毒意外泄露，许多工作人员不慎让生物血液接触到头部而被感染。感染在 48 小时内席卷首尔。

你是首尔一名普通的在读大学生 **Yuan Jiahao**。凌晨 2 点 47 分，你必须离开出租屋外出搜集物资，再活着回来。

开场剧情用**韩语配音**（浏览器语音合成 ko-KR），字幕为**中文在上、韩语在下（小号）**。

## 玩法 / How to play

| 按键 | 作用 |
|---|---|
| `W A S D` | 移动 |
| 鼠标 | 环顾 |
| `Shift` | 奔跑（声音大、消耗体力） |
| `C` | 蹲伏潜行（更安静；蹲在车后可以挡住丧尸视线） |
| `F` | 开 / 关手电筒（开灯视野好，但丧尸更容易看见你） |
| `E` | 拾取物资 / 进入出租屋 |
| `[` `]` | 调节画面亮度 |
| `Esc` | 暂停 |

**目标**：在街区里收集至少 6 件物资（矿泉水、罐头、泡面、急救包、电池），回到北端亮着绿灯的出租屋（원룸）。

**丧尸**
- 蹒跚型：动作迟缓、四肢抽搐，但会被声音吸引
- 狂奔型：一旦发现你会剧烈抽搐，然后全速冲过来（比你跑得慢不了多少）
- 啃食型：跪在地上进食，注意力较低，但被惊动后会起身追击
- 一只丧尸发现你后会惊动附近的同伴

## 运行 / Run locally

项目是纯静态网页，没有构建步骤。由于使用了 ES Module，需要通过本地服务器打开（直接双击 `index.html` 会被浏览器拦截）：

```bash
# 任选一种
python -m http.server 8000
npx serve .
```

然后访问 http://localhost:8000 。推荐使用桌面版 Chrome / Edge，并佩戴耳机。

> 3D 引擎 three.js 通过 CDN（cdn.jsdelivr.net）加载，需要联网。
> 韩语配音依赖系统自带的韩语语音：Windows 可在「设置 → 时间和语言 → 语音」中添加韩语；macOS / Chrome 通常自带。如果没有韩语语音，字幕仍会正常播放。

## 部署到 GitHub Pages

1. 新建仓库，把本文件夹里的所有文件推送上去：
   ```bash
   git init
   git add .
   git commit -m "Seoul Abyss: menu, Korean intro, first playable street"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/seoul-abyss.git
   git push -u origin main
   ```
2. 仓库 → **Settings → Pages** → Source 选 `Deploy from a branch`，分支选 `main` / `(root)`，保存。
3. 一两分钟后即可通过 `https://<你的用户名>.github.io/seoul-abyss/` 游玩。

## 项目结构

```
seoul-abyss/
├── index.html        # 页面结构：主菜单 / 剧情 / 游戏 HUD
├── css/style.css     # 全部样式与动画
└── js/
    ├── main.js       # 主菜单（雨夜首尔动态背景）与流程控制
    ├── intro.js      # 开场剧情：韩语配音 + 中韩双语字幕 + 场景动画
    ├── audio.js      # 程序化音效（雨声、嘶吼、心跳、脚步……无音频文件）
    ├── world.js      # 首尔街区：程序化贴图、建筑、韩文招牌、车辆、灯光、雨
    ├── zombie.js     # 丧尸模型、程序化动画与 AI（视觉 / 听觉 / 追击）
    └── game.js       # 第一人称控制、手电筒、物资、HUD、胜负
```

所有贴图、模型和声音都是代码实时生成的，仓库里没有任何外部素材文件。

## 路线图 / Roadmap

- [x] 主菜单、开场剧情（韩语配音 + 双语字幕）
- [x] 第一章：首尔街区之夜（潜行、物资、三种丧尸）
- [ ] 室内场景（便利店、宿舍楼、地铁站）
- [ ] 存档 / 继续游戏
- [ ] 背包与物资消耗（饥饿、口渴）
- [ ] 近战武器与路障
- [ ] 更多章节与结局

---

© 2026 Yuan Jiahao. All rights reserved.

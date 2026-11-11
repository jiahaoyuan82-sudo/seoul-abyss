# 画面与配音素材指南

游戏会自动检测仓库根目录里的下面这些文件。**有就用，没有就用程序画面兜底**，不需要改任何代码。

| 文件名 | 用途 | 建议尺寸 |
|---|---|---|
| `menu.jpg` | 主菜单背景 | 2560×1440（16:9） |
| `intro1.jpg` ~ `intro7.jpg` | 开场剧情 7 个画面 | 1920×1080（16:9） |
| `voice1.mp3` ~ `voice7.mp3` | 开场剧情 7 句韩语女声（可选） | — |

> 支持 `.jpg / .png / .webp`，文件名必须完全一致（全小写）。单张图建议压缩到 1MB 以内，加载更快。

---

## 一、统一风格后缀（每条提示词末尾都加上）

**English（Midjourney / Flux / SDXL / DALL·E）**
```
photorealistic, cinematic film still, shot on ARRI Alexa, 35mm lens, natural overcast light, muted desaturated colors, cold teal and grey tones with dim sodium-orange accents, heavy atmosphere, light rain and haze, film grain, oppressive and bleak mood, ultra detailed, no text, no watermark, no logo --ar 16:9 --style raw
```

**中文（即梦 / 可灵 / 通义万相 / 豆包）**
```
超写实电影剧照，ARRI 摄影机拍摄，35mm 镜头，阴天自然光，低饱和度，冷青灰色调夹杂暗淡的钠灯橙光，雾气与细雨，胶片颗粒，压抑荒凉的氛围，细节丰富，无文字，无水印，16:9
```

---

## 二、主菜单 `menu.jpg`

> 构图要点：**左侧三分之一要暗、要空**（放标题和"开始游戏"），城市主体放在画面右半边。

```
Wide view of Seoul at dusk during a zombie outbreak, seen from a rooftop in Mapo district, dense apartment blocks and rain-soaked streets with Korean neon signs half broken, abandoned cars with hazard lights on an empty boulevard, black smoke rising from several distant fires, N Seoul Tower faint in thick fog on the right, low heavy clouds, dark empty negative space on the left third of the frame, + 风格后缀
```
中文版：
```
僵尸病毒爆发中的首尔黄昏全景，从麻浦区楼顶俯瞰，密集的公寓楼和被雨淋湿的街道，半坏的韩文霓虹招牌，空荡大道上停着打着双闪的废弃汽车，远处几处火灾冒出黑烟，右侧浓雾中隐约可见南山塔，低垂厚重的云层，画面左侧三分之一是昏暗的留白，+ 风格后缀
```

---

## 三、开场剧情 7 帧

| 文件 | 对应台词 | 提示词（English，末尾加风格后缀） |
|---|---|---|
| `intro1.jpg` | 2026年秋，首尔 | Aerial view of Seoul skyline in late autumn, Han River and bridges under a grey overcast sky, evening city lights starting to turn on, calm but ominous, distant haze |
| `intro2.jpg` | 港口进口深海生物 | Container port at night in heavy rain, a rusty cargo ship docked, several sealed refrigerated containers marked with yellow biohazard symbols, cranes and sodium floodlights, wet asphalt reflections, a few workers in raincoats |
| `intro3.jpg` | 研究所研究病毒 | Inside a dim research laboratory, a large cylindrical glass tank filled with murky water containing an unknown deep-sea creature with long translucent tentacles and faint bioluminescent spots, cold cyan light, scientists' silhouettes in the background |
| `intro4.jpg` | 防疫检查时泄露 | Quarantine officers in white hazmat suits and respirators inspecting an opened shipping container, a cracked glass specimen tank leaking dark fluid on the floor, red emergency warning lights flashing, tense moment, motion blur |
| `intro5.jpg` | 血液接触头部被感染 | A quarantine worker in a white protective suit kneeling and clutching his head, dark blood splattered across his face shield and hood, red emergency light, other workers backing away in panic, shallow depth of field, not gory |
| `intro6.jpg` | 感染蔓延全城 | Chaotic Seoul street at night seen from above, crowds of people running in panic between cars, overturned vehicles burning, police car lights flashing red and blue, smoke and rain, Korean shop signs |
| `intro7.jpg` | 我，必须活下去 | Inside a small Korean university student's one-room apartment at night, view from behind a young man standing at a rain-streaked window, the city outside burning in the distance, a smartphone on the desk glowing with an emergency alert, cramped room with instant noodles, water bottles and books, cold blue and faint orange light |

中文版（同样末尾加风格后缀）：

1. 深秋的首尔城市天际线航拍，汉江与大桥，灰色阴天，傍晚城市灯光刚刚亮起，平静但不祥，远处薄雾
2. 暴雨中的夜晚集装箱港口，停靠着一艘锈迹斑斑的货轮，几个贴着黄色生物危害标志的密封冷藏集装箱，起重机和钠灯照明，湿漉漉的地面反光，几名穿雨衣的工人
3. 昏暗的研究所实验室内部，一个巨大的圆柱形玻璃水槽，浑浊的水中有一只长着半透明长触手、带微弱生物荧光斑点的未知深海生物，冷青色光线，背景中科研人员的剪影
4. 身穿白色防护服和防毒面具的检疫人员正在检查一个打开的集装箱，一个破裂的玻璃标本罐正往地上渗出深色液体，红色应急警报灯闪烁，紧张的瞬间，动态模糊
5. 一名穿白色防护服的检疫人员跪在地上抱着头，深色血液溅满他的面罩和头罩，红色应急灯光，其他工作人员惊慌后退，浅景深，不血腥
6. 从高处俯瞰混乱的首尔夜晚街道，人群在车辆间惊慌奔逃，翻倒的汽车在燃烧，警车红蓝灯闪烁，浓烟与雨，韩文店铺招牌
7. 夜晚韩国大学生狭小的单间公寓（원룸）内部，从背后看一个年轻男生站在满是雨痕的窗前，窗外远处城市在燃烧，桌上的手机亮着紧急灾难短信，狭窄的房间里堆着泡面、矿泉水和书本，冷蓝色与微弱的橙色光线

> 小技巧：7 张图用同一个风格后缀、同一个模型、同一套参数生成，放在一起才像同一部电影。生成后挑最暗、最压抑的那张。

---

## 四、韩语女声配音（可选，但强烈推荐）

不放配音文件时，游戏会用浏览器自带的韩语女声朗读。**用 Edge 浏览器打开效果最好**（有 SunHi 神经网络女声，非常流畅）。

如果想让所有人听到的声音都一样流畅，可以用微软免费的 `edge-tts` 生成 7 个 mp3 文件（需要安装 Python）：

```bash
pip install edge-tts

edge-tts --voice ko-KR-SunHiNeural --rate=-8% --text "2026년 가을, 대한민국 서울." --write-media voice1.mp3
edge-tts --voice ko-KR-SunHiNeural --rate=-8% --text "어느 항구에, 정체를 알 수 없는 심해 생물들이 수입되었다." --write-media voice2.mp3
edge-tts --voice ko-KR-SunHiNeural --rate=-8% --text "그 생물들의 몸속에는 미지의 바이러스가 있었고, 한 연구소가 연구를 위해 들여온 것이었다." --write-media voice3.mp3
edge-tts --voice ko-KR-SunHiNeural --rate=-8% --text "그러나 방역 요원들이 검사를 하던 중, 바이러스는 자신도 모르는 사이에 유출되고 말았다." --write-media voice4.mp3
edge-tts --voice ko-KR-SunHiNeural --rate=-8% --text "많은 직원들이 실수로 그 생물의 피를 머리에 뒤집어썼고, 결국 감염되고 말았다." --write-media voice5.mp3
edge-tts --voice ko-KR-SunHiNeural --rate=-8% --text "감염은 순식간에 도시 전체로 퍼져 나갔다." --write-media voice6.mp3
edge-tts --voice ko-KR-SunHiNeural --rate=-8% --text "그리고 나, 서울의 평범한 대학생 위안자하오. 살아남아야 한다." --write-media voice7.mp3
```

把生成的 `voice1.mp3` ~ `voice7.mp3` 上传到仓库根目录即可。
语速可以用 `--rate` 调整（如 `-15%` 更慢更沉），音调用 `--pitch=-5Hz` 稍微压低会更压抑。

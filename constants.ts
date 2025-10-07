

import { ComicFormat, DrawingStyle, LayoutTemplate } from './types';

export const DRAWING_STYLES = [
  { id: DrawingStyle.JAPANESE_SHONEN, name: '日式少年漫画' },
  { id: DrawingStyle.AMERICAN_REALISTIC, name: '美式写实漫画' },
  { id: DrawingStyle.CHIBI, name: 'Q版 / 赤壁风格' },
  { id: DrawingStyle.INK_WASH, name: '水墨画风格' },
];

export const COMIC_FORMATS = [
  { id: ComicFormat.WEBTOON, name: '网络漫画 (竖版长条)' },
  { id: ComicFormat.PAGE, name: '标准页漫 (横版)' },
];

// Re-organized and expanded based on professional comic/film terminology.
export const CAMERA_SHOTS = [
  // --- By Distance ---
  "建场镜头",       // Establishing Shot
  "全景",           // Full / Long Shot
  "中远景 (牛仔镜头)", // Medium Long Shot / Cowboy Shot
  "中景",           // Medium Shot
  "特写镜头",       // Close-up
  "大特写",         // Extreme Close-up
  "插入镜头 (特写道具)", // Insert Shot
  
  // --- By Angle ---
  "主观视角",       // Point-of-View (POV) Shot
  "过肩镜头",       // Over-the-Shoulder Shot
  "仰拍",           // Low-Angle Shot
  "虫瞰视角 (极端仰拍)", // Worm's-eye View
  "俯拍",           // High-Angle Shot
  "鸟瞰视角 (极端俯拍)", // Bird's-eye View
  "斜角镜头 (荷兰角)", // Dutch Angle / Canted Angle

  // --- Narrative & Stylistic ---
  "反应镜头",       // Reaction Shot
  "动态动作分镜",   // Dynamic Action Panel
  "序列镜头 (分解动作)", // Sequence Shot
  "突破画框",       // Breaking the Frame
  "无声分镜",       // Silent Panel
];


export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'single-panel',
    name: '单分镜 (整页)',
    panelCount: 1,
    description: '整个图像是一个单独的、大的分镜，常用于展示宏大场景或关键时刻 (Splash Page)。',
    style: { display: 'flex', flexDirection: 'row', gap: '8px' },
    panelStyles: [{ flex: 1 }],
  },
  {
    id: '2-horizontal',
    name: '水平两分镜',
    panelCount: 2,
    description: '图像水平平均分为两个并排的分镜。左边是分镜1，右边是分镜2。',
    style: { display: 'flex', flexDirection: 'row', gap: '8px' },
    panelStyles: [{ flex: 1 }, { flex: 1 }],
  },
  {
    id: '2-vertical',
    name: '垂直两分镜',
    panelCount: 2,
    description: '图像垂直平均分为两个分镜。上面是分镜1，下面是分镜2。',
    style: { display: 'flex', flexDirection: 'column', gap: '8px' },
    panelStyles: [{ flex: 1 }, { flex: 1 }],
  },
  {
    id: '3-vertical',
    name: '垂直三分镜',
    panelCount: 3,
    description: '图像垂直平均分为三个等高的分镜。从上到下依次是分镜1、分镜2和分镜3。',
    style: { display: 'flex', flexDirection: 'column', gap: '8px' },
    panelStyles: [{ flex: 1 }, { flex: 1 }, { flex: 1 }],
  },
   {
    id: '4-grid',
    name: '四宫格 (2x2)',
    panelCount: 4,
    description: '图像被平均分割成一个2x2的网格，共四个分镜。顺序为左上(1)、右上(2)、左下(3)、右下(4)。',
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px' },
    panelStyles: [{}, {}, {}, {}],
  },
  {
    id: 'hero-top',
    name: '顶部主分镜',
    panelCount: 3,
    description: '页面布局如下：一个大的、横跨整个页面宽度的分镜1在顶部，占据页面上半部分。分镜2和分镜3并排在底部，各占一半宽度。',
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px' },
    panelStyles: [{ gridColumn: 'span 2' }, {}, {}],
  },
  {
    id: 'hero-left',
    name: '左侧主分镜',
    panelCount: 3,
    description: '页面布局如下：一个大的、垂直的分镜1在左侧，占据页面一半宽度和全部高度。分镜2和分镜3在右侧垂直堆叠，各占一半高度。',
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px' },
    panelStyles: [{ gridRow: 'span 2' }, {}, {}],
  },
    {
    id: 'hero-bottom',
    name: '底部主分镜',
    panelCount: 3,
    description: '页面布局如下：分镜1和分镜2并排在顶部，各占一半宽度。一个大的、横跨整个页面宽度的分镜3在底部，占据页面下半部分。',
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px' },
    panelStyles: [{}, {}, { gridColumn: 'span 2' }],
  },
  {
    id: 'top-plus-4-grid',
    name: '顶部+四宫格',
    panelCount: 5,
    description: '页面布局如下：一个横跨整个页面宽度的分镜1在顶部。分镜2、3、4、5在下方形成一个2x2的网格。顺序为左上(2)、右上(3)、左下(4)、右下(5)。',
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto 1fr 1fr', gap: '8px' },
    panelStyles: [{ gridColumn: 'span 2' }, {}, {}, {}, {}],
  },
  {
    id: '4-vertical-montage',
    name: '垂直四分镜',
    panelCount: 4,
    description: '图像被垂直分为四个等高的水平条状分镜，从上到下依次为分镜1到4。适合表现快速的动作序列或时间流逝。',
    style: { display: 'flex', flexDirection: 'column', gap: '8px' },
    panelStyles: [{ flex: 1 }, { flex: 1 }, { flex: 1 }, { flex: 1 }],
  },
  {
    id: '2-diagonal',
    name: '斜切分镜',
    panelCount: 2,
    description: '图像被一条强烈的对角线（例如从左上到右下）分割成两个三角形分镜。分镜1占据一个三角，分镜2占据另一个。这种布局能创造出极强的动态感和紧张感。',
    style: { display: 'flex', flexDirection: 'row', gap: '8px', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' },
    panelStyles: [{ flex: 1, clipPath: 'polygon(0 0, 100% 0, 0 100%)', marginRight: '-1px' }, { flex: 1, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }],
  },
  {
    id: 'inset-panel',
    name: '画格嵌套',
    panelCount: 2,
    description: '一个大的主分镜（分镜1）占据了画面的绝大部分。一个小得多的嵌入式分镜（分镜2）被叠加在主分镜的一个角落（例如右上角），用于展示特写细节、角色反应或内心想法。',
    style: { position: 'relative', width: '100%', height: '100%', display: 'block' },
    panelStyles: [
      { width: '100%', height: '100%', position: 'absolute' }, 
      { position: 'absolute', top: '8px', right: '8px', width: '40%', height: '40%', border: '2px solid #1F2937' }
    ],
  },
  {
    id: 'borderless-3-montage',
    name: '无框意识流',
    panelCount: 3,
    description: '创建一个没有分镜边框的、单一无缝的图像。分镜1、2、3中描述的场景应该相互融合、流动，没有清晰的分割线。此布局非常适用于表现梦境、回忆或意识流效果。',
    style: { display: 'flex', flexDirection: 'column', gap: '8px' },
    panelStyles: [{ flex: 1 }, { flex: 1 }, { flex: 1 }],
  },
  {
    id: 'custom',
    name: '自定义',
    panelCount: 1, // Default, will be overridden
    description: '用户自定义布局。', // Will be overridden
    style: {}, // Not used by custom logic
    panelStyles: [], // Not used by custom logic
  },
];

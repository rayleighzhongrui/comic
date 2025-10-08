

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

// Base styles for panels to ensure consistency and better visual feedback
const basePanelStyle = { border: '2px solid #9CA3AF', background: '#4B5563', borderRadius: '1px' };
const heroPanelStyle = { ...basePanelStyle, background: '#6B7280' }; // A slightly lighter background for hero panels
const baseLayoutStyle = { padding: '4px', border: '1px solid #4B5563', borderRadius: '2px' };

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'single-panel',
    name: '整页冲击力',
    panelCount: 1,
    description: 'Splash Page。用单张大图呈现宏大场景、关键动作或戏剧性开场。能瞬间抓住读者注意力，带来强烈视觉震撼。',
    style: { ...baseLayoutStyle, display: 'flex' },
    panelStyles: [heroPanelStyle],
  },
  {
    id: '2-horizontal',
    name: '并列对比',
    panelCount: 2,
    description: '并排展示两个画面，非常适合表现对话、因果关系（动作与反应），或同时发生的两个场景。创造一种平衡稳定的感觉。',
    style: { ...baseLayoutStyle, display: 'flex', flexDirection: 'row', gap: '6px' },
    panelStyles: [basePanelStyle, basePanelStyle],
  },
  {
    id: '2-vertical',
    name: '时间流逝',
    panelCount: 2,
    description: '上下排列的两个分镜引导读者视线向下，天然适合表现时间的先后顺序或一个动作的两个阶段。',
    style: { ...baseLayoutStyle, display: 'flex', flexDirection: 'column', gap: '6px' },
    panelStyles: [basePanelStyle, basePanelStyle],
  },
  {
    id: '3-vertical',
    name: '叙事节拍器',
    panelCount: 3,
    description: '经典的叙事节拍器。用它来分解一个连续动作 (A→B→C)，展示角色从“观察”到“思考”再到“反应”的心理过程，或通过层层递进的画面营造悬念。',
    style: { ...baseLayoutStyle, display: 'flex', flexDirection: 'column', gap: '6px' },
    panelStyles: [basePanelStyle, basePanelStyle, basePanelStyle],
  },
   {
    id: '4-grid',
    name: '叙事基石 (2x2)',
    panelCount: 4,
    description: '节奏稳定、信息量大。非常适合日式四格漫画，或在一个页面内紧凑地讲述一个包含“起承转合”的完整小故事。',
    style: { ...baseLayoutStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '6px' },
    panelStyles: [basePanelStyle, basePanelStyle, basePanelStyle, basePanelStyle],
  },
  {
    id: 'hero-top',
    name: '建立场景',
    panelCount: 3,
    description: '顶部的大分镜先建立宏观场景或关键动作，下方的小分镜则用来展示细节、对话或后续发展。',
    style: { ...baseLayoutStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '2fr 1fr', gap: '6px' },
    panelStyles: [{ ...heroPanelStyle, gridColumn: 'span 2' }, basePanelStyle, basePanelStyle],
  },
  {
    id: 'hero-left',
    name: '聚焦主体',
    panelCount: 3,
    description: '左侧垂直的大分镜用来突出一个主要角色或关键物体，右侧的小分镜则展示与之相关的反应、对话或细节。',
    style: { ...baseLayoutStyle, display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: '6px' },
    panelStyles: [{ ...heroPanelStyle, gridRow: 'span 2' }, basePanelStyle, basePanelStyle],
  },
  {
    id: 'hero-bottom',
    name: '高潮揭示',
    panelCount: 3,
    description: '先用上方的小分镜进行铺垫和叙事，最后在底部用一个冲击力强的大分镜来揭示故事的高潮、结局或关键转折。',
    style: { ...baseLayoutStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 2fr', gap: '6px' },
    panelStyles: [basePanelStyle, basePanelStyle, { ...heroPanelStyle, gridColumn: 'span 2' }],
  },
  {
    id: 'top-plus-4-grid',
    name: '场景+故事',
    panelCount: 5,
    description: '结合了“建场镜头”和“四宫格”的优点。先用顶部横幅展示环境，再用下方的四格紧凑地讲述一个多步骤的小故事。',
    style: { ...baseLayoutStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', gap: '6px' },
    panelStyles: [{ ...heroPanelStyle, gridColumn: 'span 2' }, basePanelStyle, basePanelStyle, basePanelStyle, basePanelStyle],
  },
  {
    id: '4-vertical-montage',
    name: '快速蒙太奇',
    panelCount: 4,
    description: '四个狭长的分镜垂直排列，能创造出极快的阅读节奏。非常适合表现连续的动作序列、时间的快速流逝或一系列闪回画面。',
    style: { ...baseLayoutStyle, display: 'flex', flexDirection: 'column', gap: '6px' },
    panelStyles: [basePanelStyle, basePanelStyle, basePanelStyle, basePanelStyle],
  },
  {
    id: '2-diagonal',
    name: '注入能量',
    panelCount: 2,
    description: '倾斜的线条打破了画面的稳定感，能瞬间提升场景的动态感与紧张度。这是表现激烈打斗、角色内心失衡或制造戏剧性冲突的绝佳选择。',
    style: { ...baseLayoutStyle, display: 'flex', flexDirection: 'row', gap: '0px', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' },
    panelStyles: [{ flex: 1, clipPath: 'polygon(0 0, 100% 0, 0 100%)', background: '#6B7280' }, { flex: 1, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', background: '#4B5563' }],
  },
  {
    id: 'inset-panel',
    name: '画中画',
    panelCount: 2,
    description: '在一个大的主分镜中嵌套小分镜。小分镜常用于展示特写细节（如角色眼神）、内心想法（内心独白或回忆闪现），或同时展示两个不同维度的信息。',
    style: { ...baseLayoutStyle, position: 'relative', width: '100%', height: '100%', display: 'block' },
    panelStyles: [
      { ...heroPanelStyle }, 
      { position: 'absolute', top: '10%', right: '10%', width: '45%', height: '45%', border: '2px solid #E5E7EB', background: 'rgba(31, 41, 55, 0.7)', borderRadius: '1px' }
    ],
  },
  {
    id: 'borderless-3-montage',
    name: '意识流/梦境',
    panelCount: 3,
    description: '分镜内容相互融合，没有清晰的边界。打破了传统画格的束缚，非常适合表现梦境、回忆、幻觉等抽象、非线性的场景。',
    style: { ...baseLayoutStyle, display: 'flex', flexDirection: 'column', gap: '0px', borderStyle: 'dashed' },
    panelStyles: [{ flex: 1, background: 'rgba(156, 163, 175, 0.7)' }, { flex: 1, background: 'rgba(156, 163, 175, 0.5)' }, { flex: 1, background: 'rgba(156, 163, 175, 0.3)' }],
  },
  {
    id: 'center-focus-5-panel',
    name: '中心焦点',
    panelCount: 5,
    description: '巨大的中心分镜用来聚焦核心事件或角色，四个角落的小分镜则用来展示细节、反应或同时发生的多角度叙事。',
    style: { ...baseLayoutStyle, display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gridTemplateRows: '1fr 1.5fr 1fr', gap: '6px' },
    panelStyles: [
      { ...heroPanelStyle, gridColumn: '2', gridRow: '2' },
      { ...basePanelStyle, gridColumn: '1', gridRow: '1' },
      { ...basePanelStyle, gridColumn: '3', gridRow: '1' },
      { ...basePanelStyle, gridColumn: '1', gridRow: '3' },
      { ...basePanelStyle, gridColumn: '3', gridRow: '3' },
    ],
  },
  {
    id: 'custom',
    name: '自由导演',
    panelCount: 1, // Default, will be overridden
    description: '完全自定义你的页面布局，通过增减行列来创造独特的叙事节奏。',
    style: {}, // Not used by custom logic
    panelStyles: [], // Not used by custom logic
  },
];
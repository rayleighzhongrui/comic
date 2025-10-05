

export enum ComicFormat {
  WEBTOON = 'webtoon',
  PAGE = 'page',
}

export enum DrawingStyle {
  JAPANESE_SHONEN = 'japanese shonen manga style, clean lines, high contrast, dynamic action poses',
  AMERICAN_REALISTIC = 'american realistic comic book style, detailed illustrations, cinematic lighting',
  CHIBI = 'chibi style, cute, large heads, small bodies, vibrant colors',
  INK_WASH = 'traditional ink wash painting style, monochrome, minimalist, expressive brushstrokes',
}

export enum PageMode {
  SINGLE = 'single',
  SPREAD = 'spread',
}

export interface Project {
  projectId: string;
  projectName: string;
  format: ComicFormat;
  style: DrawingStyle;
  stylePrompt: string;
}

export interface Character {
  characterId: string;
  name: string;
  referenceImageUrl: string;
  corePrompt: string; 
}

export interface Asset {
  assetId: string;
  name: string;
  referenceImageUrl: string;
  corePrompt: string;
}

export interface Page {
  pageId: string;
  pageNumber: number;
  imageUrl: string;
  userStoryText: string;
  finalGenerationPrompt: string;
  mode: PageMode; // To identify if it's a single page or a spread
}

export interface Scene {
  sceneId: string;
  description: string;
  cameraShot: string;
}

export interface LayoutTemplate {
  id: string;
  name: string;
  panelCount: number;
  description: string; // The instruction for the AI on how to lay out the panels
  style: React.CSSProperties; // For rendering the layout preview
  panelStyles: React.CSSProperties[]; // For styling individual scene inputs
}
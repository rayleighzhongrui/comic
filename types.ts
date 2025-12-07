

// Fix: Import CSSProperties from React to resolve type errors.
import type { CSSProperties } from 'react';

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

export interface Relationship {
  id: string;
  entity1Id: string; // Can be a Character or Asset ID
  entity2Id: string; // Can be a Character or Asset ID
  description: string; // e.g., "is the father of", "is the rival of"
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
  characterIds?: string[];
  assetIds?: string[];
}

export interface LayoutTemplate {
  id: string;
  name: string;
  panelCount: number;
  description: string; // The instruction for the AI on how to lay out the panels
  // Fix: Use the imported CSSProperties type instead of React.CSSProperties.
  style: CSSProperties; // For rendering the layout preview
  // Fix: Use the imported CSSProperties type instead of React.CSSProperties.
  panelStyles: CSSProperties[]; // For styling individual scene inputs
}
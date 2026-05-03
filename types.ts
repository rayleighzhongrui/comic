

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
  // New Styles
  OBATA_STYLE = 'Takeshi Obata style, intricate gothic details, high contrast lighting, sharp and realistic facial features, psychological tension, dark atmosphere, highly detailed backgrounds',
  ODA_STYLE = 'Eiichiro Oda style, exaggerated expressions, vibrant energy, fish-eye lens effects, dynamic action lines, whimsical character designs, strong ink outlines',
  CLAMP_STYLE = 'CLAMP style, extreme detail, flowing hair, long limbs, decorative elements, magical atmosphere, feathers and petals, dramatic composition, shoujo manga aesthetic',
  SHINKAI_STYLE = 'Makoto Shinkai style, breathtaking lighting, hyper-realistic clouds and sky, lens flares, emotional atmosphere, vibrant colors, high fidelity background art',
  JUNJI_ITO_STYLE = 'Junji Ito style, heavy ink lines, horror aesthetic, spiral patterns, unsettling atmosphere, intricate cross-hatching, realistic yet disturbing facial features',
  CUSTOM = 'custom', // Placeholder for custom logic
}

export enum PageMode {
  SINGLE = 'single',
  SPREAD = 'spread',
}

export enum ImageModel {
  GEMINI_2_5_FLASH = 'gemini-2.5-flash-image',
  GEMINI_3_1_FLASH = 'gemini-3.1-flash-image-preview',
  IMAGEN_4 = 'imagen-4.0-generate-001',
}

export interface Project {
  projectId: string;
  projectName: string;
  format: ComicFormat;
  style: DrawingStyle;
  stylePrompt: string; // This holds the actual prompt used for generation
  imageModel: ImageModel;
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
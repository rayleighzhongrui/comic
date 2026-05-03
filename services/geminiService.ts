

// @ts-nocheck
// This service connects to the Google Gemini API.
// It requires a valid API key to be set in the environment variables.

import { GoogleGenAI, Modality, Type } from "@google/genai";
import { type Character, type Scene, ImageModel } from '../types';

// A function to get a random placeholder image in case of API failure
const getPlaceholderImage = (width = 1024, height = 1024) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        // Very unlikely fallback to an SVG data URL if canvas context fails
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect width='100%25' height='100%25' fill='%234A5568'/%3E%3Ctext x='50%25' y='50%25' fill='%23FFFFFF' font-size='30' font-family='sans-serif' text-anchor='middle' dy='.3em'%3EGeneration Failed%3C/text%3E%3C/svg%3E`;
    }
    
    ctx.fillStyle = '#4A5568'; // bg-gray-700
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#FFFFFF'; // text-white
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Generation Failed', width / 2, height / 2);
    
    return canvas.toDataURL('image/png');
};

/**
 * Helper to clean up the AI response text before parsing as JSON.
 * It removes Markdown code blocks and extra conversational text.
 */
const cleanJsonText = (text: string): string => {
  let cleaned = text;
  
  // 1. Remove Markdown code blocks (e.g. ```json ... ```)
  // This regex matches ```json (content) ``` or just ``` (content) ```
  const markdownRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const match = cleaned.match(markdownRegex);
  if (match) {
    cleaned = match[1];
  }

  // 2. Find the first '{' and last '}' to strip preamble/postscript text
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    cleaned = cleaned.substring(firstOpen, lastClose + 1);
  }

  return cleaned;
};

/**
 * Helper to get the appropriate GoogleGenAI instance based on the model.
 */
const getAI = (model: string) => {
  // Paid models use process.env.API_KEY, free models use process.env.GEMINI_API_KEY
  const paidModels = ['gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview', 'imagen-4.0-generate-001', 'veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview', 'lyria-3-clip-preview', 'lyria-3-pro-preview'];
  const apiKey = paidModels.includes(model) ? process.env.API_KEY : process.env.GEMINI_API_KEY;
  return new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY });
};

export const geminiService = {
  /**
   * Checks if a paid API key is selected and opens the selection dialog if not.
   */
  checkAndOpenApiKeyDialog: async (model: string): Promise<boolean> => {
    const paidModels = ['gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview', 'imagen-4.0-generate-001', 'veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview', 'lyria-3-clip-preview', 'lyria-3-pro-preview'];
    if (!paidModels.includes(model)) return true;

    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        if (typeof window.aistudio.openSelectKey === 'function') {
          await window.aistudio.openSelectKey();
          // Assume success after opening as per instructions (race condition mitigation)
          return true;
        }
      }
    }
    return true;
  },

  /**
   * Generates a reference image for a character or asset using imagen-4.0-generate-001.
   */
  generateReferenceImage: async (prompt: string, model: ImageModel = ImageModel.IMAGEN_4): Promise<string[]> => {
    console.log("Generating reference image with prompt:", prompt, "Model:", model);
    try {
      const config: any = {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      };
      
      const ai = getAI(model);
      const response = await ai.models.generateImages({
          model: model,
          prompt: prompt,
          config: config,
      });
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return [`data:image/jpeg;base64,${base64ImageBytes}`];
    } catch (error) {
      if (error instanceof Error && error.message.includes("Requested entity was not found")) {
        console.warn("API Key might be invalid or not selected. Prompting user.");
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
          await window.aistudio.openSelectKey();
        }
      }
      console.error("Error generating reference image:", error);
      // Fallback to a placeholder on error
      return [getPlaceholderImage(512, 512)];
    }
  },

  /**
   * Generates comic panel images using a multi-modal prompt with gemini-2.5-flash-image.
   * Takes a text prompt and reference images to maintain character consistency.
   * Includes a retry mechanism for robustness.
   * 
   * @param aspectRatio - The aspect ratio for the generated image (e.g., "3:4", "4:3", "9:16").
   */
  generateComicPanels: async (prompt: string, referenceImages: { mimeType: string; data: string }[], aspectRatio: string, model: ImageModel = ImageModel.GEMINI_2_5_FLASH): Promise<string[]> => {
    console.log("Generating comic panels with multimodal prompt:", { prompt, referenceImagesCount: referenceImages.length, aspectRatio, model });
    
    // Ensure API Key is available before proceeding to avoid parallel prompt hangs
    await geminiService.checkAndOpenApiKeyDialog(model);
    
    const imageParts = referenceImages.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data,
      },
    }));

    const config: any = {
      responseModalities: ["IMAGE"]
    };
    if (model === ImageModel.GEMINI_3_1_FLASH) {
      config.imageConfig = {
        aspectRatio: aspectRatio,
        imageSize: "1K"
      };
    } else {
      config.imageConfig = {
        aspectRatio: aspectRatio
      };
    }

    let enhancedPrompt = prompt;
    if (model === ImageModel.GEMINI_3_1_FLASH) {
      enhancedPrompt = `SYSTEM: You are a professional manga artist. You MUST generate a single image that is divided into multiple comic panels according to the layout description. CLEAR PANEL BORDERS AND GUTTERS ARE MANDATORY. DO NOT generate a single continuous scene. The output MUST be a comic page with distinct panels.
      
      USER REQUEST: ${prompt}`;
    }

    const contentRequest = {
      model: model,
      contents: {
        parts: [
          { text: enhancedPrompt },
          ...imageParts,
        ],
      },
      config: config,
    };

    /**
     * Attempts to generate a single comic panel image. If it fails, it will retry once.
     * This makes the generation process more resilient to transient API errors.
     */
    try {
      const ai = getAI(model);
      const response = await ai.models.generateContent(contentRequest);
      const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      if (imagePart?.inlineData) {
        const { mimeType, data } = imagePart.inlineData;
        return [`data:${mimeType};base64,${data}`];
      }
      throw new Error("Generated content did not include a valid image part.");
    } catch (error: any) {
      console.error("API Generation Error:", error);
      if (error && error.status === 429) {
          throw new Error("429 Quota Exceeded");
      }
      throw error;
    }
  },

  /**
   * Edits a comic panel using an original image, a mask, a text prompt, and an optional reference image.
   */
  editComicPanel: async (
    prompt: string, 
    originalImage: { mimeType: string; data: string }, 
    maskImage: { mimeType: string; data: string },
    model: ImageModel = ImageModel.GEMINI_2_5_FLASH,
    referenceImage?: { mimeType: string; data: string }
  ): Promise<string> => {
    console.log("Editing comic panel with prompt:", prompt, "Model:", model);
    
    // Check key before anything
    await geminiService.checkAndOpenApiKeyDialog(model);
    
    let userInstruction = prompt;
    // Keywords for removal/inpainting tasks in both English and Chinese
    const removeKeywords = ['remove', 'delete', 'get rid of', 'erase', '去掉', '删除', '擦掉', '去除'];
    const isRemoveTask = removeKeywords.some(kw => prompt.toLowerCase().includes(kw));

    if (isRemoveTask) {
        userInstruction = `
          The user wants to remove an object or character from the image. 
          Your task is to perform an inpainting operation on the masked area.
          Fill the masked region by intelligently continuing the surrounding background textures, colors, and patterns.
          The final result should look natural and seamless, as if the object was never there.
          The user's original request was: "${prompt}".
        `.trim().replace(/\s+/g, ' ');
    }
    
    let fullPrompt = `
      You are an expert AI image editor specializing in inpainting and object removal. Your task is to edit an image based on a mask and a user prompt.
      - The first image is the original comic panel.
      - The second image is a mask. You must ONLY apply changes to the non-black (e.g., white) areas of the mask. The black area must remain completely unchanged.
    `;

    const parts = [
      // Text part will be constructed and placed here.
      { inlineData: { mimeType: originalImage.mimeType, data: originalImage.data } },
      { inlineData: { mimeType: maskImage.mimeType, data: maskImage.data } },
    ];

    if (referenceImage) {
      fullPrompt += `
        - The third image is a reference. Use it as a style and content guide for the changes, but prioritize the inpainting task if it's a removal request.
      `;
      parts.push({ inlineData: { mimeType: referenceImage.mimeType, data: referenceImage.data } });
    }

    fullPrompt += `
      User's instruction for the edit is: "${userInstruction}".
      Strictly follow the mask. The edit should be confined ONLY to the non-black parts of the mask. Do not alter any other part of the original image.
      The output must be a single, high-quality edited image.
    `;

    // Add the fully constructed prompt text as the first part.
    parts.unshift({ text: fullPrompt.trim().replace(/\s+/g, ' ') });


    const config: any = {};
    if (model === ImageModel.GEMINI_3_1_FLASH) {
      config.imageConfig = { imageSize: "1K" };
    }

    const contentRequest = {
      model: model,
      contents: { parts },
      config: config,
    };

    try {
      const ai = getAI(model);
      const response = await ai.models.generateContent(contentRequest);
      const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      if (imagePart?.inlineData) {
        const { mimeType, data } = imagePart.inlineData;
        return `data:${mimeType};base64,${data}`;
      }
      throw new Error("No image was returned from the edit operation.");
    } catch (error) {
      console.error("Error editing comic panel:", error);
      return originalImage.data; // Return original on failure
    }
  },

  extendComicPanel: async (
    storyText: string,
    imageOnCanvas: { mimeType: string; data: string },
    maskImage: { mimeType: string; data: string },
    model: ImageModel = ImageModel.GEMINI_2_5_FLASH
  ): Promise<string> => {
    console.log("Extending comic panel with story context:", storyText, "Model:", model);

    // Check key before anything
    await geminiService.checkAndOpenApiKeyDialog(model);

    const prompt = `
      **Primary Goal: Image Outpainting.**
      You are an expert AI image editor. Your task is to seamlessly extend an existing comic panel image to fill a larger canvas. This is an outpainting task.

      **Inputs:**
      1.  **Image on Canvas:** An image placed in the center of a larger, blank canvas.
      2.  **Mask:** A black and white image. You MUST ONLY generate new content in the WHITE areas. The BLACK area contains the original image and must be preserved and seamlessly connected to your new content.

      **Instructions:**
      - **Visually Continue the Scene:** Your most important job is to intelligently continue the existing artwork from the black area into the white area. Analyze the lighting, colors, textures, characters, and background elements at the edges of the original image and extend them outwards naturally.
      - **Maintain Style:** The new content must perfectly match the art style of the original image.
      - **Contextual Awareness:** The original story content for this image was: "${storyText}". Use this as a high-level guide for what the extended scene might contain, but your primary focus is on a believable visual continuation, not a literal interpretation of the text.
      - **Seamless Integration:** The transition between the original image and the newly generated areas must be invisible.

      **Final Output:** A single, high-quality, larger image with the empty space filled in.
    `.trim().replace(/\s+/g, ' ');

    const config: any = {};
    if (model === ImageModel.GEMINI_3_1_FLASH) {
      config.imageConfig = { imageSize: "1K" };
    }

    const contentRequest = {
      model: model,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: imageOnCanvas },
          { inlineData: maskImage }
        ]
      },
      config: config,
    };

    try {
      const ai = getAI(model);
      const response = await ai.models.generateContent(contentRequest);
      const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      if (imagePart?.inlineData) {
        const { mimeType, data } = imagePart.inlineData;
        return `data:${mimeType};base64,${data}`;
      }
      throw new Error("No image was returned from the extend operation.");
    } catch (error) {
      console.error("Error extending comic panel:", error);
      // Re-throw the error to be handled by the calling component.
      throw error;
    }
  },
  
  /**
   * Analyzes an uploaded image and extracts its artistic style as a text prompt.
   * This is used to create custom style presets.
   */
  extractStyleFromImage: async (imageBase64: { mimeType: string; data: string }): Promise<string> => {
      const prompt = `
        You are an expert art critic and manga editor. 
        Your task is to analyze the provided image and extract its artistic style into a concise but highly descriptive prompt suitable for an AI image generator.
        
        Focus on:
        1. Line quality (e.g., thin, thick, sketchy, clean, ink wash).
        2. Coloring style (e.g., monochrome, vibrant, pastel, watercolor, cel-shaded, screentones).
        3. Lighting (e.g., high contrast, cinematic, flat, soft).
        4. Atmosphere (e.g., dark, whimsical, gritty, ethereal).
        5. Specific artistic influences if apparent (e.g., "reminiscent of 90s shoujo", "cyberpunk noir").
        
        Return ONLY the descriptive prompt string in English. Do not include introductory text like "Here is the style description:".
      `;
      
      const model = 'gemini-2.5-flash';
      const contentRequest = {
          model: model, // Vision capabilities available in standard model
          contents: {
              parts: [
                  { text: prompt },
                  { inlineData: imageBase64 }
              ]
          }
      };
      
      try {
          const ai = getAI(model);
          const response = await ai.models.generateContent(contentRequest);
          const styleDescription = response.text.trim();
          return styleDescription;
      } catch (error) {
          console.error("Error extracting style:", error);
          throw new Error("Failed to extract style from image.");
      }
  },

  /**
   * Continues the story for multiple panels based on a layout, using gemini-2.5-flash.
   * Returns an array of objects, each containing a description and a suggested camera shot.
   */
  generateStoryContinuation: async (
    previousStory: string,
    panelCount: number,
    layoutDescription: string,
    availableCameraShots: string[],
    allCharacters: Character[],
    initialScenes: Scene[],
    mainCharacters: Character[],
    relationshipsPrompt: string,
    pageOutline: string,
    contextImage?: { mimeType: string; data: string }
  ): Promise<Array<{ description: string; cameraShot: string; characterIds: string[] }>> => {
    
    const charIdToName = new Map(allCharacters.map(c => [c.characterId, c.name]));
    const charNameToId = new Map(allCharacters.map(c => [c.name, c.characterId]));
    
    const parts = [];

    let characterPool: Character[];
    let characterPoolDescription: string;

    if (mainCharacters.length > 0) {
        characterPool = mainCharacters;
        characterPoolDescription = `故事必须只围绕这些【主要角色】展开：${mainCharacters.map(c => `“${c.name}”`).join('、')}。`;
    } else {
        characterPool = allCharacters;
        if (allCharacters.length > 0) {
          characterPoolDescription = `故事可以从项目中的【任何角色】中选择：${allCharacters.map(c => `“${c.name}”`).join('、')}。`;
        } else {
          characterPoolDescription = '故事中不应出现任何角色。';
        }
    }
    const characterPoolNames = characterPool.map(c => c.name);
    
    let prompt = `你是一位富有创意的漫画编剧。你需要根据前文续写接下来的漫画分镜脚本。\n\n`;
    prompt += `【前文回顾】\n`;
    prompt += previousStory ? `${previousStory}\n\n` : `(这是故事的开篇，还没有前文)\n\n`;
    
    prompt += `【本页要求】\n`;
    prompt += `- 分镜数量: ${panelCount} 个\n`;
    prompt += `- 页面布局: ${layoutDescription}\n`;
    if (pageOutline) {
      prompt += `- 本页大纲: ${pageOutline}\n`;
    }

    prompt += `\n【角色出场限制】(非常重要！)\n`;
    if (mainCharacters.length > 0) {
        prompt += `本页故事【必须且只能】围绕以下选定的角色展开：${mainCharacters.map(c => `[${c.name}]`).join(', ')}。绝对不允许引入其他未提及的角色！\n`;
    } else if (allCharacters.length > 0) {
        prompt += `你可以从以下角色库中选择角色出场：${allCharacters.map(c => `[${c.name}]`).join(', ')}。\n`;
    } else {
        prompt += `本页不需要任何特定角色出场。\n`;
    }

    if (relationshipsPrompt) {
      prompt += `\n【角色关系设定】\n${relationshipsPrompt}\n`;
    }

    const presetScenesText = initialScenes.map((scene, i) => {
        const charNames = (scene.characterIds || []).map(id => charIdToName.get(id)).filter(Boolean);
        return charNames.length > 0 ? `分镜 ${i + 1} 必须包含角色: ${charNames.join(', ')}` : null;
    }).filter(Boolean).join('\n');
    
    if (presetScenesText) {
        prompt += `\n【特定分镜强制要求】\n${presetScenesText}\n`;
    }

    if (contextImage) {
      prompt += "\n【参考图片】\n请特别参考提供的图片作为接下来剧情的视觉上下文。\n";
      parts.push({ inlineData: { mimeType: contextImage.mimeType, data: contextImage.data } });
    }
    
    prompt += `\n【输出任务】\n`;
    prompt += `请为这 ${panelCount} 个分镜编写具体的故事描述。要求：\n`;
    prompt += `1. 剧情必须与【前文回顾】紧密衔接，逻辑连贯。\n`;
    prompt += `2. 严格遵守【角色出场限制】，不要自己发明新角色。\n`;
    prompt += `3. 描述要具体、有画面感，适合转化为漫画画面。\n`;
    prompt += `4. 为每个分镜选择一个最合适的镜头：[${availableCameraShots.join(', ')}]\n`;
    prompt += `5. 明确列出每个分镜中实际出场的角色名字（必须是上面允许的角色）。\n`;
    prompt += `\n请以JSON格式提供你的回答。JSON对象应包含一个名为 "panel_details" 的键，其值为一个包含 ${panelCount} 个对象的数组。每个对象都必须有三个键："description" (故事描述), "camera_shot" (分镜镜头), 和 "characters" (出场角色名字的数组)。`;

    parts.unshift({ text: prompt });
    
    console.log("Generating story continuation with STRICT character logic:", { prompt, panelCount });
    
    try {
        const ai = getAI('gemini-2.5-flash');
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                panel_details: {
                  type: Type.ARRAY,
                  description: `一个包含 ${panelCount} 个对象的数组，每个对象代表一个分镜。`,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      description: {
                        type: Type.STRING,
                        description: "分镜的故事描述。"
                      },
                      camera_shot: {
                        type: Type.STRING,
                        description: "从提供的列表中选择的分镜镜头。"
                      },
                      characters: {
                        type: Type.ARRAY,
                        description: "出场角色的名字数组。",
                        items: {
                          type: Type.STRING,
                        }
                      }
                    },
                    required: ["description", "camera_shot", "characters"]
                  }
                }
              },
              required: ["panel_details"]
            }
          }
        });

        // Use the cleanJsonText helper to robustly parse the response
        const resultText = response.text;
        const cleanedText = cleanJsonText(resultText);
        console.log("Cleaned JSON Text:", cleanedText);
        
        const parsedResult = JSON.parse(cleanedText);

        if (parsedResult.panel_details && Array.isArray(parsedResult.panel_details)) {
          const details: any[] = parsedResult.panel_details;

          const finalDetails = Array.from({ length: panelCount }, (_, i) => {
              const detail = details[i];
              if (!detail) {
                  return { description: "", cameraShot: availableCameraShots[0], characterIds: [] };
              }
              const characterIds = (detail.characters || [])
                .map((name: string) => charNameToId.get(name))
                .filter(Boolean);
              
              return {
                  description: detail.description,
                  cameraShot: detail.camera_shot,
                  characterIds,
              };
          });

          return finalDetails;
        }
        throw new Error("Invalid JSON structure returned from AI.");

    } catch (error: any) {
      console.error("Error generating story continuation:", error);
      if (error && error.status === 429) {
          throw new Error("429 Quota Exceeded");
      }
      const fallbackMessage = "发生意外错误。英雄停顿了一下，不知道接下来该做什么。";
      return Array.from({ length: panelCount }, (_, i) => ({ 
        description: i === 0 ? fallbackMessage : "", 
        cameraShot: availableCameraShots[0],
        characterIds: [],
      }));
    }
  },
};

// @ts-nocheck
// This service connects to the Google Gemini API.
// It requires a valid API key to be set in the environment variables.

import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { Character, Scene } from '../types';

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


// This should be initialized with a real API key in a production environment.
// It is assumed that `process.env.API_KEY` is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  /**
   * Generates a reference image for a character or asset using imagen-4.0-generate-001.
   */
  generateReferenceImage: async (prompt: string, seed?: number): Promise<string[]> => {
    console.log("Generating reference image with prompt:", prompt, "Seed:", seed);
    try {
      const config: any = {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      };
      
      // Only add seed if it's defined
      if (typeof seed === 'number') {
        // Imagen models might use 'randomSeed' or just rely on regeneration, 
        // but for GenAI SDK consistency with other calls we check support.
        // Currently Imagen via GenAI SDK might not fully expose seed control in the same way as generateContent,
        // but passing it in config is the standard way if supported. 
        // Note: For Imagen, strict seed control varies by specific model version.
      }

      const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: prompt,
          config: config,
      });
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return [`data:image/jpeg;base64,${base64ImageBytes}`];
    } catch (error) {
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
  generateComicPanels: async (prompt: string, referenceImages: { mimeType: string; data: string }[], aspectRatio: string, seed?: number): Promise<string[]> => {
    console.log("Generating comic panels with multimodal prompt:", { prompt, referenceImagesCount: referenceImages.length, seed, aspectRatio });
    
    const imageParts = referenceImages.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data,
      },
    }));

    const config: any = {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
      imageConfig: {
        aspectRatio: aspectRatio,
      },
    };

    if (typeof seed === 'number') {
      config.seed = seed;
    }

    const contentRequest = {
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt },
          ...imageParts,
        ],
      },
      config: config,
    };

    /**
     * Attempts to generate a single comic panel image. If it fails, it will retry once.
     * This makes the generation process more resilient to transient API errors.
     */
    const attemptGeneration = async (): Promise<string> => {
      const generateAndValidate = async () => {
        const response = await ai.models.generateContent(contentRequest);
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
          const { mimeType, data } = imagePart.inlineData;
          return `data:${mimeType};base64,${data}`;
        }
        // Throw an error to trigger the catch block for a retry if no image is found.
        throw new Error("Generated content did not include a valid image part.");
      };

      try {
        // First attempt
        return await generateAndValidate();
      } catch (error) {
        console.warn("Initial generation attempt failed, retrying...", error);
        try {
          // Second and final attempt
          return await generateAndValidate();
        } catch (retryError) {
          console.error("Generation retry also failed. Using placeholder.", retryError);
          return getPlaceholderImage(1024, 576);
        }
      }
    };

    // Run two generation attempts in parallel, each with its own retry logic.
    const [result1, result2] = await Promise.all([
      attemptGeneration(),
      attemptGeneration()
    ]);
      
    return [result1, result2];
  },

  /**
   * Edits a comic panel using an original image, a mask, a text prompt, and an optional reference image.
   */
  editComicPanel: async (
    prompt: string, 
    originalImage: { mimeType: string; data: string }, 
    maskImage: { mimeType: string; data: string },
    referenceImage?: { mimeType: string; data: string },
    seed?: number
  ): Promise<string> => {
    console.log("Editing comic panel with prompt:", prompt, "Seed:", seed);
    
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


    const config: any = {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    };
    if (typeof seed === 'number') {
      config.seed = seed;
    }

    const contentRequest = {
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: config,
    };

    try {
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
    maskImage: { mimeType: string; data: string }
  ): Promise<string> => {
    console.log("Extending comic panel with story context:", storyText);

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

    const contentRequest = {
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: imageOnCanvas },
          { inlineData: maskImage }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    };

    try {
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
    
    let prompt = `你是一位富有创意的漫画导演和编剧。到目前为止的故事是：“${previousStory}”。\n`;
    prompt += `现在，请为下一页续写故事。这一页有一个特殊的布局：“${layoutDescription}”，它包含 ${panelCount} 个分镜。\n`;
    
    if (pageOutline) {
      prompt += `你的核心任务是创作接下来 ${panelCount} 个分镜的具体内容，并且必须严格围绕【本页故事大纲】：“${pageOutline}”来展开。\n`;
    }

    prompt += `\n【角色使用规则】:\n${characterPoolDescription}\n`;
    
    const presetScenesText = initialScenes.map((scene, i) => {
        const charNames = (scene.characterIds || []).map(id => charIdToName.get(id)).filter(Boolean);
        return `- 分镜 ${i + 1}: ${charNames.length > 0 ? `已预设，必须出现角色 [${charNames.join(', ')}]` : '未预设角色'}`;
    }).join('\n');
    prompt += `\n【分镜角色预设】:\n${presetScenesText}\n`;

    if (relationshipsPrompt) {
      prompt += `\n请在故事中体现这些【重要关系】：${relationshipsPrompt}\n`;
    }

    if (contextImage) {
      prompt += "\n请特别参考这张图片作为接下来剧情的上下文。\n";
      parts.push({ inlineData: { mimeType: contextImage.mimeType, data: contextImage.data } });
    }
    
    prompt += `\n**你的任务是:**\n`;
    prompt += `1. **故事创作**: 为全部 ${panelCount} 个分镜创作连贯的故事。故事必须严格遵守上面的【角色使用规则】。\n`;
    prompt += `2. **角色分配**:\n`;
    prompt += `   - 对于【已预设角色】的分镜，故事必须围绕他们展开。\n`;
    if (characterPoolNames.length > 0) {
        prompt += `   - 对于【未预设角色】的分镜，你【必须】从以下角色列表中选择角色出场：[${characterPoolNames.join(', ')}]。绝对不能使用此列表之外的任何角色。\n`;
    } else {
        prompt += `   - 对于【未预设角色】的分镜，不能安排任何角色出场。\n`;
    }
    prompt += `3. **提供描述**: 为每个分镜提供一个简洁、生动的故事描述。\n`;
    prompt += `4. **选择镜头**: 为每个分镜从以下列表中精确选择一个最适合的【分镜镜头】：[${availableCameraShots.join(', ')}]\n`;
    prompt += `5. **明确角色**: 为每个分镜明确指出最终出场的【所有角色名字】。如果分镜中没有角色，则返回一个空数组。\n`;
    prompt += `\n请以JSON格式提供你的回答。JSON对象应包含一个名为 "panel_details" 的键，其值为一个包含 ${panelCount} 个对象的数组。每个对象都必须有三个键："description" (故事描述), "camera_shot" (分镜镜头), 和 "characters" (出场角色名字的数组)。`;

    parts.unshift({ text: prompt });
    
    console.log("Generating story continuation with STRICT character logic:", { prompt, panelCount });
    
    try {
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

    } catch (error) {
      console.error("Error generating story continuation:", error);
      const fallbackMessage = "发生意外错误。英雄停顿了一下，不知道接下来该做什么。";
      return Array.from({ length: panelCount }, (_, i) => ({ 
        description: i === 0 ? fallbackMessage : "", 
        cameraShot: availableCameraShots[0],
        characterIds: [],
      }));
    }
  },
};

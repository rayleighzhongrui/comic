// @ts-nocheck
// This service connects to the Google Gemini API.
// It requires a valid API key to be set in the environment variables.

import { GoogleGenAI, Modality, Type } from "@google/genai";

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


// This should be initialized with a real API key in a production environment.
// It is assumed that `process.env.API_KEY` is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  /**
   * Generates a reference image for a character or asset using imagen-4.0-generate-001.
   */
  generateReferenceImage: async (prompt: string): Promise<string[]> => {
    console.log("Generating reference image with prompt:", prompt);
    try {
      const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
          },
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
   */
  generateComicPanels: async (prompt: string, referenceImages: { mimeType: string; data: string }[]): Promise<string[]> => {
    console.log("Generating comic panels with multimodal prompt:", { prompt, referenceImagesCount: referenceImages.length });
    
    const imageParts = referenceImages.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data,
      },
    }));

    const contentRequest = {
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt },
          ...imageParts,
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
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
    referenceImage?: { mimeType: string; data: string }
  ): Promise<string> => {
    console.log("Editing comic panel with prompt:", prompt);
    
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


    const contentRequest = {
      model: 'gemini-2.5-flash-image',
      contents: { parts },
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
      throw new Error("No image was returned from the edit operation.");
    } catch (error) {
      console.error("Error editing comic panel:", error);
      return originalImage.data; // Return original on failure
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
    selectedItemsPrompt: string,
    contextImage?: { mimeType: string; data: string }
  ): Promise<Array<{ description: string; cameraShot: string }>> => {
    
    const parts = [];
    let prompt = `你是一位富有创意的漫画导演和编剧。到目前为止的故事是：“${previousStory}”。\n`;
    prompt += `现在，请为下一页续写故事。这一页有一个特殊的布局：“${layoutDescription}”，它包含 ${panelCount} 个分镜。\n`;
    
    if (selectedItemsPrompt) {
        prompt += `${selectedItemsPrompt}\n`;
    }

    if (contextImage) {
      prompt += "请特别参考这张图片作为接下来剧情的上下文。\n";
      parts.push({ inlineData: { mimeType: contextImage.mimeType, data: contextImage.data } });
    }
    
    prompt += `你的任务是为这 ${panelCount} 个分镜中的【每一个】都提供：\n`;
    prompt += `1. 一个简洁、生动的故事描述。\n`;
    prompt += `2. 一个最适合该描述的【分镜镜头】。\n`;
    prompt += `请从以下列表中精确选择分镜镜头：[${availableCameraShots.join(', ')}]\n`;
    prompt += `请以JSON格式提供你的回答。JSON对象应包含一个名为 "panel_details" 的键，其值为一个包含 ${panelCount} 个对象的数组。每个对象都必须有两个键："description" (故事描述) 和 "camera_shot" (从列表中选择的分镜镜头)。`;

    parts.unshift({ text: prompt });
    
    console.log("Generating story continuation for multiple panels with camera shots:", { prompt, panelCount });
    
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
                      }
                    },
                    required: ["description", "camera_shot"]
                  }
                }
              },
              required: ["panel_details"]
            }
          }
        });

        const resultText = response.text;
        const parsedResult = JSON.parse(resultText);

        if (parsedResult.panel_details && Array.isArray(parsedResult.panel_details)) {
          const details = parsedResult.panel_details;
          const finalDetails = Array.from({ length: panelCount }, (_, i) => details[i] || { description: "", cameraShot: availableCameraShots[0] });
          return finalDetails;
        }
        throw new Error("Invalid JSON structure returned from AI.");

    } catch (error) {
      console.error("Error generating story continuation:", error);
      const fallbackMessage = "发生意外错误。英雄停顿了一下，不知道接下来该做什么。";
      return Array.from({ length: panelCount }, (_, i) => ({ 
        description: i === 0 ? fallbackMessage : "", 
        cameraShot: availableCameraShots[0] 
      }));
    }
  },
};
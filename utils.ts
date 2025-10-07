/**
 * Converts an image URL (remote or data URL) to a Base64 string and MIME type,
 * preserving its original dimensions and aspect ratio.
 */
export const toBase64FromUrl = (
  url: string
): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'Anonymous';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }
        
        ctx.drawImage(image, 0, 0);
        
        // Output as PNG to preserve maximum quality.
        const dataUrl = canvas.toDataURL('image/png');
        const [, base64Data] = dataUrl.split(',');
        resolve({ mimeType: 'image/png', data: base64Data });

      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => {
      reject(new Error(`Failed to load image from URL: ${url}`));
    };

    image.src = url;
  });
};

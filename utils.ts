

/**
 * Converts a URL (remote or data URL) to a Base64 string and MIME type.
 * It will be letterboxed/pillarboxed onto a correctly-sized canvas with a white background
 * based on the target aspect ratio ('16:9', '9:16', or '1:1').
 */
export const toBase64FromUrl = async (
  url: string,
  targetAspectRatioString: '16:9' | '9:16' | '1:1'
): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'Anonymous';

    image.onload = () => {
      try {
        const originalWidth = image.naturalWidth;
        const originalHeight = image.naturalHeight;
        const originalAspectRatio = originalWidth / originalHeight;
        
        const targetAspectRatioMap = {
            '16:9': 16 / 9,
            '9:16': 9 / 16,
            '1:1': 1
        };
        const targetAspectRatio = targetAspectRatioMap[targetAspectRatioString];
        
        // If the aspect ratio is already very close, just convert it directly without resizing
        if (Math.abs(originalAspectRatio - targetAspectRatio) < 0.05) {
          const canvas = document.createElement('canvas');
          canvas.width = originalWidth;
          canvas.height = originalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');
          ctx.drawImage(image, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const [, base64Data] = dataUrl.split(',');
          resolve({ mimeType: 'image/jpeg', data: base64Data });
          return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        if (targetAspectRatioString === '16:9') {
          canvas.width = 1024;
          canvas.height = 576;
        } else if (targetAspectRatioString === '9:16') {
          canvas.width = 576;
          canvas.height = 1024;
        } else { // '1:1'
          canvas.width = 1024;
          canvas.height = 1024;
        }
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        let newWidth, newHeight;
        const canvasAspectRatio = canvas.width / canvas.height;
        if (originalAspectRatio > canvasAspectRatio) {
          newWidth = canvas.width;
          newHeight = newWidth / originalAspectRatio;
        } else {
          newHeight = canvas.height;
          newWidth = newHeight * originalAspectRatio;
        }
        
        const x = (canvas.width - newWidth) / 2;
        const y = (canvas.height - newHeight) / 2;
        
        ctx.drawImage(image, x, y, newWidth, newHeight);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const [, base64Data] = dataUrl.split(',');
        resolve({ mimeType: 'image/jpeg', data: base64Data });

      } catch (error) {
        reject(error);
      }
    };

    image.onerror = (err) => {
      reject(new Error(`Failed to load image from URL: ${url}. Error: ${err}`));
    };

    image.src = url;
  });
};

import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import type { Page, Project } from '../types';
import { PageMode } from '../types';
import { geminiService } from '../services/geminiService';
import { toBase64FromUrl } from '../utils';

interface AspectRatioModalProps {
  project: Project;
  page: Page;
  onClose: () => void;
  onUpdatePage: (page: Page) => void;
}

const AspectRatioModal: React.FC<AspectRatioModalProps> = ({ page, onClose, onUpdatePage }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number; ratio: number } | null>(null);

  const targetRatio = page.mode === PageMode.SPREAD ? 4 / 3 : 2 / 3;

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      setImageInfo({
        width: img.naturalWidth,
        height: img.naturalHeight,
        ratio: img.naturalWidth / img.naturalHeight,
      });
    };
    img.src = page.imageUrl;
  }, [page.imageUrl]);

  const handleCrop = async () => {
    if (!imageInfo) return;
    setIsLoading(true);
    setLoadingText('正在裁剪...');

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
          alert("无法创建画布以上传图片。");
          setIsLoading(false);
          return;
      }

      let sx = 0, sy = 0, sWidth = img.naturalWidth, sHeight = img.naturalHeight;

      if (imageInfo.ratio > targetRatio) { // Image is wider than target
        sWidth = img.naturalHeight * targetRatio;
        sx = (img.naturalWidth - sWidth) / 2;
      } else { // Image is taller than target
        sHeight = img.naturalWidth / targetRatio;
        sy = (img.naturalHeight - sHeight) / 2;
      }
      
      canvas.width = sWidth;
      canvas.height = sHeight;

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      
      const newImageUrl = canvas.toDataURL('image/png');
      onUpdatePage({ ...page, imageUrl: newImageUrl });
      // onClose is called by the parent component
    };
    img.src = page.imageUrl;
  };

  const handleExtend = async () => {
    if (!imageInfo) return;
    setIsLoading(true);

    try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = page.imageUrl;
        });

        let targetWidth = img.naturalWidth;
        let targetHeight = img.naturalHeight;
        let dx = 0, dy = 0;

        if (imageInfo.ratio > targetRatio) { // Image is wider, need to extend height
            setLoadingText('正在创建画布...');
            targetHeight = Math.round(img.naturalWidth / targetRatio);
            dy = (targetHeight - img.naturalHeight) / 2;
        } else { // Image is taller, need to extend width
            setLoadingText('正在创建画布...');
            targetWidth = Math.round(img.naturalHeight * targetRatio);
            dx = (targetWidth - img.naturalWidth) / 2;
        }

        // Create image on larger canvas
        const imageCanvas = document.createElement('canvas');
        imageCanvas.width = targetWidth;
        imageCanvas.height = targetHeight;
        const imgCtx = imageCanvas.getContext('2d');
        if (!imgCtx) throw new Error("无法创建图片画布。");
        imgCtx.drawImage(img, dx, dy);
        const imageOnCanvasUrl = imageCanvas.toDataURL('image/png');

        // Create mask
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = targetWidth;
        maskCanvas.height = targetHeight;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) throw new Error("无法创建蒙版画布。");
        maskCtx.fillStyle = 'white'; // Area to fill
        maskCtx.fillRect(0, 0, targetWidth, targetHeight);
        maskCtx.fillStyle = 'black'; // Area to preserve
        maskCtx.fillRect(dx, dy, img.naturalWidth, img.naturalHeight);
        const maskUrl = maskCanvas.toDataURL('image/png');
        
        setLoadingText('准备 AI 模型...');
        const [imageOnCanvasB64, maskB64] = await Promise.all([
            toBase64FromUrl(imageOnCanvasUrl),
            toBase64FromUrl(maskUrl)
        ]);
        
        setLoadingText('AI 正在扩展图片...');
        const newImageUrl = await geminiService.extendComicPanel(page.userStoryText, imageOnCanvasB64, maskB64);
        onUpdatePage({ ...page, imageUrl: newImageUrl });

    } catch (error) {
        console.error('Failed to extend image:', error);
        alert('使用 AI 扩展图片时发生错误。');
    } finally {
        setIsLoading(false);
        setLoadingText('');
    }
  };

  const isCorrectRatio = imageInfo ? Math.abs(imageInfo.ratio - targetRatio) < 0.01 : false;

  return (
    <Modal isOpen={true} onClose={onClose} title="调整页面比例" size="5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden">
          <img src={page.imageUrl} alt="页面预览" className="max-w-full max-h-[70vh] object-contain" />
        </div>
        <div className="flex flex-col space-y-4">
            {isCorrectRatio ? (
                 <div className="p-4 bg-green-800 text-green-200 rounded-lg text-center">
                    <h3 className="font-bold text-lg">比例正确!</h3>
                    <p className="text-sm">此页面的比例已符合要求。</p>
                </div>
            ) : (
                <div className="p-4 bg-yellow-800 text-yellow-200 rounded-lg">
                    <h3 className="font-bold">比例不匹配</h3>
                    {imageInfo && (
                        <p className="text-sm">
                            当前: {imageInfo.width}x{imageInfo.height} (比例: {(imageInfo.ratio).toFixed(2)})
                            <br />
                            目标: {page.mode === PageMode.SPREAD ? '4:3' : '2:3'} (比例: {targetRatio.toFixed(2)})
                        </p>
                    )}
                </div>
            )}
            
            <div className="bg-gray-700 p-4 rounded-lg flex flex-col items-center text-center">
                <h4 className="font-semibold text-lg mb-2">裁剪至合适比例</h4>
                <p className="text-sm text-gray-300 mb-4">
                    此操作将从中心裁剪图像，移除多余的边缘以匹配目标比例。这是一个快速的、无AI的本地操作。
                </p>
                <button 
                    onClick={handleCrop}
                    disabled={isLoading || isCorrectRatio}
                    className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    {isLoading && loadingText === '正在裁剪...' ? <LoadingSpinner /> : '裁剪'}
                </button>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg flex flex-col items-center text-center">
                <h4 className="font-semibold text-lg mb-2">扩展至合适比例 (AI)</h4>
                <p className="text-sm text-gray-300 mb-4">
                    此操作将使用 AI 智能地填充缺失的区域，将图像扩展到目标比例，而不会丢失任何原始内容。这可能需要一些时间。
                </p>
                <button 
                    onClick={handleExtend}
                    disabled={isLoading || isCorrectRatio}
                    className="w-full sm:w-auto px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                     {isLoading && loadingText !== '正在裁剪...' ? <div className="flex items-center"><LoadingSpinner size={20} className="mr-2"/>{loadingText || "处理中..."}</div> : '使用 AI 扩展'}
                </button>
            </div>
        </div>
      </div>
    </Modal>
  );
};

export default AspectRatioModal;
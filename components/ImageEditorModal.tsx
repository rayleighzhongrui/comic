import React, { useState, useRef, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { geminiService } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { toBase64FromUrl } from '../utils';

interface ImageEditorModalProps {
  imageUrl: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  onClose: () => void;
  onSave: (newImageUrl: string) => void;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageUrl, aspectRatio, onClose, onSave }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [lastPos, setLastPos] = useState<{ x: number, y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  
  const [editPrompt, setEditPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  
  const getCanvasContext = () => canvasRef.current?.getContext('2d');
  
  const currentImage = editedImageUrl || imageUrl;

  const resizeAndInitializeCanvas = useCallback(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (image && canvas && image.naturalWidth > 0) {
      // Use the image's intrinsic dimensions for the canvas resolution for 1:1 mapping
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      
      const ctx = getCanvasContext();
      if (ctx) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Reset history and save the initial, clean state
          const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setHistory([initialState]);
      }
    }
  }, []);
  
  const saveHistory = () => {
    const ctx = getCanvasContext();
    if(ctx && canvasRef.current){
        setHistory(prev => [...prev, ctx.getImageData(0,0, canvasRef.current!.width, canvasRef.current!.height)])
    }
  }

  useEffect(() => {
    const image = imageRef.current;
    if (image) {
      const handleLoad = () => resizeAndInitializeCanvas();
      // If the image is already loaded and has dimensions, resize. Otherwise, add a load event listener.
      if (image.complete && image.naturalHeight !== 0) {
        handleLoad();
      } else {
        image.addEventListener('load', handleLoad);
        return () => image.removeEventListener('load', handleLoad);
      }
    }
  }, [currentImage, resizeAndInitializeCanvas]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the scale factor between the canvas's actual size and its displayed size.
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Apply the scale factor to the mouse coordinates to fix misalignment.
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setLastPos(pos);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = getCanvasContext();
    const pos = getMousePos(e);
    if (ctx && lastPos) {
      ctx.globalCompositeOperation = 'destination-out'; // Erase
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    setLastPos(pos);
  };
  
  const stopDrawing = () => {
    if (isDrawing) {
        setIsDrawing(false);
        setLastPos(null);
        saveHistory();
    }
  };
  
  const handleUndo = () => {
      if(history.length > 1) {
          const newHistory = [...history];
          newHistory.pop(); // remove current state
          const lastState = newHistory[newHistory.length -1];
          const ctx = getCanvasContext();
          if(ctx){
            ctx.putImageData(lastState, 0, 0);
          }
          setHistory(newHistory);
      }
  }

    const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                setReferenceImage(loadEvent.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

  const handleGenerateEdit = async () => {
    if (!editPrompt.trim() || !canvasRef.current) return;
    setIsLoading(true);
    
    // --- Correct Mask Generation Logic ---
    // The user's brush creates transparent "holes" in the semi-transparent black overlay on canvasRef.
    // We need a mask that is WHITE where the holes are, and BLACK everywhere else.

    // 1. Create a temporary canvas that is white where the user brushed and transparent elsewhere.
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      setIsLoading(false);
      return;
    }
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.globalCompositeOperation = 'destination-out';
    tempCtx.drawImage(canvasRef.current, 0, 0);

    // 2. Create the final black and white mask.
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvasRef.current.width;
    maskCanvas.height = canvasRef.current.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) {
      setIsLoading(false);
      return;
    }
    // Fill with black (the area to preserve).
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    // Draw the white part (from tempCanvas) on top.
    maskCtx.drawImage(tempCanvas, 0, 0);
    
    const maskUrl = maskCanvas.toDataURL('image/png');

    try {
      const promises: Promise<{ mimeType: string, data: string }>[] = [
        toBase64FromUrl(imageUrl),
        toBase64FromUrl(maskUrl)
      ];

      if (referenceImage) {
          promises.push(toBase64FromUrl(referenceImage));
      }

      const results = await Promise.all(promises);
      const originalImageBase64 = results[0];
      const maskImageBase64 = results[1];
      const referenceImageBase64 = results.length > 2 ? results[2] : undefined;


      const newImageUrl = await geminiService.editComicPanel(editPrompt, originalImageBase64, maskImageBase64, referenceImageBase64);
      setEditedImageUrl(newImageUrl);

    } catch(error) {
      console.error("Failed to generate edit:", error);
      alert("编辑过程中发生错误。请重试。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (editedImageUrl) {
      onSave(editedImageUrl);
    }
  };
  
  return (
    <Modal isOpen={true} onClose={onClose} title="编辑漫画面板" size="6xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Image and Canvas */}
        <div className="relative w-full h-[70vh] flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden">
          <img ref={imageRef} src={currentImage} alt="要编辑的漫画面板" className="max-w-full max-h-full object-contain" crossOrigin="anonymous"/>
          {!editedImageUrl && <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} />}
        </div>

        {/* Right: Controls */}
        <div className="flex flex-col space-y-4">
          <h3 className="text-lg font-semibold">{editedImageUrl ? "预览您的编辑" : "1. 蒙版要更改的区域"}</h3>

          {!editedImageUrl && (
            <div className="p-4 bg-gray-700 rounded-lg space-y-3">
              <div>
                <label htmlFor="brushSize" className="block text-sm font-medium text-gray-300">笔刷大小: {brushSize}px</label>
                <input
                  id="brushSize"
                  type="range"
                  min="10"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <button onClick={handleUndo} disabled={history.length <= 1} className="w-full text-sm px-4 py-2 border border-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">撤销上一步</button>
            </div>
          )}

          <h3 className="text-lg font-semibold">{editedImageUrl ? "看起来不错？" : "2. 描述您的更改"}</h3>
          
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="例如, '把她的衬衫改成红色', '在他肩膀上加一条小龙'"
            rows={3}
            className="w-full bg-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isLoading || !!editedImageUrl}
          />
          
            {!editedImageUrl && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">3. 添加参考图 (可选)</h3>
                     <div className="p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-4">
                            {referenceImage ? (
                                <div className="relative">
                                    <img src={referenceImage} alt="参考图" className="w-20 h-20 object-cover rounded-md" />
                                    <button
                                        type="button"
                                        onClick={() => setReferenceImage(null)}
                                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 flex items-center justify-center hover:bg-red-700"
                                        aria-label="移除参考图"
                                        disabled={isLoading || !!editedImageUrl}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            ) : (
                                <div className="w-20 h-20 bg-gray-600 rounded-md flex items-center justify-center text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                            )}
                            <div>
                                <label htmlFor="reference-image-upload" className={`cursor-pointer bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors ${isLoading || !!editedImageUrl ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    上传
                                </label>
                                <p className="text-xs text-gray-400 mt-1">提供一个示例图片。</p>
                            </div>
                            <input id="reference-image-upload" name="reference-image-upload" type="file" className="sr-only" onChange={handleReferenceImageUpload} accept="image/*" disabled={isLoading || !!editedImageUrl}/>
                        </div>
                    </div>
                </div>
            )}
          
          <div className="pt-4">
          {editedImageUrl ? (
            <div className="flex gap-4">
                <button onClick={() => setEditedImageUrl(null)} className="flex-1 w-full flex justify-center items-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md transition-colors">
                    重试
                </button>
                <button onClick={handleSave} className="flex-1 w-full flex justify-center items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors">
                    保存更改
                </button>
            </div>
          ) : (
             <button onClick={handleGenerateEdit} disabled={isLoading || !editPrompt.trim()} className="w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                {isLoading ? <LoadingSpinner size={20} /> : '生成编辑'}
             </button>
          )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ImageEditorModal;
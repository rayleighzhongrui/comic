
import React, { useState, useEffect } from 'react';
import type { Character, Asset, Project } from '../types';
import Modal from './Modal';
import ImageEditorModal from './ImageEditorModal';
import { geminiService } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface AssetEditModalProps {
  project: Project;
  item: Character | Asset;
  onClose: () => void;
  onSave: (item: Character | Asset) => void;
}

const AssetEditModal: React.FC<AssetEditModalProps> = ({ project, item, onClose, onSave }) => {
  const [editableItem, setEditableItem] = useState(item);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  useEffect(() => {
    setEditableItem(item);
  }, [item]);

  const isCharacter = 'characterId' in editableItem;
  const title = isCharacter ? '编辑角色' : '编辑特征 & 道具';

  const handleSave = () => {
    onSave(editableItem);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = editableItem.referenceImageUrl;
    link.download = `${editableItem.name.replace(/\s+/g, '_')}_reference.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInputChange = (field: 'name' | 'corePrompt', value: string) => {
    setEditableItem(prev => ({ ...prev, [field]: value }));
  };
  
  const handleRegenerateImage = async () => {
    setIsRegenerating(true);
    try {
        const typeName = isCharacter ? '角色' : '道具';
        const prompt = `${project.stylePrompt}, ${typeName}设定集, 名为${editableItem.name}的${typeName}的全身视图, 描述为: ${editableItem.corePrompt}`;
        const images = await geminiService.generateReferenceImage(prompt);
        if (images && images.length > 0) {
            setEditableItem(prev => ({ ...prev, referenceImageUrl: images[0] }));
        } else {
            throw new Error("AI did not return a valid image.");
        }
    } catch (error) {
        console.error("Failed to regenerate image:", error);
        alert("重新生成图片时发生错误，请重试。");
    } finally {
        setIsRegenerating(false);
    }
  };


  return (
    <>
      <Modal isOpen={!isEditingImage} onClose={onClose} title={title} size="3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="space-y-4">
              <div className="relative">
                <img 
                    src={editableItem.referenceImageUrl} 
                    alt={editableItem.name} 
                    className={`w-full h-auto aspect-square object-cover rounded-lg shadow-lg transition-opacity ${isRegenerating ? 'opacity-50' : ''}`} 
                />
                {isRegenerating && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 rounded-lg">
                        <LoadingSpinner size={48} />
                        <p className="mt-4 text-white">正在重新生成...</p>
                    </div>
                )}
              </div>
              <div className="space-y-2">
                <button onClick={handleRegenerateImage} disabled={isRegenerating} className="w-full flex justify-center items-center bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                    {isRegenerating ? <LoadingSpinner size={20} /> : '一键重新生成'}
                </button>
                <div className="flex gap-2">
                    <button onClick={handleDownload} disabled={isRegenerating} className="w-full flex justify-center items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                        下载
                    </button>
                    <button onClick={() => setIsEditingImage(true)} disabled={isRegenerating} className="w-full flex justify-center items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                        编辑
                    </button>
                </div>
              </div>
          </div>

          {/* Form */}
          <div className="space-y-4 flex flex-col">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{isCharacter ? "角色名称" : "特征名称"}</label>
              <input
                type="text"
                value={editableItem.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full bg-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isRegenerating}
              />
            </div>
            <div className="flex-grow flex flex-col">
              <label className="block text-sm font-medium text-gray-300 mb-1">核心提示词</label>
              <textarea
                value={editableItem.corePrompt}
                onChange={(e) => handleInputChange('corePrompt', e.target.value)}
                className="w-full flex-grow bg-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isRegenerating}
              />
            </div>
            <div className="pt-4 space-y-3">
               <button onClick={handleSave} disabled={isRegenerating} className="w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                  保存更改
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {isEditingImage && (
        <ImageEditorModal
          imageUrl={editableItem.referenceImageUrl}
          aspectRatio="1:1"
          onClose={() => setIsEditingImage(false)}
          onSave={(newImageUrl) => {
            setEditableItem(prev => ({...prev, referenceImageUrl: newImageUrl }));
            setIsEditingImage(false);
          }}
        />
      )}
    </>
  );
};

export default AssetEditModal;
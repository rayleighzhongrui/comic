

import React, { useState } from 'react';
import type { Character, Asset, Project, Relationship } from '../types';
import { geminiService } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import AssetEditModal from './AssetEditModal';
import RelationshipEditor from './RelationshipEditor';

// 1. AssetSectionProps interface moved outside of AssetManager
interface AssetSectionProps<T extends Character | Asset> {
  title: string;
  items: T[];
  onAddItem: (item: T) => void;
  onEditItem: (item: T) => void;
  onDeleteItem: (itemId: string) => void;
  placeholder: string;
  project: Project;
  type: 'character' | 'asset';
}

// 2. AssetSection component moved outside of AssetManager
const AssetSection = <T extends Character | Asset,>({ title, items, onAddItem, onEditItem, onDeleteItem, placeholder, project, type }: AssetSectionProps<T>) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setUploadedImage(loadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    setIsLoading(true);
    let imageUrl = uploadedImage;

    try {
      if (!imageUrl) {
        const typeName = type === 'character' ? '角色' : '道具';
        const prompt = `${project.stylePrompt}, ${typeName}设定集, 名为${name}的${typeName}的全身视图, 描述为: ${description}`;
        const images = await geminiService.generateReferenceImage(prompt);
        imageUrl = images[0];
      }
      
      if (!imageUrl) {
        throw new Error("无法创建或上传图片。");
      }

      // --- Start of fix ---
      // Use a more explicit way to create the new item to ensure the ID is set correctly.
      let newItem;
      if (type === 'character') {
          newItem = {
              characterId: `character-${Date.now()}`,
              name,
              referenceImageUrl: imageUrl,
              corePrompt: description,
          };
      } else {
          newItem = {
              assetId: `asset-${Date.now()}`,
              name,
              referenceImageUrl: imageUrl,
              corePrompt: description,
          };
      }
      onAddItem(newItem as T);
      // --- End of fix ---
      
      setName('');
      setDescription('');
      setUploadedImage(null);
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      alert(`生成${type === 'character' ? '角色' : '道具'}失败。请重试。`);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonTextMapping = {
    character: '角色',
    asset: '特征'
  };
  const typeName = buttonTextMapping[type];

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
        {items.map(item => {
            const itemId = 'characterId' in item ? item.characterId : item.assetId;
            return (
              <div key={itemId} className="group relative" title={item.name}>
                <div onClick={() => onEditItem(item)} className="cursor-pointer">
                    <img src={item.referenceImageUrl} alt={item.name} className="w-full h-auto aspect-square object-cover rounded-md" />
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                    <span className="text-white text-xs text-center p-1">{item.name}</span>
                    </div>
                </div>
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`确定要删除“${item.name}”吗？此操作无法撤销。`)) {
                            onDeleteItem(itemId);
                        }
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-all transform scale-75 group-hover:scale-100 z-10"
                    aria-label={`删除 ${item.name}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
            );
        })}
      </div>
      <form onSubmit={handleAddItem} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={type === 'character' ? "角色名称" : "特征名称"}
          className="w-full bg-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          disabled={isLoading}
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          disabled={isLoading}
        />
         <div className="mt-1">
          <label className="text-xs font-medium text-gray-400">添加图片 (可选)</label>
          <div className="mt-1 flex items-center gap-4">
            {uploadedImage ? (
              <div className="relative">
                <img src={uploadedImage} alt="预览" className="w-16 h-16 object-cover rounded-md" />
                <button
                  type="button"
                  onClick={() => setUploadedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 flex items-center justify-center hover:bg-red-700"
                  aria-label="移除图片"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 bg-gray-700 rounded-md flex items-center justify-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            )}
            <div>
                <label htmlFor={`file-upload-${type}`} className="cursor-pointer bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors">
                    上传
                </label>
                <p className="text-xs text-gray-400 mt-1">或者让 AI 生成。</p>
            </div>
            <input id={`file-upload-${type}`} name={`file-upload-${type}`} type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" disabled={isLoading}/>
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || !name || !description}
          className="w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 text-base rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          {isLoading ? <LoadingSpinner size={20} /> : `添加新${typeName}`}
        </button>
      </form>
    </div>
  );
};


interface AssetManagerProps {
  project: Project;
  characters: Character[];
  assets: Asset[];
  relationships: Relationship[];
  onAddCharacter: (character: Character) => void;
  onAddAsset: (asset: Asset) => void;
  onUpdateCharacter: (character: Character) => void;
  onDeleteCharacter: (characterId: string) => void;
  onUpdateAsset: (asset: Asset) => void;
  onDeleteAsset: (assetId: string) => void;
  onAddRelationship: (relationship: Relationship) => void;
  onUpdateRelationship: (relationship: Relationship) => void;
  onDeleteRelationship: (relationshipId: string) => void;
}

const AssetManager: React.FC<AssetManagerProps> = ({ 
  project, 
  characters, 
  assets,
  relationships,
  onAddCharacter, 
  onAddAsset,
  onUpdateCharacter,
  onDeleteCharacter,
  onUpdateAsset,
  onDeleteAsset,
  onAddRelationship,
  onUpdateRelationship,
  onDeleteRelationship,
}) => {
  const [editingItem, setEditingItem] = useState<Character | Asset | null>(null);

  const handleSaveItem = (item: Character | Asset) => {
    if ('characterId' in item) {
        onUpdateCharacter(item as Character);
    } else {
        onUpdateAsset(item as Asset);
    }
    setEditingItem(null);
  };

  return (
    <>
      <div className="bg-gray-800 rounded-lg p-4 space-y-6">
        <AssetSection<Character>
          title="角色"
          items={characters}
          onAddItem={onAddCharacter}
          onEditItem={setEditingItem}
          onDeleteItem={onDeleteCharacter}
          placeholder="例如, '勇敢的骑士，银色头发，左眼有一道疤痕'"
          project={project}
          type="character"
        />
        <AssetSection<Asset>
          title="特征 & 道具"
          items={assets}
          onAddItem={onAddAsset}
          onEditItem={setEditingItem}
          onDeleteItem={onDeleteAsset}
          placeholder="例如, '闪耀着蓝色能量的传奇之剑'"
          project={project}
          type="asset"
        />
        <RelationshipEditor
          characters={characters}
          assets={assets}
          relationships={relationships}
          onAddRelationship={onAddRelationship}
          onUpdateRelationship={onUpdateRelationship}
          onDeleteRelationship={onDeleteRelationship}
        />
      </div>
      {editingItem && (
          <AssetEditModal
              project={project}
              item={editingItem}
              onClose={() => setEditingItem(null)}
              onSave={handleSaveItem}
          />
      )}
    </>
  );
};

export default AssetManager;
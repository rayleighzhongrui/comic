
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
    <div className="mb-8">
      <h3 className="text-xl font-black italic bg-yellow-300 inline-block px-3 py-1 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -skew-x-6 mb-4 text-black uppercase">
        {title}
      </h3>
      
      {/* List */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
        {items.map(item => {
            const itemId = 'characterId' in item ? item.characterId : item.assetId;
            return (
              <div key={itemId} className="group relative bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer" title={item.name}>
                <div onClick={() => onEditItem(item)} className="p-1">
                    <img src={item.referenceImageUrl} alt={item.name} className="w-full h-auto aspect-square object-cover border border-black" />
                    <div className="mt-1 text-center bg-black">
                        <span className="text-white text-xs font-bold truncate block px-1 py-0.5">{item.name}</span>
                    </div>
                </div>
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`确定要删除“${item.name}”吗？此操作无法撤销。`)) {
                            onDeleteItem(itemId);
                        }
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 border-2 border-black text-white w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-all z-10 shadow-sm"
                    aria-label={`删除 ${item.name}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
            );
        })}
        {items.length === 0 && (
            <div className="col-span-3 text-gray-400 text-sm italic border-2 border-dashed border-gray-300 p-2 text-center bg-gray-50">
                暂无{typeName}。请添加。
            </div>
        )}
      </div>

      {/* Add Form */}
      <form onSubmit={handleAddItem} className="space-y-3 bg-gray-50 border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(200,200,200,1)]">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={type === 'character' ? "角色名称" : "特征名称"}
          className="w-full bg-white text-black border-2 border-black rounded-sm px-3 py-2 text-sm font-bold focus:outline-none focus:bg-yellow-50 focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all placeholder-gray-400"
          disabled={isLoading}
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-white text-black border-2 border-black rounded-sm px-3 py-2 text-sm focus:outline-none focus:bg-yellow-50 focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all placeholder-gray-400"
          disabled={isLoading}
        />
         <div className="mt-1">
          <label className="text-xs font-bold text-black uppercase">REF IMAGE (OPTIONAL)</label>
          <div className="mt-1 flex items-center gap-4">
            {uploadedImage ? (
              <div className="relative border-2 border-black">
                <img src={uploadedImage} alt="预览" className="w-16 h-16 object-cover" />
                <button
                  type="button"
                  onClick={() => setUploadedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-600 border-2 border-black text-white w-5 h-5 flex items-center justify-center hover:bg-red-700"
                  aria-label="移除图片"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 bg-gray-100 border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            )}
            <div>
                <label htmlFor={`file-upload-${type}`} className="cursor-pointer bg-gray-200 hover:bg-gray-300 border-2 border-black text-black font-bold py-1 px-3 text-xs transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                    UPLOAD / 上传
                </label>
                <p className="text-xs text-gray-500 mt-1">OR AI GENERATE</p>
            </div>
            <input id={`file-upload-${type}`} name={`file-upload-${type}`} type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" disabled={isLoading}/>
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || !name || !description}
          className="w-full flex justify-center items-center bg-pink-600 hover:bg-pink-500 text-white font-black py-3 px-4 text-base border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:bg-gray-400 disabled:border-gray-600 disabled:shadow-none disabled:cursor-not-allowed transition-all uppercase italic"
        >
          {isLoading ? <LoadingSpinner size={20} /> : `ADD NEW ${type === 'character' ? 'CHAR' : 'ITEM'} / 添加`}
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
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 h-full overflow-y-auto">
        <AssetSection<Character>
          title="CHARACTERS / 角色"
          items={characters}
          onAddItem={onAddCharacter}
          onEditItem={setEditingItem}
          onDeleteItem={onDeleteCharacter}
          placeholder="例如: '勇敢的骑士，银色头发，左眼有一道疤痕'"
          project={project}
          type="character"
        />
        <div className="my-6 border-t-4 border-black border-dashed opacity-50"></div>
        <AssetSection<Asset>
          title="ASSETS / 道具"
          items={assets}
          onAddItem={onAddAsset}
          onEditItem={setEditingItem}
          onDeleteItem={onDeleteAsset}
          placeholder="例如: '闪耀着蓝色能量的传奇之剑'"
          project={project}
          type="asset"
        />
        <div className="my-6 border-t-4 border-black border-dashed opacity-50"></div>
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

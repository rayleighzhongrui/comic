
import React, { useState, useMemo, useEffect } from 'react';
import type { Character, Asset, Relationship } from '../types';

interface RelationshipEditorProps {
  characters: Character[];
  assets: Asset[];
  relationships: Relationship[];
  onAddRelationship: (relationship: Relationship) => void;
  onUpdateRelationship: (relationship: Relationship) => void;
  onDeleteRelationship: (relationshipId: string) => void;
}

const RelationshipEditor: React.FC<RelationshipEditorProps> = ({
  characters,
  assets,
  relationships,
  onAddRelationship,
  onUpdateRelationship,
  onDeleteRelationship,
}) => {
  const [entity1Id, setEntity1Id] = useState<string>('');
  const [entity2Id, setEntity2Id] = useState<string>('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const allEntities = useMemo(() => {
    return [
      ...characters.map(c => ({ ...c, type: 'character' })),
      ...assets.map(a => ({ ...a, type: 'asset' })),
    ];
  }, [characters, assets]);

  const allEntitiesMap = useMemo(() => {
    return new Map(allEntities.map(e => [('characterId' in e) ? e.characterId : e.assetId, e]));
  }, [allEntities]);

  useEffect(() => {
    if (!editingId) {
      // If we exit editing mode, reset the form
      setEntity1Id('');
      setEntity2Id('');
      setDescription('');
    }
  }, [editingId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entity1Id || !entity2Id || !description.trim() || entity1Id === entity2Id) {
      alert("请选择两个不同的实体并填写关系描述。");
      return;
    }

    if (editingId) {
      onUpdateRelationship({ id: editingId, entity1Id, entity2Id, description });
      setEditingId(null);
    } else {
      onAddRelationship({
        id: `rel-${Date.now()}`,
        entity1Id,
        entity2Id,
        description,
      });
    }

    // Reset form after submit
    setEntity1Id('');
    setEntity2Id('');
    setDescription('');
  };
  
  const handleEdit = (relationship: Relationship) => {
    setEditingId(relationship.id);
    setEntity1Id(relationship.entity1Id);
    setEntity2Id(relationship.entity2Id);
    setDescription(relationship.description);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div>
       <h3 className="text-xl font-black italic bg-yellow-300 inline-block px-3 py-1 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -skew-x-6 mb-4 text-black uppercase">
        RELATIONSHIPS / 关系
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-3 bg-gray-50 border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(200,200,200,1)]">
        <div className="flex flex-col sm:flex-row items-center gap-2">
            <select
              value={entity1Id}
              onChange={(e) => setEntity1Id(e.target.value)}
              className="w-full bg-white text-black border-2 border-black rounded-sm px-3 py-2 text-sm font-bold focus:outline-none focus:bg-yellow-50 focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <option value="">实体 1</option>
              <optgroup label="角色">
                {characters.map(c => <option key={c.characterId} value={c.characterId}>{c.name}</option>)}
              </optgroup>
              <optgroup label="道具">
                {assets.map(a => <option key={a.assetId} value={a.assetId}>{a.name}</option>)}
              </optgroup>
            </select>
          <span className="text-black font-black text-lg">X</span>
           <select
              value={entity2Id}
              onChange={(e) => setEntity2Id(e.target.value)}
              className="w-full bg-white text-black border-2 border-black rounded-sm px-3 py-2 text-sm font-bold focus:outline-none focus:bg-yellow-50 focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <option value="">实体 2</option>
              <optgroup label="角色">
                {characters.map(c => <option key={c.characterId} value={c.characterId}>{c.name}</option>)}
              </optgroup>
              <optgroup label="道具">
                {assets.map(a => <option key={a.assetId} value={a.assetId}>{a.name}</option>)}
              </optgroup>
            </select>
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="关系描述 (例如: 宿敌)"
          className="w-full bg-white text-black border-2 border-black rounded-sm px-3 py-2 text-sm font-bold focus:outline-none focus:bg-yellow-50 focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all placeholder-gray-400"
        />
        <div className="flex gap-2">
          {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full flex justify-center items-center bg-gray-200 border-2 border-black text-black font-bold py-2 px-4 rounded-sm hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
          )}
          <button
            type="submit"
            disabled={!entity1Id || !entity2Id || !description.trim() || entity1Id === entity2Id}
            className="w-full flex justify-center items-center bg-cyan-400 hover:bg-cyan-300 text-black font-black py-2 px-4 rounded-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] disabled:bg-gray-300 disabled:border-gray-500 disabled:shadow-none disabled:cursor-not-allowed transition-all uppercase"
          >
            {editingId ? 'SAVE' : 'ADD RELATION'}
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-2">
        {relationships.map((rel) => {
          const entity1 = allEntitiesMap.get(rel.entity1Id);
          const entity2 = allEntitiesMap.get(rel.entity2Id);
          if (!entity1 || !entity2) return null;

          return (
            <div key={rel.id} className="flex items-center justify-between bg-white border-2 border-black p-2 shadow-sm">
              <p className="text-black text-sm">
                <span className="font-bold bg-yellow-100 px-1 border border-black">{entity1.name}</span>
                <span className="text-pink-600 font-black mx-2 italic">{rel.description}</span>
                <span className="font-bold bg-yellow-100 px-1 border border-black">{entity2.name}</span>
              </p>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(rel)} className="text-blue-600 hover:text-blue-800 font-bold px-1 hover:bg-blue-100 rounded">
                   EDIT
                </button>
                <button onClick={() => onDeleteRelationship(rel.id)} className="text-red-600 hover:text-red-800 font-bold px-1 hover:bg-red-100 rounded">
                    X
                </button>
              </div>
            </div>
          );
        })}
        {relationships.length === 0 && (
             <div className="text-gray-400 text-sm italic text-center p-2">
                暂无关系。
            </div>
        )}
      </div>
    </div>
  );
};

export default RelationshipEditor;

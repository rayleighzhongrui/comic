
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
      <h3 className="text-lg font-semibold text-white mb-3 pt-4 border-t border-gray-700">关系编辑器</h3>
      <form onSubmit={handleSubmit} className="space-y-3 bg-gray-700 p-4 rounded-lg">
        <div className="flex items-center gap-2">
            <select
              value={entity1Id}
              onChange={(e) => setEntity1Id(e.target.value)}
              className="w-full bg-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">选择实体1</option>
              <optgroup label="角色">
                {characters.map(c => <option key={c.characterId} value={c.characterId}>{c.name}</option>)}
              </optgroup>
              <optgroup label="道具">
                {assets.map(a => <option key={a.assetId} value={a.assetId}>{a.name}</option>)}
              </optgroup>
            </select>
          <span className="text-gray-400 text-sm">与</span>
           <select
              value={entity2Id}
              onChange={(e) => setEntity2Id(e.target.value)}
              className="w-full bg-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">选择实体2</option>
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
          placeholder="的关系是... (例如: 父亲, 宿敌, 拥有)"
          className="w-full bg-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
        <div className="flex gap-2">
          {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full flex justify-center items-center bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              >
                取消
              </button>
          )}
          <button
            type="submit"
            disabled={!entity1Id || !entity2Id || !description.trim() || entity1Id === entity2Id}
            className="w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {editingId ? '保存更改' : '添加关系'}
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-2">
        {relationships.map((rel) => {
          const entity1 = allEntitiesMap.get(rel.entity1Id);
          const entity2 = allEntitiesMap.get(rel.entity2Id);
          if (!entity1 || !entity2) return null;

          return (
            <div key={rel.id} className="flex items-center justify-between bg-gray-700 p-2 rounded-md text-sm">
              <p className="text-gray-300">
                <span className="font-semibold text-white">{entity1.name}</span>
                <span className="text-indigo-400 mx-2">{rel.description}</span>
                <span className="font-semibold text-white">{entity2.name}</span>
              </p>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(rel)} className="p-1 text-blue-400 hover:text-blue-300">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                </button>
                <button onClick={() => onDeleteRelationship(rel.id)} className="p-1 text-red-400 hover:text-red-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RelationshipEditor;

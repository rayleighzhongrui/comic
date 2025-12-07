
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Project, Character, Asset, Page, Relationship } from './types';
import ProjectCreation from './components/ProjectCreation';
import Editor from './components/Editor';
import { storageService } from './services/storage';
import Modal from './components/Modal';

const App: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  
  const [hasBackup, setHasBackup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // Ref to track if data has changed since last save to debounce
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for existing backup on mount using IndexedDB
  useEffect(() => {
    const checkBackup = async () => {
        try {
            const data = await storageService.loadProjectData();
            if (data && data.project) {
                setHasBackup(true);
            }
        } catch (e) {
            console.error("Failed to check IndexedDB backup", e);
        }
    };
    checkBackup();
  }, []);

  // Auto-save effect using IndexedDB with debounce
  useEffect(() => {
    if (!project) return;

    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
        const backupData = {
            project,
            characters,
            assets,
            pages,
            relationships,
            timestamp: Date.now()
        };
        
        try {
            await storageService.saveProjectData(backupData);
            setIsSaving(false);
        } catch (e) {
            console.error("Auto-save failed:", e);
            setIsSaving(false);
        }
    }, 1000); // 1 second debounce

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [project, characters, assets, pages, relationships]);

  const handleCreateProject = useCallback((newProject: Project) => {
    setProject(newProject);
    setCharacters([]);
    setAssets([]);
    setPages([]);
    setRelationships([]);
  }, []);
  
  const handleLoadBackup = useCallback(async () => {
    try {
        const data = await storageService.loadProjectData();
        if (data && data.project) {
            setProject(data.project);
            setCharacters(data.characters || []);
            setAssets(data.assets || []);
            setPages(data.pages || []);
            setRelationships(data.relationships || []);
            console.log("Restored from IndexedDB backup!");
        }
    } catch (e) {
        console.error("Error loading backup", e);
        alert("恢复备份失败。");
    }
  }, []);

  const handleImportProject = useCallback((jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);

      if (data.project) {
        setProject(data.project);
        setCharacters(data.characters || []);
        setAssets(data.assets || []);
        setPages(data.pages || []);
        setRelationships(data.relationships || []);
        console.log("Project imported successfully!");
      } else {
        throw new Error("Invalid project file format: 'project' data is missing.");
      }
    } catch (error) {
      console.error("Failed to import project:", error);
      alert("导入项目失败。请确保您选择了一个有效的项目 .json 文件。");
    }
  }, []);

  const handleAddCharacter = useCallback((character: Character) => {
    setCharacters(prev => [...prev, character]);
  }, []);

  const handleAddAsset = useCallback((asset: Asset) => {
    setAssets(prev => [...prev, asset]);
  }, []);

  const handleAddRelationship = useCallback((relationship: Relationship) => {
    setRelationships(prev => [...prev, relationship]);
  }, []);
  
  const handleAddPage = useCallback((page: Page) => {
    setPages(prev => [...prev, page]);
  }, []);

  const handleDeletePage = useCallback((pageId: string) => {
    setConfirmModal({
        isOpen: true,
        title: "删除页面确认",
        message: "确定要删除此页面吗？",
        onConfirm: () => {
            setPages(prev => prev
                .filter(p => p.pageId !== pageId)
                .map((page, index) => ({ ...page, pageNumber: index + 1 }))
            );
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    });
  }, []);

  const handleUpdatePage = useCallback((updatedPage: Page) => {
    setPages(prev => prev.map(p => p.pageId === updatedPage.pageId ? updatedPage : p));
  }, []);
  
  const handleUpdateCharacter = useCallback((updatedCharacter: Character) => {
    setCharacters(prev => prev.map(c => c.characterId === updatedCharacter.characterId ? updatedCharacter : c));
  }, []);

  // Optimized Cascading Delete for Characters
  const handleDeleteCharacter = useCallback((characterId: string) => {
    const char = characters.find(c => c.characterId === characterId);
    if (!char) {
        console.error("Character not found for deletion:", characterId);
        return;
    }

    // 1. Calculate Statistics
    const relatedRelationships = relationships.filter(r => r.entity1Id === characterId || r.entity2Id === characterId);
    const relatedPageCount = pages.filter(p => p.userStoryText && p.userStoryText.includes(char.name)).length;

    // 2. Build Confirmation Message
    let message = `⚠️ 删除角色确认：${char.name}\n\n`;
    
    if (relatedRelationships.length > 0 || relatedPageCount > 0) {
        message += `该角色目前正在被使用：\n`;
        if (relatedRelationships.length > 0) message += `- 关联关系：${relatedRelationships.length} 个 (将被自动删除以防报错)\n`;
        if (relatedPageCount > 0) message += `- 历史页面提及：${relatedPageCount} 页 (文本将保留，但失去关联数据)\n`;
        message += `\n`;
    } else {
        message += `该角色暂未被使用。\n`;
    }
    
    message += `确定要永久删除吗？此操作无法撤销。`;

    // 3. Confirm and Execute via Modal
    setConfirmModal({
        isOpen: true,
        title: "删除角色",
        message: message,
        onConfirm: () => {
             setCharacters(prev => prev.filter(c => c.characterId !== characterId));
             setRelationships(prev => prev.filter(r => r.entity1Id !== characterId && r.entity2Id !== characterId));
             setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    });
  }, [characters, relationships, pages]);

  const handleUpdateAsset = useCallback((updatedAsset: Asset) => {
    setAssets(prev => prev.map(a => a.assetId === updatedAsset.assetId ? updatedAsset : a));
  }, []);

  const handleDeleteAsset = useCallback((assetId: string) => {
    const asset = assets.find(a => a.assetId === assetId);
    if (!asset) return;

    // Calculate Statistics
    const relatedRelationships = relationships.filter(r => r.entity1Id === assetId || r.entity2Id === assetId);
    const relatedPageCount = pages.filter(p => p.userStoryText && p.userStoryText.includes(asset.name)).length;

    let message = `⚠️ 删除道具确认：${asset.name}\n\n`;
    if (relatedRelationships.length > 0) {
         message += `- 关联关系：${relatedRelationships.length} 个 (将被删除)\n`;
    }
    if (relatedPageCount > 0) {
         message += `- 历史页面提及：${relatedPageCount} 页\n`;
    }
    message += `\n确定要永久删除吗？`;

    setConfirmModal({
        isOpen: true,
        title: "删除道具",
        message: message,
        onConfirm: () => {
             setAssets(prev => prev.filter(a => a.assetId !== assetId));
             setRelationships(prev => prev.filter(r => r.entity1Id !== assetId && r.entity2Id !== assetId));
             setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    });
  }, [assets, relationships, pages]);

  const handleUpdateRelationship = useCallback((updatedRelationship: Relationship) => {
    setRelationships(prev => prev.map(r => r.id === updatedRelationship.id ? updatedRelationship : r));
  }, []);

  const handleDeleteRelationship = useCallback((relationshipId: string) => {
    setConfirmModal({
        isOpen: true,
        title: "删除关系",
        message: "确定要删除这条关系吗？",
        onConfirm: () => {
            setRelationships(prev => prev.filter(r => r.id !== relationshipId));
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    });
  }, []);


  if (!project) {
    return (
        <ProjectCreation 
            onCreateProject={handleCreateProject} 
            onImportProject={handleImportProject} 
            hasBackup={hasBackup}
            onLoadBackup={handleLoadBackup}
        />
    );
  }

  return (
    <div className="relative">
        <Editor
            project={project}
            characters={characters}
            assets={assets}
            pages={pages}
            relationships={relationships}
            onAddCharacter={handleAddCharacter}
            onAddAsset={handleAddAsset}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onUpdatePage={handleUpdatePage}
            onUpdateCharacter={handleUpdateCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onUpdateAsset={handleUpdateAsset}
            onDeleteAsset={handleDeleteAsset}
            onAddRelationship={handleAddRelationship}
            onUpdateRelationship={handleUpdateRelationship}
            onDeleteRelationship={handleDeleteRelationship}
        />
        {isSaving && (
            <div className="fixed bottom-4 right-4 bg-black text-white px-3 py-1 text-xs font-bold uppercase border-2 border-white shadow-lg z-50 animate-pulse">
                Saving...
            </div>
        )}
        
        {/* Global Confirmation Modal */}
        <Modal 
            isOpen={confirmModal.isOpen} 
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
            title={confirmModal.title}
            size="md"
        >
            <div className="flex flex-col gap-6">
                <div className="whitespace-pre-wrap font-bold text-lg text-black">
                    {confirmModal.message}
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t-2 border-black border-dashed">
                    <button
                        onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                        className="px-6 py-2 border-2 border-black font-bold text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
                    >
                        CANCEL / 取消
                    </button>
                    <button
                        onClick={confirmModal.onConfirm}
                        className="px-6 py-2 bg-red-600 text-white border-2 border-black font-black hover:bg-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
                    >
                        CONFIRM / 确认
                    </button>
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default App;

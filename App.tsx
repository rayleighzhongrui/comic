
import React, { useState, useCallback } from 'react';
import type { Project, Character, Asset, Page, Relationship } from './types';
import ProjectCreation from './components/ProjectCreation';
import Editor from './components/Editor';

const App: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  const handleCreateProject = useCallback((newProject: Project) => {
    setProject(newProject);
    // Reset other states for a new project
    setCharacters([]);
    setAssets([]);
    setPages([]);
    setRelationships([]);
  }, []);

  const handleImportProject = useCallback((jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);

      // The only required field is 'project'. Everything else is optional.
      if (data.project) {
        setProject(data.project);
        // If a key is missing from the export, default to an empty array.
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
    setPages(prev => prev
      .filter(p => p.pageId !== pageId)
      .map((page, index) => ({ ...page, pageNumber: index + 1 }))
    );
  }, []);

  const handleUpdatePage = useCallback((updatedPage: Page) => {
    setPages(prev => prev.map(p => p.pageId === updatedPage.pageId ? updatedPage : p));
  }, []);
  
  const handleUpdateCharacter = useCallback((updatedCharacter: Character) => {
    setCharacters(prev => prev.map(c => c.characterId === updatedCharacter.characterId ? updatedCharacter : c));
  }, []);

  const handleDeleteCharacter = useCallback((characterId: string) => {
    setCharacters(prev => prev.filter(c => c.characterId !== characterId));
    // Also remove any relationships involving this character
    setRelationships(prev => prev.filter(r => r.entity1Id !== characterId && r.entity2Id !== characterId));
  }, []);

  const handleUpdateAsset = useCallback((updatedAsset: Asset) => {
    setAssets(prev => prev.map(a => a.assetId === updatedAsset.assetId ? updatedAsset : a));
  }, []);

  const handleDeleteAsset = useCallback((assetId: string) => {
    setAssets(prev => prev.filter(a => a.assetId !== assetId));
    // Also remove any relationships involving this asset
    setRelationships(prev => prev.filter(r => r.entity1Id !== assetId && r.entity2Id !== assetId));
  }, []);

  const handleUpdateRelationship = useCallback((updatedRelationship: Relationship) => {
    setRelationships(prev => prev.map(r => r.id === updatedRelationship.id ? updatedRelationship : r));
  }, []);

  const handleDeleteRelationship = useCallback((relationshipId: string) => {
    setRelationships(prev => prev.filter(r => r.id !== relationshipId));
  }, []);


  if (!project) {
    return <ProjectCreation onCreateProject={handleCreateProject} onImportProject={handleImportProject} />;
  }

  return (
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
  );
};

export default App;

import React, { useState, useCallback } from 'react';
import type { Project, Character, Asset, Page } from './types';
import ProjectCreation from './components/ProjectCreation';
import Editor from './components/Editor';

const App: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pages, setPages] = useState<Page[]>([]);

  const handleCreateProject = useCallback((newProject: Project) => {
    setProject(newProject);
    // Reset other states for a new project
    setCharacters([]);
    setAssets([]);
    setPages([]);
  }, []);

  const handleAddCharacter = useCallback((character: Character) => {
    setCharacters(prev => [...prev, character]);
  }, []);

  const handleAddAsset = useCallback((asset: Asset) => {
    setAssets(prev => [...prev, asset]);
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
  }, []);

  const handleUpdateAsset = useCallback((updatedAsset: Asset) => {
    setAssets(prev => prev.map(a => a.assetId === updatedAsset.assetId ? updatedAsset : a));
  }, []);

  const handleDeleteAsset = useCallback((assetId: string) => {
    setAssets(prev => prev.filter(a => a.assetId !== assetId));
  }, []);


  if (!project) {
    return <ProjectCreation onCreateProject={handleCreateProject} />;
  }

  return (
    <Editor
      project={project}
      characters={characters}
      assets={assets}
      pages={pages}
      onAddCharacter={handleAddCharacter}
      onAddAsset={handleAddAsset}
      onAddPage={handleAddPage}
      onDeletePage={handleDeletePage}
      onUpdatePage={handleUpdatePage}
      onUpdateCharacter={handleUpdateCharacter}
      onDeleteCharacter={handleDeleteCharacter}
      onUpdateAsset={handleUpdateAsset}
      onDeleteAsset={handleDeleteAsset}
    />
  );
};

export default App;

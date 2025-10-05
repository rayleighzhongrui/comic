

import React, { useState } from 'react';
import type { Project, Character, Asset, Page } from '../types';
import AssetManager from './AssetManager';
import PageDisplay from './PageDisplay';
import PageCreator from './PageCreator';

interface EditorProps {
  project: Project;
  characters: Character[];
  assets: Asset[];
  pages: Page[];
  onAddCharacter: (character: Character) => void;
  onAddAsset: (asset: Asset) => void;
  onAddPage: (page: Page) => void;
  onDeletePage: (pageId: string) => void;
  onUpdatePage: (page: Page) => void;
  onUpdateCharacter: (character: Character) => void;
  onDeleteCharacter: (characterId: string) => void;
  onUpdateAsset: (asset: Asset) => void;
  onDeleteAsset: (assetId: string) => void;
}

const Editor: React.FC<EditorProps> = (props) => {
  const { 
    project, 
    characters, 
    assets, 
    pages, 
    onAddCharacter, 
    onAddAsset, 
    onAddPage,
    onDeletePage,
    onUpdatePage,
    onUpdateCharacter,
    onDeleteCharacter,
    onUpdateAsset,
    onDeleteAsset,
  } = props;

  const [continuationContext, setContinuationContext] = useState<Page | null>(null);

  const handleContinueFromPage = (page: Page) => {
    setContinuationContext(page);
    // Optionally, you could scroll the user to the PageCreator component
    // document.getElementById('page-creator-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearContinuationContext = () => {
    setContinuationContext(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">AI 漫画生成器</h1>
        <p className="text-gray-400">项目: {project.projectName}</p>
      </header>
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-80px)]">
        
        {/* Left Panel: Asset Management */}
        <div className="lg:col-span-3 h-full overflow-y-auto">
          <AssetManager
            project={project}
            characters={characters}
            assets={assets}
            onAddCharacter={onAddCharacter}
            onAddAsset={onAddAsset}
            onUpdateCharacter={onUpdateCharacter}
            onDeleteCharacter={onDeleteCharacter}
            onUpdateAsset={onUpdateAsset}
            onDeleteAsset={onDeleteAsset}
          />
        </div>
        
        {/* Center Panel: Page Display */}
        <div className="lg:col-span-5 h-full">
          <PageDisplay 
            project={project} 
            pages={pages}
            onDeletePage={onDeletePage}
            onUpdatePage={onUpdatePage}
            onContinueFromPage={handleContinueFromPage}
          />
        </div>
        
        {/* Right Panel: Page Creation */}
        <div id="page-creator-panel" className="lg:col-span-4 h-full overflow-y-auto">
          <PageCreator
            project={project}
            characters={characters}
            assets={assets}
            pages={pages}
            onAddPage={onAddPage}
            continuationContext={continuationContext}
            onClearContinuationContext={handleClearContinuationContext}
          />
        </div>

      </main>
    </div>
  );
};

export default Editor;
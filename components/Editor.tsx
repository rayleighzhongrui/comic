

import React, { useState } from 'react';
import type { Project, Character, Asset, Page, Relationship } from '../types';
import AssetManager from './AssetManager';
import PageDisplay from './PageDisplay';
import PageCreator from './PageCreator';
import ExportModal, { type ExportOptions } from './ExportModal';

interface EditorProps {
  project: Project;
  characters: Character[];
  assets: Asset[];
  pages: Page[];
  relationships: Relationship[];
  onAddCharacter: (character: Character) => void;
  onAddAsset: (asset: Asset) => void;
  onAddPage: (page: Page) => void;
  onDeletePage: (pageId: string) => void;
  onUpdatePage: (page: Page) => void;
  onUpdateCharacter: (character: Character) => void;
  onDeleteCharacter: (characterId: string) => void;
  onUpdateAsset: (asset: Asset) => void;
  onDeleteAsset: (assetId: string) => void;
  onAddRelationship: (relationship: Relationship) => void;
  onUpdateRelationship: (relationship: Relationship) => void;
  onDeleteRelationship: (relationshipId: string) => void;
}

const Editor: React.FC<EditorProps> = (props) => {
  const { 
    project, 
    characters, 
    assets, 
    pages,
    relationships,
    onAddCharacter, 
    onAddAsset, 
    onAddPage,
    onDeletePage,
    onUpdatePage,
    onUpdateCharacter,
    onDeleteCharacter,
    onUpdateAsset,
    onDeleteAsset,
    onAddRelationship,
    onUpdateRelationship,
    onDeleteRelationship,
  } = props;

  const [continuationContext, setContinuationContext] = useState<Page | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleContinueFromPage = (page: Page) => {
    setContinuationContext(page);
    // Optionally, you could scroll the user to the PageCreator component
    // document.getElementById('page-creator-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearContinuationContext = () => {
    setContinuationContext(null);
  };

  const handleConfirmExport = (options: ExportOptions) => {
    setIsExportModalOpen(false);

    // 1. Conditionally build the project data object
    const projectData: { [key: string]: any } = {
      project, // Always include project settings
      version: "1.1.0", // Bump version for selective export feature
    };

    if (options.characters) projectData.characters = characters;
    if (options.assets) projectData.assets = assets;
    if (options.relationships) projectData.relationships = relationships;
    if (options.pages) projectData.pages = pages;

    // 2. Convert the data object to a nicely formatted JSON string
    const jsonString = JSON.stringify(projectData, null, 2);

    // 3. Create a Blob from the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 4. Create a temporary URL for the Blob
    const url = URL.createObjectURL(blob);

    // 5. Create a temporary anchor element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.projectName}.json`; // Set the filename
    document.body.appendChild(link);
    link.click();
    
    // 6. Clean up by removing the temporary link and revoking the URL
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <header className="mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">AI 漫画生成器</h1>
            <p className="text-gray-400">项目: {project.projectName}</p>
          </div>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-md transition-colors"
            title="将整个项目导出为 .json 文件"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2V4z" />
              <path fillRule="evenodd" d="M3 8h14v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 6a1 1 0 100 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
            </svg>
            导出项目
          </button>
        </header>
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-80px)]">
          
          {/* Left Panel: Asset Management */}
          <div className="lg:col-span-3 h-full overflow-y-auto">
            <AssetManager
              project={project}
              characters={characters}
              assets={assets}
              relationships={relationships}
              onAddCharacter={onAddCharacter}
              onAddAsset={onAddAsset}
              onUpdateCharacter={onUpdateCharacter}
              onDeleteCharacter={onDeleteCharacter}
              onUpdateAsset={onUpdateAsset}
              onDeleteAsset={onDeleteAsset}
              onAddRelationship={onAddRelationship}
              onUpdateRelationship={onUpdateRelationship}
              onDeleteRelationship={onDeleteRelationship}
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
              relationships={relationships}
              onAddPage={onAddPage}
              continuationContext={continuationContext}
              onClearContinuationContext={handleClearContinuationContext}
            />
          </div>

        </main>
      </div>
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleConfirmExport}
      />
    </>
  );
};

export default Editor;
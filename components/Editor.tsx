
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
      <div className="lg:h-screen min-h-screen bg-yellow-400 p-4 font-sans relative lg:overflow-hidden overflow-auto flex flex-col">
        {/* Background Patterns */}
        <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
                backgroundImage: 'radial-gradient(#000 20%, transparent 20%)',
                backgroundSize: '20px 20px'
            }}
        ></div>
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[conic-gradient(from_0deg_at_50%_50%,white_0deg,transparent_2deg,transparent_5deg,white_7deg)]"></div>

        <header className="flex-none relative z-10 mb-4 flex justify-between items-center bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 rounded-sm">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-black uppercase transform -skew-x-6">
                AI MANGA CREATOR
            </h1>
            <p className="text-black font-bold text-sm bg-yellow-300 inline-block px-2 border border-black mt-1">
                PROJECT: {project.projectName}
            </p>
          </div>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="group flex items-center gap-2 px-4 py-2 bg-cyan-400 hover:bg-cyan-300 border-2 border-black text-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            title="将整个项目导出为 .json 文件"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2V4z" />
              <path fillRule="evenodd" d="M3 8h14v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 6a1 1 0 100 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
            </svg>
            EXPORT / 导出
          </button>
        </header>

        <main className="flex-1 lg:min-h-0 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel: Asset Management */}
          {/* On desktop (lg), it takes height of parent (grid) and manages own scroll. On mobile, it takes auto height. */}
          <div className="lg:col-span-3 lg:h-full h-auto lg:overflow-hidden pr-1">
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
          {/* Fixed height on mobile to ensure internal scroll works, full height on desktop. */}
          <div className="lg:col-span-5 lg:h-full h-[60vh] lg:overflow-hidden">
            <PageDisplay 
              project={project} 
              pages={pages}
              onDeletePage={onDeletePage}
              onUpdatePage={onUpdatePage}
              onContinueFromPage={handleContinueFromPage}
            />
          </div>
          
          {/* Right Panel: Page Creation */}
          {/* Wrapper manages scroll on desktop. On mobile, it grows and window scrolls. */}
          <div id="page-creator-panel" className="lg:col-span-4 lg:h-full h-auto lg:overflow-y-auto pl-1">
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

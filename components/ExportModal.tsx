
import React, { useState } from 'react';
import Modal from './Modal';

export interface ExportOptions {
  characters: boolean;
  assets: boolean;
  relationships: boolean;
  pages: boolean;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

const Checkbox: React.FC<{ id: string; label: string; checked: boolean; onChange: () => void }> = ({ id, label, checked, onChange }) => (
    <div className="flex items-start bg-white border-2 border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer" onClick={onChange}>
        <div className="flex items-center h-5">
            <input
                id={id}
                name={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="focus:ring-pink-500 h-5 w-5 text-pink-600 border-2 border-black rounded-sm bg-gray-100"
            />
        </div>
        <div className="ml-3 text-sm">
            <label htmlFor={id} className="font-bold text-black uppercase cursor-pointer">{label}</label>
        </div>
    </div>
);


const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
  const [options, setOptions] = useState<ExportOptions>({
    characters: true,
    assets: true,
    relationships: true,
    pages: true,
  });

  const handleCheckboxChange = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    setOptions({ characters: true, assets: true, relationships: true, pages: true });
  };

  const handleDeselectAll = () => {
    setOptions({ characters: false, assets: false, relationships: false, pages: false });
  };

  const handleExportClick = () => {
    onExport(options);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="EXPORT PROJECT" size="lg">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-black">SELECT DATA TO EXPORT</h3>
          <p className="mt-1 text-sm text-gray-600">Choose which parts of your project to include in the JSON file.</p>
        </div>
        
        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Checkbox 
            id="characters"
            label="CHARACTERS"
            checked={options.characters}
            onChange={() => handleCheckboxChange('characters')}
          />
          <Checkbox 
            id="assets"
            label="ASSETS & ITEMS"
            checked={options.assets}
            onChange={() => handleCheckboxChange('assets')}
          />
          <Checkbox 
            id="relationships"
            label="RELATIONSHIPS"
            checked={options.relationships}
            onChange={() => handleCheckboxChange('relationships')}
          />
          <Checkbox 
            id="pages"
            label="PAGES & STORY"
            checked={options.pages}
            onChange={() => handleCheckboxChange('pages')}
          />
        </fieldset>

        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            type="button" 
            onClick={handleSelectAll}
            className="flex-1 py-2 px-4 border-2 border-black text-sm font-bold text-black bg-gray-100 hover:bg-gray-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
          >
            SELECT ALL
          </button>
          <button 
            type="button" 
            onClick={handleDeselectAll}
            className="flex-1 py-2 px-4 border-2 border-black text-sm font-bold text-black bg-gray-100 hover:bg-gray-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
          >
            DESELECT ALL
          </button>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t-2 border-black border-dashed">
          <button 
            type="button" 
            onClick={onClose}
            className="py-3 px-6 border-2 border-black text-sm font-bold text-black bg-white hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            CANCEL
          </button>
          <button 
            type="button" 
            onClick={handleExportClick}
            className="py-3 px-6 border-2 border-black text-sm font-black text-white bg-indigo-600 hover:bg-indigo-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all uppercase"
          >
            CONFIRM EXPORT
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportModal;

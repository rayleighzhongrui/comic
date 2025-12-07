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
    <div className="flex items-start">
        <div className="flex items-center h-5">
            <input
                id={id}
                name={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-500 rounded bg-gray-700"
            />
        </div>
        <div className="ml-3 text-sm">
            <label htmlFor={id} className="font-medium text-gray-200">{label}</label>
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
    <Modal isOpen={isOpen} onClose={onClose} title="导出项目选项" size="lg">
      <div className="space-y-6 text-white">
        <div>
          <h3 className="text-lg leading-6 font-medium text-white">选择要导出的数据</h3>
          <p className="mt-1 text-sm text-gray-400">选择您想包含在 JSON 导出文件中的项目部分。</p>
        </div>
        
        <fieldset className="space-y-4 bg-gray-700 p-4 rounded-lg">
          <Checkbox 
            id="characters"
            label="角色"
            checked={options.characters}
            onChange={() => handleCheckboxChange('characters')}
          />
          <Checkbox 
            id="assets"
            label="特征 & 道具"
            checked={options.assets}
            onChange={() => handleCheckboxChange('assets')}
          />
          <Checkbox 
            id="relationships"
            label="关系"
            checked={options.relationships}
            onChange={() => handleCheckboxChange('relationships')}
          />
          <Checkbox 
            id="pages"
            label="漫画页面 (图片和故事)"
            checked={options.pages}
            onChange={() => handleCheckboxChange('pages')}
          />
        </fieldset>

        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            type="button" 
            onClick={handleSelectAll}
            className="w-full flex justify-center py-2 px-4 border border-gray-500 text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-500 focus:outline-none"
          >
            全选
          </button>
          <button 
            type="button" 
            onClick={handleDeselectAll}
            className="w-full flex justify-center py-2 px-4 border border-gray-500 text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-500 focus:outline-none"
          >
            全部不选
          </button>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
          <button 
            type="button" 
            onClick={onClose}
            className="py-2 px-4 border border-gray-500 text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-500 focus:outline-none"
          >
            取消
          </button>
          <button 
            type="button" 
            onClick={handleExportClick}
            className="py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
          >
            导出
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportModal;
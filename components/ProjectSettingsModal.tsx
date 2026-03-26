

import React, { useState, useRef, useEffect } from 'react';
import type { Project, ComicFormat } from '../types';
import { DrawingStyle } from '../types';
import { DRAWING_STYLES, COMIC_FORMATS } from '../constants';
import Modal from './Modal';
import { geminiService } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { toBase64FromUrl } from '../utils';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (project: Project) => void;
}

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ isOpen, onClose, project, onUpdateProject }) => {
  const [projectName, setProjectName] = useState(project.projectName);
  const [format, setFormat] = useState<ComicFormat>(project.format);
  const [style, setStyle] = useState<DrawingStyle>(project.style);
  const [stylePrompt, setStylePrompt] = useState<string>(project.stylePrompt);
  
  const [isExtractingStyle, setIsExtractingStyle] = useState(false);
  const styleImageInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
      if (isOpen) {
          setProjectName(project.projectName);
          setFormat(project.format);
          setStyle(project.style);
          setStylePrompt(project.stylePrompt);
      }
  }, [isOpen, project]);

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStyle = e.target.value as DrawingStyle;
    setStyle(newStyle);
    
    if (newStyle !== DrawingStyle.CUSTOM) {
        const selectedStyleObj = DRAWING_STYLES.find(s => s.id === newStyle);
        if (selectedStyleObj) {
            setStylePrompt(selectedStyleObj.id);
        }
    }
  };

  const handleStyleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsExtractingStyle(true);
      try {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
              const base64DataUrl = reader.result as string;
              const { mimeType, data } = await toBase64FromUrl(base64DataUrl);
              const extractedPrompt = await geminiService.extractStyleFromImage({ mimeType, data });
              setStylePrompt(extractedPrompt);
              // Auto-switch to custom if not already
              if (style !== DrawingStyle.CUSTOM) {
                  setStyle(DrawingStyle.CUSTOM);
              }
          };
      } catch (error) {
          console.error("Style extraction failed", error);
          alert("风格提取失败，请重试。");
      } finally {
          setIsExtractingStyle(false);
          if (styleImageInputRef.current) styleImageInputRef.current.value = '';
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProject({
        ...project,
        projectName,
        format,
        style,
        stylePrompt
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="PROJECT SETTINGS / 项目设置" size="2xl">
      <form className="space-y-6" onSubmit={handleSubmit}>
              
        <div className="space-y-2">
            <label htmlFor="edit-project-name" className="block text-lg font-black italic text-black uppercase transform -skew-x-6">
                Project Name
            </label>
            <input
                id="edit-project-name"
                type="text"
                required
                className="w-full px-4 py-2 bg-gray-50 border-4 border-black text-black font-bold placeholder-gray-400 focus:outline-none focus:bg-yellow-50 focus:border-pink-500 transition-all"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label htmlFor="edit-format" className="block text-lg font-black italic text-black uppercase transform -skew-x-6">
                Format
                </label>
                <select
                    id="edit-format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as ComicFormat)}
                    className="w-full px-4 py-2 bg-gray-50 border-4 border-black text-black font-bold focus:outline-none focus:bg-yellow-50 focus:border-cyan-500 transition-all"
                >
                    {COMIC_FORMATS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
            </div>

            <div className="space-y-2">
                <label htmlFor="edit-style" className="block text-lg font-black italic text-black uppercase transform -skew-x-6">
                Style Preset
                </label>
                <select
                    id="edit-style"
                    value={style}
                    onChange={handleStyleChange}
                    className="w-full px-4 py-2 bg-gray-50 border-4 border-black text-black font-bold focus:outline-none focus:bg-yellow-50 focus:border-cyan-500 transition-all"
                >
                    {DRAWING_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
        </div>

        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <label htmlFor="edit-style-prompt" className="block text-sm font-bold text-gray-700 uppercase">
                    Style Prompt (Editable)
                </label>
                <div className="flex gap-2">
                    <input 
                        type="file" 
                        ref={styleImageInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleStyleImageUpload}
                    />
                    <button 
                        type="button"
                        onClick={() => styleImageInputRef.current?.click()}
                        disabled={isExtractingStyle}
                        className="text-xs bg-indigo-600 text-white px-2 py-1 font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all flex items-center gap-1"
                    >
                        {isExtractingStyle ? <LoadingSpinner size={12} /> : '📷'} EXTRACT FROM IMAGE
                    </button>
                </div>
            </div>
            <textarea
                id="edit-style-prompt"
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-gray-50 border-4 border-black text-black text-sm font-mono placeholder-gray-400 focus:outline-none focus:bg-yellow-50 focus:border-pink-500 transition-all"
            />
             <p className="text-xs text-gray-500 font-bold italic">
                * 这里的提示词将直接决定 AI 生成画面的风格。您可以上传参考图来自动生成这段描述。
            </p>
        </div>

        <div className="pt-4 flex justify-end gap-4">
             <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border-2 border-black font-bold text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
                CANCEL
            </button>
            <button
                type="submit"
                className="px-6 py-2 bg-pink-600 text-white border-2 border-black font-black hover:bg-pink-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
                SAVE SETTINGS
            </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectSettingsModal;
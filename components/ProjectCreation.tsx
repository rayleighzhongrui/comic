import React, { useState, useRef } from 'react';
// Fix: 'DrawingStyle' is an enum used as a value, so it must be a regular import, not a type-only import.
import { type Project, type ComicFormat, DrawingStyle } from '../types';
import { DRAWING_STYLES, COMIC_FORMATS } from '../constants';

interface ProjectCreationProps {
  onCreateProject: (project: Project) => void;
  onImportProject: (projectData: string) => void;
  hasBackup?: boolean;
  onLoadBackup?: () => void;
}

const ProjectCreation: React.FC<ProjectCreationProps> = ({ onCreateProject, onImportProject, hasBackup, onLoadBackup }) => {
  const [projectName, setProjectName] = useState('');
  const [format, setFormat] = useState<ComicFormat>(COMIC_FORMATS[0].id);
  const [style, setStyle] = useState<DrawingStyle>(DRAWING_STYLES[0].id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      alert('请输入项目名称。');
      return;
    }
    
    const selectedStyle = DRAWING_STYLES.find(s => s.id === style);

    onCreateProject({
      projectId: `proj-${Date.now()}`,
      projectName,
      format,
      style,
      stylePrompt: selectedStyle ? selectedStyle.id : DrawingStyle.JAPANESE_SHONEN,
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportProject(content);
      } else {
        alert("无法读取文件内容。");
      }
    };
    reader.onerror = () => {
        alert("读取文件时出错。");
    };
    reader.readAsText(file);

    // Reset the input value to allow re-selecting the same file
    e.target.value = '';
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-400 relative overflow-hidden font-sans">
      {/* Dynamic Manga Background Pattern */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
            backgroundImage: 'radial-gradient(#000 20%, transparent 20%)',
            backgroundSize: '20px 20px'
        }}
      ></div>
      
      {/* Speed lines effect in CSS */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[conic-gradient(from_0deg_at_50%_50%,white_0deg,transparent_2deg,transparent_5deg,white_7deg)]"></div>

      <div className="relative z-10 w-full max-w-2xl transform transition-all">
        {/* Title Section with Manga Styling */}
        <div className="mb-8 text-center relative">
             <h1 className="text-6xl md:text-7xl font-black text-white italic tracking-tighter transform -skew-x-12 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] stroke-black"
                 style={{ WebkitTextStroke: '2px black' }}>
              AI MANGA
            </h1>
            <div className="absolute -top-6 -right-4 bg-pink-500 text-white text-xs font-bold px-3 py-1 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transform rotate-12">
                GENERATE!
            </div>
            <p className="mt-2 text-xl font-bold text-black bg-white inline-block px-4 py-1 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -skew-x-12">
                创作属于你的漫画世界
            </p>
        </div>

        {/* Main Card */}
        <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 relative overflow-hidden">
             {/* Decorative Corner Triangles */}
             <div className="absolute -top-12 -left-12 w-24 h-24 bg-cyan-400 border-4 border-black transform rotate-45"></div>
             <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-pink-500 border-4 border-black transform rotate-45"></div>

            <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
              
              {/* Project Name Input */}
              <div className="space-y-2">
                <label htmlFor="project-name" className="block text-lg font-black italic text-black uppercase transform -skew-x-6">
                    01. Project Name / 项目名称
                </label>
                <input
                  id="project-name"
                  name="project-name"
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-4 border-black text-black font-bold placeholder-gray-400 focus:outline-none focus:bg-yellow-50 focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_rgba(236,72,153,1)] transition-all"
                  placeholder="例如: 幻影旅团的冒险"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              {/* Grid for Selects */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Format Select */}
                  <div className="space-y-2">
                     <label htmlFor="comic-format" className="block text-lg font-black italic text-black uppercase transform -skew-x-6">
                        02. Format / 格式
                    </label>
                    <div className="relative">
                        <select
                            id="comic-format"
                            value={format}
                            onChange={(e) => setFormat(e.target.value as ComicFormat)}
                            className="w-full px-4 py-3 bg-gray-50 border-4 border-black text-black font-bold appearance-none focus:outline-none focus:bg-yellow-50 focus:border-cyan-500 focus:shadow-[4px_4px_0px_0px_rgba(6,182,212,1)] transition-all"
                        >
                            {COMIC_FORMATS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-black">
                            <svg className="fill-current h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                  </div>

                  {/* Style Select */}
                  <div className="space-y-2">
                    <label htmlFor="drawing-style" className="block text-lg font-black italic text-black uppercase transform -skew-x-6">
                        03. Style / 风格
                    </label>
                     <div className="relative">
                        <select
                            id="drawing-style"
                            value={style}
                            onChange={(e) => setStyle(e.target.value as DrawingStyle)}
                            className="w-full px-4 py-3 bg-gray-50 border-4 border-black text-black font-bold appearance-none focus:outline-none focus:bg-yellow-50 focus:border-cyan-500 focus:shadow-[4px_4px_0px_0px_rgba(6,182,212,1)] transition-all"
                        >
                            {DRAWING_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-black">
                            <svg className="fill-current h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                  </div>
              </div>

              {/* Main Action Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-4 px-4 border-4 border-black text-xl font-black italic uppercase text-white bg-pink-600 hover:bg-pink-500 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all focus:outline-none"
                >
                  <span className="mr-2">🚀</span> START CREATION / 开始创作
                </button>
              </div>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t-4 border-black border-dashed"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-lg font-black text-black italic">OR</span>
              </div>
            </div>

            {/* Secondary Actions */}
            <div className="space-y-4">
              {hasBackup && onLoadBackup && (
                  <button
                    type="button"
                    onClick={onLoadBackup}
                    className="group relative w-full flex justify-center py-3 px-4 border-4 border-black text-lg font-black text-black bg-yellow-300 hover:bg-yellow-200 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all focus:outline-none uppercase"
                  >
                    <span>🔄</span> RESUME SESSION / 恢复上次进度
                  </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={handleImportClick}
                className="group relative w-full flex justify-center py-3 px-4 border-4 border-black text-lg font-black text-black bg-cyan-400 hover:bg-cyan-300 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all focus:outline-none"
              >
                📂 IMPORT PROJECT / 导入存档
              </button>
            </div>
        </div>
        
        {/* Footer/Copyright */}
        <div className="mt-8 text-center">
             <p className="text-black font-bold text-sm bg-white inline-block px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                POWERED BY GEMINI 2.5 FLASH
            </p>
        </div>
      </div>
    </div>
  );
};

export default ProjectCreation;
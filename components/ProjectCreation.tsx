import React, { useState } from 'react';
// Fix: 'DrawingStyle' is an enum used as a value, so it must be a regular import, not a type-only import.
import { type Project, type ComicFormat, DrawingStyle } from '../types';
import { DRAWING_STYLES, COMIC_FORMATS } from '../constants';

interface ProjectCreationProps {
  onCreateProject: (project: Project) => void;
}

const ProjectCreation: React.FC<ProjectCreationProps> = ({ onCreateProject }) => {
  const [projectName, setProjectName] = useState('');
  const [format, setFormat] = useState<ComicFormat>(COMIC_FORMATS[0].id);
  const [style, setStyle] = useState<DrawingStyle>(DRAWING_STYLES[0].id);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center text-white">创建您的 AI 漫画</h1>
          <p className="mt-2 text-center text-sm text-gray-400">让我们开始一段新的创作之旅。</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="project-name" className="sr-only">项目名称</label>
              <input
                id="project-name"
                name="project-name"
                type="text"
                required
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="项目名称 (例如, '星尘漂流者')"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="comic-format" className="sr-only">漫画格式</label>
              <select
                id="comic-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as ComicFormat)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              >
                {COMIC_FORMATS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="drawing-style" className="sr-only">绘画风格</label>
               <select
                id="drawing-style"
                value={style}
                onChange={(e) => setStyle(e.target.value as DrawingStyle)}
                className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              >
                {DRAWING_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800"
            >
              开始创作
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectCreation;
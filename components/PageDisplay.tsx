import React, { useEffect, useRef, useState } from 'react';
import type { Page, Project } from '../types';
import { ComicFormat, PageMode } from '../types';
import jsPDF from 'jspdf';
import LoadingSpinner from './LoadingSpinner';
import ImageEditorModal from './ImageEditorModal';

interface PageDisplayProps {
  project: Project;
  pages: Page[];
  onDeletePage: (pageId: string) => void;
  onUpdatePage: (page: Page) => void;
  onContinueFromPage: (page: Page) => void;
}

const PageDisplay: React.FC<PageDisplayProps> = ({ project, pages, onDeletePage, onUpdatePage, onContinueFromPage }) => {
  const endOfPagesRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);

  useEffect(() => {
    endOfPagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [pages]);

  const triggerDownload = (href: string, filename:string) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const downloadAsWebtoon = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imagePromises = pages.map(page => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Important for fetching from data URLs or other origins
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = page.imageUrl;
    }));

    const images = await Promise.all(imagePromises);
    if(images.length === 0) return;

    const totalWidth = images[0].width;
    const totalHeight = images.reduce((sum, img) => sum + img.height, 0);
    
    canvas.width = totalWidth;
    canvas.height = totalHeight;

    let currentY = 0;
    images.forEach(img => {
      ctx.drawImage(img, 0, currentY);
      currentY += img.height;
    });

    triggerDownload(canvas.toDataURL('image/png'), `${project.projectName}.png`);
  };
  
  const downloadAsPdf = async () => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4'
    });
    
    const pdfPageWidth = doc.internal.pageSize.getWidth();
    const pdfPageHeight = doc.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (i > 0) {
            doc.addPage();
        }
        
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = page.imageUrl;
        });
        
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        const imgAspectRatio = imgWidth / imgHeight;
        const pdfAspectRatio = pdfPageWidth / pdfPageHeight;

        let finalWidth, finalHeight, x, y;

        if (imgAspectRatio > pdfAspectRatio) {
            // Image is wider than page, so fit to width
            finalWidth = pdfPageWidth;
            finalHeight = finalWidth / imgAspectRatio;
            x = 0;
            y = (pdfPageHeight - finalHeight) / 2;
        } else {
            // Image is taller than or same aspect as page, so fit to height
            finalHeight = pdfPageHeight;
            finalWidth = finalHeight * imgAspectRatio;
            x = (pdfPageWidth - finalWidth) / 2;
            y = 0;
        }

        doc.addImage(img, 'PNG', x, y, finalWidth, finalHeight);
    }
    
    doc.save(`${project.projectName}.pdf`);
  };

  const handleDownload = async () => {
    if(pages.length === 0) {
      alert("没有可供下载的页面！");
      return;
    }
    setIsDownloading(true);
    try {
      if(project.format === ComicFormat.WEBTOON) {
        await downloadAsWebtoon();
      } else {
        await downloadAsPdf();
      }
    } catch (error) {
      console.error("Failed to download comic:", error);
      alert("准备下载时发生错误。请重试。");
    } finally {
      setIsDownloading(false);
    }
  };
  
  const containerClasses = project.format === ComicFormat.WEBTOON
    ? "space-y-1"
    // Fix: Changed grid columns for 'page' format to 1 for better display on most screens.
    : "grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4";

  return (
    <>
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-center">{project.projectName}</h2>
        <button 
          onClick={handleDownload}
          disabled={isDownloading || pages.length === 0}
          className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {isDownloading ? <LoadingSpinner size={20} className="mr-2"/> : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
          下载
        </button>
      </div>
      <div className="flex-grow overflow-y-auto">
        {pages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>您的漫画将显示在这里。从创建第一页开始吧！</p>
          </div>
        ) : (
          <div className={containerClasses}>
            {pages.map((page, index) => (
              <div key={page.pageId} className="relative group">
                <img src={page.imageUrl} alt={`页面 ${page.pageNumber}`} className="w-full h-auto rounded-md shadow-lg"/>
                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {index + 1}
                </div>
                 <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onContinueFromPage(page)}
                        className="p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                        aria-label="从本页续写"
                        title="AI 从本页续写"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                    </button>
                    <button
                        onClick={() => setEditingPage(page)}
                        className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                        aria-label="编辑页面"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                    </button>
                    <button
                        onClick={() => onDeletePage(page.pageId)}
                        className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        aria-label="删除页面"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    </button>
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-80 p-4 pt-12 rounded-md opacity-0 group-hover:opacity-100 transition-opacity overflow-y-auto">
                  <p className="text-sm text-white whitespace-pre-wrap">{page.userStoryText}</p>
                </div>
              </div>
            ))}
            <div ref={endOfPagesRef} />
          </div>
        )}
      </div>
    </div>
    {editingPage && (
      <ImageEditorModal 
        imageUrl={editingPage.imageUrl}
        aspectRatio={editingPage.mode === PageMode.SPREAD ? '16:9' : '9:16'}
        onClose={() => setEditingPage(null)}
        onSave={(newImageUrl) => {
          onUpdatePage({ ...editingPage, imageUrl: newImageUrl });
          setEditingPage(null);
        }}
      />
    )}
    </>
  );
};

export default PageDisplay;
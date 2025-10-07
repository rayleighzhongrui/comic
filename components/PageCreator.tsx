

import React, { useState, useEffect, useMemo } from 'react';
import type { Page, Character, Asset, Project, Scene, LayoutTemplate, Relationship } from '../types';
import { CAMERA_SHOTS, LAYOUT_TEMPLATES } from '../constants';
import { geminiService } from '../services/geminiService';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import { ComicFormat, PageMode } from '../types';
import { toBase64FromUrl } from '../utils';


const PageCreator: React.FC<PageCreatorProps> = ({ project, characters, assets, pages, relationships, onAddPage, continuationContext, onClearContinuationContext }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<LayoutTemplate>(LAYOUT_TEMPLATES[0]);
  const [pageMode, setPageMode] = useState<PageMode>(PageMode.SINGLE);
  const [colorMode, setColorMode] = useState<'color' | 'bw'>('color');

  const [selectedCharIdsForContinuation, setSelectedCharIdsForContinuation] = useState<string[]>([]);
  const [selectedAssetIdsForContinuation, setSelectedAssetIdsForContinuation] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [finalStory, setFinalStory] = useState('');
  const [pageOutline, setPageOutline] = useState('');
  
  const [customLayoutConfig, setCustomLayoutConfig] = useState<number[]>([1]); // e.g., [1, 2] means 2 rows, 1 panel on top, 2 on bottom.

  const finalSelectedLayout = useMemo<LayoutTemplate>(() => {
    if (selectedLayout.id !== 'custom') {
      return selectedLayout;
    }

    const panelCount = customLayoutConfig.reduce((sum, count) => sum + count, 0);
    const description = `一个自定义布局，包含 ${customLayoutConfig.length} 行。` +
        customLayoutConfig.map((count, index) => `第 ${index + 1} 行有 ${count} 个分镜。`).join(' ');

    return {
        ...LAYOUT_TEMPLATES.find(t => t.id === 'custom')!,
        panelCount,
        description,
    };
  }, [selectedLayout, customLayoutConfig]);


  useEffect(() => {
    setScenes(currentScenes => {
      const newScenes = Array.from({ length: finalSelectedLayout.panelCount }, (_, i) => {
        return currentScenes[i] || { 
          sceneId: `scene-${Date.now()}-${i}`, 
          description: '', 
          cameraShot: CAMERA_SHOTS[0],
          characterIds: [],
          assetIds: [],
        };
      });
      return newScenes;
    });
  }, [finalSelectedLayout.panelCount]);
  
  // Reset to single page mode if project format changes to webtoon
  useEffect(() => {
    if (project.format === ComicFormat.WEBTOON) {
        setPageMode(PageMode.SINGLE);
    }
  }, [project.format]);
  
  // Effect to trigger continuation from a specific page context
  useEffect(() => {
    if (continuationContext) {
      handleGenerate(true);
    }
  }, [continuationContext]);
  
  useEffect(() => {
    const availableCharIds = new Set(characters.map(c => c.characterId));
    setSelectedCharIdsForContinuation(prev => prev.filter(id => availableCharIds.has(id)));
    setScenes(prevScenes => prevScenes.map(scene => ({
        ...scene,
        characterIds: scene.characterIds?.filter(id => availableCharIds.has(id))
    })));

    const availableAssetIds = new Set(assets.map(a => a.assetId));
    setSelectedAssetIdsForContinuation(prev => prev.filter(id => availableAssetIds.has(id)));
    setScenes(prevScenes => prevScenes.map(scene => ({
        ...scene,
        assetIds: scene.assetIds?.filter(id => availableAssetIds.has(id))
    })));
  }, [characters, assets]);


  const toggleContinuationSelection = (id: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setList(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSceneChange = (sceneId: string, field: 'description' | 'cameraShot', value: string) => {
    setScenes(currentScenes => 
        currentScenes.map(scene => 
            scene.sceneId === sceneId ? { ...scene, [field]: value } : scene
        )
    );
  };

  const handleSceneItemToggle = (sceneId: string, itemId: string, type: 'character' | 'asset') => {
      setScenes(currentScenes =>
          currentScenes.map(scene => {
              if (scene.sceneId === sceneId) {
                  const key = type === 'character' ? 'characterIds' : 'assetIds';
                  const currentIds = scene[key] || [];
                  const newIds = currentIds.includes(itemId)
                      ? currentIds.filter(id => id !== itemId)
                      : [...currentIds, itemId];
                  return { ...scene, [key]: newIds };
              }
              return scene;
          })
      );
  };
  
    const handleAddRow = () => setCustomLayoutConfig(prev => [...prev, 1]);
    const handleRemoveRow = () => setCustomLayoutConfig(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    const handleColsChange = (rowIndex: number, newCols: number) => {
        setCustomLayoutConfig(prev => prev.map((c, i) => i === rowIndex ? newCols : c));
    };

  const buildPrompt = (
    currentLayout: LayoutTemplate, 
    currentScenes: Scene[],
    allAvailableCharacters: Character[],
    allAvailableAssets: Asset[],
    currentProject: Project, 
    currentPageMode: PageMode,
    currentColorMode: 'color' | 'bw'
  ) => {
      // 1. Collect all unique items that appear in ANY scene.
      const appearingCharIds = new Set(currentScenes.flatMap(s => s.characterIds || []));
      const appearingAssetIds = new Set(currentScenes.flatMap(s => s.assetIds || []));

      const appearingCharacters = allAvailableCharacters.filter(c => appearingCharIds.has(c.characterId));
      const appearingAssets = allAvailableAssets.filter(a => appearingAssetIds.has(a.assetId));

      const allAppearingItems = [...appearingCharacters, ...appearingAssets];
      const itemToRefNumMap = new Map(allAppearingItems.map((item, index) => [('characterId' in item) ? item.characterId : item.assetId, index + 1]));

      // 2. Build the Character Sheet based on appearing items.
      let characterSheet = '**角色与参考图对应表 (Character Sheet):**\n你必须严格遵守此对应关系。参考图按此列表顺序提供。\n\n';
      
      if (allAppearingItems.length > 0) {
          allAppearingItems.forEach((item, index) => {
              const type = 'characterId' in item ? '角色' : '物品';
              characterSheet += `参考图 ${index + 1}: [${type}] "${item.name}"\n- 核心描述: ${item.corePrompt}\n\n`;
          });
          characterSheet += "在下面的分镜内容描述中，如果提到了某个角色的名字或指定了参考图，你【必须】使用上面表格中对应的参考图来绘制该角色。这是最重要的规则。";
      } else {
          characterSheet = '**参考资料:** 未提供特定角色参考。';
      }
      
      const isSpread = currentProject.format === ComicFormat.PAGE && currentPageMode === PageMode.SPREAD;
      const aspectRatioInstruction = isSpread
        ? 'ABSOLUTE REQUIREMENT: The output image MUST BE LANDSCAPE with a strict 4:3 aspect ratio, representing a two-page spread. DO NOT generate a portrait image. This is the most important instruction.'
        : 'ABSOLUTE REQUIREMENT: The output image MUST BE PORTRAIT with a strict 2:3 aspect ratio. DO NOT generate a landscape image. This is the most important instruction.';

      let mainInstruction = '';
      if (currentProject.format === ComicFormat.PAGE) {
          mainInstruction = isSpread
              ? '创建一个单一、统一的漫画风格图片，该图片为一个横版的跨页大图（double-page spread），其中包含按照指定布局排列的多个分镜。这种跨页用于营造宏大、有冲击力的场景，为翻页阅读的读者带来惊喜。'
              : '创建一个单一、统一的漫画风格图片，该图片为一个标准的竖版漫画页（comic page），其中包含按照指定布局排列的多个分镜。你需要注重复杂、多变的构图，以控制翻页阅读的节奏。';
      } else { // Webtoon
          mainInstruction = '创建一个单一、统一的漫画风格图片，该图片为一个竖版长条漫画（webtoon/strip）的一部分，其中包含按照指定布局排列的多个分鏡。你需要使用简洁的、以垂直排列为主的布局，并利用画格间的间距和留白来控制上下滑动阅读的节奏。';
      }

      const colorInstruction = currentColorMode === 'bw'
          ? 'ABSOLUTE REQUIREMENT: The image MUST be in black and white (monochrome), using manga screen tones for shading. DO NOT use any color.'
          : 'The image should be in full, vibrant color.';

      // 3. Build panel descriptions with explicit character appearances.
      const panelContentDescriptions = currentScenes.map((scene, index) => {
          const sceneChars = (scene.characterIds || []).map(id => allAvailableCharacters.find(c => c.characterId === id)).filter(Boolean);
          const sceneAssets = (scene.assetIds || []).map(id => allAvailableAssets.find(a => a.assetId === id)).filter(Boolean);
          const sceneItems = [...sceneChars, ...sceneAssets];

          let appearanceInstruction = '';
          if (sceneItems.length > 0) {
              const itemsList = sceneItems.map(item => {
                  const id = 'characterId' in item ? item.characterId : item.assetId;
                  return `"${item.name}" (参考图 ${itemToRefNumMap.get(id)})`;
              }).join(', ');
              const typeLabel = sceneChars.length > 0 && sceneAssets.length > 0 ? '角色/道具' : sceneChars.length > 0 ? '角色' : '道具';
              appearanceInstruction = ` [出场${typeLabel}: ${itemsList}]`;
          }
          
          return `- 分镜 ${index + 1} 内容: [镜头: ${scene.cameraShot}] ${scene.description}${appearanceInstruction}`;
      }).join('\n');


      const finalPrompt = `
        ${aspectRatioInstruction}
        
        ${characterSheet}
        
        **任务:** ${mainInstruction}
        
        **风格:** ${project.stylePrompt}. ${colorInstruction}

        **重要指令：** 生成的漫画中绝对不能包含任何文字、标题、音效词 (SFX) 或符号。如果场景需要对话框或气泡，请将它们画成【完全空白】。
        
        **布局描述:** 图像必须包含 ${currentLayout.panelCount} 个分镜，排列方式如下: ${currentLayout.description}
        
        **分镜内容:**
        ${panelContentDescriptions}
        
        **最终检查:** 验证最终图像的宽高比是否符合绝对要求，并且分镜布局和角色对应关系是否正确。
      `.trim().replace(/\s+/g, ' ');

      return finalPrompt;
  };
  
  const handleGenerate = async (isContinuation: boolean = false) => {
    setIsLoading(true);

    try {
      let scenesForGeneration = scenes;

      if (isContinuation) {
        setLoadingText('AI 正在撰写下一个场景...');
        
        let continuationDetails: Array<{ description: string; cameraShot: string; }> = [];
        const panelCount = finalSelectedLayout.panelCount;
        const layoutDescription = finalSelectedLayout.description;

        const selectedChars = characters.filter(c => selectedCharIdsForContinuation.includes(c.characterId));
        const selectedAssets = assets.filter(a => selectedAssetIdsForContinuation.includes(a.assetId));
        const allSelectedItems = [...selectedChars, ...selectedAssets];
        const allItemsMap = new Map([...characters, ...assets].map(item => [('characterId' in item) ? item.characterId : item.assetId, item]));

        const selectedItemsPrompt = allSelectedItems.length > 0
            ? `${allSelectedItems.map(item => `“${item.name}” (核心设定: ${item.corePrompt})`).join('；')}。`
            : '';

        const allSelectedIds = new Set([...selectedCharIdsForContinuation, ...selectedAssetIdsForContinuation]);
        const relevantRelationships = relationships.filter(r => allSelectedIds.has(r.entity1Id) && allSelectedIds.has(r.entity2Id));
        const relationshipsPrompt = relevantRelationships.length > 0
            ? `${relevantRelationships.map(r => `“${allItemsMap.get(r.entity1Id)?.name}” ${r.description} “${allItemsMap.get(r.entity2Id)?.name}”`).join('；')}。`
            : '';


        if (continuationContext) {
          const contextImagePart = await toBase64FromUrl(continuationContext.imageUrl);
          continuationDetails = await geminiService.generateStoryContinuation(
            continuationContext.userStoryText, 
            panelCount, 
            layoutDescription,
            CAMERA_SHOTS,
            selectedItemsPrompt,
            relationshipsPrompt,
            pageOutline,
            contextImagePart
          );
          onClearContinuationContext();
        } else {
          const previousStory = pages.map(p => p.userStoryText).join('\n');
          continuationDetails = await geminiService.generateStoryContinuation(
            previousStory, 
            panelCount, 
            layoutDescription,
            CAMERA_SHOTS,
            selectedItemsPrompt,
            relationshipsPrompt,
            pageOutline
          );
        }
        
        if (continuationDetails.length >= panelCount) {
          const newScenes = scenes.map((scene, index) => {
            const detail = continuationDetails[index];
            if (!detail) return scene;

            const validCameraShot = CAMERA_SHOTS.includes(detail.cameraShot) 
              ? detail.cameraShot 
              : scene.cameraShot;

            return {
              ...scene,
              description: detail.description || '',
              cameraShot: validCameraShot
            };
          });
          setScenes(newScenes);
          scenesForGeneration = newScenes;
        } else {
          console.warn('AI返回的分镜描述数量与请求不符。');
          const newScenes = [...scenes];
          const combinedDescription = continuationDetails.map(d => d.description).join(' ');
          newScenes[0] = { ...newScenes[0], description: combinedDescription };
           for (let i = 1; i < newScenes.length; i++) {
            newScenes[i] = { ...newScenes[i], description: '' };
          }
          setScenes(newScenes);
          scenesForGeneration = newScenes;
        }
      }
      
      const currentStory = scenesForGeneration.map(s => s.description).join(' ').trim();
      if (!currentStory) {
        alert("请至少为一个分镜提供故事描述。");
        setIsLoading(false);
        return;
      }
      
      setLoadingText('准备参考图中...');
      const appearingCharIds = new Set(scenesForGeneration.flatMap(s => s.characterIds || []));
      const appearingAssetIds = new Set(scenesForGeneration.flatMap(s => s.assetIds || []));
      const appearingCharacters = characters.filter(c => appearingCharIds.has(c.characterId));
      const appearingAssets = assets.filter(a => appearingAssetIds.has(a.assetId));
      const allAppearingItems = [...appearingCharacters, ...appearingAssets];

      const imageParts = await Promise.all(
        allAppearingItems.map(item => toBase64FromUrl(item.referenceImageUrl))
      );

      setLoadingText('AI 正在绘制您的漫画...');
      const prompt = buildPrompt(finalSelectedLayout, scenesForGeneration, characters, assets, project, pageMode, colorMode);
      const fullStoryText = scenesForGeneration.map((s, i) => `分镜 ${i+1}: ${s.description}`).join('\n\n');
      
      setFinalPrompt(prompt);
      setFinalStory(fullStoryText);

      const images = await geminiService.generateComicPanels(prompt, imageParts);
      
      const processedImages = await Promise.all(
        images.map(async (imgUrl) => {
          const { mimeType, data } = await toBase64FromUrl(imgUrl);
          return `data:${mimeType};base64,${data}`;
        })
      );
      
      setGeneratedImages(processedImages);
      setIsModalOpen(true);

    } catch (error) {
      console.error('Failed to generate panels:', error);
      alert('生成图片时发生错误。请检查控制台获取详细信息。');
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  const handleSelectImage = (imageUrl: string) => {
    onAddPage({
      pageId: `page-${Date.now()}`,
      pageNumber: pages.length + 1,
      imageUrl,
      userStoryText: finalStory,
      finalGenerationPrompt: finalPrompt,
      mode: project.format === ComicFormat.PAGE ? pageMode : PageMode.SINGLE,
    });
    setIsModalOpen(false);
    setGeneratedImages([]);
    setScenes(Array.from({ length: finalSelectedLayout.panelCount }, (_, i) => ({
      sceneId: `scene-${Date.now()}-${i}`,
      description: '',
      cameraShot: CAMERA_SHOTS[0],
      characterIds: [],
      assetIds: [],
    })));
    setPageMode(PageMode.SINGLE);
    setPageOutline('');
  };

  const isStoryEmpty = scenes.every(s => !s.description.trim());

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold">创建新页面</h3>

      <ContinuationSelectionGrid title="AI续写-主要角色" items={characters} selectedIds={selectedCharIdsForContinuation} onToggle={id => toggleContinuationSelection(id, selectedCharIdsForContinuation, setSelectedCharIdsForContinuation)} />
      <ContinuationSelectionGrid title="AI续写-主要特征" items={assets} selectedIds={selectedAssetIdsForContinuation} onToggle={id => toggleContinuationSelection(id, selectedAssetIdsForContinuation, setSelectedAssetIdsForContinuation)} />

       <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">色彩模式</label>
        <div className="flex gap-2 rounded-lg bg-gray-700 p-1">
          <button
            onClick={() => setColorMode('color')}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${colorMode === 'color' ? 'bg-indigo-600 text-white font-semibold' : 'hover:bg-gray-600 text-gray-300'}`}
          >
            彩色
          </button>
          <button
            onClick={() => setColorMode('bw')}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${colorMode === 'bw' ? 'bg-indigo-600 text-white font-semibold' : 'hover:bg-gray-600 text-gray-300'}`}
          >
            黑白
          </button>
        </div>
      </div>

      {project.format === ComicFormat.PAGE && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">页面模式</label>
          <div className="flex gap-2 rounded-lg bg-gray-700 p-1">
            <button
              onClick={() => setPageMode(PageMode.SINGLE)}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${pageMode === PageMode.SINGLE ? 'bg-indigo-600 text-white font-semibold' : 'hover:bg-gray-600 text-gray-300'}`}
            >
              单页
            </button>
            <button
              onClick={() => setPageMode(PageMode.SPREAD)}
              disabled={pages.length === 0}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${pageMode === PageMode.SPREAD ? 'bg-indigo-600 text-white font-semibold' : 'hover:bg-gray-600 text-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
              title={pages.length === 0 ? "从第二页开始才能创建跨页" : "创建横版跨页大图"}
            >
              跨页
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">选择构图</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {LAYOUT_TEMPLATES.map(template => (
            <div
              key={template.id}
              onClick={() => setSelectedLayout(template)}
              className={`cursor-pointer p-2 rounded-md transition-all border-2 ${selectedLayout.id === template.id ? 'border-indigo-500 bg-indigo-900' : 'border-gray-600 bg-gray-700 hover:bg-gray-600'}`}
              title={template.name}
            >
              {template.id === 'custom' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} className="h-12 w-full">
                  {customLayoutConfig.map((cols, rowIndex) => (
                      <div key={rowIndex} style={{ display: 'flex', flex: 1, gap: '4px' }}>
                          {Array.from({ length: cols }).map((_, colIndex) => (
                              <div key={colIndex} style={{ flex: 1 }} className="bg-gray-500 rounded-sm"></div>
                          ))}
                      </div>
                  ))}
                </div>
              ) : (
                <div style={template.style} className="h-12 w-full">
                  {template.panelStyles.map((style, i) => (
                    <div key={i} style={style} className="bg-gray-500 rounded-sm"></div>
                  ))}
                </div>
              )}
              <p className="text-xs text-center mt-1 text-white truncate">{template.name}</p>
            </div>
          ))}
        </div>
      </div>
      
      {selectedLayout.id === 'custom' && (
        <div className="p-4 bg-gray-700 rounded-lg mt-2 space-y-3">
            <h4 className="text-md font-semibold text-white">自定义构图</h4>
            {customLayoutConfig.map((cols, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-3">
                    <span className="text-sm text-gray-300 font-medium">第 {rowIndex + 1} 行:</span>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map(colCount => (
                            <button
                                key={colCount}
                                onClick={() => handleColsChange(rowIndex, colCount)}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${cols === colCount ? 'bg-indigo-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'}`}
                            >
                                {colCount} 分镜
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            <div className="flex gap-2 pt-2 border-t border-gray-600">
                <button onClick={handleAddRow} className="text-sm px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-md font-semibold">添加行</button>
                <button onClick={handleRemoveRow} disabled={customLayoutConfig.length <= 1} className="text-sm px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-md font-semibold disabled:opacity-50">删除最后一行</button>
            </div>
        </div>
      )}

      <div>
         <label className="block text-sm font-medium text-gray-300 mb-2">填充分镜内容</label>
         {(() => {
            const renderSceneInput = (scene: Scene, index: number) => {
              if (!scene) return null;
              return (
                  <div key={scene.sceneId} className="p-3 bg-gray-700 rounded-lg space-y-2">
                      <label className="block text-xs font-medium text-gray-400">分镜 {index + 1}</label>
                      <textarea
                          rows={3}
                          className="w-full bg-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          value={scene.description}
                          onChange={e => handleSceneChange(scene.sceneId, 'description', e.target.value)}
                          placeholder={`例如, '主角A在废墟中与反派X对峙...'`}
                      />
                      <select
                          value={scene.cameraShot}
                          onChange={e => handleSceneChange(scene.sceneId, 'cameraShot', e.target.value)}
                          className="w-full bg-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      >
                          {CAMERA_SHOTS.map(shot => <option key={shot} value={shot}>{shot}</option>)}
                      </select>
                      {characters.length > 0 && (
                          <div className="pt-2">
                              <label className="block text-xs font-medium text-gray-400 mb-1">出场角色</label>
                              <div className="flex flex-wrap gap-2">
                                  {characters.map(char => (
                                      <img
                                          key={char.characterId}
                                          src={char.referenceImageUrl}
                                          alt={char.name}
                                          title={char.name}
                                          onClick={() => handleSceneItemToggle(scene.sceneId, char.characterId, 'character')}
                                          className={`w-10 h-10 object-cover rounded-md cursor-pointer border-2 transition-all ${scene.characterIds?.includes(char.characterId) ? 'border-indigo-500' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                      />
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              );
            };

            if (selectedLayout.id === 'custom') {
              let sceneIndex = 0;
              return (
                <div className="w-full flex flex-col gap-2">
                  {customLayoutConfig.map((cols, rowIndex) => (
                    <div key={rowIndex} className="flex gap-2">
                      {Array.from({ length: cols }).map(() => {
                        const currentScene = scenes[sceneIndex];
                        const currentIndex = sceneIndex;
                        sceneIndex++;
                        return <div style={{flex: 1}} key={currentScene?.sceneId || currentIndex}>{renderSceneInput(currentScene, currentIndex)}</div>
                      })}
                    </div>
                  ))}
                </div>
              );
            } else {
              return (
                <div style={finalSelectedLayout.style} className="w-full">
                  {scenes.map((scene, index) => (
                    <div key={scene.sceneId} style={finalSelectedLayout.panelStyles[index]}>
                      {renderSceneInput(scene, index)}
                    </div>
                  ))}
                </div>
              );
            }
          })()}
      </div>
      
      <div className="space-y-3 pt-3">
        <div>
            <label htmlFor="page-outline" className="block text-sm font-medium text-gray-300 mb-1">页面大纲 (用于 AI 续写)</label>
            <textarea
                id="page-outline"
                rows={2}
                value={pageOutline}
                onChange={e => setPageOutline(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="为 AI 续写提供一个大致方向，例如：'主角遇到了一个神秘的老人，老人给了他一张地图。'"
            />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleGenerate(false)}
            disabled={isLoading || isStoryEmpty}
            className="flex-1 w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading && !loadingText.includes('撰写') ? <><LoadingSpinner size={20} className="mr-2"/> {loadingText || '生成中...'}</> : '生成页面'}
          </button>
          <button
            onClick={() => handleGenerate(true)}
            disabled={isLoading || pages.length === 0}
            className="flex-1 w-full flex justify-center items-center bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading && loadingText.includes('撰写') ? <><LoadingSpinner size={20} className="mr-2"/> {loadingText}</> : 'AI 续写'}
          </button>
        </div>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="选择您最喜欢的画稿">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {generatedImages.map((img, idx) => (
            <div key={idx} className="cursor-pointer group" onClick={() => handleSelectImage(img)}>
              <img src={img} alt={`生成面板 ${idx+1}`} className="w-full h-auto rounded-lg border-2 border-transparent group-hover:border-indigo-500 transition-all"/>
              <p className="text-center text-sm mt-2 text-gray-300">选项 {idx+1}</p>
            </div>
          ))}
        </div>
      </Modal>

    </div>
  );
};

interface PageCreatorProps {
  project: Project;
  characters: Character[];
  assets: Asset[];
  pages: Page[];
  relationships: Relationship[];
  onAddPage: (page: Page) => void;
  continuationContext: Page | null;
  onClearContinuationContext: () => void;
}

interface ContinuationSelectionGridProps {
  title: string;
  items: (Character | Asset)[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

const ContinuationSelectionGrid: React.FC<ContinuationSelectionGridProps> = ({ title, items, selectedIds, onToggle }) => {
  if(items.length === 0) return null;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{title}</label>
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const id = 'characterId' in item ? item.characterId : item.assetId;
          const isSelected = selectedIds.includes(id);
          return (
            <div
              key={id}
              onClick={() => onToggle(id)}
              className={`cursor-pointer p-1 rounded-md transition-all ${isSelected ? 'bg-teal-500' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              <img src={item.referenceImageUrl} alt={item.name} className="w-12 h-12 object-cover rounded" />
              <p className="text-xs text-center mt-1 truncate w-12 text-white">{item.name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PageCreator;
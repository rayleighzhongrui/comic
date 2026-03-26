
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { Character, Asset, Relationship } from '../types';

interface RelationshipEditorProps {
  characters: Character[];
  assets: Asset[];
  relationships: Relationship[];
  onAddRelationship: (relationship: Relationship) => void;
  onUpdateRelationship: (relationship: Relationship) => void;
  onDeleteRelationship: (relationshipId: string) => void;
}

// D3 Node Type Extension
interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  img: string;
  type: 'character' | 'asset';
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  description: string;
}

const RelationshipEditor: React.FC<RelationshipEditorProps> = ({
  characters,
  assets,
  relationships,
  onAddRelationship,
  onUpdateRelationship,
  onDeleteRelationship,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction State (Visual Modes)
  const [mode, setMode] = useState<'move' | 'link'>('move');
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  // Refs for interaction to avoid re-renders during d3 drag cycles
  const hoverNodeIdRef = useRef<string | null>(null);
  const dragSourceRef = useRef<GraphNode | null>(null);
  const tempLinkRef = useRef<{ x1: number, y1: number, x2: number, y2: number } | null>(null);

  // Modal State for adding/editing relationship
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRelData, setEditingRelData] = useState<{ sourceId: string, targetId: string, relId?: string, description: string } | null>(null);

  // Data Refs
  const nodesRef = useRef<GraphNode[]>([]);
  
  // 1. Sync Data Ref (Keeps positions stable across renders)
  useEffect(() => {
    const newNodesData: GraphNode[] = [
      ...characters.map(c => ({ id: c.characterId, name: c.name, img: c.referenceImageUrl, type: 'character' as const })),
      ...assets.map(a => ({ id: a.assetId, name: a.name, img: a.referenceImageUrl, type: 'asset' as const })),
    ];

    const currentMap = new Map<string, GraphNode>();
    nodesRef.current.forEach(n => currentMap.set(n.id, n));

    nodesRef.current = newNodesData.map(n => {
      const existing = currentMap.get(n.id);
      if (existing) {
        return { ...n, x: existing.x, y: existing.y, vx: existing.vx, vy: existing.vy };
      }
      return n;
    });
  }, [characters, assets]);


  // 2. D3 Simulation & Rendering Effect
  // IMPORTANT: We do NOT include transient interaction states (like hoverNodeId) in dependencies
  // to avoid destroying the DOM during interaction.
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 500;

    const svg = d3.select(svgRef.current);
    svg.attr("viewBox", [0, 0, width, height]);

    // Data
    const nodes = nodesRef.current;
    const links: GraphLink[] = relationships.map(r => ({
      id: r.id,
      source: r.entity1Id,
      target: r.entity2Id,
      description: r.description
    })).filter(l => nodes.find(n => n.id === l.source) && nodes.find(n => n.id === l.target));

    // Simulation Setup
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("collide", d3.forceCollide().radius(40))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Cleanup & Render
    svg.selectAll("*").remove();

    // -- Defs --
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 32)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#000");

    defs.append("marker")
      .attr("id", "arrowhead-selected")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 32)
      .attr("refY", 0)
      .attr("markerWidth", 10)
      .attr("markerHeight", 10)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#ec4899");

    // -- Layers --
    const linkGroup = svg.append("g").attr("class", "links");
    // Temp line layer must be under nodes but above links usually, or top. Let's put it on top of links.
    const tempLineGroup = svg.append("g").attr("class", "temp-line"); 
    const nodeGroup = svg.append("g").attr("class", "nodes");

    // -- Temp Drag Line --
    const tempLinePath = tempLineGroup.append("line")
      .attr("stroke", "#ec4899")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("marker-end", "url(#arrowhead-selected)")
      .attr("visibility", "hidden");

    // -- Links --
    const link = linkGroup.selectAll("g")
      .data(links)
      .join("g")
      .attr("class", "link-group")
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedLinkId(d.id);
        setEditingRelData({
          relId: d.id,
          sourceId: (d.source as GraphNode).id,
          targetId: (d.target as GraphNode).id,
          description: d.description
        });
        setModalOpen(true);
      });

    const linkPath = link.append("path")
      .attr("stroke", d => d.id === selectedLinkId ? "#ec4899" : "#000")
      .attr("stroke-width", d => d.id === selectedLinkId ? 3 : 2)
      .attr("marker-end", d => d.id === selectedLinkId ? "url(#arrowhead-selected)" : "url(#arrowhead)")
      .attr("fill", "none")
      .style("cursor", "pointer");

    // Link Text Background
    link.append("text")
      .text(d => d.description)
      .attr("font-size", 10)
      .attr("font-weight", "bold")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .attr("stroke", "white")
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .attr("paint-order", "stroke");

    // Link Text
    link.append("text")
      .text(d => d.description)
      .attr("font-size", 10)
      .attr("font-weight", "bold")
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .style("cursor", "pointer");

    // -- Nodes --
    const node = nodeGroup.selectAll("g")
      .data(nodes)
      .join("g")
      .attr("id", d => `node-${d.id}`) // Add ID for easy selection
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    node.append("circle")
      .attr("r", 25)
      .attr("fill", "#fff")
      .attr("stroke", d => d.type === 'character' ? "#000" : "#4b5563")
      .attr("stroke-width", 3);

    node.append("clipPath")
      .attr("id", d => `clip-${d.id}`)
      .append("circle")
      .attr("r", 22);

    node.append("image")
      .attr("href", d => d.img)
      .attr("x", -22)
      .attr("y", -22)
      .attr("width", 44)
      .attr("height", 44)
      .attr("clip-path", d => `url(#clip-${d.id})`)
      .style("pointer-events", "none");

    // Hover Ring (Directly controlled by D3 updates in drag, not React state)
    node.append("circle")
      .attr("class", "hover-ring")
      .attr("r", 30)
      .attr("fill", "none")
      .attr("stroke", "#ec4899")
      .attr("stroke-width", 0);

    node.append("text")
      .text(d => d.name)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("font-weight", "bold")
      .attr("fill", "#000")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("paint-order", "stroke");


    // -- Tick Function --
    simulation.on("tick", () => {
      nodes.forEach(d => {
        d.x = Math.max(25, Math.min(width - 25, d.x!));
        d.y = Math.max(25, Math.min(height - 25, d.y!));
      });

      linkPath.attr("d", (d) => {
          const source = d.source as GraphNode;
          const target = d.target as GraphNode;
          return `M${source.x},${source.y}L${target.x},${target.y}`;
      });

      link.selectAll("text")
        .attr("x", d => ((d as any).source.x + (d as any).target.x) / 2)
        .attr("y", d => ((d as any).source.y + (d as any).target.y) / 2);

      node.attr("transform", d => `translate(${d.x},${d.y})`);

      // Update Temp Line manually during tick as well, in case source moves
      const tLink = tempLinkRef.current;
      if (tLink) {
        tempLinePath
          .attr("x1", tLink.x1)
          .attr("y1", tLink.y1)
          .attr("x2", tLink.x2)
          .attr("y2", tLink.y2)
          .attr("visibility", "visible");
      } else {
        tempLinePath.attr("visibility", "hidden");
      }
    });


    // -- Drag Handlers --
    function dragstarted(event: any, d: GraphNode) {
      if (mode === 'move') {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
      } else {
          // Link Mode
          dragSourceRef.current = d;
          tempLinkRef.current = { x1: d.x!, y1: d.y!, x2: d.x!, y2: d.y! };
          // Force one tick to show line immediately
          simulation.alpha(0.1).restart();
      }
    }

    function dragged(event: any, d: GraphNode) {
      if (mode === 'move') {
          d.fx = event.x;
          d.fy = event.y;
      } else {
          // Link Mode
          if (dragSourceRef.current) {
             tempLinkRef.current = { 
                x1: dragSourceRef.current.x!, 
                y1: dragSourceRef.current.y!, 
                x2: event.x, 
                y2: event.y 
             };
             // Manually update line position for smoothness
             tempLinePath
               .attr("x1", tempLinkRef.current.x1)
               .attr("y1", tempLinkRef.current.y1)
               .attr("x2", tempLinkRef.current.x2)
               .attr("y2", tempLinkRef.current.y2)
               .attr("visibility", "visible");

             // Hit detection
             let foundId: string | null = null;
             nodes.forEach(n => {
               if (n.id === d.id) return; // Don't link to self
               const dx = n.x! - event.x;
               const dy = n.y! - event.y;
               if (Math.sqrt(dx*dx + dy*dy) < 30) {
                   foundId = n.id;
               }
             });
             
             hoverNodeIdRef.current = foundId;

             // Direct DOM Update for visual feedback (bypassing React state)
             node.select(".hover-ring").attr("stroke-width", (n: any) => n.id === foundId ? 3 : 0);
          }
      }
    }

    function dragended(event: any, d: GraphNode) {
      if (mode === 'move') {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
      } else {
          // Link Mode
          const targetId = hoverNodeIdRef.current;
          const sourceId = d.id;

          if (targetId && targetId !== sourceId) {
             // Open Modal (This IS a state update, but it's okay now because drag is finished)
             setEditingRelData({
                sourceId: sourceId,
                targetId: targetId,
                description: ''
             });
             setModalOpen(true);
          }

          // Reset Refs
          dragSourceRef.current = null;
          tempLinkRef.current = null;
          hoverNodeIdRef.current = null;
          
          // Hide temp line
          tempLinePath.attr("visibility", "hidden");
          // Clear rings
          node.select(".hover-ring").attr("stroke-width", 0);
      }
    }

    // Deselect on bg click
    svg.on("click", () => setSelectedLinkId(null));

    return () => {
      simulation.stop();
    };
  }, [characters, assets, relationships, mode, selectedLinkId]); // Re-run only when strictly necessary data changes


  const handleSaveRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRelData || !editingRelData.description.trim()) return;

    if (editingRelData.relId) {
        onUpdateRelationship({
            id: editingRelData.relId,
            entity1Id: editingRelData.sourceId,
            entity2Id: editingRelData.targetId,
            description: editingRelData.description
        });
    } else {
        onAddRelationship({
            id: `rel-${Date.now()}`,
            entity1Id: editingRelData.sourceId,
            entity2Id: editingRelData.targetId,
            description: editingRelData.description
        });
    }
    setModalOpen(false);
    setEditingRelData(null);
    setSelectedLinkId(null);
  };

  const handleDeleteSelected = () => {
    if (editingRelData?.relId) {
        onDeleteRelationship(editingRelData.relId);
        setModalOpen(false);
        setEditingRelData(null);
        setSelectedLinkId(null);
    }
  };


  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
         <h3 className="text-xl font-black italic bg-yellow-300 inline-block px-3 py-1 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -skew-x-6 text-black uppercase">
            RELATIONSHIPS / 关系网
        </h3>
        
        <div className="flex bg-white border-2 border-black rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <button
                onClick={() => setMode('move')}
                className={`px-3 py-1 text-xs font-bold flex items-center gap-1 transition-colors ${mode === 'move' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'}`}
            >
                <span>✋</span> MOVE
            </button>
            <button
                onClick={() => setMode('link')}
                className={`px-3 py-1 text-xs font-bold flex items-center gap-1 transition-colors border-l-2 border-black ${mode === 'link' ? 'bg-pink-600 text-white' : 'text-black hover:bg-gray-100'}`}
            >
                <span>🔗</span> CONNECT
            </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-2 italic">
          {mode === 'move' ? '💡 拖拽节点调整位置。切换到 "CONNECT" 模式来建立关系。' : '💡 拖拽一个头像到另一个头像上以建立连接。点击连线可修改。'}
      </div>

      <div ref={containerRef} className="flex-grow bg-white border-2 border-black relative overflow-hidden shadow-inner" style={{minHeight: '400px', backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
        <svg ref={svgRef} className="w-full h-full block touch-none"></svg>
        
        {characters.length === 0 && assets.length === 0 && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <p className="text-gray-400 font-bold bg-white p-2 border border-gray-300">添加角色或道具后，它们将显示在这里。</p>
             </div>
        )}
      </div>

      {modalOpen && editingRelData && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20 backdrop-blur-[1px]">
              <div className="bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-80 transform -rotate-1">
                  <h4 className="font-black text-lg mb-2 uppercase border-b-2 border-black pb-1">
                      {editingRelData.relId ? 'EDIT RELATIONSHIP' : 'NEW RELATIONSHIP'}
                  </h4>
                  
                  <div className="flex items-center justify-center gap-2 mb-4 text-xs font-bold">
                       <span className="bg-gray-200 px-1 border border-black truncate max-w-[80px]">
                           {nodesRef.current.find(n => n.id === editingRelData.sourceId)?.name}
                       </span>
                       <span className="text-pink-600">➔</span>
                       <span className="bg-gray-200 px-1 border border-black truncate max-w-[80px]">
                            {nodesRef.current.find(n => n.id === editingRelData.targetId)?.name}
                       </span>
                  </div>

                  <form onSubmit={handleSaveRelationship}>
                      <label className="block text-xs font-bold mb-1">DESCRIPTION (e.g. 朋友, 宿敌)</label>
                      <input 
                          autoFocus
                          type="text" 
                          value={editingRelData.description}
                          onChange={e => setEditingRelData({...editingRelData, description: e.target.value})}
                          className="w-full border-2 border-black p-2 text-sm font-bold mb-4 focus:outline-none focus:bg-yellow-50"
                          placeholder="关系描述..."
                      />
                      <div className="flex gap-2">
                          {editingRelData.relId && (
                               <button 
                                type="button" 
                                onClick={handleDeleteSelected}
                                className="flex-1 bg-red-500 text-white font-bold text-xs py-2 border-2 border-black hover:bg-red-400"
                              >
                                DELETE
                              </button>
                          )}
                           <button 
                            type="button" 
                            onClick={() => { setModalOpen(false); setEditingRelData(null); setSelectedLinkId(null); }}
                            className="flex-1 bg-gray-200 text-black font-bold text-xs py-2 border-2 border-black hover:bg-gray-300"
                          >
                            CANCEL
                          </button>
                          <button 
                            type="submit" 
                            disabled={!editingRelData.description.trim()}
                            className="flex-1 bg-cyan-400 text-black font-bold text-xs py-2 border-2 border-black hover:bg-cyan-300 disabled:opacity-50"
                          >
                            SAVE
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default RelationshipEditor;

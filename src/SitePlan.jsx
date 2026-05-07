import React, { useState, useEffect, useRef } from 'react';
import { Move, Maximize2, RotateCcw, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { calculateTPZ } from './Trees.jsx';

// ============================================================================
// DWELLING DEFAULTS
// ============================================================================

export const blankDwelling = (label, lot) => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
  label: label || 'House 1',
  lot: lot || 'lot1', // 'lot1' | 'lot2'
  // Position in metres relative to top-left of parent lot
  x: 6, // 6m from left
  y: 6, // 6m from top
  width: 12, // 12m wide
  depth: 15, // 15m deep
  notes: '',
});

// Suggest dwelling dimensions based on project type and SDA category
export const suggestDwellingSize = (projectType, sdaCategory) => {
  // Floor area estimates (approx, for 1 dwelling)
  const areas = {
    '2-resident': { 'Improved Liveability': 130, 'Fully Accessible': 145, 'High Physical Support': 165, 'Robust': 155 },
    '3-resident': { 'Improved Liveability': 155, 'Fully Accessible': 175, 'High Physical Support': 195, 'Robust': 185 },
    'duplex': { 'Improved Liveability': 130, 'Fully Accessible': 145, 'High Physical Support': 165, 'Robust': 155 },
  };
  const area = areas[projectType]?.[sdaCategory] || 150;
  // Default 4:5 aspect ratio (depth slightly longer than width)
  const width = Math.sqrt(area * 0.8);
  const depth = area / width;
  return { width: Math.round(width * 10) / 10, depth: Math.round(depth * 10) / 10 };
};

// ============================================================================
// COLLISION / CONSTRAINT DETECTION
// ============================================================================

// Returns array of issues for a dwelling at given position
export function checkConstraints(dwelling, allDwellings, layout, parentLotSize, setbacks, trees) {
  const issues = [];

  const lotW = parseFloat(layout?.parentFrontage) || 20;
  const lotD = parseFloat(layout?.parentDepth) || 40;

  // Out of lot bounds
  if (dwelling.x < 0) issues.push('Outside left boundary');
  if (dwelling.y < 0) issues.push('Outside top boundary');
  if (dwelling.x + dwelling.width > lotW) issues.push('Outside right boundary');
  if (dwelling.y + dwelling.depth > lotD) issues.push('Outside bottom boundary');

  // Setback violations — check which boundary is which road
  const primarySide = layout?.primaryRoadSide || 'top';
  const secondarySide = layout?.isCorner ? layout?.secondaryRoadSide : null;

  const sb = setbacks || { front: 6, secondary: 2, rear: 4, side: 1.5 };

  // Helper: distance from dwelling edge to each side of the lot
  const distLeft = dwelling.x;
  const distTop = dwelling.y;
  const distRight = lotW - (dwelling.x + dwelling.width);
  const distBottom = lotD - (dwelling.y + dwelling.depth);

  const sideMap = {
    top: { dist: distTop, name: 'top' },
    bottom: { dist: distBottom, name: 'bottom' },
    left: { dist: distLeft, name: 'left' },
    right: { dist: distRight, name: 'right' },
  };

  // Primary road = front setback applies
  const primaryDist = sideMap[primarySide]?.dist;
  if (primaryDist !== undefined && primaryDist < sb.front) {
    issues.push(`Front setback to ${primarySide} (primary road) is ${primaryDist.toFixed(2)}m, below ${sb.front}m min`);
  }

  // Secondary road = secondary setback applies
  if (secondarySide) {
    const secDist = sideMap[secondarySide]?.dist;
    if (secDist !== undefined && secDist < sb.secondary) {
      issues.push(`Secondary setback to ${secondarySide} road is ${secDist.toFixed(2)}m, below ${sb.secondary}m min`);
    }
  }

  // Rear = opposite of primary road
  const rearOpposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[primarySide];
  const rearDist = sideMap[rearOpposite]?.dist;
  if (rearDist !== undefined && rearDist < sb.rear) {
    issues.push(`Rear setback (${rearOpposite}) is ${rearDist.toFixed(2)}m, below ${sb.rear}m min`);
  }

  // Side setbacks — the boundaries that aren't primary/secondary/rear
  Object.keys(sideMap).forEach(s => {
    if (s === primarySide || s === secondarySide || s === rearOpposite) return;
    const d = sideMap[s].dist;
    if (d < sb.side) {
      issues.push(`Side setback to ${s} is ${d.toFixed(2)}m, below ${sb.side}m min`);
    }
  });

  // Subdivision line check — dwelling must stay on its assigned lot side
  if (allDwellings.some(d => d.lot !== dwelling.lot)) {
    const subdivLine = layout?.subdivisionDirection;
    if (subdivLine === 'frontage-split' || subdivLine === 'auto') {
      // Vertical line at lot midpoint (horizontal split based on primary road orientation)
      if (primarySide === 'top' || primarySide === 'bottom') {
        const midX = lotW / 2;
        if (dwelling.lot === 'lot1' && (dwelling.x + dwelling.width) > midX + 0.05) {
          issues.push('Crosses subdivision line into Lot 2');
        }
        if (dwelling.lot === 'lot2' && dwelling.x < midX - 0.05) {
          issues.push('Crosses subdivision line into Lot 1');
        }
      } else {
        const midY = lotD / 2;
        if (dwelling.lot === 'lot1' && (dwelling.y + dwelling.depth) > midY + 0.05) {
          issues.push('Crosses subdivision line into Lot 2');
        }
        if (dwelling.lot === 'lot2' && dwelling.y < midY - 0.05) {
          issues.push('Crosses subdivision line into Lot 1');
        }
      }
    } else if (subdivLine === 'long-side-split') {
      // Long-side split is the opposite axis
      if (primarySide === 'top' || primarySide === 'bottom') {
        const midY = lotD / 2;
        if (dwelling.lot === 'lot1' && (dwelling.y + dwelling.depth) > midY + 0.05) {
          issues.push('Crosses subdivision line into Lot 2');
        }
        if (dwelling.lot === 'lot2' && dwelling.y < midY - 0.05) {
          issues.push('Crosses subdivision line into Lot 1');
        }
      } else {
        const midX = lotW / 2;
        if (dwelling.lot === 'lot1' && (dwelling.x + dwelling.width) > midX + 0.05) {
          issues.push('Crosses subdivision line into Lot 2');
        }
        if (dwelling.lot === 'lot2' && dwelling.x < midX - 0.05) {
          issues.push('Crosses subdivision line into Lot 1');
        }
      }
    }
  }

  // Dwelling-to-dwelling collision + minimum 50mm gap
  allDwellings.forEach(other => {
    if (other.id === dwelling.id) return;

    // Rectangle separation
    const dx1 = dwelling.x, dx2 = dwelling.x + dwelling.width;
    const dy1 = dwelling.y, dy2 = dwelling.y + dwelling.depth;
    const ox1 = other.x, ox2 = other.x + other.width;
    const oy1 = other.y, oy2 = other.y + other.depth;

    const overlapX = !(dx2 <= ox1 || ox2 <= dx1);
    const overlapY = !(dy2 <= oy1 || oy2 <= dy1);

    if (overlapX && overlapY) {
      issues.push(`Overlaps with ${other.label}`);
    } else {
      // Compute the closest-edge distance
      let dist;
      if (overlapY) {
        dist = Math.min(Math.abs(dx2 - ox1), Math.abs(ox2 - dx1));
      } else if (overlapX) {
        dist = Math.min(Math.abs(dy2 - oy1), Math.abs(oy2 - dy1));
      } else {
        const dxGap = Math.max(0, Math.max(dx1 - ox2, ox1 - dx2));
        const dyGap = Math.max(0, Math.max(dy1 - oy2, oy1 - dy2));
        dist = Math.sqrt(dxGap * dxGap + dyGap * dyGap);
      }

      if (dist < 0.05) {
        issues.push(`Less than 50mm from ${other.label}`);
      } else if (dist < 0.6) {
        issues.push(`Only ${(dist * 1000).toFixed(0)}mm from ${other.label} — may need fire-rated party wall`);
      }
    }
  });

  // Tree TPZ encroachment (for retained trees only)
  if (trees && trees.length > 0) {
    trees.forEach((tree, idx) => {
      if (tree.decision === 'remove') return;
      const tpz = calculateTPZ(tree.dbhCm);
      if (!tpz) return;

      // Compute tree position in metres from top-left of parent lot
      let treeX = 0, treeY = 0;
      const dCorner = parseFloat(tree.distanceFromCorner) || 0;
      const dBoundary = parseFloat(tree.distanceFromBoundary) || 0;
      if (tree.side === 'top') { treeX = dCorner; treeY = dBoundary; }
      else if (tree.side === 'bottom') { treeX = dCorner; treeY = lotD - dBoundary; }
      else if (tree.side === 'left') { treeX = dBoundary; treeY = dCorner; }
      else if (tree.side === 'right') { treeX = lotW - dBoundary; treeY = dCorner; }
      else if (tree.side === 'interior') { treeX = dCorner; treeY = dBoundary; }
      else return;

      // Closest distance from tree centre to dwelling rectangle
      const closestX = Math.max(dwelling.x, Math.min(treeX, dwelling.x + dwelling.width));
      const closestY = Math.max(dwelling.y, Math.min(treeY, dwelling.y + dwelling.depth));
      const distToTree = Math.sqrt((treeX - closestX) ** 2 + (treeY - closestY) ** 2);

      if (distToTree < tpz) {
        const encroach = ((tpz - distToTree) / tpz * 100).toFixed(1);
        issues.push(`Encroaches T${idx + 1} TPZ (${tree.species || 'tree'}) by ~${encroach}%`);
      }
    });
  }

  return issues;
}

// ============================================================================
// INTERACTIVE PARENT LOT DIAGRAM
// ============================================================================

export function InteractiveParentLot({ project, updateProject, setbacks }) {
  const dwellings = project.dwellings || [];
  const layout = project.layout || {};
  const isDuplex = project.projectType === 'duplex';
  const trees = project.trees || [];

  const lotW = parseFloat(layout?.parentFrontage) || 20;
  const lotD = parseFloat(layout?.parentDepth) || 40;

  // SVG sizing — preserve aspect ratio of the lot
  const SVG_PAD = 50;
  const MAX_DRAW = 480; // max draw area dimension
  let drawW, drawH;
  if (lotW >= lotD) {
    drawW = MAX_DRAW;
    drawH = MAX_DRAW * (lotD / lotW);
  } else {
    drawH = MAX_DRAW;
    drawW = MAX_DRAW * (lotW / lotD);
  }
  const SVG_W = drawW + SVG_PAD * 2;
  const SVG_H = drawH + SVG_PAD * 2;
  const lotX = SVG_PAD;
  const lotY = SVG_PAD;
  const scaleX = drawW / lotW;
  const scaleY = drawH / lotD;

  // Drag state
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);

  const updateDwelling = (id, updates) => {
    const newDwellings = dwellings.map(d => d.id === id ? { ...d, ...updates } : d);
    updateProject({ dwellings: newDwellings });
  };

  const addDwelling = (lotKey) => {
    const suggested = suggestDwellingSize(project.projectType, project.sdaCategory);
    const label = lotKey === 'lot1' ? 'House 1' : 'House 2';
    // Auto-place: front setback + side setback
    const sb = setbacks || { front: 6, side: 1.5 };
    const newD = {
      ...blankDwelling(label, lotKey),
      width: suggested.width,
      depth: suggested.depth,
      x: lotKey === 'lot1' ? sb.side : (lotW / 2 + sb.side),
      y: sb.front,
    };
    updateProject({ dwellings: [...dwellings, newD] });
  };

  const removeDwelling = (id) => {
    if (confirm('Remove this dwelling from the site plan?')) {
      updateProject({ dwellings: dwellings.filter(d => d.id !== id) });
    }
  };

  const autoPlace = () => {
    const sb = setbacks || { front: 6, rear: 4, side: 1.5 };
    const updated = dwellings.map(d => {
      const lot1 = d.lot === 'lot1';
      // Centre dwelling within its half of the parent lot
      const halfW = lotW / 2;
      const center = lot1 ? halfW / 2 : halfW + halfW / 2;
      return {
        ...d,
        x: Math.max(sb.side, center - d.width / 2),
        y: Math.max(sb.front, (lotD - d.depth) / 2),
      };
    });
    updateProject({ dwellings: updated });
  };

  const mirrorLot2 = () => {
    const lot1d = dwellings.find(d => d.lot === 'lot1');
    const lot2d = dwellings.find(d => d.lot === 'lot2');
    if (!lot1d || !lot2d) return;
    updateDwelling(lot2d.id, {
      width: lot1d.width,
      depth: lot1d.depth,
      // Mirror across vertical centre
      x: lotW - lot1d.x - lot1d.width,
      y: lot1d.y,
    });
  };

  // Convert mouse position to lot coordinates
  const mouseToLotCoords = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    const svgX = (clientX - rect.left) / rect.width * SVG_W;
    const svgY = (clientY - rect.top) / rect.height * SVG_H;
    return {
      x: (svgX - lotX) / scaleX,
      y: (svgY - lotY) / scaleY,
    };
  };

  const handlePointerDown = (e, dwelling, mode = 'drag') => {
    e.preventDefault();
    e.stopPropagation();
    const coords = mouseToLotCoords(e);
    if (mode === 'drag') {
      setDragging({
        id: dwelling.id,
        offsetX: coords.x - dwelling.x,
        offsetY: coords.y - dwelling.y,
      });
    } else {
      setResizing({
        id: dwelling.id,
        startX: coords.x,
        startY: coords.y,
        startWidth: dwelling.width,
        startDepth: dwelling.depth,
      });
    }
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragging && !resizing) return;
      e.preventDefault();
      const coords = mouseToLotCoords(e);
      if (dragging) {
        const newX = Math.round((coords.x - dragging.offsetX) * 100) / 100;
        const newY = Math.round((coords.y - dragging.offsetY) * 100) / 100;
        updateDwelling(dragging.id, { x: newX, y: newY });
      } else if (resizing) {
        const newW = Math.max(3, Math.round((resizing.startWidth + (coords.x - resizing.startX)) * 10) / 10);
        const newD = Math.max(3, Math.round((resizing.startDepth + (coords.y - resizing.startY)) * 10) / 10);
        updateDwelling(resizing.id, { width: newW, depth: newD });
      }
    };
    const handleUp = () => {
      setDragging(null);
      setResizing(null);
    };

    if (dragging || resizing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragging, resizing]);

  // Setback zone display
  const sb = setbacks || { front: 6, secondary: 2, rear: 4, side: 1.5 };
  const primarySide = layout.primaryRoadSide || 'top';
  const secondarySide = layout.isCorner ? layout.secondaryRoadSide : null;

  // Subdivision line position
  const computeSubdivLineCoords = () => {
    const subdivDir = layout.subdivisionDirection;
    const horizontalRoad = primarySide === 'top' || primarySide === 'bottom';
    if (subdivDir === 'frontage-split' || subdivDir === 'auto') {
      if (horizontalRoad) {
        return { x1: lotX + lotW * scaleX / 2, y1: lotY, x2: lotX + lotW * scaleX / 2, y2: lotY + lotD * scaleY };
      } else {
        return { x1: lotX, y1: lotY + lotD * scaleY / 2, x2: lotX + lotW * scaleX, y2: lotY + lotD * scaleY / 2 };
      }
    } else if (subdivDir === 'long-side-split') {
      if (horizontalRoad) {
        return { x1: lotX, y1: lotY + lotD * scaleY / 2, x2: lotX + lotW * scaleX, y2: lotY + lotD * scaleY / 2 };
      } else {
        return { x1: lotX + lotW * scaleX / 2, y1: lotY, x2: lotX + lotW * scaleX / 2, y2: lotY + lotD * scaleY };
      }
    }
    return null;
  };
  const subdivLine = isDuplex ? computeSubdivLineCoords() : null;

  // Setback envelope rectangle (shown as a faint zone)
  const setbackZone = {
    top: primarySide === 'top' ? sb.front : (rearOf(primarySide) === 'top' ? sb.rear : (secondarySide === 'top' ? sb.secondary : sb.side)),
    right: primarySide === 'right' ? sb.front : (rearOf(primarySide) === 'right' ? sb.rear : (secondarySide === 'right' ? sb.secondary : sb.side)),
    bottom: primarySide === 'bottom' ? sb.front : (rearOf(primarySide) === 'bottom' ? sb.rear : (secondarySide === 'bottom' ? sb.secondary : sb.side)),
    left: primarySide === 'left' ? sb.front : (rearOf(primarySide) === 'left' ? sb.rear : (secondarySide === 'left' ? sb.secondary : sb.side)),
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="serif" style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Site plan — drag dwellings</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {isDuplex && dwellings.length === 2 && (
            <button className="btn-ghost" onClick={mirrorLot2} title="Make Lot 2 dwelling mirror Lot 1">
              <Maximize2 size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Mirror Lot 2
            </button>
          )}
          {dwellings.length > 0 && (
            <button className="btn-ghost" onClick={autoPlace} title="Auto-centre dwellings in their lots">
              <RotateCcw size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Auto-place
            </button>
          )}
        </div>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '100%', height: 'auto', background: 'white', border: '1px solid #e0d9cd', cursor: dragging ? 'grabbing' : 'default', userSelect: 'none', touchAction: 'none' }}>

        {/* Road bars */}
        {primarySide === 'top' && <rect x={0} y={lotY - 14} width={SVG_W} height={10} fill="#888" />}
        {primarySide === 'bottom' && <rect x={0} y={lotY + lotD * scaleY + 4} width={SVG_W} height={10} fill="#888" />}
        {primarySide === 'left' && <rect x={lotX - 14} y={0} width={10} height={SVG_H} fill="#888" />}
        {primarySide === 'right' && <rect x={lotX + lotW * scaleX + 4} y={0} width={10} height={SVG_H} fill="#888" />}
        {layout.isCorner && secondarySide === 'top' && <rect x={0} y={lotY - 14} width={SVG_W} height={10} fill="#aaa" strokeDasharray="4,3" />}
        {layout.isCorner && secondarySide === 'bottom' && <rect x={0} y={lotY + lotD * scaleY + 4} width={SVG_W} height={10} fill="#aaa" />}
        {layout.isCorner && secondarySide === 'left' && <rect x={lotX - 14} y={0} width={10} height={SVG_H} fill="#aaa" />}
        {layout.isCorner && secondarySide === 'right' && <rect x={lotX + lotW * scaleX + 4} y={0} width={10} height={SVG_H} fill="#aaa" />}

        {/* Lot boundary */}
        <rect x={lotX} y={lotY} width={lotW * scaleX} height={lotD * scaleY} fill="#f5f1ea" stroke="#1a1a1a" strokeWidth="2" />

        {/* Setback zones (faint red) */}
        <g opacity="0.18">
          {/* Top setback */}
          <rect x={lotX} y={lotY} width={lotW * scaleX} height={setbackZone.top * scaleY} fill="#c74343" />
          {/* Bottom setback */}
          <rect x={lotX} y={lotY + (lotD - setbackZone.bottom) * scaleY} width={lotW * scaleX} height={setbackZone.bottom * scaleY} fill="#c74343" />
          {/* Left setback */}
          <rect x={lotX} y={lotY} width={setbackZone.left * scaleX} height={lotD * scaleY} fill="#c74343" />
          {/* Right setback */}
          <rect x={lotX + (lotW - setbackZone.right) * scaleX} y={lotY} width={setbackZone.right * scaleX} height={lotD * scaleY} fill="#c74343" />
        </g>

        {/* Subdivision line */}
        {subdivLine && (
          <line x1={subdivLine.x1} y1={subdivLine.y1} x2={subdivLine.x2} y2={subdivLine.y2}
            stroke="#b8763e" strokeWidth="2.5" strokeDasharray="6,4" />
        )}

        {/* Driveways */}
        {layout.existingDriveway?.present === 'yes' && layout.existingDriveway?.distanceFromCorner && (() => {
          const d = parseFloat(layout.existingDriveway.distanceFromCorner);
          let cx, cy;
          const s = layout.existingDriveway.side;
          if (s === 'top') { cx = lotX + d * scaleX; cy = lotY; }
          else if (s === 'bottom') { cx = lotX + d * scaleX; cy = lotY + lotD * scaleY; }
          else if (s === 'left') { cx = lotX; cy = lotY + d * scaleY; }
          else if (s === 'right') { cx = lotX + lotW * scaleX; cy = lotY + d * scaleY; }
          const colour = layout.existingDriveway.decision === 'keep' ? '#5a8254' : '#c74343';
          return cx !== undefined ? (
            <g>
              <circle cx={cx} cy={cy} r="9" fill={colour} stroke="white" strokeWidth="2" />
              <text x={cx} y={cy + 3} textAnchor="middle" fontFamily="IBM Plex Sans" fontSize="9" fontWeight="700" fill="white">EX</text>
            </g>
          ) : null;
        })()}
        {layout.proposedDriveway?.distanceFromCorner && (() => {
          const d = parseFloat(layout.proposedDriveway.distanceFromCorner);
          let cx, cy;
          const s = layout.proposedDriveway.side;
          if (s === 'top') { cx = lotX + d * scaleX; cy = lotY; }
          else if (s === 'bottom') { cx = lotX + d * scaleX; cy = lotY + lotD * scaleY; }
          else if (s === 'left') { cx = lotX; cy = lotY + d * scaleY; }
          else if (s === 'right') { cx = lotX + lotW * scaleX; cy = lotY + d * scaleY; }
          return cx !== undefined ? (
            <g>
              <circle cx={cx} cy={cy} r="9" fill="#b8763e" stroke="white" strokeWidth="2" />
              <text x={cx} y={cy + 3} textAnchor="middle" fontFamily="IBM Plex Sans" fontSize="8" fontWeight="700" fill="white">NEW</text>
            </g>
          ) : null;
        })()}

        {/* Tree TPZs */}
        {trees.filter(t => t.dbhCm).map((tree, idx) => {
          const tpz = calculateTPZ(tree.dbhCm);
          if (!tpz) return null;
          const dCorner = parseFloat(tree.distanceFromCorner) || 0;
          const dBoundary = parseFloat(tree.distanceFromBoundary) || 0;
          let treeX, treeY;
          if (tree.side === 'top') { treeX = dCorner; treeY = dBoundary; }
          else if (tree.side === 'bottom') { treeX = dCorner; treeY = lotD - dBoundary; }
          else if (tree.side === 'left') { treeX = dBoundary; treeY = dCorner; }
          else if (tree.side === 'right') { treeX = lotW - dBoundary; treeY = dCorner; }
          else if (tree.side === 'interior') { treeX = dCorner; treeY = dBoundary; }
          else return null;
          const cx = lotX + treeX * scaleX;
          const cy = lotY + treeY * scaleY;
          const tpzPx = tpz * Math.min(scaleX, scaleY);
          const willRemove = tree.decision === 'remove';
          return (
            <g key={tree.id || idx} style={{ pointerEvents: 'none' }}>
              <circle cx={cx} cy={cy} r={tpzPx}
                fill={willRemove ? 'rgba(199, 67, 67, 0.08)' : 'rgba(90, 130, 84, 0.12)'}
                stroke={willRemove ? '#c74343' : '#5a8254'}
                strokeWidth="1" strokeDasharray="3,3" />
              <circle cx={cx} cy={cy} r={4}
                fill={willRemove ? '#c74343' : '#5a8254'}
                stroke="white" strokeWidth="1.5" />
            </g>
          );
        })}

        {/* DWELLINGS */}
        {dwellings.map((d) => {
          const issues = checkConstraints(d, dwellings, layout, parseFloat(project.parentLotSize) || lotW * lotD, sb, trees);
          const valid = issues.length === 0;
          const dx = lotX + d.x * scaleX;
          const dy = lotY + d.y * scaleY;
          const dw = d.width * scaleX;
          const dh = d.depth * scaleY;
          const colour = d.lot === 'lot1' ? '#5b8def' : '#a05b9b';
          const fillColour = valid ? colour : '#c74343';
          const isDragged = dragging?.id === d.id;

          return (
            <g key={d.id} style={{ cursor: isDragged ? 'grabbing' : 'grab' }}>
              <rect x={dx} y={dy} width={dw} height={dh}
                fill={fillColour} fillOpacity={valid ? 0.45 : 0.55}
                stroke={fillColour} strokeWidth={isDragged ? 3 : 2}
                onMouseDown={(e) => handlePointerDown(e, d, 'drag')}
                onTouchStart={(e) => handlePointerDown(e, d, 'drag')}
              />
              <text x={dx + dw / 2} y={dy + dh / 2 - 4} textAnchor="middle" dominantBaseline="middle"
                fontFamily="Fraunces, serif" fontSize="13" fontWeight="500" fill="white" style={{ pointerEvents: 'none' }}>
                {d.label}
              </text>
              <text x={dx + dw / 2} y={dy + dh / 2 + 12} textAnchor="middle" dominantBaseline="middle"
                fontFamily="IBM Plex Mono" fontSize="9" fill="white" style={{ pointerEvents: 'none' }}>
                {d.width}×{d.depth}m · {(d.width * d.depth).toFixed(0)}m²
              </text>
              {/* Resize handle in bottom-right */}
              <rect x={dx + dw - 10} y={dy + dh - 10} width={10} height={10}
                fill="white" stroke={fillColour} strokeWidth="2"
                style={{ cursor: 'nwse-resize' }}
                onMouseDown={(e) => handlePointerDown(e, d, 'resize')}
                onTouchStart={(e) => handlePointerDown(e, d, 'resize')}
              />
            </g>
          );
        })}

        {/* Lot labels */}
        {isDuplex && (
          <>
            <text x={lotX + 6} y={lotY + 14} fontFamily="IBM Plex Mono" fontSize="9" fill="#666">Lot 1</text>
            <text x={lotX + lotW * scaleX - 6} y={lotY + 14} textAnchor="end" fontFamily="IBM Plex Mono" fontSize="9" fill="#666">Lot 2</text>
          </>
        )}
      </svg>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {isDuplex ? (
          <>
            {!dwellings.some(d => d.lot === 'lot1') && (
              <button className="btn-secondary" onClick={() => addDwelling('lot1')}>
                <Plus size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Add House on Lot 1
              </button>
            )}
            {!dwellings.some(d => d.lot === 'lot2') && (
              <button className="btn-secondary" onClick={() => addDwelling('lot2')}>
                <Plus size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Add House on Lot 2
              </button>
            )}
          </>
        ) : (
          dwellings.length === 0 && (
            <button className="btn-secondary" onClick={() => addDwelling('lot1')}>
              <Plus size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Add House
            </button>
          )
        )}
      </div>

      {/* Per-dwelling details and constraint feedback */}
      {dwellings.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {dwellings.map(d => (
            <DwellingDetailCard key={d.id} dwelling={d} dwellings={dwellings} layout={layout} setbacks={sb} trees={trees}
              onUpdate={(updates) => updateDwelling(d.id, updates)}
              onRemove={() => removeDwelling(d.id)} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, padding: 12, background: '#f5f1ea', fontSize: 11, lineHeight: 1.5, color: '#666' }} className="sans">
        <strong>Tip:</strong> Drag dwelling boxes to reposition. Drag the small white square (bottom-right) to resize. Red shaded zones are setback areas — dwellings entering them get flagged. Minimum 50mm gap enforced between dwellings; under 600mm shows a fire-rated wall warning.
      </div>
    </div>
  );
}

function DwellingDetailCard({ dwelling, dwellings, layout, setbacks, trees, onUpdate, onRemove }) {
  const issues = checkConstraints(dwelling, dwellings, layout, null, setbacks, trees);
  const colour = dwelling.lot === 'lot1' ? '#5b8def' : '#a05b9b';

  return (
    <div className="card" style={{ marginBottom: 8, padding: 16, borderLeft: `4px solid ${issues.length === 0 ? colour : '#c74343'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
            <div>
              <label>Label</label>
              <input value={dwelling.label} onChange={e => onUpdate({ label: e.target.value })} />
            </div>
            <div>
              <label>Width (m)</label>
              <input type="number" step="0.1" value={dwelling.width} onChange={e => onUpdate({ width: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label>Depth (m)</label>
              <input type="number" step="0.1" value={dwelling.depth} onChange={e => onUpdate({ depth: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
            <div>
              <label>X position (m)</label>
              <input type="number" step="0.1" value={dwelling.x} onChange={e => onUpdate({ x: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label>Y position (m)</label>
              <input type="number" step="0.1" value={dwelling.y} onChange={e => onUpdate({ y: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label>Floor area</label>
              <input value={`${(dwelling.width * dwelling.depth).toFixed(0)} m²`} readOnly style={{ background: '#f5f1ea' }} />
            </div>
          </div>
        </div>
        <button onClick={onRemove}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#999', padding: 6 }}>
          <Trash2 size={14} />
        </button>
      </div>

      {issues.length > 0 ? (
        <div style={{ padding: 10, background: '#fdf2f2', borderLeft: '3px solid #c74343', fontSize: 12 }} className="sans">
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#c74343' }}>
            <AlertCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            {issues.length} constraint {issues.length === 1 ? 'violation' : 'violations'}:
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {issues.map((iss, i) => <li key={i}>{iss}</li>)}
          </ul>
        </div>
      ) : (
        <div style={{ padding: 8, background: '#f4f9f3', borderLeft: '3px solid #5a8254', fontSize: 12, color: '#2d6826' }} className="sans">
          ✓ All constraints met for {dwelling.label}
        </div>
      )}
    </div>
  );
}

function rearOf(side) {
  return { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side] || 'bottom';
}

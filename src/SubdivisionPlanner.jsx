import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';
import { renderTPZOnSVG } from './Trees.jsx';

// ============================================================================
// LAYOUT DEFAULTS
// ============================================================================

export const LAYOUT_DEFAULTS = {
  primaryRoadName: '',
  primaryRoadSide: 'top', // top | right | bottom | left
  isCorner: false,
  secondaryRoadName: '',
  secondaryRoadSide: 'left',
  subdivisionDirection: 'auto', // 'auto' | 'frontage-split' | 'long-side-split'
  existingDriveway: {
    present: 'unknown', // 'yes' | 'no' | 'unknown'
    side: 'top',         // matches one of the road sides
    distanceFromCorner: '', // metres from nearest corner
    decision: 'keep',    // 'keep' | 'move' | 'remove'
    notes: '',
  },
  proposedDriveway: {
    side: 'top',
    distanceFromCorner: '',
    notes: '',
  },
  parentFrontage: '',     // metres along the primary road
  parentDepth: '',         // metres perpendicular
};

// Auto-suggest subdivision based on lot dimensions
export const suggestSubdivisionDirection = (frontage, depth, isCorner) => {
  const f = parseFloat(frontage) || 0;
  const d = parseFloat(depth) || 0;
  if (isCorner && f >= 15 && d >= 15) return 'long-side-split'; // corner with both sides usable
  if (f >= 18) return 'frontage-split';
  if (d > f) return 'long-side-split';
  return 'frontage-split';
};

// Determine which side of each subdivided lot faces which road
// Returns: { lot1: { primary: 'top' | etc, secondary: ... }, lot2: { ... } }
export const computeLotRoadAssignments = (layout) => {
  const { primaryRoadSide, isCorner, secondaryRoadSide, subdivisionDirection } = layout;

  if (subdivisionDirection === 'frontage-split') {
    // Both lots front the primary road
    return {
      lot1: { primary: primaryRoadSide, secondary: isCorner ? secondaryRoadSide : null, splitBoundary: 'right-or-left' },
      lot2: { primary: primaryRoadSide, secondary: null, splitBoundary: 'right-or-left' },
    };
  }

  if (subdivisionDirection === 'long-side-split') {
    // Corner block split along the long side; one lot faces primary, the other faces secondary
    return {
      lot1: { primary: primaryRoadSide, secondary: null, splitBoundary: 'rear' },
      lot2: { primary: secondaryRoadSide || primaryRoadSide, secondary: null, splitBoundary: 'rear' },
    };
  }

  return {
    lot1: { primary: primaryRoadSide, secondary: null },
    lot2: { primary: primaryRoadSide, secondary: null },
  };
};

// Suggest where the subdivision line falls within the parent lot
export const computeSubdivisionLine = (layout) => {
  const { primaryRoadSide, subdivisionDirection } = layout;

  if (subdivisionDirection === 'frontage-split') {
    // Split at midpoint of frontage — subdivision line runs perpendicular to primary road
    if (primaryRoadSide === 'top' || primaryRoadSide === 'bottom') return 'vertical-mid';
    return 'horizontal-mid';
  }

  if (subdivisionDirection === 'long-side-split') {
    // Split parallel to primary road; lots stack one behind the other (or side-by-side along long boundary)
    if (primaryRoadSide === 'top' || primaryRoadSide === 'bottom') return 'horizontal-mid';
    return 'vertical-mid';
  }

  return 'vertical-mid';
};

// ============================================================================
// SUBDIVISION PLANNER UI
// ============================================================================

export function SubdivisionPlannerSection({ project, updateProject }) {
  const layout = project.layout || LAYOUT_DEFAULTS;
  const isDuplex = project.projectType === 'duplex';

  const updateLayout = (path, value) => {
    const newLayout = JSON.parse(JSON.stringify(layout));
    const keys = path.split('.');
    let target = newLayout;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;

    // Auto-add Planning DD action item if driveway decision changes to move/remove
    let updates = { layout: newLayout };
    if (path === 'existingDriveway.decision' && (value === 'move' || value === 'remove')) {
      const dd = project.planningDD || { actionItems: [] };
      const items = dd.actionItems || [];
      const actionText = value === 'move'
        ? 'Notify Council to relocate existing driveway crossover'
        : 'Notify Council to remove existing driveway crossover';
      const exists = items.some(i => i.text === actionText);
      if (!exists) {
        updates.planningDD = {
          ...dd,
          actionItems: [...items, { text: actionText, status: 'open', addedAt: new Date().toISOString(), autoAdded: true }],
        };
      }
    }
    updateProject(updates);
  };

  // Auto-detect subdivision direction
  const autoDirection = isDuplex
    ? suggestSubdivisionDirection(layout.parentFrontage, layout.parentDepth, layout.isCorner)
    : null;
  const effectiveDirection = layout.subdivisionDirection === 'auto' ? autoDirection : layout.subdivisionDirection;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="serif" style={{ fontSize: 18, fontWeight: 500, margin: '0 0 4px' }}>
          {isDuplex ? 'Subdivision & Layout Planner' : 'Site Layout Planner'}
        </h3>
        <p style={{ fontSize: 12, color: '#666', margin: '0 0 16px' }} className="sans">
          Tell me where the road frontages are, the existing driveway, and (for duplex) how you'd like to split the lot. The diagrams will update automatically.
        </p>

        {/* Roads */}
        <div style={{ marginBottom: 24 }}>
          <h4 className="serif" style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1.5 }}>Road frontages</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label>Primary road name</label>
              <input value={layout.primaryRoadName} onChange={e => updateLayout('primaryRoadName', e.target.value)} placeholder="e.g. Discovery Drive" />
            </div>
            <div>
              <label>Primary road on which side?</label>
              <select value={layout.primaryRoadSide} onChange={e => updateLayout('primaryRoadSide', e.target.value)}>
                <option value="top">Top (north)</option>
                <option value="right">Right (east)</option>
                <option value="bottom">Bottom (south)</option>
                <option value="left">Left (west)</option>
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: 500, color: '#1a1a1a', cursor: 'pointer', padding: 10, background: layout.isCorner ? 'rgba(184, 118, 62, 0.08)' : '#f5f1ea', border: `1px solid ${layout.isCorner ? '#b8763e' : '#e0d9cd'}` }}>
            <input type="checkbox" checked={layout.isCorner || false} onChange={e => updateLayout('isCorner', e.target.checked)} style={{ width: 'auto', margin: 0 }} />
            Corner block (has secondary road frontage)
          </label>

          {layout.isCorner && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div>
                <label>Secondary road name</label>
                <input value={layout.secondaryRoadName} onChange={e => updateLayout('secondaryRoadName', e.target.value)} placeholder="e.g. Sandy Creek Road" />
              </div>
              <div>
                <label>Secondary road on which side?</label>
                <select value={layout.secondaryRoadSide} onChange={e => updateLayout('secondaryRoadSide', e.target.value)}>
                  <option value="top">Top</option>
                  <option value="right">Right</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Parent lot dimensions */}
        {isDuplex && (
          <div style={{ marginBottom: 24 }}>
            <h4 className="serif" style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1.5 }}>Parent lot dimensions</h4>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }} className="sans">Approximate measurements for the diagram. Pre-subdivision dimensions.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Frontage along primary road (m)</label>
                <input type="number" step="0.1" value={layout.parentFrontage} onChange={e => updateLayout('parentFrontage', e.target.value)} placeholder="20" />
              </div>
              <div>
                <label>Depth perpendicular (m)</label>
                <input type="number" step="0.1" value={layout.parentDepth} onChange={e => updateLayout('parentDepth', e.target.value)} placeholder="40" />
              </div>
            </div>
          </div>
        )}

        {/* Subdivision direction */}
        {isDuplex && (
          <div style={{ marginBottom: 24 }}>
            <h4 className="serif" style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1.5 }}>Subdivision approach</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { key: 'auto', label: 'Auto-suggest based on lot dimensions', desc: autoDirection ? `Currently suggesting: ${autoDirection === 'frontage-split' ? 'Split frontage at midpoint (both lots face primary road)' : 'Split along long side (lots face different roads on a corner block)'}` : 'Enter lot dimensions to get a suggestion' },
                { key: 'frontage-split', label: 'Split the frontage at midpoint', desc: 'Both lots get equal road frontage on the primary road. Standard side-by-side duplex.' },
                { key: 'long-side-split', label: 'Split along the long boundary (corner blocks)', desc: 'One lot faces primary road, the other faces secondary road. Each gets independent crossover.' },
              ].map(opt => (
                <label key={opt.key} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: 12, cursor: 'pointer',
                  border: layout.subdivisionDirection === opt.key ? '2px solid #b8763e' : '1px solid #e0d9cd',
                  background: layout.subdivisionDirection === opt.key ? 'rgba(184, 118, 62, 0.05)' : 'white',
                  textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: 400, color: '#1a1a1a', marginBottom: 0,
                }}>
                  <input type="radio" name="subdir" checked={layout.subdivisionDirection === opt.key}
                    onChange={() => updateLayout('subdivisionDirection', opt.key)}
                    style={{ width: 'auto', margin: '4px 0 0 0' }} />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Existing driveway */}
        <div style={{ marginBottom: 24 }}>
          <h4 className="serif" style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1.5 }}>Existing driveway</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label>Existing driveway present?</label>
              <select value={layout.existingDriveway?.present || 'unknown'} onChange={e => updateLayout('existingDriveway.present', e.target.value)}>
                <option value="unknown">Not yet checked</option>
                <option value="yes">Yes</option>
                <option value="no">No / vacant lot</option>
              </select>
            </div>
            <div>
              <label>On which boundary?</label>
              <select value={layout.existingDriveway?.side || 'top'} onChange={e => updateLayout('existingDriveway.side', e.target.value)} disabled={layout.existingDriveway?.present !== 'yes'}>
                <option value="top">Top</option>
                <option value="right">Right</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
              </select>
            </div>
            <div>
              <label>Distance from corner (m)</label>
              <input type="number" step="0.1" value={layout.existingDriveway?.distanceFromCorner || ''} onChange={e => updateLayout('existingDriveway.distanceFromCorner', e.target.value)} placeholder="5" disabled={layout.existingDriveway?.present !== 'yes'} />
            </div>
          </div>
          {layout.existingDriveway?.present === 'yes' && (
            <div>
              <label>Decision on existing driveway</label>
              <select value={layout.existingDriveway?.decision || 'keep'} onChange={e => updateLayout('existingDriveway.decision', e.target.value)}>
                <option value="keep">Keep in place</option>
                <option value="move">Move to new location</option>
                <option value="remove">Remove entirely</option>
              </select>
              {(layout.existingDriveway?.decision === 'move' || layout.existingDriveway?.decision === 'remove') && (
                <div style={{ marginTop: 8, padding: 10, background: '#fffbf5', border: '1px solid #e8d9bf', fontSize: 12, lineHeight: 1.5 }} className="sans">
                  <CheckCircle2 size={12} style={{ display: 'inline', verticalAlign: 'middle', color: '#b8763e', marginRight: 6 }} />
                  An action item has been added to your Planning DD: "<strong>Notify Council to {layout.existingDriveway.decision === 'move' ? 'relocate' : 'remove'} existing driveway crossover</strong>"
                </div>
              )}
              <textarea rows={2} value={layout.existingDriveway?.notes || ''} onChange={e => updateLayout('existingDriveway.notes', e.target.value)} placeholder="Notes…" style={{ marginTop: 8 }} />
            </div>
          )}
        </div>

        {/* Proposed driveway (for duplex) */}
        {isDuplex && (
          <div style={{ marginBottom: 12 }}>
            <h4 className="serif" style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1.5 }}>Proposed new driveway (Lot 2)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
              <div>
                <label>On which boundary?</label>
                <select value={layout.proposedDriveway?.side || 'top'} onChange={e => updateLayout('proposedDriveway.side', e.target.value)}>
                  <option value="top">Top</option>
                  <option value="right">Right</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                </select>
              </div>
              <div>
                <label>Distance from corner (m)</label>
                <input type="number" step="0.1" value={layout.proposedDriveway?.distanceFromCorner || ''} onChange={e => updateLayout('proposedDriveway.distanceFromCorner', e.target.value)} placeholder="5" />
              </div>
            </div>
            <textarea rows={2} value={layout.proposedDriveway?.notes || ''} onChange={e => updateLayout('proposedDriveway.notes', e.target.value)} placeholder="Notes on proposed crossover location…" />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PARENT LOT DIAGRAM (for duplex projects)
// ============================================================================

export function ParentLotDiagram({ project }) {
  const layout = project.layout || LAYOUT_DEFAULTS;
  const isDuplex = project.projectType === 'duplex';
  if (!isDuplex) return null;

  const frontage = parseFloat(layout.parentFrontage) || 20;
  const depth = parseFloat(layout.parentDepth) || 40;

  // Determine SVG dimensions based on which side the primary road is on
  const isHorizontalRoad = layout.primaryRoadSide === 'top' || layout.primaryRoadSide === 'bottom';

  // Map lot dimensions to canvas
  const SVG_W = 420, SVG_H = 360, PAD = 50;
  const drawW = SVG_W - PAD * 2, drawH = SVG_H - PAD * 2;

  // Lot width is along the road (frontage), depth is perpendicular
  let lotPxW, lotPxH;
  if (isHorizontalRoad) {
    lotPxW = drawW;
    lotPxH = drawW * (depth / frontage);
    if (lotPxH > drawH) {
      lotPxH = drawH;
      lotPxW = drawH * (frontage / depth);
    }
  } else {
    lotPxH = drawH;
    lotPxW = drawH * (frontage / depth);
    if (lotPxW > drawW) {
      lotPxW = drawW;
      lotPxH = drawW * (depth / frontage);
    }
  }

  const lotX = (SVG_W - lotPxW) / 2;
  const lotY = (SVG_H - lotPxH) / 2;

  // Subdivision line
  const subdivLine = computeSubdivisionLine(layout);
  let lineX1, lineY1, lineX2, lineY2;
  if (subdivLine === 'vertical-mid') {
    lineX1 = lineX2 = lotX + lotPxW / 2;
    lineY1 = lotY;
    lineY2 = lotY + lotPxH;
  } else {
    lineY1 = lineY2 = lotY + lotPxH / 2;
    lineX1 = lotX;
    lineX2 = lotX + lotPxW;
  }

  // Helper for road label position
  const roadLabel = (side, name, isPrimary) => {
    if (side === 'top') return { x: SVG_W / 2, y: lotY - 18, anchor: 'middle' };
    if (side === 'bottom') return { x: SVG_W / 2, y: lotY + lotPxH + 30, anchor: 'middle' };
    if (side === 'left') return { x: lotX - 12, y: lotY + lotPxH / 2, anchor: 'end', rotate: -90 };
    if (side === 'right') return { x: lotX + lotPxW + 12, y: lotY + lotPxH / 2, anchor: 'start', rotate: 90 };
  };

  // Driveway position calculation
  const driveAt = (side, dist, label) => {
    if (!dist) return null;
    const d = parseFloat(dist);
    let cx, cy;
    if (side === 'top') { cx = lotX + d * (lotPxW / frontage); cy = lotY; }
    else if (side === 'bottom') { cx = lotX + d * (lotPxW / frontage); cy = lotY + lotPxH; }
    else if (side === 'left') { cx = lotX; cy = lotY + d * (lotPxH / depth); }
    else if (side === 'right') { cx = lotX + lotPxW; cy = lotY + d * (lotPxH / depth); }
    else return null;
    return { cx, cy, label };
  };

  const existingDrive = layout.existingDriveway?.present === 'yes'
    ? driveAt(layout.existingDriveway.side, layout.existingDriveway.distanceFromCorner, 'EX')
    : null;
  const proposedDrive = driveAt(layout.proposedDriveway?.side, layout.proposedDriveway?.distanceFromCorner, 'NEW');

  const primaryRoadLabel = roadLabel(layout.primaryRoadSide, layout.primaryRoadName, true);
  const secondaryRoadLabel = layout.isCorner ? roadLabel(layout.secondaryRoadSide, layout.secondaryRoadName, false) : null;

  const lot1Label = subdivLine === 'vertical-mid'
    ? { x: lotX + lotPxW * 0.25, y: lotY + lotPxH / 2 }
    : { x: lotX + lotPxW / 2, y: lotY + lotPxH * 0.25 };
  const lot2Label = subdivLine === 'vertical-mid'
    ? { x: lotX + lotPxW * 0.75, y: lotY + lotPxH / 2 }
    : { x: lotX + lotPxW / 2, y: lotY + lotPxH * 0.75 };

  return (
    <div>
      <h3 className="serif" style={{ fontSize: 16, fontWeight: 500, margin: '0 0 12px' }}>Parent lot — proposed subdivision</h3>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', height: 'auto', background: 'white', border: '1px solid #e0d9cd' }}>
        {/* Road lines (running along the relevant boundary) */}
        {layout.primaryRoadSide === 'top' && <line x1={0} y1={lotY - 4} x2={SVG_W} y2={lotY - 4} stroke="#888" strokeWidth="2" />}
        {layout.primaryRoadSide === 'bottom' && <line x1={0} y1={lotY + lotPxH + 4} x2={SVG_W} y2={lotY + lotPxH + 4} stroke="#888" strokeWidth="2" />}
        {layout.primaryRoadSide === 'left' && <line x1={lotX - 4} y1={0} x2={lotX - 4} y2={SVG_H} stroke="#888" strokeWidth="2" />}
        {layout.primaryRoadSide === 'right' && <line x1={lotX + lotPxW + 4} y1={0} x2={lotX + lotPxW + 4} y2={SVG_H} stroke="#888" strokeWidth="2" />}

        {layout.isCorner && layout.secondaryRoadSide === 'top' && <line x1={0} y1={lotY - 4} x2={SVG_W} y2={lotY - 4} stroke="#aaa" strokeWidth="2" strokeDasharray="6,3" />}
        {layout.isCorner && layout.secondaryRoadSide === 'bottom' && <line x1={0} y1={lotY + lotPxH + 4} x2={SVG_W} y2={lotY + lotPxH + 4} stroke="#aaa" strokeWidth="2" strokeDasharray="6,3" />}
        {layout.isCorner && layout.secondaryRoadSide === 'left' && <line x1={lotX - 4} y1={0} x2={lotX - 4} y2={SVG_H} stroke="#aaa" strokeWidth="2" strokeDasharray="6,3" />}
        {layout.isCorner && layout.secondaryRoadSide === 'right' && <line x1={lotX + lotPxW + 4} y1={0} x2={lotX + lotPxW + 4} y2={SVG_H} stroke="#aaa" strokeWidth="2" strokeDasharray="6,3" />}

        {/* Road name labels */}
        {primaryRoadLabel && (
          <text x={primaryRoadLabel.x} y={primaryRoadLabel.y} textAnchor={primaryRoadLabel.anchor}
            fontFamily="IBM Plex Sans" fontSize="11" fill="#1a1a1a" fontWeight="600"
            transform={primaryRoadLabel.rotate ? `rotate(${primaryRoadLabel.rotate} ${primaryRoadLabel.x} ${primaryRoadLabel.y})` : undefined}>
            {layout.primaryRoadName || 'PRIMARY ROAD'}
          </text>
        )}
        {secondaryRoadLabel && (
          <text x={secondaryRoadLabel.x} y={secondaryRoadLabel.y} textAnchor={secondaryRoadLabel.anchor}
            fontFamily="IBM Plex Sans" fontSize="10" fill="#666" fontStyle="italic"
            transform={secondaryRoadLabel.rotate ? `rotate(${secondaryRoadLabel.rotate} ${secondaryRoadLabel.x} ${secondaryRoadLabel.y})` : undefined}>
            {layout.secondaryRoadName || 'SECONDARY ROAD'}
          </text>
        )}

        {/* Lot boundary */}
        <rect x={lotX} y={lotY} width={lotPxW} height={lotPxH} fill="#f5f1ea" stroke="#1a1a1a" strokeWidth="2" />

        {/* Subdivision line */}
        <line x1={lineX1} y1={lineY1} x2={lineX2} y2={lineY2} stroke="#b8763e" strokeWidth="2.5" strokeDasharray="6,4" />

        {/* Lot labels */}
        <text x={lot1Label.x} y={lot1Label.y} textAnchor="middle" dominantBaseline="middle" fontFamily="Fraunces, serif" fontSize="14" fontWeight="500" fill="#1a1a1a">Lot 1</text>
        <text x={lot2Label.x} y={lot2Label.y} textAnchor="middle" dominantBaseline="middle" fontFamily="Fraunces, serif" fontSize="14" fontWeight="500" fill="#1a1a1a">Lot 2</text>

        {/* Driveways */}
        {existingDrive && (
          <g>
            <circle cx={existingDrive.cx} cy={existingDrive.cy} r="9" fill={layout.existingDriveway?.decision === 'keep' ? '#5a8254' : '#c74343'} stroke="white" strokeWidth="2" />
            <text x={existingDrive.cx} y={existingDrive.cy + 3} textAnchor="middle" fontFamily="IBM Plex Sans" fontSize="9" fontWeight="700" fill="white">EX</text>
            <text x={existingDrive.cx} y={existingDrive.cy + 20}
              textAnchor="middle" fontFamily="IBM Plex Sans" fontSize="8" fill={layout.existingDriveway?.decision === 'keep' ? '#5a8254' : '#c74343'} letterSpacing="1">
              {layout.existingDriveway?.decision === 'keep' ? 'KEEP' : layout.existingDriveway?.decision === 'move' ? 'MOVE' : 'REMOVE'}
            </text>
          </g>
        )}
        {proposedDrive && (
          <g>
            <circle cx={proposedDrive.cx} cy={proposedDrive.cy} r="9" fill="#b8763e" stroke="white" strokeWidth="2" />
            <text x={proposedDrive.cx} y={proposedDrive.cy + 3} textAnchor="middle" fontFamily="IBM Plex Sans" fontSize="8" fontWeight="700" fill="white">NEW</text>
            <text x={proposedDrive.cx} y={proposedDrive.cy + 20}
              textAnchor="middle" fontFamily="IBM Plex Sans" fontSize="8" fill="#b8763e" letterSpacing="1">
              LOT 2
            </text>
          </g>
        )}

        {/* Dimensions */}
        <text x={lotX + lotPxW / 2} y={lotY + lotPxH + 16} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9" fill="#666">{layout.parentFrontage || '?'}m frontage</text>
        <text x={lotX - 8} y={lotY + lotPxH / 2} textAnchor="end" fontFamily="IBM Plex Mono" fontSize="9" fill="#666" transform={`rotate(-90 ${lotX - 8} ${lotY + lotPxH / 2})`}>{layout.parentDepth || '?'}m depth</text>

        {/* TPZ overlay for trees on parent lot */}
        {project.trees && project.trees.length > 0 && (() => {
          const scaleX = lotPxW / (parseFloat(layout.parentFrontage) || frontage);
          const scaleY = lotPxH / (parseFloat(layout.parentDepth) || depth);
          return renderTPZOnSVG(project.trees, { lotX, lotY }, scaleX, scaleY,
            parseFloat(layout.parentFrontage) || frontage,
            parseFloat(layout.parentDepth) || depth);
        })()}
      </svg>

      <div style={{ marginTop: 12, padding: 12, background: '#f5f1ea', fontSize: 11, lineHeight: 1.5, color: '#666' }} className="sans">
        <strong>Legend:</strong> Solid line = primary road · Dashed grey = secondary road · Orange dashed = subdivision line · 🟢 EX = existing driveway (keep) · 🔴 EX = existing driveway (move/remove) · 🟧 NEW = proposed driveway for Lot 2 · 🌳 Green dashed circle = Tree Protection Zone (TPZ) · Inner dashed = Structural Root Zone (SRZ)
      </div>
    </div>
  );
}

// ============================================================================
// PER-LOT DIAGRAM with road frontages and driveway
// ============================================================================

export function PerLotDiagramWithRoads({ lot, lotIdx, layout, stateRules, trees }) {
  const lotSize = parseFloat(lot.lotSize) || 600;
  const lotWidth = Math.sqrt(lotSize / 1.5);
  const lotDepth = lotSize / lotWidth;

  // Determine road assignments for this lot
  const assignments = computeLotRoadAssignments(layout || LAYOUT_DEFAULTS);
  const myAssignment = lotIdx === 0 ? assignments.lot1 : assignments.lot2;
  const primarySide = myAssignment.primary || 'top';
  const secondarySide = myAssignment.secondary;

  const front = parseFloat(lot.setbacks?.front) || 0;
  const rear = parseFloat(lot.setbacks?.rear) || 0;
  const side = parseFloat(lot.setbacks?.side) || 0;
  const secondary = (lot.isCorner || secondarySide) ? (parseFloat(lot.setbacks?.secondary) || 0) : 0;

  const SVG_W = 380, SVG_H = 380, PAD = 40;
  const drawW = SVG_W - PAD * 2, drawH = SVG_H - PAD * 2;

  // Orient the lot so primary road is at top of diagram
  const scaleX = drawW / lotWidth, scaleY = drawH / lotDepth;
  const lotX = PAD, lotY = PAD;
  const lotPxW = lotWidth * scaleX, lotPxH = lotDepth * scaleY;

  // Map setback assignments to sides of the diagram
  // We always render with primary at top; relabel as needed
  const frontSide = primarySide;

  // For corner lot with secondary, work out which boundary it falls on
  // In the simplified view, render: front (top), rear (bottom), side (right), secondary (left if corner)
  const leftSetback = (lot.isCorner || secondarySide) ? secondary : side;
  const rightSetback = side;
  const topSetback = front;
  const bottomSetback = rear;

  const buildX = lotX + leftSetback * scaleX;
  const buildY = lotY + topSetback * scaleY;
  const buildW = Math.max(0, lotPxW - (leftSetback + rightSetback) * scaleX);
  const buildH = Math.max(0, lotPxH - (topSetback + bottomSetback) * scaleY);

  const buildableArea = (lotWidth - leftSetback - rightSetback) * (lotDepth - topSetback - bottomSetback);
  const siteCoveragePct = lotSize > 0 ? Math.max(0, Math.min(100, (buildableArea / lotSize) * 100)) : 0;
  const stateCovLimit = stateRules.siteCoverage;
  const overCoverage = typeof stateCovLimit === 'number' && siteCoveragePct > stateCovLimit;

  // Driveway for this lot
  const myDriveway = lotIdx === 0
    ? (layout?.existingDriveway?.present === 'yes' && layout.existingDriveway.decision === 'keep' ? layout.existingDriveway : null)
    : (layout?.proposedDriveway?.distanceFromCorner ? layout.proposedDriveway : null);

  // Place driveway icon — always shown at top of lot diagram (which represents the primary road frontage)
  let driveCx = null, driveCy = null;
  if (myDriveway?.distanceFromCorner) {
    const d = parseFloat(myDriveway.distanceFromCorner);
    driveCx = lotX + d * scaleX;
    driveCy = lotY;
  }

  // Road labels
  const primaryRoadName = layout?.primaryRoadName || 'PRIMARY ROAD';
  const secondaryRoadName = layout?.secondaryRoadName || 'SECONDARY ROAD';
  const showSecondaryOnLeft = lotIdx === 1 && layout?.subdivisionDirection === 'long-side-split' && layout?.isCorner;
  // For lot 2 in long-side split on a corner, the "primary frontage" is actually the secondary road
  const lotPrimaryRoadDisplay = (lotIdx === 1 && layout?.subdivisionDirection === 'long-side-split' && layout?.isCorner)
    ? secondaryRoadName
    : primaryRoadName;

  return (
    <div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', height: 'auto', background: 'white', border: '1px solid #e0d9cd' }}>
        {/* Primary road bar at top */}
        <rect x={0} y={lotY - 16} width={SVG_W} height={12} fill="#888" />
        <text x={SVG_W / 2} y={lotY - 7} textAnchor="middle" fontFamily="IBM Plex Sans" fontSize="9" fontWeight="600" fill="white" letterSpacing="1.5">
          {(lotPrimaryRoadDisplay || 'PRIMARY ROAD').toUpperCase()}
        </text>

        {/* Secondary road if corner */}
        {(lot.isCorner || secondarySide) && (
          <>
            <rect x={lotX - 16} y={0} width={12} height={SVG_H} fill="#aaa" strokeDasharray="4,3" />
            <text x={lotX - 10} y={SVG_H / 2} textAnchor="middle" fontFamily="IBM Plex Sans" fontSize="9" fontWeight="600" fill="white" letterSpacing="1.5"
              transform={`rotate(-90 ${lotX - 10} ${SVG_H / 2})`}>
              {(secondaryRoadName || 'SECONDARY').toUpperCase()}
            </text>
          </>
        )}

        {/* Lot boundary */}
        <rect x={lotX} y={lotY} width={lotPxW} height={lotPxH} fill="#f5f1ea" stroke="#1a1a1a" strokeWidth="2" />

        {/* Buildable area */}
        {buildW > 0 && buildH > 0 && (
          <rect x={buildX} y={buildY} width={buildW} height={buildH}
                fill={overCoverage ? '#fdecec' : 'rgba(184, 118, 62, 0.15)'}
                stroke={overCoverage ? '#c74343' : '#b8763e'} strokeWidth="1.5" strokeDasharray="4,3" />
        )}
        {buildW > 0 && buildH > 0 && (
          <text x={buildX + buildW / 2} y={buildY + buildH / 2} textAnchor="middle" dominantBaseline="middle"
                fontFamily="Fraunces, serif" fontSize="11" fill="#1a1a1a" fontStyle="italic">buildable</text>
        )}

        {/* Setback labels */}
        <line x1={lotX + lotPxW / 2} y1={lotY} x2={lotX + lotPxW / 2} y2={buildY} stroke="#666" strokeWidth="1" />
        <text x={lotX + lotPxW / 2 + 4} y={lotY + (buildY - lotY) / 2 + 3} fontFamily="IBM Plex Mono" fontSize="9" fill="#1a1a1a">{front}m</text>

        <line x1={lotX + lotPxW / 2} y1={buildY + buildH} x2={lotX + lotPxW / 2} y2={lotY + lotPxH} stroke="#666" strokeWidth="1" />
        <text x={lotX + lotPxW / 2 + 4} y={(buildY + buildH) + (lotY + lotPxH - buildY - buildH) / 2 + 3} fontFamily="IBM Plex Mono" fontSize="9" fill="#1a1a1a">{rear}m</text>

        <line x1={lotX} y1={lotY + lotPxH / 2} x2={buildX} y2={lotY + lotPxH / 2} stroke="#666" strokeWidth="1" />
        <text x={lotX + (buildX - lotX) / 2} y={lotY + lotPxH / 2 - 4} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9" fill={(lot.isCorner || secondarySide) ? '#b8763e' : '#1a1a1a'}>{leftSetback}m</text>

        <line x1={buildX + buildW} y1={lotY + lotPxH / 2} x2={lotX + lotPxW} y2={lotY + lotPxH / 2} stroke="#666" strokeWidth="1" />
        <text x={buildX + buildW + (lotX + lotPxW - buildX - buildW) / 2} y={lotY + lotPxH / 2 - 4} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9" fill="#1a1a1a">{rightSetback}m</text>

        {/* Driveway */}
        {driveCx !== null && (
          <g>
            <circle cx={driveCx} cy={driveCy} r="9" fill={lotIdx === 0 ? '#5a8254' : '#b8763e'} stroke="white" strokeWidth="2" />
            <text x={driveCx} y={driveCy + 3} textAnchor="middle" fontFamily="IBM Plex Sans" fontSize="8" fontWeight="700" fill="white">
              {lotIdx === 0 ? 'EX' : 'NEW'}
            </text>
          </g>
        )}

        {/* Lot info */}
        <text x={lotX + 6} y={lotY + 14} fontFamily="IBM Plex Mono" fontSize="9" fill="#666">{lot.label} · {lot.lotSize || '?'}m²</text>

        {/* TPZ overlay for trees */}
        {trees && trees.length > 0 && renderTPZOnSVG(trees, { lotX, lotY }, scaleX, scaleY, lotWidth, lotDepth)}
      </svg>

      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }} className="sans">
        <div style={{ padding: 8, background: '#f5f1ea' }}>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Buildable area</div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{buildableArea > 0 ? buildableArea.toFixed(0) : 0}m²</div>
        </div>
        <div style={{ padding: 8, background: overCoverage ? '#fdecec' : '#f5f1ea' }}>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Max site cover</div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 500, color: overCoverage ? '#c74343' : '#1a1a1a' }}>{siteCoveragePct.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}

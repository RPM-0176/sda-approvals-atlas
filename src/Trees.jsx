import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2, TreePine, Info } from 'lucide-react';

// ============================================================================
// AS 4970 — TREE PROTECTION ZONE CALCULATIONS
// ============================================================================
//
// TPZ Radius = DBH (m) × 12
//   - Minimum TPZ = 2.0 m
//   - Maximum TPZ = 15.0 m
//
// SRZ Radius = (DBH × 50)^0.42 × 0.64
//   - Minimum SRZ = 1.5 m
//   - Trees with DBH < 0.15m use minimum SRZ
//
// Encroachment:
//   - <10% of TPZ area = minor (usually OK with arborist sign-off)
//   - >10% = major (requires detailed assessment + compensation)
// ============================================================================

export const calculateTPZ = (dbhCm) => {
  const dbh = parseFloat(dbhCm) / 100; // convert cm to m
  if (!dbh || dbh <= 0) return null;
  let tpz = dbh * 12;
  if (tpz < 2.0) tpz = 2.0;
  if (tpz > 15.0) tpz = 15.0;
  return tpz;
};

export const calculateSRZ = (dbhCm) => {
  const dbh = parseFloat(dbhCm) / 100;
  if (!dbh || dbh <= 0) return null;
  let srz = Math.pow(dbh * 50, 0.42) * 0.64;
  if (srz < 1.5) srz = 1.5;
  return srz;
};

// Calculate encroachment of buildable envelope into a tree's TPZ
// Returns: { encroachmentArea, encroachmentPct, severity }
// Approximation: uses circle-rectangle intersection area
export const calculateEncroachment = (tree, buildableRect) => {
  const tpz = calculateTPZ(tree.dbhCm);
  if (!tpz || !tree.x || !tree.y || !buildableRect) return null;

  const tpzArea = Math.PI * tpz * tpz;

  // Compute intersection of TPZ circle with buildable rectangle
  // Use Monte Carlo approximation for simplicity (1000 sample points)
  let inside = 0;
  const samples = 2500;
  const cx = parseFloat(tree.x);
  const cy = parseFloat(tree.y);
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * 2 * Math.PI;
    for (let r = 0; r < 50; r++) {
      const dist = (r / 50) * tpz;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      if (px >= buildableRect.x && px <= buildableRect.x + buildableRect.w &&
          py >= buildableRect.y && py <= buildableRect.y + buildableRect.h) {
        inside++;
      }
    }
  }
  const encroachmentPct = (inside / (samples * 50)) * 100;
  const encroachmentArea = (encroachmentPct / 100) * tpzArea;

  let severity = 'none';
  if (encroachmentPct >= 10) severity = 'major';
  else if (encroachmentPct > 0) severity = 'minor';

  return { encroachmentArea, encroachmentPct, severity, tpzArea };
};

// ============================================================================
// TREE DATA SHAPE
// ============================================================================

export const blankTree = () => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
  species: '',
  dbhCm: '',
  heightM: '',
  crownSpreadM: '',
  health: 'unknown', // good | fair | poor | dead | unknown
  position: 'on-site', // 'on-site' | 'neighbour-encroaching' | 'street-tree'
  side: 'top', // top | right | bottom | left | interior
  distanceFromCorner: '', // metres from corner of lot
  distanceFromBoundary: '', // metres from the indicated boundary
  // Position in metres relative to top-left of lot (used for diagram overlay calc)
  // Computed from side + distanceFromCorner + distanceFromBoundary; can be edited directly too
  x: '',
  y: '',
  councilProtected: 'unknown', // yes | no | unknown
  significantTree: 'unknown',
  decision: 'retain', // retain | remove | unknown
  notes: '',
});

// ============================================================================
// TREE REGISTER UI
// ============================================================================

export function TreeRegisterTab({ project, updateProject }) {
  const trees = project.trees || [];
  const [expandedId, setExpandedId] = useState(null);

  const updateTrees = (newTrees) => {
    // Auto-add Planning DD action items based on tree decisions
    const dd = project.planningDD || { actionItems: [] };
    const items = [...(dd.actionItems || [])];

    const arboristNeeded = newTrees.some(t =>
      t.councilProtected === 'unknown' ||
      t.health === 'unknown' ||
      t.decision === 'unknown' ||
      (t.dbhCm && !t.species)
    );
    const removalsProposed = newTrees.some(t => t.decision === 'remove' && t.councilProtected !== 'no');

    const arboristText = 'Engage arborist for on-site tree assessment (AS 4970)';
    const removalText = 'Apply for council tree removal permit';

    const ensureItem = (text) => {
      if (!items.some(i => i.text === text)) {
        items.push({ text, status: 'open', addedAt: new Date().toISOString(), autoAdded: true });
      }
    };

    if (arboristNeeded && newTrees.length > 0) ensureItem(arboristText);
    if (removalsProposed) ensureItem(removalText);

    updateProject({
      trees: newTrees,
      planningDD: { ...dd, actionItems: items },
    });
  };

  const addTree = () => {
    const t = blankTree();
    updateTrees([...trees, t]);
    setExpandedId(t.id);
  };

  const updateTree = (id, updates) => {
    updateTrees(trees.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeTree = (id) => {
    if (confirm('Remove this tree from the register?')) {
      updateTrees(trees.filter(t => t.id !== id));
    }
  };

  // Summary stats
  const totalTrees = trees.length;
  const toRemove = trees.filter(t => t.decision === 'remove').length;
  const toRetain = trees.filter(t => t.decision === 'retain').length;
  const protected_ = trees.filter(t => t.councilProtected === 'yes' || t.significantTree === 'yes').length;

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            <TreePine size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: '#5a8254' }} />
            Trees & Protection Zones
          </h2>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }} className="sans">
            TPZs auto-calculated per AS 4970 (Protection of Trees on Development Sites). Visualised on the Site & Setbacks tab.
          </p>
        </div>
        <button className="btn-primary" onClick={addTree}>
          <Plus size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          Add Tree
        </button>
      </div>

      {/* Disclaimer */}
      <div style={{ padding: 14, background: '#fffbf5', border: '1px solid #e8d9bf', fontSize: 12, lineHeight: 1.5, marginBottom: 24 }} className="sans">
        <Info size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: '#b8763e' }} />
        <strong>Important:</strong> This tool calculates indicative TPZs from your tree measurements. It does <strong>not</strong> replace an on-site arborist assessment. AS 4970 requires a qualified arborist to certify TPZs before development. Use this register to brief your arborist and identify likely conflicts early.
      </div>

      {/* Stats */}
      {totalTrees > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatBlock label="Trees" value={totalTrees} />
          <StatBlock label="Retain" value={toRetain} colour="#5a8254" />
          <StatBlock label="Remove" value={toRemove} colour="#c74343" />
          <StatBlock label="Protected" value={protected_} colour="#b8763e" />
        </div>
      )}

      {trees.length === 0 ? (
        <div style={{ border: '2px dashed #ccc', padding: '40px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.4)' }}>
          <TreePine size={32} style={{ color: '#999', marginBottom: 12 }} />
          <p className="serif" style={{ fontSize: 16, fontStyle: 'italic', color: '#666', margin: '0 0 8px' }}>No trees registered yet.</p>
          <p style={{ fontSize: 12, color: '#888', margin: 0 }} className="sans">Click "Add Tree" to start building the register.</p>
        </div>
      ) : (
        <div>
          {trees.map((tree, idx) => (
            <TreeCard key={tree.id}
              tree={tree} idx={idx}
              expanded={expandedId === tree.id}
              setExpanded={(e) => setExpandedId(e ? tree.id : null)}
              update={(updates) => updateTree(tree.id, updates)}
              remove={() => removeTree(tree.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, value, colour }) {
  return (
    <div style={{ padding: 14, background: 'rgba(255,255,255,0.6)', border: '1px solid #e0d9cd' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: '#888', marginBottom: 4 }} className="sans">{label}</div>
      <div className="serif" style={{ fontSize: 24, fontWeight: 500, color: colour || '#1a1a1a' }}>{value}</div>
    </div>
  );
}

function TreeCard({ tree, idx, expanded, setExpanded, update, remove }) {
  const tpz = calculateTPZ(tree.dbhCm);
  const srz = calculateSRZ(tree.dbhCm);

  const decisionColor = tree.decision === 'remove' ? '#c74343' :
                        tree.decision === 'retain' ? '#5a8254' : '#888';

  return (
    <div className="card" style={{ marginBottom: 12, padding: 0 }}>
      <div style={{
        padding: '16px 20px', cursor: 'pointer',
        display: 'grid', gridTemplateColumns: 'auto 2fr 1fr 1fr auto', gap: 16, alignItems: 'center',
      }} onClick={() => setExpanded(!expanded)}>
        <div className="mono" style={{ fontSize: 12, color: '#888', minWidth: 24 }}>#{idx + 1}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }} className="sans">{tree.species || <span style={{ fontStyle: 'italic', color: '#999' }}>Unspecified species</span>}</div>
          <div style={{ fontSize: 11, color: '#666' }} className="sans">
            DBH: {tree.dbhCm ? `${tree.dbhCm}cm` : '—'} · Height: {tree.heightM ? `${tree.heightM}m` : '—'}
          </div>
        </div>
        <div style={{ fontSize: 11 }} className="sans">
          <div style={{ color: '#888', textTransform: 'uppercase', letterSpacing: 1, fontSize: 9 }}>TPZ / SRZ</div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{tpz ? `${tpz.toFixed(1)}m` : '—'} / {srz ? `${srz.toFixed(1)}m` : '—'}</div>
        </div>
        <div>
          <span style={{
            display: 'inline-block', padding: '4px 10px', fontSize: 10, fontWeight: 600,
            letterSpacing: 1, textTransform: 'uppercase',
            background: decisionColor + '22', color: decisionColor,
          }} className="sans">
            {tree.decision === 'unknown' ? 'TBC' : tree.decision}
          </span>
          {(tree.councilProtected === 'yes' || tree.significantTree === 'yes') && (
            <span style={{ marginLeft: 6, padding: '4px 8px', fontSize: 9, fontWeight: 600, background: '#b8763e', color: 'white', letterSpacing: 1 }} className="sans">PROTECTED</span>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); remove(); }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#999', padding: 6 }}>
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0eadf' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginTop: 16 }}>
            <div>
              <label>Species</label>
              <input value={tree.species} onChange={e => update({ species: e.target.value })} placeholder="e.g. Eucalyptus tereticornis (Forest Red Gum)" />
            </div>
            <div>
              <label>DBH (cm)</label>
              <input type="number" step="0.1" value={tree.dbhCm} onChange={e => update({ dbhCm: e.target.value })} placeholder="50" />
            </div>
            <div>
              <label>Height (m)</label>
              <input type="number" step="0.1" value={tree.heightM} onChange={e => update({ heightM: e.target.value })} placeholder="15" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label>Crown spread (m)</label>
              <input type="number" step="0.1" value={tree.crownSpreadM} onChange={e => update({ crownSpreadM: e.target.value })} placeholder="8" />
            </div>
            <div>
              <label>Health</label>
              <select value={tree.health} onChange={e => update({ health: e.target.value })}>
                <option value="unknown">Not yet assessed</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="dead">Dead / hazard</option>
              </select>
            </div>
            <div>
              <label>Position</label>
              <select value={tree.position} onChange={e => update({ position: e.target.value })}>
                <option value="on-site">On the lot</option>
                <option value="neighbour-encroaching">Neighbour's tree, TPZ encroaches</option>
                <option value="street-tree">Council street tree</option>
              </select>
            </div>
          </div>

          {/* Calculated TPZ/SRZ display */}
          {tpz && (
            <div style={{ marginTop: 16, padding: 14, background: '#f4f9f3', border: '1px solid #c9dac1' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#5a8254', fontWeight: 600, marginBottom: 8 }} className="sans">CALCULATED PER AS 4970</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }} className="sans">
                <div>
                  <div style={{ color: '#666', fontSize: 11 }}>Tree Protection Zone (TPZ)</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{tpz.toFixed(2)}m radius</div>
                  <div style={{ fontSize: 10, color: '#888' }}>= {(Math.PI * tpz * tpz).toFixed(1)}m² area</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 11 }}>Structural Root Zone (SRZ)</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{srz.toFixed(2)}m radius</div>
                  <div style={{ fontSize: 10, color: '#888' }}>No encroachment permitted</div>
                </div>
              </div>
            </div>
          )}

          {/* Position on lot */}
          <div style={{ marginTop: 16 }}>
            <h4 className="serif" style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1.5 }}>Tree position on lot</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label>Closest boundary</label>
                <select value={tree.side} onChange={e => update({ side: e.target.value })}>
                  <option value="top">Top (front)</option>
                  <option value="right">Right</option>
                  <option value="bottom">Bottom (rear)</option>
                  <option value="left">Left</option>
                  <option value="interior">Middle of lot</option>
                </select>
              </div>
              <div>
                <label>Distance from corner (m)</label>
                <input type="number" step="0.1" value={tree.distanceFromCorner} onChange={e => update({ distanceFromCorner: e.target.value })} placeholder="5" />
              </div>
              <div>
                <label>Distance from boundary (m)</label>
                <input type="number" step="0.1" value={tree.distanceFromBoundary} onChange={e => update({ distanceFromBoundary: e.target.value })} placeholder="2" />
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#888', marginTop: 6 }} className="sans">
              Position is used to draw the TPZ circle on the lot diagram.
            </p>
          </div>

          {/* Decision and protection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
            <div>
              <label>Council protected?</label>
              <select value={tree.councilProtected} onChange={e => update({ councilProtected: e.target.value })}>
                <option value="unknown">Not yet checked</option>
                <option value="yes">Yes (permit needed for any works)</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label>On significant tree register?</label>
              <select value={tree.significantTree} onChange={e => update({ significantTree: e.target.value })}>
                <option value="unknown">Not yet checked</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label>Decision</label>
              <select value={tree.decision} onChange={e => update({ decision: e.target.value })}>
                <option value="unknown">Not yet decided</option>
                <option value="retain">Retain (work around TPZ)</option>
                <option value="remove">Remove (permit may be required)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Notes</label>
            <textarea rows={2} value={tree.notes} onChange={e => update({ notes: e.target.value })} placeholder="Arborist findings, council advice, mitigation strategies…" />
          </div>

          {/* Auto-flagged actions */}
          {((tree.health === 'unknown' || tree.councilProtected === 'unknown' || tree.decision === 'unknown') ||
            (tree.decision === 'remove' && tree.councilProtected !== 'no')) && (
            <div style={{ marginTop: 12, padding: 10, background: '#fffbf5', border: '1px solid #e8d9bf', fontSize: 12, lineHeight: 1.5 }} className="sans">
              <CheckCircle2 size={12} style={{ display: 'inline', verticalAlign: 'middle', color: '#b8763e', marginRight: 6 }} />
              Action items have been added to your Planning DD for the items still needing arborist or council confirmation.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TPZ OVERLAY — used by the lot diagram in SubdivisionPlanner.jsx
// Returns SVG elements ready to inject into a parent SVG
// ============================================================================

export function renderTPZOnSVG(trees, lotPxBounds, scaleX, scaleY, lotWidth, lotDepth, options = {}) {
  if (!trees || trees.length === 0) return null;
  const { lotX, lotY } = lotPxBounds;

  return trees.map((tree, idx) => {
    if (!tree.dbhCm) return null;
    const tpz = calculateTPZ(tree.dbhCm);
    const srz = calculateSRZ(tree.dbhCm);
    if (!tpz) return null;

    // Compute pixel position from side + distances
    const dCorner = parseFloat(tree.distanceFromCorner) || 0;
    const dBoundary = parseFloat(tree.distanceFromBoundary) || 0;

    let cxM, cyM;
    if (tree.side === 'top') { cxM = dCorner; cyM = dBoundary; }
    else if (tree.side === 'bottom') { cxM = dCorner; cyM = lotDepth - dBoundary; }
    else if (tree.side === 'left') { cxM = dBoundary; cyM = dCorner; }
    else if (tree.side === 'right') { cxM = lotWidth - dBoundary; cyM = dCorner; }
    else if (tree.side === 'interior') { cxM = dCorner; cyM = dBoundary; }
    else return null;

    const cx = lotX + cxM * scaleX;
    const cy = lotY + cyM * scaleY;
    const tpzPx = tpz * Math.min(scaleX, scaleY);
    const srzPx = srz * Math.min(scaleX, scaleY);

    const protected_ = tree.councilProtected === 'yes' || tree.significantTree === 'yes';
    const willRemove = tree.decision === 'remove';

    return (
      <g key={tree.id || idx} style={{ pointerEvents: 'none' }}>
        {/* TPZ circle */}
        <circle cx={cx} cy={cy} r={tpzPx}
          fill={willRemove ? 'rgba(199, 67, 67, 0.08)' : 'rgba(90, 130, 84, 0.12)'}
          stroke={willRemove ? '#c74343' : '#5a8254'}
          strokeWidth="1" strokeDasharray="3,3" />
        {/* SRZ circle */}
        <circle cx={cx} cy={cy} r={srzPx}
          fill="none"
          stroke={willRemove ? '#c74343' : '#5a8254'}
          strokeWidth="1.5" strokeDasharray="6,2" opacity="0.7" />
        {/* Trunk */}
        <circle cx={cx} cy={cy} r={4}
          fill={willRemove ? '#c74343' : '#5a8254'}
          stroke="white" strokeWidth="1.5" />
        {/* Label */}
        <text x={cx} y={cy - tpzPx - 4} textAnchor="middle"
          fontFamily="IBM Plex Sans" fontSize="9" fontWeight="600"
          fill={willRemove ? '#c74343' : '#5a8254'} letterSpacing="0.5">
          T{idx + 1} · TPZ {tpz.toFixed(1)}m{protected_ ? ' · PROTECTED' : ''}
        </text>
      </g>
    );
  }).filter(Boolean);
}

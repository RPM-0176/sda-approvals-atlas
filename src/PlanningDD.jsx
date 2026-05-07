import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Circle, Copy, Download, FileText, Mail, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';

// ============================================================================
// PLANNING DD STRUCTURE
// ============================================================================

export const DD_DEFAULTS = {
  flooding: { status: 'unknown', notes: '' },
  overlays: { status: 'unknown', list: '', notes: '' },
  setbacksConfirmed: { status: 'unknown', notes: '' },
  siteCoverage: { maxAllowed: '', proposedFootprint: '', fits: 'unknown', notes: '' },
  yardRequirements: { status: 'unknown', notes: '' },
  waterMain: { location: 'unknown', notes: '' },
  sewerMain: { location: 'unknown', notes: '' },
  lpod: { location: 'unknown', notes: '' },
  power: { status: 'unknown', notes: '' },
  nbn: { status: 'unknown', notes: '' },
  landFall: { direction: 'unknown', metres: '', notes: '' },
  retainingWalls: { required: 'unknown', sides: '', notes: '' },
  trees: { onSite: 'unknown', arboristRequired: 'unknown', notes: '' },
  easements: { exists: 'unknown', type: '', location: '', notes: '' },
  contamination: { status: 'unknown', notes: '' },
  accessAndCrossover: { status: 'unknown', notes: '' },
  plannerOpinion: '',
  actionItems: [],
  plannerName: '',
  plannerDate: '',
};

const DD_FIELD_OPTIONS = {
  flooding: [
    { value: 'unknown', label: 'Not yet assessed' },
    { value: 'none', label: 'No flooding issues' },
    { value: 'minor', label: 'Minor — manageable' },
    { value: 'major', label: 'Major flooding concern — pathway risk' },
  ],
  overlays: [
    { value: 'unknown', label: 'Not yet assessed' },
    { value: 'none', label: 'No prohibitive overlays' },
    { value: 'minor', label: 'Some overlays but workable' },
    { value: 'major', label: 'Prohibitive overlays — pathway risk' },
  ],
  yesNoUnknown: [
    { value: 'unknown', label: 'Not yet assessed' },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ],
  passFail: [
    { value: 'unknown', label: 'Not yet assessed' },
    { value: 'pass', label: 'Met / OK' },
    { value: 'marginal', label: 'Marginal — needs review' },
    { value: 'fail', label: 'Not met — issue' },
  ],
  fits: [
    { value: 'unknown', label: 'Not yet assessed' },
    { value: 'yes', label: 'Yes — building fits within envelope' },
    { value: 'tight', label: 'Tight but workable' },
    { value: 'no', label: 'No — building too large for envelope' },
  ],
  utilityLocation: [
    { value: 'unknown', label: 'Not yet confirmed' },
    { value: 'this-side', label: 'This side of road' },
    { value: 'other-side', label: 'Other side of road (extension required)' },
    { value: 'in-property', label: 'Already in property' },
    { value: 'not-available', label: 'Not available — needs extension' },
  ],
  lpodLocation: [
    { value: 'unknown', label: 'Not yet confirmed' },
    { value: 'kerb-front', label: 'Kerb at front of property' },
    { value: 'kerb-side', label: 'Kerb at side of property' },
    { value: 'rear', label: 'Rear of property' },
    { value: 'easement', label: 'Via easement' },
    { value: 'none', label: 'No LPOD — pump-out required' },
  ],
  fallDirection: [
    { value: 'unknown', label: 'Not yet measured' },
    { value: 'flat', label: 'Flat — no significant fall' },
    { value: 'front-back', label: 'Front to back' },
    { value: 'back-front', label: 'Back to front' },
    { value: 'left-right', label: 'Left to right' },
    { value: 'right-left', label: 'Right to left' },
    { value: 'cross', label: 'Cross-fall (corner-to-corner)' },
  ],
};

// ============================================================================
// HELPERS
// ============================================================================

const ddStatusColour = (val) => {
  if (val === 'none' || val === 'pass' || val === 'no' || val === 'yes' || val === 'this-side' || val === 'in-property' || val === 'kerb-front' || val === 'kerb-side' || val === 'flat') return 'positive';
  if (val === 'minor' || val === 'marginal' || val === 'tight' || val === 'other-side') return 'warning';
  if (val === 'major' || val === 'fail' || val === 'not-available' || val === 'none-lpod') return 'issue';
  return 'neutral';
};

const ddCompleteness = (dd) => {
  if (!dd) return { pct: 0, complete: 0, total: 0 };
  const fields = [
    dd.flooding?.status,
    dd.overlays?.status,
    dd.setbacksConfirmed?.status,
    dd.siteCoverage?.fits,
    dd.yardRequirements?.status,
    dd.waterMain?.location,
    dd.sewerMain?.location,
    dd.lpod?.location,
    dd.power?.status,
    dd.nbn?.status,
    dd.landFall?.direction,
    dd.retainingWalls?.required,
    dd.trees?.onSite,
    dd.easements?.exists,
    dd.contamination?.status,
    dd.accessAndCrossover?.status,
  ];
  const done = fields.filter(f => f && f !== 'unknown').length;
  return { pct: Math.round((done / fields.length) * 100), complete: done, total: fields.length };
};

// ============================================================================
// PLANNING DD TAB
// ============================================================================

export function PlanningDDTab({ project, updateProject }) {
  const dd = project.planningDD || DD_DEFAULTS;
  const [showBrief, setShowBrief] = useState(false);
  const [openSections, setOpenSections] = useState({
    eligibility: true,
    services: true,
    site: true,
    findings: true,
  });

  const updateDD = (path, value) => {
    const newDD = JSON.parse(JSON.stringify(dd));
    const keys = path.split('.');
    let target = newDD;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    updateProject({ planningDD: newDD });
  };

  const addActionItem = () => {
    const items = [...(dd.actionItems || []), { text: '', status: 'open', addedAt: new Date().toISOString() }];
    updateDD('actionItems', items);
  };

  const updateActionItem = (idx, updates) => {
    const items = [...(dd.actionItems || [])];
    items[idx] = { ...items[idx], ...updates };
    updateDD('actionItems', items);
  };

  const removeActionItem = (idx) => {
    const items = (dd.actionItems || []).filter((_, i) => i !== idx);
    updateDD('actionItems', items);
  };

  const completeness = ddCompleteness(dd);

  const toggle = (key) => setOpenSections({ ...openSections, [key]: !openSections[key] });

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Planning Due Diligence</h2>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }} className="sans">
            Capture findings from your planner. Cross-checked against state rules automatically.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setShowBrief(true)}>
            <Mail size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Generate Planner Brief
          </button>
          <button className="btn-primary" onClick={() => exportDDReport(project)}>
            <Download size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Export DD Report
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 className="serif" style={{ fontSize: 16, fontWeight: 500, margin: '0 0 4px' }}>DD completeness</h3>
            <p style={{ fontSize: 11, color: '#888', margin: 0 }} className="sans">{completeness.complete} / {completeness.total} items assessed</p>
          </div>
          <div className="mono" style={{ fontSize: 32, fontWeight: 500, color: '#b8763e' }}>{completeness.pct}%</div>
        </div>
        <div style={{ height: 4, background: '#eee' }}>
          <div style={{ height: '100%', width: `${completeness.pct}%`, background: '#b8763e', transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label>Planner name</label>
          <input value={dd.plannerName || ''} onChange={e => updateDD('plannerName', e.target.value)} placeholder="e.g. Jane Smith — ABC Town Planning" />
        </div>
        <div>
          <label>Date of DD</label>
          <input type="date" value={dd.plannerDate || ''} onChange={e => updateDD('plannerDate', e.target.value)} />
        </div>
      </div>

      {/* SECTION 1: Eligibility */}
      <DDSection title="1. Site Eligibility" isOpen={openSections.eligibility} toggle={() => toggle('eligibility')}>
        <DDDropdownField label="Flooding" path="flooding" dd={dd} updateDD={updateDD} options={DD_FIELD_OPTIONS.flooding} />
        <DDDropdownField label="Prohibitive overlays" path="overlays" dd={dd} updateDD={updateDD} options={DD_FIELD_OPTIONS.overlays}
          extraField={{ key: 'list', label: 'Which overlays?', placeholder: 'e.g. Bushfire, Heritage' }} />
        <DDDropdownField label="Setbacks confirmed" path="setbacksConfirmed" dd={dd} updateDD={updateDD} options={DD_FIELD_OPTIONS.passFail} />

        <div style={{ padding: '14px 0', borderBottom: '1px solid #f0eadf' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }} className="sans">Site coverage check</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label>Max allowed (%)</label>
              <input type="number" value={dd.siteCoverage?.maxAllowed || ''} onChange={e => updateDD('siteCoverage.maxAllowed', e.target.value)} placeholder="70" />
            </div>
            <div>
              <label>Proposed footprint (m²)</label>
              <input type="number" value={dd.siteCoverage?.proposedFootprint || ''} onChange={e => updateDD('siteCoverage.proposedFootprint', e.target.value)} placeholder="280" />
            </div>
            <div>
              <label>Fits within envelope?</label>
              <select value={dd.siteCoverage?.fits || 'unknown'} onChange={e => updateDD('siteCoverage.fits', e.target.value)}>
                {DD_FIELD_OPTIONS.fits.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <textarea rows={2} value={dd.siteCoverage?.notes || ''} onChange={e => updateDD('siteCoverage.notes', e.target.value)} placeholder="Notes…" />
        </div>

        <DDDropdownField label="Yard / private open space" path="yardRequirements" dd={dd} updateDD={updateDD} options={DD_FIELD_OPTIONS.passFail} />
      </DDSection>

      {/* SECTION 2: Services */}
      <DDSection title="2. Services & Utilities" isOpen={openSections.services} toggle={() => toggle('services')}>
        <DDDropdownField label="Water main" path="waterMain" dd={dd} updateDD={updateDD} options={DD_FIELD_OPTIONS.utilityLocation} pathSuffix="location" />
        <DDDropdownField label="Sewer main" path="sewerMain" dd={dd} updateDD={updateDD} options={DD_FIELD_OPTIONS.utilityLocation} pathSuffix="location" />
        <DDDropdownField label="LPOD (Legal Point of Discharge)" path="lpod" dd={dd} updateDD={updateDD} options={DD_FIELD_OPTIONS.lpodLocation} pathSuffix="location" />
        <DDDropdownField label="Power" path="power" dd={dd} updateDD={updateDD} options={DD_FIELD_OPTIONS.passFail} />
        <DDDropdownField label="NBN" path="nbn" dd={dd} updateDD={updateDD} options={DD_FIELD_OPTIONS.passFail} />
      </DDSection>

      {/* SECTION 3: Site characteristics */}
      <DDSection title="3. Site Characteristics" isOpen={openSections.site} toggle={() => toggle('site')}>
        <div style={{ padding: '14px 0', borderBottom: '1px solid #f0eadf' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }} className="sans">Land fall</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label>Direction</label>
              <select value={dd.landFall?.direction || 'unknown'} onChange={e => updateDD('landFall.direction', e.target.value)}>
                {DD_FIELD_OPTIONS.fallDirection.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label>Total fall (m)</label>
              <input type="number" step="0.1" value={dd.landFall?.metres || ''} onChange={e => updateDD('landFall.metres', e.target.value)} placeholder="1.0" />
            </div>
          </div>
          <textarea rows={2} value={dd.landFall?.notes || ''} onChange={e => updateDD('landFall.notes', e.target.value)} placeholder="Notes from contour lines / survey…" />
        </div>

        <div style={{ padding: '14px 0', borderBottom: '1px solid #f0eadf' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }} className="sans">Retaining walls required</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label>Required?</label>
              <select value={dd.retainingWalls?.required || 'unknown'} onChange={e => updateDD('retainingWalls.required', e.target.value)}>
                {DD_FIELD_OPTIONS.yesNoUnknown.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label>Which sides?</label>
              <input value={dd.retainingWalls?.sides || ''} onChange={e => updateDD('retainingWalls.sides', e.target.value)} placeholder="e.g. left and rear" />
            </div>
          </div>
          <textarea rows={2} value={dd.retainingWalls?.notes || ''} onChange={e => updateDD('retainingWalls.notes', e.target.value)} placeholder="Approximate height, length…" />
        </div>

        <div style={{ padding: '14px 0', borderBottom: '1px solid #f0eadf' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }} className="sans">Trees & arborist</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label>Existing trees on site?</label>
              <select value={dd.trees?.onSite || 'unknown'} onChange={e => updateDD('trees.onSite', e.target.value)}>
                {DD_FIELD_OPTIONS.yesNoUnknown.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label>Arborist required?</label>
              <select value={dd.trees?.arboristRequired || 'unknown'} onChange={e => updateDD('trees.arboristRequired', e.target.value)}>
                {DD_FIELD_OPTIONS.yesNoUnknown.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <textarea rows={2} value={dd.trees?.notes || ''} onChange={e => updateDD('trees.notes', e.target.value)} placeholder="Tree species, location, removal permit needed…" />
        </div>

        <div style={{ padding: '14px 0', borderBottom: '1px solid #f0eadf' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }} className="sans">Easements</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label>Easement on lot?</label>
              <select value={dd.easements?.exists || 'unknown'} onChange={e => updateDD('easements.exists', e.target.value)}>
                {DD_FIELD_OPTIONS.yesNoUnknown.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label>Type</label>
              <input value={dd.easements?.type || ''} onChange={e => updateDD('easements.type', e.target.value)} placeholder="e.g. drainage, sewer" />
            </div>
            <div>
              <label>Location</label>
              <input value={dd.easements?.location || ''} onChange={e => updateDD('easements.location', e.target.value)} placeholder="e.g. rear, 2m wide" />
            </div>
          </div>
          <textarea rows={2} value={dd.easements?.notes || ''} onChange={e => updateDD('easements.notes', e.target.value)} placeholder="Investigation needed?…" />
        </div>

        <DDDropdownField label="Contamination history" path="contamination" dd={dd} updateDD={updateDD} options={DD_FIELD_OPTIONS.passFail} />
        <DDDropdownField label="Vehicle access / crossover" path="accessAndCrossover" dd={dd} updateDD={updateDD} options={DD_FIELD_OPTIONS.passFail} />
      </DDSection>

      {/* SECTION 4: Findings */}
      <DDSection title="4. Planner's Opinion & Action Items" isOpen={openSections.findings} toggle={() => toggle('findings')}>
        <div style={{ padding: '14px 0', borderBottom: '1px solid #f0eadf' }}>
          <label>Planner's overall opinion / summary</label>
          <textarea rows={5} value={dd.plannerOpinion || ''} onChange={e => updateDD('plannerOpinion', e.target.value)}
            placeholder="e.g. Site is suitable for proposed 2-resident SDA dwelling. Setbacks workable with minor design adjustments. Concerns about LPOD location require further investigation…" />
        </div>

        <div style={{ padding: '14px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }} className="sans">Action items / further investigations</div>
            <button className="btn-ghost" onClick={addActionItem}>+ Add item</button>
          </div>
          {(dd.actionItems || []).length === 0 ? (
            <div style={{ padding: 16, background: '#f5f1ea', fontSize: 12, color: '#888', textAlign: 'center' }} className="sans">No action items yet</div>
          ) : (
            (dd.actionItems || []).map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 8, padding: 8, marginBottom: 6, background: '#f5f1ea', alignItems: 'center' }}>
                <select value={item.status} onChange={e => updateActionItem(idx, { status: e.target.value })} style={{ width: 'auto' }}>
                  <option value="open">Open</option>
                  <option value="in-progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <input value={item.text} onChange={e => updateActionItem(idx, { text: e.target.value })} placeholder="e.g. Engage arborist to assess Eucalyptus at front of lot" />
                <span style={{ fontSize: 10, color: '#888' }} className="sans">{item.addedAt ? new Date(item.addedAt).toLocaleDateString('en-AU') : ''}</span>
                <button onClick={() => removeActionItem(idx)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#999' }}>×</button>
              </div>
            ))
          )}
        </div>
      </DDSection>

      {showBrief && <BriefModal project={project} onClose={() => setShowBrief(false)} />}
    </div>
  );
}

function DDSection({ title, isOpen, toggle, children }) {
  return (
    <div className="card" style={{ marginBottom: 16, padding: 0 }}>
      <button onClick={toggle} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 24px', background: 'transparent', border: 'none', cursor: 'pointer',
        fontFamily: 'Fraunces, Georgia, serif', fontSize: 18, fontWeight: 500, textAlign: 'left',
      }}>
        <span>{title}</span>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRightIcon size={18} />}
      </button>
      {isOpen && <div style={{ padding: '0 24px 20px' }}>{children}</div>}
    </div>
  );
}

function DDDropdownField({ label, path, dd, updateDD, options, pathSuffix, extraField }) {
  const statusKey = pathSuffix || 'status';
  const value = dd[path]?.[statusKey] || 'unknown';
  const colour = ddStatusColour(value);
  const colourMap = {
    positive: '#5a8254',
    warning: '#d49435',
    issue: '#c74343',
    neutral: '#888',
  };

  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid #f0eadf' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: colourMap[colour] }} />
        <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }} className="sans">{label}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: extraField ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 8 }}>
        <select value={value} onChange={e => updateDD(`${path}.${statusKey}`, e.target.value)}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {extraField && (
          <input value={dd[path]?.[extraField.key] || ''}
            onChange={e => updateDD(`${path}.${extraField.key}`, e.target.value)}
            placeholder={extraField.placeholder} />
        )}
      </div>
      <textarea rows={2} value={dd[path]?.notes || ''} onChange={e => updateDD(`${path}.notes`, e.target.value)} placeholder="Notes…" />
    </div>
  );
}

// ============================================================================
// BRIEF GENERATOR
// ============================================================================

function BriefModal({ project, onClose }) {
  const briefText = generateBrief(project);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(briefText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = briefText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const mailto = `mailto:?subject=${encodeURIComponent(`Planning DD request — ${project.name}`)}&body=${encodeURIComponent(briefText)}`;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{ background: 'white', maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 32 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 className="serif" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px' }}>Planner brief</h2>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }} className="sans">Copy and paste this into an email or messaging app to your planner.</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 24, color: '#999' }}>×</button>
        </div>

        <textarea readOnly value={briefText} rows={20} style={{ width: '100%', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, lineHeight: 1.5 }} />

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <a href={mailto} className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            <Mail size={13} style={{ marginRight: 6 }} /> Open in Email
          </a>
          <button className="btn-primary" onClick={handleCopy}>
            <Copy size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

function generateBrief(project) {
  const projType = project.projectType;
  const projTypeLabel = {
    '2-resident': '2 participants + OOA (single house)',
    '3-resident': '3 participants + OOA (single house)',
    'duplex': '2-house duplex (2 lots, 2 participants + OOA per house)',
  }[projType] || projType;

  const lotInfo = project.lots.map((lot, idx) => {
    return `  ${lot.label}: ${lot.address || 'address TBC'} — ${lot.lotSize || '?'}m² — Zone: ${lot.zone || 'TBC'}${lot.isCorner ? ' — CORNER BLOCK' : ''}`;
  }).join('\n');

  const subdivLine = projType === 'duplex'
    ? `Subdivision status: ${project.subdivisionStatus === 'titled' ? 'Already subdivided / titled' : project.subdivisionStatus === 'approved' ? 'Approved, awaiting registration' : `Proposed (parent lot ${project.parentLotSize || '?'}m²)`}`
    : '';

  return `Hi,

Could you do a planning DD for the following site, please?

PROJECT: ${project.name}
TYPE: ${projTypeLabel}
SDA CATEGORY: ${project.sdaCategory}
BUILDING CLASS: ${project.buildingClass}
STATE: ${project.state}

LOT DETAILS:
${lotInfo}
${subdivLine ? '\n' + subdivLine : ''}

I need you to confirm the following for ${project.lots.length > 1 ? 'each lot' : 'the lot'}:

1. SITE ELIGIBILITY
   - Flooding status (any flooding overlays or known flooding)
   - Any prohibitive overlays (bushfire, heritage, environmental, coastal etc.)
   - Confirmed setbacks (front, side, rear, secondary if corner)
   - Maximum site coverage allowed (%)
   - Whether a ${projType === 'duplex' ? '2P + OOA' : projType === '3-resident' ? '3P + OOA' : '2P + OOA'} house footprint can fit within the buildable envelope
   - Yard / private open space requirements — can these be met?

2. SERVICES & UTILITIES
   - Water main: which side of the road?
   - Sewer main: which side of the road?
   - LPOD (Legal Point of Discharge) location
   - Power: available / extension required?
   - NBN: available?

3. SITE CHARACTERISTICS
   - Direction and amount of fall on the land (per contour lines)
   - Whether retaining walls will be needed and on which sides
   - Existing trees on site — is an arborist needed?
   - Any easements on the lot — type, location, width
   - Contamination history concerns
   - Vehicle access / crossover requirements

4. YOUR OPINION
   - Is the site workable for the proposed development?
   - Any concerns or further investigations needed before we proceed?
   - Any action items (arborist, surveyor, geotech, etc.)

Once you've completed the DD, I'll enter your findings into our planning portal.

Thanks!`;
}

// ============================================================================
// EXPORT DD REPORT
// ============================================================================

function exportDDReport(project) {
  const dd = project.planningDD || DD_DEFAULTS;
  const projTypeLabel = {
    '2-resident': '2 participants + OOA',
    '3-resident': '3 participants + OOA',
    'duplex': 'Duplex (2 houses)',
  }[project.projectType] || project.projectType;

  const fmtStatus = (val, options) => {
    const opt = options.find(o => o.value === val);
    return opt ? opt.label : val || 'Not assessed';
  };

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${project.name} — Planning DD Report</title>
<style>
@page { size: A4; margin: 18mm; }
body { font-family: Georgia, 'Times New Roman', serif; max-width: 820px; margin: 0 auto; padding: 32px; color: #1a1a1a; line-height: 1.55; }
h1 { font-size: 28px; border-bottom: 3px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 4px; font-weight: 500; }
h2 { font-size: 17px; margin-top: 28px; color: #2a2a2a; border-bottom: 1px solid #999; padding-bottom: 5px; font-weight: 500; }
.meta { color: #666; font-size: 12px; margin-bottom: 16px; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 12px 0; padding: 14px; background: #f5f1ea; border-left: 3px solid #b8763e; }
.meta-grid div { font-size: 12px; }
.meta-grid strong { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 2px; }
.dd-row { display: grid; grid-template-columns: 200px 1fr; gap: 12px; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 12px; }
.dd-row strong { color: #555; }
.dd-row .notes { color: #666; font-style: italic; margin-top: 2px; font-size: 11px; }
.status-positive { color: #2d6826; font-weight: 600; }
.status-warning { color: #a16a1c; font-weight: 600; }
.status-issue { color: #a82828; font-weight: 600; }
.status-neutral { color: #888; }
.opinion { padding: 14px; background: #fffbf5; border-left: 3px solid #b8763e; font-size: 12px; white-space: pre-wrap; margin: 8px 0; }
.action-item { padding: 8px 12px; background: #f5f1ea; margin-bottom: 4px; font-size: 12px; display: grid; grid-template-columns: auto 1fr; gap: 12px; }
.footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #ccc; font-size: 10px; color: #888; }
</style></head><body>

<h1>Planning Due Diligence Report</h1>
<div class="meta">${project.name} · Generated ${new Date().toLocaleDateString('en-AU')}</div>

<div class="meta-grid">
<div><strong>Project</strong>${project.name}</div>
<div><strong>Type</strong>${projTypeLabel}</div>
<div><strong>State</strong>${project.state}</div>
<div><strong>SDA Category</strong>${project.sdaCategory}</div>
<div><strong>Planner</strong>${dd.plannerName || 'Not specified'}</div>
<div><strong>Date</strong>${dd.plannerDate || 'Not specified'}</div>
</div>

<h2>Lot Information</h2>
${project.lots.map(lot => `
<div style="margin-bottom: 12px; padding: 10px; background: #f5f1ea;">
<strong>${lot.label}</strong> — ${lot.address || 'No address'}<br>
<span style="font-size: 11px; color: #666;">Zone: ${lot.zone || '—'} · Size: ${lot.lotSize ? lot.lotSize + 'm²' : '—'} · ${lot.isCorner ? 'Corner block' : 'Standard block'}</span>
</div>
`).join('')}

<h2>1. Site Eligibility</h2>
<div class="dd-row"><strong>Flooding</strong><div><span class="status-${ddStatusColour(dd.flooding?.status)}">${fmtStatus(dd.flooding?.status, DD_FIELD_OPTIONS.flooding)}</span>${dd.flooding?.notes ? `<div class="notes">${dd.flooding.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>Prohibitive overlays</strong><div><span class="status-${ddStatusColour(dd.overlays?.status)}">${fmtStatus(dd.overlays?.status, DD_FIELD_OPTIONS.overlays)}</span>${dd.overlays?.list ? `<div class="notes">Overlays: ${dd.overlays.list}</div>` : ''}${dd.overlays?.notes ? `<div class="notes">${dd.overlays.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>Setbacks confirmed</strong><div><span class="status-${ddStatusColour(dd.setbacksConfirmed?.status)}">${fmtStatus(dd.setbacksConfirmed?.status, DD_FIELD_OPTIONS.passFail)}</span>${dd.setbacksConfirmed?.notes ? `<div class="notes">${dd.setbacksConfirmed.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>Site coverage check</strong><div>Max allowed: ${dd.siteCoverage?.maxAllowed || '—'}% · Proposed footprint: ${dd.siteCoverage?.proposedFootprint || '—'}m²<br><span class="status-${ddStatusColour(dd.siteCoverage?.fits)}">${fmtStatus(dd.siteCoverage?.fits, DD_FIELD_OPTIONS.fits)}</span>${dd.siteCoverage?.notes ? `<div class="notes">${dd.siteCoverage.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>Yard / open space</strong><div><span class="status-${ddStatusColour(dd.yardRequirements?.status)}">${fmtStatus(dd.yardRequirements?.status, DD_FIELD_OPTIONS.passFail)}</span>${dd.yardRequirements?.notes ? `<div class="notes">${dd.yardRequirements.notes}</div>` : ''}</div></div>

<h2>2. Services & Utilities</h2>
<div class="dd-row"><strong>Water main</strong><div><span class="status-${ddStatusColour(dd.waterMain?.location)}">${fmtStatus(dd.waterMain?.location, DD_FIELD_OPTIONS.utilityLocation)}</span>${dd.waterMain?.notes ? `<div class="notes">${dd.waterMain.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>Sewer main</strong><div><span class="status-${ddStatusColour(dd.sewerMain?.location)}">${fmtStatus(dd.sewerMain?.location, DD_FIELD_OPTIONS.utilityLocation)}</span>${dd.sewerMain?.notes ? `<div class="notes">${dd.sewerMain.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>LPOD</strong><div><span class="status-${ddStatusColour(dd.lpod?.location)}">${fmtStatus(dd.lpod?.location, DD_FIELD_OPTIONS.lpodLocation)}</span>${dd.lpod?.notes ? `<div class="notes">${dd.lpod.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>Power</strong><div><span class="status-${ddStatusColour(dd.power?.status)}">${fmtStatus(dd.power?.status, DD_FIELD_OPTIONS.passFail)}</span>${dd.power?.notes ? `<div class="notes">${dd.power.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>NBN</strong><div><span class="status-${ddStatusColour(dd.nbn?.status)}">${fmtStatus(dd.nbn?.status, DD_FIELD_OPTIONS.passFail)}</span>${dd.nbn?.notes ? `<div class="notes">${dd.nbn.notes}</div>` : ''}</div></div>

<h2>3. Site Characteristics</h2>
<div class="dd-row"><strong>Land fall</strong><div><span class="status-${ddStatusColour(dd.landFall?.direction)}">${fmtStatus(dd.landFall?.direction, DD_FIELD_OPTIONS.fallDirection)}</span>${dd.landFall?.metres ? ` · ${dd.landFall.metres}m total` : ''}${dd.landFall?.notes ? `<div class="notes">${dd.landFall.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>Retaining walls</strong><div>${dd.retainingWalls?.required === 'yes' ? `<span class="status-warning">Required</span>${dd.retainingWalls.sides ? ` (${dd.retainingWalls.sides})` : ''}` : dd.retainingWalls?.required === 'no' ? '<span class="status-positive">Not required</span>' : '<span class="status-neutral">Not yet assessed</span>'}${dd.retainingWalls?.notes ? `<div class="notes">${dd.retainingWalls.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>Trees / arborist</strong><div>Trees on site: ${dd.trees?.onSite || 'Unknown'} · Arborist required: ${dd.trees?.arboristRequired || 'Unknown'}${dd.trees?.notes ? `<div class="notes">${dd.trees.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>Easements</strong><div>${dd.easements?.exists === 'yes' ? `<span class="status-warning">Yes</span>${dd.easements.type ? ` — ${dd.easements.type}` : ''}${dd.easements.location ? ` (${dd.easements.location})` : ''}` : dd.easements?.exists === 'no' ? '<span class="status-positive">None</span>' : '<span class="status-neutral">Not yet assessed</span>'}${dd.easements?.notes ? `<div class="notes">${dd.easements.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>Contamination</strong><div><span class="status-${ddStatusColour(dd.contamination?.status)}">${fmtStatus(dd.contamination?.status, DD_FIELD_OPTIONS.passFail)}</span>${dd.contamination?.notes ? `<div class="notes">${dd.contamination.notes}</div>` : ''}</div></div>
<div class="dd-row"><strong>Access / crossover</strong><div><span class="status-${ddStatusColour(dd.accessAndCrossover?.status)}">${fmtStatus(dd.accessAndCrossover?.status, DD_FIELD_OPTIONS.passFail)}</span>${dd.accessAndCrossover?.notes ? `<div class="notes">${dd.accessAndCrossover.notes}</div>` : ''}</div></div>

${dd.plannerOpinion ? `<h2>Planner's Opinion</h2><div class="opinion">${dd.plannerOpinion}</div>` : ''}

${(dd.actionItems || []).length > 0 ? `
<h2>Action Items</h2>
${dd.actionItems.map(item => `<div class="action-item"><strong style="text-transform: uppercase; font-size: 9px; letter-spacing: 1.5px; color: ${item.status === 'resolved' ? '#5a8254' : item.status === 'in-progress' ? '#d49435' : '#c74343'};">${item.status}</strong><span>${item.text}</span></div>`).join('')}
` : ''}

<div class="footer">
This DD report is a record of findings from your planner. Always verify against current legislation and the council's planning scheme. The information here does not replace formal council pre-lodgement advice.
</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_Planning_DD_Report.html`;
  a.click();
  URL.revokeObjectURL(url);
}

import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Search, FileText, Download, ChevronDown, ChevronRight,
  ExternalLink, BookOpen, Filter
} from 'lucide-react';
import sdaStandard from './sda-design-standard.json';
// PDF hosting + deep-link helper
const PDF_RAW_URL = 'https://cdn.jsdelivr.net/gh/RPM-0176/sda-approvals-atlas@main/sda-design-standard.pdf';
const pdfViewerUrl = (page) =>
  `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(PDF_RAW_URL)}${page ? `#page=${page}` : ''}`;

// Inline "Jump to PDF →" button shown next to each section heading
const JumpToPdfButton = ({ page, onJump }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onJump(page); }}
    title={`Open PDF at page ${page}`}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 10px',
      marginLeft: 12,
      background: 'transparent',
      color: '#b8763e',
      border: '1px solid #b8763e',
      borderRadius: 4,
      fontFamily: "'IBM Plex Sans', sans-serif",
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = '#b8763e'; e.currentTarget.style.color = '#fff'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#b8763e'; }}
  >
    <ExternalLink size={11} /> Jump to PDF p.{page}
  </button>
);
// Category metadata — matches the icons used in the SDA Design Standard
const CATEGORIES = {
  IL: { label: 'Improved Liveability', short: 'IL', color: '#d9488a' },
  R:  { label: 'Robust',                short: 'R',  color: '#e07a3c' },
  FA: { label: 'Fully Accessible',      short: 'FA', color: '#2c8db8' },
  HPS:{ label: 'High Physical Support', short: 'HPS',color: '#5fa84a' },
};

// External resources (the existing list — kept here so Resources hub is one source of truth)
const EXTERNAL_LINKS = [
  {
    title: 'NDIS SDA Design Standard (NDIS.gov.au)',
    url: 'https://www.ndis.gov.au/providers/housing-and-living-supports-and-services/housing/specialist-disability-accommodation/sda-design-standard',
    desc: 'Official NDIS SDA Design Standard page'
  },
  {
    title: 'AS 1428.1 — Design for access and mobility',
    url: 'https://store.standards.org.au/product/as-1428-1-2009',
    desc: 'Australian Standard for general accessibility requirements'
  },
  {
    title: 'AS 4970 — Tree protection on development sites',
    url: 'https://store.standards.org.au/product/as-4970-2009',
    desc: 'Standard for TPZ and SRZ calculations'
  },
  {
    title: 'NCC (National Construction Code)',
    url: 'https://ncc.abcb.gov.au/',
    desc: 'Australian Building Codes Board — current edition'
  },
];

// Flatten all clauses into a search index, with section context attached
const buildSearchIndex = () => {
  const items = [];
  sdaStandard.sections.forEach(section => {
    section.clauses.forEach(clause => {
      items.push({
        sectionId: section.id,
        sectionTitle: section.title,
        sectionPage: section.page,
        sectionSummary: section.summary,
        clauseId: clause.id,
        categories: clause.categories,
        requirement: clause.requirement,
        rationale: clause.rationale || '',
        searchText: [
          section.title,
          section.summary,
          clause.id,
          clause.requirement,
          clause.rationale || ''
        ].join(' ').toLowerCase()
      });
    });
  });
  return items;
};

// Category pill — coloured tag for design category
const CategoryPill = ({ category, size = 'sm', isPriority = false }) => {
  const meta = CATEGORIES[category];
  if (!meta) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        backgroundColor: isPriority ? meta.color : `${meta.color}1f`,
        color: isPriority ? '#fff' : meta.color,
        border: `1px solid ${meta.color}${isPriority ? '' : '55'}`,
        borderRadius: 4,
        marginRight: 4,
      }}
      title={meta.label}
    >
      {meta.short}
    </span>
  );
};

// Highlight matching text in search results
const highlightText = (text, query) => {
  if (!query || !text) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ backgroundColor: '#f5d7a8', color: '#1a1a1a', padding: '0 2px', borderRadius: 2 }}>{part}</mark>
      : part
  );
};

// Single section card — collapsible, shows all clauses when open
const SectionCard = ({ section, query, expanded, onToggle, projectCategory,onJumpToPdf }) => {
  // For sorting: does this section have any clauses matching the project's category?
  const hasProjectCategory = projectCategory
    ? section.clauses.some(c => c.categories.includes(projectCategory))
    : false;

  return (
    <div style={{
      backgroundColor: '#fff',
      border: '1px solid #e5dfd3',
      borderRadius: 8,
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        {expanded
          ? <ChevronDown size={18} color="#666" style={{ flexShrink: 0 }} />
          : <ChevronRight size={18} color="#666" style={{ flexShrink: 0 }} />
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              color: '#b8763e',
              fontWeight: 600,
            }}>
              {section.id === 'AppA' ? 'App. A' : `Section ${section.id}`}
            </span>
            <h3 style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 18,
              fontWeight: 500,
              color: '#1a1a1a',
              margin: 0,
            }}>
              {highlightText(section.title, query)}
            </h3>
            <span style={{ fontSize: 11, color: '#999', fontFamily: 'IBM Plex Mono, monospace' }}>
              p. {section.page}
            </span>
            <JumpToPdfButton page={section.page} onJump={onJumpToPdf} />
            {hasProjectCategory && (
              <span style={{
                fontSize: 10,
                color: '#b8763e',
                fontFamily: 'IBM Plex Mono, monospace',
                backgroundColor: '#fef3e2',
                padding: '2px 6px',
                borderRadius: 3,
                fontWeight: 600,
              }}>
                ★ relevant
              </span>
            )}
          </div>
          <p style={{
            fontSize: 13,
            color: '#666',
            margin: 0,
            lineHeight: 1.5,
          }}>
            {highlightText(section.summary, query)}
          </p>
        </div>
      </button>

      {expanded && (
        <div style={{
          padding: '4px 18px 18px 44px',
          borderTop: '1px solid #f0ebe0',
        }}>
          {section.clauses.map(clause => {
            const isProjectMatch = projectCategory && clause.categories.includes(projectCategory);
            return (
              <div
                key={clause.id}
                style={{
                  padding: '14px 0',
                  borderBottom: '1px dashed #f0ebe0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 12,
                    color: '#1a1a1a',
                    fontWeight: 600,
                    backgroundColor: '#f5f1ea',
                    padding: '2px 8px',
                    borderRadius: 3,
                  }}>
                    {clause.id}
                  </span>
                  <div>
                    {clause.categories.map(c => (
                      <CategoryPill
                        key={c}
                        category={c}
                        isPriority={projectCategory === c}
                      />
                    ))}
                  </div>
                </div>
                <p style={{
                  fontSize: 14,
                  color: '#1a1a1a',
                  lineHeight: 1.6,
                  margin: '0 0 6px 0',
                }}>
                  {highlightText(clause.requirement, query)}
                </p>
                {clause.rationale && (
                  <p style={{
                    fontSize: 13,
                    color: '#666',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                    margin: 0,
                    paddingLeft: 12,
                    borderLeft: '2px solid #e5dfd3',
                  }}>
                    {highlightText(clause.rationale, query)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Main Resources component — opened as a fullscreen overlay
export default function Resources({ onClose, projectCategory = null, projectName = null }) {
  const [view, setView] = useState('standard'); // 'standard' | 'pdf' | 'links'
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(projectCategory || 'all');
  const [expandedSections, setExpandedSections] = useState(new Set());
const [pdfPage, setPdfPage] = useState(null);
const handleJumpToPdf = (page) => { setPdfPage(page); setView('pdf'); };
  
  // Auto-expand sections that match the search query
  useEffect(() => {
    if (!query) return;
    const q = query.toLowerCase();
    const newExpanded = new Set(expandedSections);
    sdaStandard.sections.forEach(section => {
      const matches =
        section.title.toLowerCase().includes(q) ||
        section.summary.toLowerCase().includes(q) ||
        section.clauses.some(c =>
          c.requirement.toLowerCase().includes(q) ||
          (c.rationale || '').toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        );
      if (matches) newExpanded.add(section.id);
    });
    setExpandedSections(newExpanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Filter + sort sections
  const filteredSections = useMemo(() => {
    const q = query.toLowerCase().trim();
    let sections = sdaStandard.sections;

    // Filter by search query
    if (q) {
      sections = sections.filter(s => {
        if (s.title.toLowerCase().includes(q)) return true;
        if (s.summary.toLowerCase().includes(q)) return true;
        return s.clauses.some(c =>
          c.requirement.toLowerCase().includes(q) ||
          (c.rationale || '').toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        );
      });
    }

    // Filter by category
    if (activeFilter !== 'all') {
      sections = sections
        .map(s => ({
          ...s,
          clauses: s.clauses.filter(c => c.categories.includes(activeFilter))
        }))
        .filter(s => s.clauses.length > 0);
    }

    // Sort by project category relevance (relevant sections first)
    if (projectCategory) {
      sections = [...sections].sort((a, b) => {
        const aRelevant = a.clauses.some(c => c.categories.includes(projectCategory));
        const bRelevant = b.clauses.some(c => c.categories.includes(projectCategory));
        if (aRelevant && !bRelevant) return -1;
        if (!aRelevant && bRelevant) return 1;
        return 0;
      });
    }

    return sections;
  }, [query, activeFilter, projectCategory]);

  const toggleSection = (id) => {
    const next = new Set(expandedSections);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedSections(next);
  };

  const expandAll = () => setExpandedSections(new Set(sdaStandard.sections.map(s => s.id)));
  const collapseAll = () => setExpandedSections(new Set());

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#f5f1ea',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'IBM Plex Sans, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#1a1a1a',
        color: '#f5f1ea',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        borderBottom: '1px solid #2a2a2a',
      }}>
        <BookOpen size={22} />
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 22,
            fontWeight: 500,
            margin: 0,
            letterSpacing: '-0.01em',
          }}>
            Resources
          </h1>
          {projectName && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
              Open from: {projectName}
              {projectCategory && (
                <> — sorted for <strong style={{ color: CATEGORIES[projectCategory]?.color }}>
                  {CATEGORIES[projectCategory]?.label}
                </strong></>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #444',
            color: '#f5f1ea',
            padding: '8px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          <X size={16} /> Close
        </button>
      </div>

      {/* View tabs */}
      <div style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #e5dfd3',
        padding: '0 28px',
        display: 'flex',
        gap: 4,
      }}>
        {[
          { id: 'standard', label: 'SDA Design Standard', icon: BookOpen },
          { id: 'pdf', label: 'View Full PDF', icon: FileText },
          { id: 'links', label: 'External Resources', icon: ExternalLink },
        ].map(tab => {
          const Icon = tab.icon;
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                padding: '14px 18px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid #b8763e' : '2px solid transparent',
                color: active ? '#1a1a1a' : '#888',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: -1,
              }}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'standard' && (
          <>
            {/* Search & filter bar */}
            <div style={{
              backgroundColor: '#fff',
              borderBottom: '1px solid #e5dfd3',
              padding: '16px 28px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <Search size={16} style={{
                  position: 'absolute',
                  left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#888',
                }} />
                <input
                  type="text"
                  placeholder="Search the standard… (e.g. kitchen, doorway, bedroom, 7.1.4)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    border: '1px solid #d9d2c2',
                    borderRadius: 6,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    backgroundColor: '#fafafa',
                  }}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    style={{
                      position: 'absolute',
                      right: 8, top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#888',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Filter size={14} color="#888" style={{ marginRight: 4 }} />
                <button
                  onClick={() => setActiveFilter('all')}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid ' + (activeFilter === 'all' ? '#1a1a1a' : '#d9d2c2'),
                    backgroundColor: activeFilter === 'all' ? '#1a1a1a' : '#fff',
                    color: activeFilter === 'all' ? '#fff' : '#1a1a1a',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  All
                </button>
                {Object.entries(CATEGORIES).map(([key, meta]) => {
                  const active = activeFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveFilter(key)}
                      style={{
                        padding: '6px 12px',
                        border: `1px solid ${meta.color}`,
                        backgroundColor: active ? meta.color : '#fff',
                        color: active ? '#fff' : meta.color,
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                      title={meta.label}
                    >
                      {meta.short}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={expandAll} style={miniBtn}>Expand all</button>
                <button onClick={collapseAll} style={miniBtn}>Collapse</button>
              </div>
            </div>

            {/* Result count */}
            <div style={{
              padding: '8px 28px',
              fontSize: 12,
              color: '#888',
              backgroundColor: '#faf7f0',
              borderBottom: '1px solid #f0ebe0',
            }}>
              {filteredSections.length} section{filteredSections.length === 1 ? '' : 's'}
              {query && ` matching "${query}"`}
              {activeFilter !== 'all' && ` in ${CATEGORIES[activeFilter]?.label}`}
              {projectCategory && (
                <> · sorted by relevance to <strong>{CATEGORIES[projectCategory]?.label}</strong></>
              )}
            </div>

            {/* Sections list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
              {filteredSections.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#888',
                }}>
                  <Search size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p>No sections match your search.</p>
                </div>
              ) : (
                filteredSections.map(section => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    query={query}
                    expanded={expandedSections.has(section.id)}
                    onToggle={() => toggleSection(section.id)}
                    projectCategory={projectCategory}
                 onJumpToPdf={handleJumpToPdf} 
                    />
                ))
              )}

              {/* Footer attribution */}
              <div style={{
                marginTop: 24,
                padding: '14px 0',
                fontSize: 11,
                color: '#999',
                borderTop: '1px solid #e5dfd3',
                textAlign: 'center',
              }}>
                Source: NDIS Specialist Disability Accommodation Design Standard,
                Edition 1.1, 25 October 2019. Always verify against the official PDF.
              </div>
            </div>
          </>
        )}

    {view === 'pdf' && (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <div style={{
      padding: '14px 28px',
      backgroundColor: '#fff',
      borderBottom: '1px solid #e5dfd3',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <FileText size={18} color="#666" />
      <div style={{ flex: 1, fontSize: 14 }}>
        <strong>NDIS SDA Design Standard</strong> — Edition 1.1, October 2019
        {pdfPage && (
          <span style={{ marginLeft: 12, color: '#b8763e', fontSize: 13 }}>
            → jumped to page {pdfPage}
          </span>
        )}
      </div>
      
        href={PDF_RAW_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          backgroundColor: '#b8763e',
          color: '#fff',
          borderRadius: 6,
          fontSize: 13,
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        <Download size={14} /> Download PDF
      </a>
    </div>
    <iframe
      key={pdfPage || 'p1'}
      src={pdfViewerUrl(pdfPage)}
      title="NDIS SDA Design Standard"
      style={{
        flex: 1,
        width: '100%',
        border: 'none',
        backgroundColor: '#525659',
      }}
    />
  </div>
)}

        {view === 'links' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            <h2 style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 20,
              fontWeight: 500,
              marginTop: 0,
              marginBottom: 6,
            }}>External Resources</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
              Authoritative external sources referenced in the SDA pathway.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {EXTERNAL_LINKS.map(link => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    padding: '16px 18px',
                    backgroundColor: '#fff',
                    border: '1px solid #e5dfd3',
                    borderRadius: 8,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 12,
                    marginBottom: 4,
                  }}>
                    <h3 style={{
                      fontFamily: 'Fraunces, serif',
                      fontSize: 16,
                      fontWeight: 500,
                      margin: 0,
                      color: '#1a1a1a',
                    }}>{link.title}</h3>
                    <ExternalLink size={14} color="#888" style={{ flexShrink: 0 }} />
                  </div>
                  <p style={{
                    fontSize: 13,
                    color: '#666',
                    margin: 0,
                    lineHeight: 1.5,
                  }}>{link.desc}</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const miniBtn = {
  padding: '6px 10px',
  border: '1px solid #d9d2c2',
  backgroundColor: '#fff',
  color: '#666',
  borderRadius: 4,
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

import React, { useState, useEffect } from 'react';
import { ChevronRight, MapPin, Trash2, Download, AlertCircle, CheckCircle2, Circle, ExternalLink, Building2, Plus, ArrowLeft, DollarSign, Ruler, Home, Wrench, FileCheck, BookOpen, Edit3, RotateCcw, Copy, Edit, Clipboard, TreePine } from 'lucide-react';
import { PlanningDDTab, DD_DEFAULTS } from './PlanningDD.jsx';
import { SubdivisionPlannerSection, ParentLotDiagram, PerLotDiagramWithRoads, LAYOUT_DEFAULTS } from './SubdivisionPlanner.jsx';
import { TreeRegisterTab } from './Trees.jsx';
import { InteractiveParentLot } from './SitePlan.jsx';

// ============================================================================
// STATE-SPECIFIC RULES
// ============================================================================

const STATES = {
  QLD: {
    name: 'Queensland',
    code: 'QLD',
    useTerm: 'Community Residence',
    legalReference: 'Planning Regulation 2017, Schedule 6 + Schedule 24',
    lastAmended: '29 November 2025',
    mapPortal: { name: 'Queensland Globe', url: 'https://qldglobe.information.qld.gov.au/' },
    councilLookups: [
      { name: 'Brisbane City Plan', url: 'https://cityplan.brisbane.qld.gov.au/eplan' },
      { name: 'Gold Coast City Plan', url: 'https://cityplan.goldcoast.qld.gov.au/' },
      { name: 'Sunshine Coast Planning Scheme', url: 'https://www.sunshinecoast.qld.gov.au/development/planning-and-development-tools' },
      { name: 'Logan Planning Scheme', url: 'https://www.logan.qld.gov.au/planning-scheme' },
      { name: 'Ipswich Plan', url: 'https://www.ipswichplanning.com.au/' },
      { name: 'Moreton Bay Planning Scheme', url: 'https://www.moretonbay.qld.gov.au/Services/Building-Development/Planning-Schemes' },
      { name: 'Redland City Plan', url: 'https://www.redland.qld.gov.au/info/20292/planning_scheme' },
      { name: 'Toowoomba Regional Council', url: 'https://www.tr.qld.gov.au/planning-building/planning-scheme' },
      { name: 'Cairns Regional Council', url: 'https://www.cairns.qld.gov.au/' },
      { name: 'Townsville City Council', url: 'https://www.townsville.qld.gov.au/' },
    ],
    fastTrackName: 'Prescribed Accepted Development',
    occupancyCap: 7,
    bedroomCap: 7,
    storeyCap: 2,
    siteCoverage: 70,
    setbacks: { front: 6, secondary: 2, rear: 4, side: 1.5 },
    minSubdivisionLotSize: 400,
    duplexParentLotMin: 800,
    duplexParentLotMinCorner: 800,
    duplexFrontageMin: null,
    duplexDepthMin: null,
    eligibleZones: ['Low Density Residential', 'Low-Medium Density Residential', 'Medium Density Residential', 'High Density Residential', 'Centre zones', 'Community Facilities', 'Mixed Use'],
    disqualifyingOverlays: ['Bushfire Hazard', 'Flood Hazard', 'Coastal Hazard', 'Landslide Hazard', 'Historic Mining Hazard', 'Heritage Overlay', 'Environmental Significance'],
    notes: 'The Planning Amendment Regulation 2025 tightened the rules from 29 November 2025. Class 1 buildings follow QDC/QHC siting rules; Class 2/3 must meet the prescribed setbacks and site coverage to qualify for the streamlined pathway.',
    typicalTimeline: { total: '6-10 weeks to permit (no MCU)' },
    costMultiplier: 1.0,
  },
  NSW: {
    name: 'New South Wales',
    code: 'NSW',
    useTerm: 'Group Home / Boarding House / Seniors Housing',
    legalReference: 'State Environmental Planning Policy (Housing) 2021',
    lastAmended: 'Multiple updates 2023-2024',
    mapPortal: { name: 'NSW Planning Portal', url: 'https://www.planningportal.nsw.gov.au/' },
    councilLookups: [
      { name: 'NSW ePlanning Spatial Viewer', url: 'https://www.planningportal.nsw.gov.au/spatialviewer/' },
      { name: 'City of Sydney', url: 'https://www.cityofsydney.nsw.gov.au/' },
      { name: 'Parramatta', url: 'https://www.cityofparramatta.nsw.gov.au/' },
      { name: 'Blacktown', url: 'https://www.blacktown.nsw.gov.au/' },
      { name: 'Liverpool', url: 'https://www.liverpool.nsw.gov.au/' },
      { name: 'Newcastle', url: 'https://newcastle.nsw.gov.au/' },
      { name: 'Wollongong', url: 'https://www.wollongong.nsw.gov.au/' },
      { name: 'Central Coast', url: 'https://www.centralcoast.nsw.gov.au/' },
      { name: 'Penrith', url: 'https://www.penrithcity.nsw.gov.au/' },
      { name: 'The Hills', url: 'https://www.thehills.nsw.gov.au/' },
    ],
    fastTrackName: 'Complying Development / Exempt Development',
    occupancyCap: 'Varies — typically 6-10 for permanent group homes',
    bedroomCap: 'Per LEP/SEPP',
    storeyCap: 2,
    siteCoverage: 'Per zone (typically 50-60%)',
    setbacks: { front: 4.5, secondary: 2, rear: 3, side: 0.9 },
    minSubdivisionLotSize: 450,
    duplexParentLotMin: 900,
    duplexParentLotMinCorner: 900,
    duplexFrontageMin: null,
    duplexDepthMin: null,
    eligibleZones: ['R1 General Residential', 'R2 Low Density Residential', 'R3 Medium Density Residential', 'R4 High Density Residential', 'B1 Neighbourhood Centre', 'B2 Local Centre', 'B4 Mixed Use'],
    disqualifyingOverlays: ['Bushfire Prone Land (BAL-FZ)', 'Flood Prone Land', 'Coastal Vulnerability', 'Heritage Conservation Area', 'Acid Sulfate Soils', 'Biodiversity'],
    notes: 'NSW treats SDA differently than QLD. Permanent SDA dwellings are typically Group Homes (Permanent) under the Housing SEPP. Class 3 SDA with shared support typically goes through DA.',
    typicalTimeline: { total: 'CDC: 6 weeks; DA: 60-180 days' },
    costMultiplier: 1.15,
  },
  VIC: {
    name: 'Victoria',
    code: 'VIC',
    useTerm: 'Residential Care Facility / Rooming House',
    legalReference: 'Planning and Environment Act 1987 + Victoria Planning Provisions',
    lastAmended: 'Plan for Victoria 2024 reforms ongoing',
    mapPortal: { name: 'Vicplan', url: 'https://mapshare.vic.gov.au/vicplan/' },
    councilLookups: [
      { name: 'Vicplan Property Report', url: 'https://mapshare.vic.gov.au/vicplan/' },
      { name: 'Melbourne CBD', url: 'https://www.melbourne.vic.gov.au/' },
      { name: 'Greater Geelong', url: 'https://www.geelongaustralia.com.au/' },
      { name: 'Casey', url: 'https://www.casey.vic.gov.au/' },
      { name: 'Wyndham', url: 'https://www.wyndham.vic.gov.au/' },
      { name: 'Hume', url: 'https://www.hume.vic.gov.au/' },
      { name: 'Whittlesea', url: 'https://www.whittlesea.vic.gov.au/' },
      { name: 'Brimbank', url: 'https://www.brimbank.vic.gov.au/' },
      { name: 'Monash', url: 'https://www.monash.vic.gov.au/' },
      { name: 'Knox', url: 'https://www.knox.vic.gov.au/' },
    ],
    fastTrackName: 'No Permit Required / VicSmart',
    occupancyCap: 'Per planning provisions',
    bedroomCap: 'Per zone schedule',
    storeyCap: 'Per zone schedule',
    siteCoverage: 'Per zone (typically 60% in GRZ)',
    setbacks: { front: 5, secondary: 2, rear: 3, side: 1 },
    minSubdivisionLotSize: 350,
    duplexParentLotMin: 800,
    duplexParentLotMinCorner: 750,
    duplexFrontageMin: 20,
    duplexDepthMin: 40,
    eligibleZones: ['General Residential Zone (GRZ)', 'Residential Growth Zone (RGZ)', 'Mixed Use Zone (MUZ)', 'Neighbourhood Residential Zone (NRZ)', 'Commercial 1 Zone (C1Z)'],
    disqualifyingOverlays: ['Bushfire Management Overlay (BMO)', 'Land Subject to Inundation Overlay (LSIO)', 'Floodway Overlay (FO)', 'Heritage Overlay (HO)', 'Environmental Significance Overlay (ESO)', 'Erosion Management Overlay'],
    notes: 'Victoria classifies SDA dwellings primarily as Residential Care Facilities under planning law. ResCode (Clauses 54-55) governs siting and design. Note: Victoria has no minimum lot size requirement for SDA dwellings — even subdivided lots under 400m² are acceptable for SDA. Corner block subdivision can produce two ~377m² lots from a 754m² parent.',
    typicalTimeline: { total: 'No permit: 0; VicSmart: 10 days; Full: 60+ days' },
    costMultiplier: 1.05,
  },
};

const SDA_CATEGORIES = {
  'Improved Liveability': {
    description: 'Housing for participants with sensory, intellectual or cognitive impairment.',
    keyFeatures: [
      'Improved physical access provisions',
      'Better wayfinding and visibility',
      'Robust elements where contact is likely',
      'Sound-attenuating elements between key areas',
      'High contrast on key items',
      'Multiple exits for emergency egress',
    ],
    estimatedPremium: 0.15,
    annualSDAFundingRange: '$22,000 – $48,000 per resident',
    typicalParticipants: 'Cognitive, sensory, mental health',
  },
  'Fully Accessible': {
    description: 'Housing for participants with significant physical impairment.',
    keyFeatures: [
      'Step-free pedestrian entry',
      'Wide doorways (min. 850mm clear)',
      'Hobless showers with grab rails',
      'Accessible kitchen with adjustable benches',
      'Reinforced walls for future grab rails',
      'Wider corridors (min. 1000mm)',
      'Accessible parking and approach',
    ],
    estimatedPremium: 0.25,
    annualSDAFundingRange: '$45,000 – $85,000 per resident',
    typicalParticipants: 'Physical disability, wheelchair users',
  },
  'High Physical Support': {
    description: 'Housing for participants with very high support needs.',
    keyFeatures: [
      'All Fully Accessible requirements PLUS:',
      'Structural provisions for ceiling hoists in all bedrooms',
      'Doors min. 950mm clear opening',
      'Power and control cabling above main bedroom and external doors',
      'Backup power for 2-hour outage',
      'Heating, cooling and household communications',
      'Larger bedrooms for overnight carer accommodation',
      'Assistive technology infrastructure',
    ],
    estimatedPremium: 0.45,
    annualSDAFundingRange: '$95,000 – $135,000 per resident',
    typicalParticipants: 'Very high physical support, hoist users',
  },
  'Robust': {
    description: 'Housing for participants with behaviours of concern.',
    keyFeatures: [
      'Reinforced wall linings (impact-resistant)',
      'Heavy duty doors and door hardware',
      'Impact-resistant fixtures and fittings',
      'Acoustic separation between bedrooms',
      'Anti-ligature considerations',
      'Secured outdoor spaces',
      'Tamper-resistant utilities',
      'Bolted-down or heavy furniture provisions',
    ],
    estimatedPremium: 0.35,
    annualSDAFundingRange: '$75,000 – $115,000 per resident',
    typicalParticipants: 'Behaviours of concern, autism, psychosocial',
  },
};

const PROJECT_TYPES = {
  '2-resident': {
    label: '2 Participants + OOA',
    description: '2 resident bedrooms + 1 OOA (Onsite Overnight Accommodation) room',
    residents: 2, ooaRooms: 1, bedrooms: 3, dwellings: 1,
    requiresSubdivision: false,
  },
  '3-resident': {
    label: '3 Participants + OOA',
    description: '3 resident bedrooms + 1 OOA room',
    residents: 3, ooaRooms: 1, bedrooms: 4, dwellings: 1,
    requiresSubdivision: false,
  },
  'duplex': {
    label: 'Duplex — 2 houses on subdivided lots',
    description: 'Two separate houses, each with 2 participants + OOA, on a subdivided block',
    residents: 4, ooaRooms: 2, bedrooms: 6, dwellings: 2,
    requiresSubdivision: true,
  },
};

const BASE_COSTS_PER_SQM = {
  standard: { mid: 3400 },
  class3: { mid: 4200 },
};

const COST_LINE_DEFAULTS = {
  'Site Works & Earthworks': 25000,
  'Sprinkler System (Class 3)': 35000,
  'NDIS SDA Design Standard Compliance': 45000,
  'SDA Assessor Fees': 12000,
  'Council & Building Permit Fees': 8000,
  'Architect & Consultants': 35000,
  'Landscaping & External Works': 25000,
  'Connection Fees (water/sewer/power/NBN)': 18000,
  'Driveway & Parking': 15000,
};

const ROOM_SIZES = {
  bedroom: 14, ensuite: 6, ooaRoom: 12, ooaEnsuite: 5,
  livingDining: 35, kitchen: 18, laundry: 8, corridors: 25, storage: 8,
};

const STEPS_TEMPLATE = {
  QLD: [
    { phase: 'Pre-Purchase Due Diligence', items: [
      'Pull Property Report from council planning portal',
      'Confirm zone is residential, centre, or community facilities',
      'Check Residential Density Overlay',
      'Confirm NO bushfire, flood, coastal, landslide, or mining overlays',
      'Check heritage and environmental overlays',
      'Verify lot allows 70% site cover with required setbacks',
      'Confirm services available (water, sewer, power, NBN)',
      'For duplex: confirm subdivision is registered or feasible',
    ]},
    { phase: 'Design Phase', items: [
      'Engage architect with SDA experience',
      'Confirm SDA category for each dwelling',
      'Decide building class with certifier',
      'Class 3 needs sprinklers, fire-rated construction, accessible egress',
      'Design within 7-bedroom, 2-storey, 7-resident cap (per dwelling)',
      'Engage SDA Assessor for design-stage assessment',
      'Confirm NDIS SDA Design Standard 2024 compliance',
      'Resolve QDC and QHC siting requirements',
      'Energy efficiency 7-star NatHERS rating',
    ]},
    { phase: 'Approvals', items: [
      'No MCU needed if all Schedule 6 boxes ticked (per lot)',
      'For duplex: separate building approval per lot',
      'Lodge building approval through private certifier',
      'Plumbing approval via QBCC-licensed plumber',
      'Building permit issued by certifier',
      'Notify utility providers',
    ]},
    { phase: 'Construction', items: [
      'Build to NCC Class 3 specifications including sprinkler system',
      'Comply with NDIS SDA Design Standard during construction',
      'Document everything for SDA assessment',
      'Mandatory inspections by certifier (footings, frame, lock-up, final)',
      'Plumbing and drainage inspections',
    ]},
    { phase: 'Completion & Enrolment', items: [
      'Final SDA assessment by accredited assessor',
      'Certificate of Classification / Form 16 from certifier',
      'For duplex: each dwelling enrolled separately with NDIA',
      'Apply to NDIA for SDA dwelling enrolment',
      'Set up tenancy management',
      'Tenant the dwelling once enrolled',
    ]},
  ],
  NSW: [
    { phase: 'Pre-Purchase Due Diligence', items: ['Pull s10.7 planning certificate', 'Use NSW Planning Portal Spatial Viewer', 'Confirm zone permits Group Home', 'Check Bushfire Prone Land — BAL-FZ disqualifies CDC', 'Check Flood Prone Land', 'Verify Heritage Conservation Area status', 'Check LEP for height, FSR, and minimum lot size', 'Confirm DCP requirements'] },
    { phase: 'Design Phase', items: ['Engage architect with NSW SDA experience', 'Decide SDA category and building class', 'Design to Housing SEPP for Group Homes', 'Engage SDA Assessor for design-stage assessment', 'Confirm NDIS SDA Design Standard 2024 compliance', 'BASIX certificate required'] },
    { phase: 'Approvals', items: ['Determine pathway: Exempt / CDC / DA', 'If CDC: lodge with private certifier', 'If DA: lodge with council, expect 60-180 days', 'Construction Certificate after DA approval'] },
    { phase: 'Construction', items: ['Build to NCC Class 3 specifications', 'NSW Home Building Compensation Fund cover', 'Mandatory inspections per certifier schedule'] },
    { phase: 'Completion & Enrolment', items: ['Final SDA assessment by accredited assessor', 'Occupation Certificate from certifier', 'Apply to NDIA for SDA dwelling enrolment', 'Tenant the dwelling once enrolled'] },
  ],
  VIC: [
    { phase: 'Pre-Purchase Due Diligence', items: ['Pull free Vicplan property report', 'Confirm zone permits Residential Care Facility', 'Check Bushfire Management Overlay (BMO)', 'Check LSIO, Floodway, Heritage and Environmental overlays', 'Verify zone schedule for site cover, height, setbacks', 'Check ResCode (Clauses 54-55) compliance feasibility'] },
    { phase: 'Design Phase', items: ['Engage architect with VIC SDA experience', 'Decide SDA category and building class', 'Design to ResCode standards', 'Engage SDA Assessor for design-stage assessment', 'Confirm NDIS SDA Design Standard 2024 compliance'] },
    { phase: 'Approvals', items: ['Determine if planning permit required', 'VicSmart pathway may apply (10 days)', 'If full permit: lodge with council, expect 60+ days', 'Building permit from registered building surveyor'] },
    { phase: 'Construction', items: ['Build to NCC Class 3 specifications', 'Domestic Building Insurance required', 'Mandatory inspections per surveyor schedule'] },
    { phase: 'Completion & Enrolment', items: ['Final SDA assessment', 'Occupancy Permit from building surveyor', 'Apply to NDIA for SDA dwelling enrolment', 'Tenant the dwelling once enrolled'] },
  ],
};

// ============================================================================
// HELPERS
// ============================================================================

const buildIssues = (state, lot) => {
  const stateRules = STATES[state];
  const issues = [];
  const warnings = [];
  const positives = [];

  if (lot.zone) {
    const isEligible = stateRules.eligibleZones.some(z =>
      lot.zone.toLowerCase().includes(z.toLowerCase().split(' ')[0])
    );
    if (!isEligible) issues.push(`Zone "${lot.zone}" may not be in the eligible zones list. Verify with planner.`);
    else positives.push(`Zone "${lot.zone}" appears compatible with the streamlined pathway.`);
  }

  if (lot.overlays) {
    stateRules.disqualifyingOverlays.forEach(overlay => {
      const key = overlay.toLowerCase().split(' ')[0];
      if (lot.overlays.toLowerCase().includes(key)) {
        issues.push(`${overlay} appears to apply — likely disqualifies fast-track pathway.`);
      }
    });
  } else {
    positives.push('No overlays entered — verify on planning portal to confirm.');
  }

  if (lot.lotSize) {
    const size = parseInt(lot.lotSize);
    if (size < stateRules.minSubdivisionLotSize) {
      warnings.push(`Lot size ${size}m² is below typical ${stateRules.minSubdivisionLotSize}m² minimum for ${stateRules.name}. Verify with council scheme.`);
    } else if (size < 600) {
      warnings.push('Lot under 600m² — may struggle to meet setback + site coverage rules for Class 3.');
    } else {
      positives.push(`Lot size of ${size}m² provides good flexibility.`);
    }
  }

  if (lot.setbacks) {
    const sb = stateRules.setbacks;
    if (lot.setbacks.front && parseFloat(lot.setbacks.front) < sb.front)
      warnings.push(`Front setback ${lot.setbacks.front}m is below state minimum ${sb.front}m for Class 3.`);
    if (lot.isCorner && lot.setbacks.secondary && parseFloat(lot.setbacks.secondary) < sb.secondary)
      warnings.push(`Secondary frontage setback below state minimum ${sb.secondary}m.`);
    if (lot.setbacks.rear && parseFloat(lot.setbacks.rear) < sb.rear)
      warnings.push(`Rear setback ${lot.setbacks.rear}m is below state minimum ${sb.rear}m.`);
    if (lot.setbacks.side && parseFloat(lot.setbacks.side) < sb.side)
      warnings.push(`Side setback ${lot.setbacks.side}m is below state minimum ${sb.side}m.`);
  }

  return { issues, warnings, positives };
};

const validateSubdivision = (state, parentLotSize, lots, subdivisionStatus, isCorner, parentFrontage, parentDepth) => {
  const stateRules = STATES[state];
  const issues = [];
  const warnings = [];
  const positives = [];

  // Use corner-aware minimum
  const applicableMin = isCorner ? stateRules.duplexParentLotMinCorner : stateRules.duplexParentLotMin;

  if (subdivisionStatus === 'proposed') {
    const parent = parseInt(parentLotSize);
    if (!parent) {
      warnings.push('Enter the pre-subdivided parent lot size to check subdivision feasibility.');
    } else if (parent < applicableMin) {
      const cornerNote = isCorner ? ' (corner block minimum)' : ' (standard block minimum)';
      issues.push(`Parent lot ${parent}m² is below ${stateRules.name}'s ${applicableMin}m² minimum${cornerNote} to subdivide for duplex. Cannot subdivide.`);
    } else {
      const cornerNote = isCorner ? ' (corner block — reduced minimum applies)' : '';
      positives.push(`Parent lot ${parent}m² meets the ${applicableMin}m² minimum for subdivision in ${stateRules.name}${cornerNote}.`);
    }

    // Check frontage and depth (Victoria specifically requires these for non-corner)
    if (stateRules.duplexFrontageMin && !isCorner) {
      const f = parseFloat(parentFrontage);
      if (f && f < stateRules.duplexFrontageMin) {
        issues.push(`Parent lot frontage ${f}m is below ${stateRules.name}'s ${stateRules.duplexFrontageMin}m minimum frontage for non-corner duplex subdivision.`);
      } else if (f) {
        positives.push(`Frontage ${f}m meets ${stateRules.duplexFrontageMin}m minimum.`);
      }
    }
    if (stateRules.duplexDepthMin && !isCorner) {
      const d = parseFloat(parentDepth);
      if (d && d < stateRules.duplexDepthMin) {
        issues.push(`Parent lot depth ${d}m is below ${stateRules.name}'s ${stateRules.duplexDepthMin}m minimum depth for non-corner duplex subdivision.`);
      } else if (d) {
        positives.push(`Depth ${d}m meets ${stateRules.duplexDepthMin}m minimum.`);
      }
    }

    const lot1 = parseInt(lots[0]?.lotSize) || 0;
    const lot2 = parseInt(lots[1]?.lotSize) || 0;
    if (lot1 && lot1 < stateRules.minSubdivisionLotSize)
      issues.push(`Proposed Lot 1 (${lot1}m²) is below ${stateRules.minSubdivisionLotSize}m² typical minimum subdivided lot size.`);
    if (lot2 && lot2 < stateRules.minSubdivisionLotSize)
      issues.push(`Proposed Lot 2 (${lot2}m²) is below ${stateRules.minSubdivisionLotSize}m² typical minimum subdivided lot size.`);

    if (parent && lot1 && lot2) {
      const sum = lot1 + lot2;
      const tolerance = parent * 0.15; // 15% for road/easement
      if (sum > parent + 5) {
        issues.push(`Lot 1 + Lot 2 (${sum}m²) exceeds parent lot (${parent}m²).`);
      } else if (parent - sum > tolerance) {
        warnings.push(`Lot 1 + Lot 2 (${sum}m²) is significantly less than parent (${parent}m²). Account for road/easement?`);
      }
    }
  } else if (subdivisionStatus === 'approved' || subdivisionStatus === 'titled') {
    const lot1 = parseInt(lots[0]?.lotSize) || 0;
    const lot2 = parseInt(lots[1]?.lotSize) || 0;
    if (lot1 && lot1 < stateRules.minSubdivisionLotSize)
      warnings.push(`Lot 1 (${lot1}m²) is below typical ${stateRules.minSubdivisionLotSize}m² minimum. Already approved/titled, so verify scheme compliance.`);
    if (lot2 && lot2 < stateRules.minSubdivisionLotSize)
      warnings.push(`Lot 2 (${lot2}m²) is below typical ${stateRules.minSubdivisionLotSize}m² minimum. Already approved/titled, so verify scheme compliance.`);
    if (lot1 && lot2) positives.push(`Two separately titled lots ready for independent build approvals.`);
  }

  return { issues, warnings, positives };
};

const calculateFloorArea = (projectType) => {
  const projType = PROJECT_TYPES[projectType];
  const beds = projType.residents;
  const ooa = projType.ooaRooms;
  const dwellings = projType.dwellings;

  const perDwelling =
    (beds / dwellings) * (ROOM_SIZES.bedroom + ROOM_SIZES.ensuite) +
    (ooa / dwellings) * (ROOM_SIZES.ooaRoom + ROOM_SIZES.ooaEnsuite) +
    ROOM_SIZES.livingDining +
    ROOM_SIZES.kitchen +
    ROOM_SIZES.laundry +
    ROOM_SIZES.corridors +
    ROOM_SIZES.storage;

  return Math.round(perDwelling * dwellings);
};

const calculateCostEstimate = (project) => {
  const projType = PROJECT_TYPES[project.projectType];
  if (!projType) return null;

  const stateMultiplier = STATES[project.state].costMultiplier;
  const dwellings = projType.dwellings;
  const floorArea = calculateFloorArea(project.projectType);

  const isClass3 = project.buildingClass === 'Class 3' || project.buildingClass === 'Class 2';
  const baseCostBase = isClass3 ? BASE_COSTS_PER_SQM.class3.mid : BASE_COSTS_PER_SQM.standard.mid;
  const sdaPremium = SDA_CATEGORIES[project.sdaCategory]?.estimatedPremium || 0.15;
  const buildCostPerSqm = Math.round(baseCostBase * (1 + sdaPremium) * stateMultiplier);

  const overrides = project.costOverrides || {};
  const buildCostOverride = overrides['Base Build Cost'];
  const baseBuildCost = buildCostOverride !== undefined && buildCostOverride !== null && buildCostOverride !== ''
    ? parseInt(buildCostOverride) || 0
    : floorArea * buildCostPerSqm;

  const costLines = {};
  costLines['Base Build Cost'] = { default: floorArea * buildCostPerSqm, override: buildCostOverride, final: baseBuildCost };

  Object.entries(COST_LINE_DEFAULTS).forEach(([key, defaultVal]) => {
    if (key === 'Sprinkler System (Class 3)' && !isClass3) return;
    const scaledDefault = Math.round(defaultVal * stateMultiplier * (
      ['Council & Building Permit Fees', 'SDA Assessor Fees', 'Sprinkler System (Class 3)', 'NDIS SDA Design Standard Compliance'].includes(key) ? dwellings : 1
    ));
    const ovr = overrides[key];
    const final = ovr !== undefined && ovr !== null && ovr !== '' ? parseInt(ovr) || 0 : scaledDefault;
    costLines[key] = { default: scaledDefault, override: ovr, final };
  });

  const subtotal = Object.values(costLines).reduce((s, l) => s + l.final, 0);
  const contingencyOverride = overrides['Contingency'];
  const contingency = contingencyOverride !== undefined && contingencyOverride !== null && contingencyOverride !== ''
    ? parseInt(contingencyOverride) || 0 : Math.round(subtotal * 0.1);
  costLines['Contingency'] = { default: Math.round(subtotal * 0.1), override: contingencyOverride, final: contingency };

  const grandTotal = subtotal + contingency;

  const fundingRange = SDA_CATEGORIES[project.sdaCategory]?.annualSDAFundingRange || '';
  const fundingMatch = fundingRange.match(/\$([\d,]+)\s*–\s*\$([\d,]+)/);
  const minFunding = fundingMatch ? parseInt(fundingMatch[1].replace(/,/g, '')) : 0;
  const maxFunding = fundingMatch ? parseInt(fundingMatch[2].replace(/,/g, '')) : 0;
  const annualRevenueLow = minFunding * projType.residents;
  const annualRevenueHigh = maxFunding * projType.residents;
  const yieldLow = grandTotal > 0 ? (annualRevenueLow / grandTotal * 100).toFixed(1) : '0';
  const yieldHigh = grandTotal > 0 ? (annualRevenueHigh / grandTotal * 100).toFixed(1) : '0';

  return {
    floorArea, buildCostPerSqm, baseBuildCost,
    costLines, subtotal, contingency, grandTotal,
    annualRevenueLow, annualRevenueHigh, yieldLow, yieldHigh,
    dwellings, perDwellingCost: Math.round(grandTotal / dwellings),
  };
};

const formatCurrency = (n) => {
  if (n === null || n === undefined) return '—';
  return '$' + Math.round(n).toLocaleString('en-AU');
};

const blankLot = (state, label) => ({
  label: label || 'Lot 1',
  address: '', zone: '', overlays: '', lotSize: '', isCorner: false,
  setbacks: {
    front: STATES[state].setbacks.front.toString(),
    secondary: STATES[state].setbacks.secondary.toString(),
    rear: STATES[state].setbacks.rear.toString(),
    side: STATES[state].setbacks.side.toString(),
  },
});

const blankProject = () => ({
  id: null, name: '', state: 'QLD', projectType: '2-resident',
  sdaCategory: 'High Physical Support', buildingClass: 'Class 3', notes: '',
  parentLotSize: '',
  subdivisionStatus: 'titled',
  lots: [blankLot('QLD')],
  completedSteps: {}, costOverrides: {},
  planningDD: { ...DD_DEFAULTS, actionItems: [] },
  layout: { ...LAYOUT_DEFAULTS },
  trees: [],
  dwellings: [],
  createdAt: null,
});

// ============================================================================
// MAIN
// ============================================================================

export default function SDAPortal() {
  const [view, setView] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('overview');
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [activeLotIdx, setActiveLotIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const [formStep, setFormStep] = useState(1);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [newProject, setNewProject] = useState(blankProject());

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get('sda-projects-v7');
        if (result?.value) {
          const loaded = JSON.parse(result.value);
          // Backfill planningDD on any older projects
          const upgraded = loaded.map(p => ({
            ...p,
            planningDD: p.planningDD || { ...DD_DEFAULTS, actionItems: [] },
            layout: p.layout || { ...LAYOUT_DEFAULTS },
            trees: p.trees || [],
            dwellings: p.dwellings || [],
          }));
          setProjects(upgraded);
        }
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const saveProjects = async (updated) => {
    setProjects(updated);
    try {
      await window.storage.set('sda-projects-v7', JSON.stringify(updated));
    } catch (e) { console.error('Save failed', e); }
  };

  const handleProjectTypeChange = (type) => {
    const projType = PROJECT_TYPES[type];
    let lots;
    if (projType.dwellings === 1) {
      lots = newProject.lots.length === 1
        ? newProject.lots
        : [{ ...newProject.lots[0], label: 'Lot 1' }];
    } else {
      lots = [
        newProject.lots[0] ? { ...newProject.lots[0], label: 'Lot 1' } : blankLot(newProject.state, 'Lot 1'),
        newProject.lots[1] ? { ...newProject.lots[1], label: 'Lot 2' } : blankLot(newProject.state, 'Lot 2'),
      ];
    }
    setNewProject({ ...newProject, projectType: type, lots });
  };

  const handleStateChange = (state) => {
    const newLots = newProject.lots.map(l => ({
      ...l,
      setbacks: {
        front: STATES[state].setbacks.front.toString(),
        secondary: STATES[state].setbacks.secondary.toString(),
        rear: STATES[state].setbacks.rear.toString(),
        side: STATES[state].setbacks.side.toString(),
      },
    }));
    setNewProject({ ...newProject, state, lots: newLots });
  };

  const updateLot = (idx, updates) => {
    const lots = [...newProject.lots];
    lots[idx] = { ...lots[idx], ...updates };
    setNewProject({ ...newProject, lots });
  };

  const updateLotSetback = (idx, key, value) => {
    const lots = [...newProject.lots];
    lots[idx] = { ...lots[idx], setbacks: { ...lots[idx].setbacks, [key]: value } };
    setNewProject({ ...newProject, lots });
  };

  const startEdit = (project) => {
    setNewProject({ ...project });
    setEditingProjectId(project.id);
    setFormStep(1);
    setView('new');
  };

  const saveProject = async () => {
    if (editingProjectId) {
      const updated = projects.map(p => p.id === editingProjectId ? { ...newProject, id: editingProjectId } : p);
      await saveProjects(updated);
      const updatedProject = updated.find(p => p.id === editingProjectId);
      setActiveProject(updatedProject);
      setActiveLotIdx(0);
      setView('project');
      setActiveTab('overview');
    } else {
      const project = { ...newProject, id: Date.now().toString(), createdAt: new Date().toISOString() };
      await saveProjects([...projects, project]);
      setActiveProject(project);
      setActiveLotIdx(0);
      setView('project');
      setActiveTab('overview');
    }
    setEditingProjectId(null);
    setFormStep(1);
    setNewProject(blankProject());
  };

  const cancelWizard = () => {
    setEditingProjectId(null);
    setFormStep(1);
    setNewProject(blankProject());
    setView(activeProject ? 'project' : 'dashboard');
  };

  const updateProject = async (updates) => {
    if (!activeProject) return;
    const updated = { ...activeProject, ...updates };
    setActiveProject(updated);
    await saveProjects(projects.map(p => p.id === updated.id ? updated : p));
  };

  const updateProjectLot = async (idx, updates) => {
    if (!activeProject) return;
    const lots = [...activeProject.lots];
    lots[idx] = { ...lots[idx], ...updates };
    await updateProject({ lots });
  };

  const updateProjectLotSetback = async (idx, key, value) => {
    if (!activeProject) return;
    const lots = [...activeProject.lots];
    lots[idx] = { ...lots[idx], setbacks: { ...lots[idx].setbacks, [key]: value } };
    await updateProject({ lots });
  };

  const deleteProject = async (id) => {
    const updated = projects.filter(p => p.id !== id);
    await saveProjects(updated);
    if (activeProject?.id === id) { setActiveProject(null); setView('dashboard'); }
  };

  const toggleStep = async (phaseIdx, itemIdx) => {
    if (!activeProject) return;
    const key = `${phaseIdx}-${itemIdx}`;
    await updateProject({
      completedSteps: { ...activeProject.completedSteps, [key]: !activeProject.completedSteps[key] },
    });
  };

  const updateCostOverride = async (lineKey, value) => {
    if (!activeProject) return;
    await updateProject({ costOverrides: { ...activeProject.costOverrides, [lineKey]: value } });
  };

  const resetCostOverrides = async () => {
    if (!activeProject) return;
    if (confirm('Reset all cost overrides back to industry defaults?')) await updateProject({ costOverrides: {} });
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f1ea' }}>
      <div style={{ fontFamily: 'Georgia, serif', color: '#666' }}>Loading…</div>
    </div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f1ea', fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#1a1a1a' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .serif { font-family: 'Fraunces', Georgia, serif; }
        .sans { font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .btn-primary { background: #1a1a1a; color: #f5f1ea; padding: 12px 24px; border: none; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; transition: all 0.2s; }
        .btn-primary:hover { background: #b8763e; }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-secondary { background: transparent; color: #1a1a1a; padding: 12px 24px; border: 1px solid #1a1a1a; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; transition: all 0.2s; }
        .btn-secondary:hover { background: #1a1a1a; color: #f5f1ea; }
        .btn-ghost { background: transparent; color: #555; padding: 8px 12px; border: none; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; }
        .btn-ghost:hover { color: #b8763e; }
        input, textarea, select { font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; padding: 10px 12px; border: 1px solid #ccc; background: white; width: 100%; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: #b8763e; }
        label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #666; font-weight: 600; display: block; margin-bottom: 6px; font-family: 'IBM Plex Sans', sans-serif; }
        .card { background: white; border: 1px solid #e0d9cd; padding: 24px; transition: all 0.2s; }
        .card:hover { border-color: #b8763e; }
        .tab { padding: 14px 20px; background: transparent; border: none; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; color: #888; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .tab:hover { color: #1a1a1a; }
        .tab.active { color: #1a1a1a; border-bottom-color: #b8763e; }
        .pill { padding: 6px 12px; background: #1a1a1a; color: #f5f1ea; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; display: inline-block; }
        .pill.outline { background: transparent; color: #1a1a1a; border: 1px solid #1a1a1a; }
      `}</style>

      <header style={{ borderBottom: '1px solid #d4ccba', padding: '20px 32px', background: '#f5f1ea', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div onClick={() => setView('dashboard')} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, color: '#b8763e', fontWeight: 600, marginBottom: 4 }} className="sans">SDA · DEVELOPMENT INTELLIGENCE</div>
            <div className="serif" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.5px' }}>The Approvals Atlas</div>
          </div>
          {view !== 'dashboard' && (
            <button className="btn-ghost" onClick={() => { setView('dashboard'); setFormStep(1); setActiveTab('overview'); setEditingProjectId(null); }}>
              <ArrowLeft size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> All Projects
            </button>
          )}
        </div>
      </header>

      {view === 'dashboard' && <Dashboard projects={projects} setView={setView} setActiveProject={setActiveProject} setActiveLotIdx={setActiveLotIdx} deleteProject={deleteProject} />}
      {view === 'new' && <ProjectWizard
        formStep={formStep} setFormStep={setFormStep}
        newProject={newProject} setNewProject={setNewProject}
        editingProjectId={editingProjectId}
        cancelWizard={cancelWizard} saveProject={saveProject}
        handleProjectTypeChange={handleProjectTypeChange}
        handleStateChange={handleStateChange}
        updateLot={updateLot} updateLotSetback={updateLotSetback}
      />}
      {view === 'project' && activeProject && (
        <ProjectView
          project={activeProject} activeTab={activeTab} setActiveTab={setActiveTab}
          activeLotIdx={activeLotIdx} setActiveLotIdx={setActiveLotIdx}
          updateProject={updateProject} updateProjectLot={updateProjectLot}
          updateProjectLotSetback={updateProjectLotSetback}
          toggleStep={toggleStep}
          updateCostOverride={updateCostOverride} resetCostOverrides={resetCostOverrides}
          startEdit={startEdit}
        />
      )}

      <footer style={{ borderTop: '1px solid #d4ccba', padding: '32px', marginTop: 60, fontSize: 11, color: '#888', textAlign: 'center' }} className="sans">
        SDA Permit Pathway · Guidance only · Always verify with council, certifier, and SDA assessor
      </footer>
    </div>
  );
}

// ============================================================================
// DASHBOARD
// ============================================================================

function Dashboard({ projects, setView, setActiveProject, setActiveLotIdx, deleteProject }) {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 32px' }}>
      <div style={{ marginBottom: 56, maxWidth: 720 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.5, color: '#666', marginBottom: 16 }} className="sans">FOR DEVELOPERS, BUILDERS & PLANNERS · v7</div>
        <h1 className="serif" style={{ fontSize: 64, fontWeight: 400, lineHeight: 1.05, margin: '0 0 24px', letterSpacing: '-0.03em' }}>
          From <em style={{ color: '#b8763e' }}>land</em><br />to <em style={{ color: '#b8763e' }}>permit</em>,<br />mapped.
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: '#444', maxWidth: 580 }} className="sans">
          A working portal for SDA developers across QLD, NSW and VIC. Now with proper subdivision flow, edit-anywhere wizard, and project type presets.
        </p>
      </div>

      {projects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
          <StatCard label="Active Projects" value={projects.length} />
          <StatCard label="Total Dwellings" value={projects.reduce((s, p) => s + (PROJECT_TYPES[p.projectType]?.dwellings || 1), 0)} />
          <StatCard label="Total Residents" value={projects.reduce((s, p) => s + (PROJECT_TYPES[p.projectType]?.residents || 0), 0)} />
          <StatCard label="Combined Build Cost" value={formatCurrency(projects.reduce((s, p) => {
            const c = calculateCostEstimate(p);
            return s + (c?.grandTotal || 0);
          }, 0))} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 className="serif" style={{ fontSize: 26, fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>Your projects</h2>
        <button className="btn-primary" onClick={() => setView('new')}>
          <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div style={{ border: '2px dashed #ccc', padding: '80px 40px', textAlign: 'center', background: 'rgba(255,255,255,0.4)' }}>
          <Building2 size={36} style={{ color: '#999', marginBottom: 16 }} />
          <p className="serif" style={{ fontSize: 20, fontStyle: 'italic', color: '#666', margin: '0 0 8px' }}>No projects yet.</p>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }} className="sans">Click "New Project" to begin.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {projects.map(p => {
            const projType = PROJECT_TYPES[p.projectType];
            const completed = Object.values(p.completedSteps || {}).filter(Boolean).length;
            const total = STEPS_TEMPLATE[p.state].reduce((sum, ph) => sum + ph.items.length, 0);
            const pct = Math.round((completed / total) * 100);
            const cost = calculateCostEstimate(p);
            return (
              <div key={p.id} className="card" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => { setActiveProject(p); setActiveLotIdx(0); setView('project'); }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: '#b8763e', fontWeight: 600, marginBottom: 8 }} className="sans">{STATES[p.state].name.toUpperCase()} · {projType?.label.toUpperCase()}</div>
                <h3 className="serif" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 8px', lineHeight: 1.2 }}>{p.name}</h3>
                <p style={{ fontSize: 12, color: '#666', margin: '0 0 16px', minHeight: 18 }} className="sans">
                  <MapPin size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  {p.lots[0]?.address || 'No address'}
                  {p.lots.length > 1 && ` (+${p.lots.length - 1})`}
                </p>
                {cost && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 11 }} className="sans">
                    <div>
                      <div style={{ color: '#888', textTransform: 'uppercase', letterSpacing: 1, fontSize: 9 }}>Est. Build</div>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{formatCurrency(cost.grandTotal)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#888', textTransform: 'uppercase', letterSpacing: 1, fontSize: 9 }}>Yield</div>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 500, color: '#b8763e' }}>{cost.yieldLow}–{cost.yieldHigh}%</div>
                    </div>
                  </div>
                )}
                <div style={{ height: 4, background: '#eee', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#b8763e' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888' }} className="sans">
                  <span>{completed} / {total} steps</span><span>{pct}%</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${p.name}"?`)) deleteProject(p.id); }}
                  style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', cursor: 'pointer', color: '#999', padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.6)', border: '1px solid #e0d9cd' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#888', marginBottom: 6 }} className="sans">{label}</div>
      <div className="serif" style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

// ============================================================================
// PROJECT WIZARD (handles both create + edit)
// ============================================================================

function ProjectWizard({ formStep, setFormStep, newProject, setNewProject, editingProjectId, cancelWizard, saveProject, handleProjectTypeChange, handleStateChange, updateLot, updateLotSetback }) {
  const projType = PROJECT_TYPES[newProject.projectType];
  const isDuplex = newProject.projectType === 'duplex';
  const isEditing = !!editingProjectId;

  const subdivResult = isDuplex
    ? validateSubdivision(newProject.state, newProject.parentLotSize, newProject.lots, newProject.subdivisionStatus, newProject.parentIsCorner, newProject.parentFrontage, newProject.parentDepth)
    : { issues: [], warnings: [], positives: [] };

  const canContinueStep3 = isDuplex
    ? subdivResult.issues.length === 0 &&
      newProject.lots.every(l => l.lotSize)
    : true;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 32px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.5, color: '#b8763e', fontWeight: 600, marginBottom: 8 }} className="sans">
          {isEditing ? 'EDITING · ' : ''}STEP {formStep} OF 4
        </div>
        <h1 className="serif" style={{ fontSize: 40, fontWeight: 400, margin: 0, letterSpacing: '-0.02em' }}>
          {formStep === 1 && (isEditing ? 'Edit project basics' : 'Project basics')}
          {formStep === 2 && 'Project type'}
          {formStep === 3 && (isDuplex ? 'Subdivision & lots' : 'Site details')}
          {formStep === 4 && 'SDA configuration'}
        </h1>
        <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
          {[1,2,3,4].map(i => (
            <button key={i} onClick={() => setFormStep(i)}
              style={{ flex: 1, height: 3, background: i <= formStep ? '#b8763e' : '#e0d9cd', border: 'none', cursor: 'pointer', padding: 0 }}
              title={`Go to step ${i}`} />
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 6 }} className="sans">Click any step number above to jump to that step</div>
      </div>

      {/* STEP 1 */}
      {formStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label>Project name</label>
            <input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="e.g. 164 Discovery Drive Duplex" />
          </div>
          <div>
            <label>State</label>
            <select value={newProject.state} onChange={e => handleStateChange(e.target.value)}>
              <option value="QLD">Queensland</option>
              <option value="NSW">New South Wales</option>
              <option value="VIC">Victoria</option>
            </select>
          </div>
          <div style={{ marginTop: 12, padding: 20, background: 'rgba(184, 118, 62, 0.08)', borderLeft: '3px solid #b8763e' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 600, color: '#b8763e', marginBottom: 8 }} className="sans">GUIDED LOOKUP</div>
            <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.6 }} className="sans">
              Open the {STATES[newProject.state].mapPortal.name} portal in another tab to look up your site.
            </p>
            <a href={STATES[newProject.state].mapPortal.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 600, textDecoration: 'underline' }} className="sans">
              Open {STATES[newProject.state].mapPortal.name} <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </a>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn-secondary" onClick={cancelWizard}>Cancel</button>
            <button className="btn-primary" disabled={!newProject.name} onClick={() => setFormStep(2)}>
              Continue <ChevronRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Project type */}
      {formStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }} className="sans">Pick the project type that matches your build:</p>
          {Object.entries(PROJECT_TYPES).map(([key, t]) => (
            <div key={key} onClick={() => handleProjectTypeChange(key)} style={{
              padding: 20,
              border: newProject.projectType === key ? '2px solid #b8763e' : '1px solid #e0d9cd',
              background: newProject.projectType === key ? 'rgba(184, 118, 62, 0.05)' : 'white',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div className="serif" style={{ fontSize: 19, fontWeight: 500 }}>{t.label}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="pill outline">{t.dwellings} dwelling{t.dwellings > 1 ? 's' : ''}</span>
                  <span className="pill outline">{t.residents} res</span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#666', margin: 0, lineHeight: 1.5 }} className="sans">{t.description}</p>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn-secondary" onClick={() => setFormStep(1)}><ArrowLeft size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Back</button>
            <button className="btn-primary" onClick={() => setFormStep(3)}>
              Continue <ChevronRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Site details / Subdivision flow */}
      {formStep === 3 && !isDuplex && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: 16, background: '#fffbf5', border: '1px solid #e8d9bf', fontSize: 12, lineHeight: 1.5 }} className="sans">
            <strong style={{ color: '#b8763e' }}>Enter site details for the lot.</strong> You can refine these later.
          </div>
          {newProject.lots.slice(0, 1).map((lot, idx) => (
            <LotEditor key={idx} lot={lot} idx={idx} updateLot={updateLot} stateRules={STATES[newProject.state]} />
          ))}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn-secondary" onClick={() => setFormStep(2)}><ArrowLeft size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Back</button>
            <button className="btn-primary" onClick={() => setFormStep(4)}>
              Continue <ChevronRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
            </button>
          </div>
        </div>
      )}

      {formStep === 3 && isDuplex && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: 16, background: '#fffbf5', border: '1px solid #e8d9bf', fontSize: 12, lineHeight: 1.5 }} className="sans">
            <strong style={{ color: '#b8763e' }}>Duplex flow:</strong> First tell us the subdivision status, then the parent lot size (if relevant), then the details for each of the 2 lots.
          </div>

          <div className="card">
            <h3 className="serif" style={{ fontSize: 18, fontWeight: 500, margin: '0 0 12px' }}>Subdivision status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { key: 'proposed', label: 'Proposed — I am planning to subdivide an existing lot', desc: 'Validates parent lot meets minimum size for subdivision' },
                { key: 'approved', label: 'Approved — subdivision permit issued, awaiting registration', desc: 'Treats lots as soon-to-be-independent' },
                { key: 'titled', label: 'Already subdivided — each lot has its own title', desc: 'Treats lots as fully independent (skips parent lot validation)' },
              ].map(opt => (
                <label key={opt.key} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: 12, cursor: 'pointer',
                  border: newProject.subdivisionStatus === opt.key ? '2px solid #b8763e' : '1px solid #e0d9cd',
                  background: newProject.subdivisionStatus === opt.key ? 'rgba(184, 118, 62, 0.05)' : 'white',
                  textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: 400, color: '#1a1a1a', marginBottom: 0,
                }}>
                  <input type="radio" name="subdiv" checked={newProject.subdivisionStatus === opt.key}
                    onChange={() => setNewProject({...newProject, subdivisionStatus: opt.key})}
                    style={{ width: 'auto', margin: '4px 0 0 0' }} />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {newProject.subdivisionStatus === 'proposed' && (
            <div className="card">
              <h3 className="serif" style={{ fontSize: 18, fontWeight: 500, margin: '0 0 4px' }}>Parent lot (pre-subdivision)</h3>
              <p style={{ fontSize: 11, color: '#888', margin: '0 0 12px' }} className="sans">
                {(() => {
                  const sr = STATES[newProject.state];
                  const isCorner = newProject.parentIsCorner;
                  const min = isCorner ? sr.duplexParentLotMinCorner : sr.duplexParentLotMin;
                  let msg = `Must be ${min}m²+ to subdivide for duplex in ${sr.name}${isCorner ? ' (corner block)' : ' (standard block)'}`;
                  if (sr.duplexFrontageMin && !isCorner) {
                    msg += `. Plus ${sr.duplexFrontageMin}m frontage × ${sr.duplexDepthMin}m depth required.`;
                  }
                  return msg;
                })()}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label>Parent lot size (m²)</label>
                  <input type="number" value={newProject.parentLotSize}
                    onChange={e => setNewProject({...newProject, parentLotSize: e.target.value})}
                    placeholder="860" />
                </div>
                <div>
                  <label>Parent address</label>
                  <input value={newProject.parentAddress || ''}
                    onChange={e => setNewProject({...newProject, parentAddress: e.target.value})}
                    placeholder="164 Discovery Drive, Helensvale" />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: 500, color: '#1a1a1a', cursor: 'pointer', padding: 10, background: newProject.parentIsCorner ? 'rgba(184, 118, 62, 0.08)' : '#f5f1ea', border: `1px solid ${newProject.parentIsCorner ? '#b8763e' : '#e0d9cd'}` }}>
                <input type="checkbox" checked={newProject.parentIsCorner || false}
                  onChange={e => setNewProject({...newProject, parentIsCorner: e.target.checked})}
                  style={{ width: 'auto', margin: 0 }} />
                Parent lot is a corner block
              </label>

              {STATES[newProject.state].duplexFrontageMin && !newProject.parentIsCorner && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Frontage (m)</label>
                    <input type="number" step="0.1" value={newProject.parentFrontage || ''}
                      onChange={e => setNewProject({...newProject, parentFrontage: e.target.value})}
                      placeholder={String(STATES[newProject.state].duplexFrontageMin)} />
                  </div>
                  <div>
                    <label>Depth (m)</label>
                    <input type="number" step="0.1" value={newProject.parentDepth || ''}
                      onChange={e => setNewProject({...newProject, parentDepth: e.target.value})}
                      placeholder={String(STATES[newProject.state].duplexDepthMin)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subdivision validation alerts */}
          {(subdivResult.issues.length > 0 || subdivResult.warnings.length > 0 || subdivResult.positives.length > 0) && (
            <div>
              {subdivResult.issues.map((i, idx) => (
                <div key={`i${idx}`} style={{ padding: '12px 16px', background: '#fdf2f2', borderLeft: '3px solid #c74343', marginBottom: 8, fontSize: 13 }} className="sans">
                  <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: '#c74343' }} />{i}
                </div>
              ))}
              {subdivResult.warnings.map((w, idx) => (
                <div key={`w${idx}`} style={{ padding: '12px 16px', background: '#fdf8f0', borderLeft: '3px solid #d49435', marginBottom: 8, fontSize: 13 }} className="sans">
                  <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: '#d49435' }} />{w}
                </div>
              ))}
              {subdivResult.positives.map((p, idx) => (
                <div key={`p${idx}`} style={{ padding: '12px 16px', background: '#f4f9f3', borderLeft: '3px solid #5a8254', marginBottom: 8, fontSize: 13 }} className="sans">
                  <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: '#5a8254' }} />{p}
                </div>
              ))}
            </div>
          )}

          <h3 className="serif" style={{ fontSize: 20, fontWeight: 500, margin: '12px 0 0' }}>
            {newProject.subdivisionStatus === 'titled' ? 'The two lots' : 'Proposed lots'}
          </h3>

          {newProject.lots.map((lot, idx) => (
            <LotEditor key={idx} lot={lot} idx={idx} updateLot={updateLot} stateRules={STATES[newProject.state]} showCornerToggle={true} />
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn-secondary" onClick={() => setFormStep(2)}><ArrowLeft size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Back</button>
            <button className="btn-primary" disabled={!canContinueStep3} onClick={() => setFormStep(4)}>
              Continue <ChevronRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {formStep === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label>SDA Category</label>
            <select value={newProject.sdaCategory} onChange={e => setNewProject({...newProject, sdaCategory: e.target.value})}>
              {Object.keys(SDA_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4, fontStyle: 'italic' }} className="sans">{SDA_CATEGORIES[newProject.sdaCategory]?.description}</div>
          </div>
          <div>
            <label>Building Class (NCC)</label>
            <select value={newProject.buildingClass} onChange={e => setNewProject({...newProject, buildingClass: e.target.value})}>
              <option>Class 1a</option><option>Class 1b</option><option>Class 3</option><option>Class 2</option>
            </select>
          </div>
          <div>
            <label>Project notes (optional)</label>
            <textarea rows={4} value={newProject.notes} onChange={e => setNewProject({...newProject, notes: e.target.value})} />
          </div>
          <div style={{ padding: 16, background: '#fffbf5', border: '1px solid #e8d9bf', fontSize: 12, lineHeight: 1.6 }} className="sans">
            <strong style={{ color: '#b8763e' }}>About cost estimates:</strong> The portal seeds cost lines with industry averages. Replace these with your real numbers from SDA Screener in the Cost tab once the project is created.
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn-secondary" onClick={() => setFormStep(3)}><ArrowLeft size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Back</button>
            <button className="btn-primary" onClick={saveProject}>{isEditing ? 'Save changes' : 'Create project'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable lot editor for the wizard
function LotEditor({ lot, idx, updateLot, stateRules, showCornerToggle = true }) {
  return (
    <div className="card">
      <h3 className="serif" style={{ fontSize: 18, fontWeight: 500, margin: '0 0 16px' }}>{lot.label}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label>Address</label>
          <input value={lot.address} onChange={e => updateLot(idx, { address: e.target.value })} placeholder="e.g. 164a Discovery Drive, Helensvale" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div>
            <label>Zone</label>
            <input value={lot.zone} onChange={e => updateLot(idx, { zone: e.target.value })} placeholder="Low Density Residential" />
          </div>
          <div>
            <label>Lot size (m²)</label>
            <input type="number" value={lot.lotSize} onChange={e => updateLot(idx, { lotSize: e.target.value })} placeholder="430" />
          </div>
        </div>
        <div>
          <label>Overlays</label>
          <input value={lot.overlays} onChange={e => updateLot(idx, { overlays: e.target.value })} placeholder="comma-separated, or leave blank" />
        </div>
        {showCornerToggle && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0, textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: 500, color: '#1a1a1a', cursor: 'pointer' }}>
            <input type="checkbox" checked={lot.isCorner} onChange={e => updateLot(idx, { isCorner: e.target.checked })} style={{ width: 'auto', margin: 0 }} />
            Corner block (has secondary frontage)
          </label>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PROJECT VIEW
// ============================================================================

function ProjectView({ project, activeTab, setActiveTab, activeLotIdx, setActiveLotIdx, updateProject, updateProjectLot, updateProjectLotSetback, toggleStep, updateCostOverride, resetCostOverrides, startEdit }) {
  const stateRules = STATES[project.state];
  const projType = PROJECT_TYPES[project.projectType];
  const steps = STEPS_TEMPLATE[project.state];
  const cost = calculateCostEstimate(project);
  const completedCount = Object.values(project.completedSteps || {}).filter(Boolean).length;
  const totalSteps = steps.reduce((sum, ph) => sum + ph.items.length, 0);
  const sdaCat = SDA_CATEGORIES[project.sdaCategory];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'site', label: 'Site & Setbacks', icon: Ruler },
    { id: 'trees', label: 'Trees & TPZ', icon: TreePine },
    { id: 'planning-dd', label: 'Planning DD', icon: Clipboard },
    { id: 'pathway', label: 'Pathway', icon: FileCheck },
    { id: 'design', label: 'Design Standard', icon: Wrench },
    { id: 'costs', label: 'Cost Estimate', icon: DollarSign },
    { id: 'resources', label: 'Resources', icon: BookOpen },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px' }}>
      <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #d4ccba' }}>
        <div style={{ fontSize: 10, letterSpacing: 2.5, color: '#b8763e', fontWeight: 600, marginBottom: 8 }} className="sans">
          {stateRules.name.toUpperCase()} · {projType?.label.toUpperCase()} · {project.sdaCategory.toUpperCase()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="serif" style={{ fontSize: 44, fontWeight: 400, margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{project.name}</h1>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }} className="sans">
              {project.lots.length === 1
                ? <><MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{project.lots[0].address || 'No address set'}</>
                : `${project.lots.length} lots · ${projType.residents} residents · ${projType.ooaRooms} OOA rooms`
              }
            </p>
          </div>
          <button className="btn-secondary" onClick={() => startEdit(project)}>
            <Edit size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Edit Project
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #d4ccba', marginBottom: 32, overflowX: 'auto' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              <Icon size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && <OverviewTab project={project} stateRules={stateRules} projType={projType} sdaCat={sdaCat} cost={cost} completedCount={completedCount} totalSteps={totalSteps} />}
      {activeTab === 'site' && <SiteTab project={project} stateRules={stateRules} projType={projType} activeLotIdx={activeLotIdx} setActiveLotIdx={setActiveLotIdx} updateProjectLot={updateProjectLot} updateProjectLotSetback={updateProjectLotSetback} updateProject={updateProject} />}
      {activeTab === 'trees' && <TreeRegisterTab project={project} updateProject={updateProject} />}
      {activeTab === 'planning-dd' && <PlanningDDTab project={project} updateProject={updateProject} />}
      {activeTab === 'pathway' && <PathwayTab project={project} steps={steps} toggleStep={toggleStep} completedCount={completedCount} totalSteps={totalSteps} />}
      {activeTab === 'design' && <DesignTab project={project} sdaCat={sdaCat} updateProject={updateProject} />}
      {activeTab === 'costs' && <CostsTab cost={cost} project={project} stateRules={stateRules} updateCostOverride={updateCostOverride} resetCostOverrides={resetCostOverrides} />}
      {activeTab === 'resources' && <ResourcesTab stateRules={stateRules} project={project} updateProject={updateProject} />}
    </div>
  );
}

// ============================================================================
// TABS
// ============================================================================

function OverviewTab({ project, stateRules, projType, sdaCat, cost, completedCount, totalSteps }) {
  const allIssues = project.lots.flatMap((lot) => {
    const r = buildIssues(project.state, lot);
    return [
      ...r.issues.map(i => ({ type: 'issue', text: i, lot: lot.label })),
      ...r.warnings.map(w => ({ type: 'warning', text: w, lot: lot.label })),
    ];
  });

  // Add subdivision warnings if duplex
  if (project.projectType === 'duplex') {
    const subdiv = validateSubdivision(project.state, project.parentLotSize, project.lots, project.subdivisionStatus, project.parentIsCorner || project.layout?.isCorner, project.parentFrontage || project.layout?.parentFrontage, project.parentDepth || project.layout?.parentDepth);
    subdiv.issues.forEach(i => allIssues.push({ type: 'issue', text: i, lot: 'Subdivision' }));
    subdiv.warnings.forEach(w => allIssues.push({ type: 'warning', text: w, lot: 'Subdivision' }));
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 32 }}>
      <div>
        {allIssues.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 className="serif" style={{ fontSize: 20, fontWeight: 500, margin: '0 0 12px' }}>Eligibility check</h2>
            {allIssues.map((item, i) => (
              <div key={i} style={{
                padding: '12px 16px',
                background: item.type === 'issue' ? '#fdf2f2' : '#fdf8f0',
                borderLeft: `3px solid ${item.type === 'issue' ? '#c74343' : '#d49435'}`,
                marginBottom: 8, fontSize: 13, lineHeight: 1.5,
              }} className="sans">
                <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: item.type === 'issue' ? '#c74343' : '#d49435' }} />
                <strong>{item.lot}:</strong> {item.text}
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="serif" style={{ fontSize: 20, fontWeight: 500, margin: '0 0 16px' }}>Project summary</h3>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: '#444' }} className="sans">
            <div><strong>Type:</strong> {projType.label}</div>
            <div><strong>Dwellings:</strong> {projType.dwellings} · <strong>Residents:</strong> {projType.residents} · <strong>OOA rooms:</strong> {projType.ooaRooms}</div>
            {project.projectType === 'duplex' && (
              <div><strong>Subdivision:</strong> {project.subdivisionStatus === 'proposed' ? `Proposed (parent ${project.parentLotSize || '?'}m²)` : project.subdivisionStatus === 'approved' ? 'Approved, awaiting registration' : 'Already titled'}</div>
            )}
            <div><strong>Use category:</strong> {stateRules.useTerm}</div>
            <div><strong>Fast-track pathway:</strong> {stateRules.fastTrackName}</div>
            <div><strong>Typical timeline:</strong> {stateRules.typicalTimeline.total}</div>
            <div style={{ padding: 12, background: '#f5f1ea', fontSize: 12, marginTop: 16 }}>{stateRules.notes}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {cost && <StatCard label="Est. Total Build" value={formatCurrency(cost.grandTotal)} />}
          {cost && <StatCard label={`Per Dwelling (${cost.dwellings}×)`} value={formatCurrency(cost.perDwellingCost)} />}
          {cost && <StatCard label="Annual Revenue" value={formatCurrency(cost.annualRevenueLow)} />}
          {cost && <StatCard label="Gross Yield" value={`${cost.yieldLow}–${cost.yieldHigh}%`} />}
        </div>
      </div>

      <div>
        <div style={{ position: 'sticky', top: 100 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 className="serif" style={{ fontSize: 16, fontWeight: 500, margin: '0 0 16px' }}>Lots</h3>
            <div style={{ fontSize: 12 }} className="sans">
              {project.lots.map((lot, idx) => (
                <div key={idx} style={{ padding: '10px 0', borderBottom: idx < project.lots.length - 1 ? '1px solid #f0eadf' : 'none' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{lot.label}{lot.isCorner && <span style={{ marginLeft: 6, fontSize: 9, padding: '2px 6px', background: '#b8763e', color: 'white', letterSpacing: 1 }}>CORNER</span>}</div>
                  <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{lot.address || '—'}</div>
                  <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>{lot.zone || 'No zone'} · {lot.lotSize ? lot.lotSize + 'm²' : '—'}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: '#1a1a1a', color: '#f5f1ea', borderColor: '#1a1a1a' }}>
            <div style={{ fontSize: 9, letterSpacing: 2.5, color: '#b8763e', fontWeight: 600, marginBottom: 12 }} className="sans">FAST-TRACK ELIGIBILITY</div>
            <h3 className="serif" style={{ fontSize: 17, fontWeight: 500, margin: '0 0 12px', lineHeight: 1.3 }}>{stateRules.fastTrackName}</h3>
            <div style={{ fontSize: 11, lineHeight: 1.7, color: '#d4ccba' }} className="sans">
              <div>Occupancy cap: <strong style={{ color: '#f5f1ea' }}>{stateRules.occupancyCap}</strong></div>
              <div>Site coverage: <strong style={{ color: '#f5f1ea' }}>{stateRules.siteCoverage}{typeof stateRules.siteCoverage === 'number' ? '%' : ''}</strong></div>
              {typeof stateRules.setbacks.front === 'number' && (
                <div>State min setbacks: <strong style={{ color: '#f5f1ea' }}>F{stateRules.setbacks.front}/R{stateRules.setbacks.rear}/S{stateRules.setbacks.side}m</strong></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteTab({ project, stateRules, projType, activeLotIdx, setActiveLotIdx, updateProjectLot, updateProjectLotSetback, updateProject }) {
  const lot = project.lots[activeLotIdx] || project.lots[0];
  const isDuplex = project.projectType === 'duplex';

  return (
    <div>
      {/* SUBDIVISION + LAYOUT PLANNER (always shown — once per project, not per lot) */}
      <SubdivisionPlannerSection project={project} updateProject={updateProject} />

      {/* PARENT LOT DIAGRAM (duplex only) */}
      {isDuplex && (
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <InteractiveParentLot project={project} updateProject={updateProject} setbacks={stateRules.setbacks} />
        </div>
      )}

      {/* LOT TAB SWITCHER */}
      {project.lots.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, marginTop: 24 }}>
          {project.lots.map((l, idx) => (
            <button key={idx} onClick={() => setActiveLotIdx(idx)}
              style={{
                padding: '10px 20px',
                background: activeLotIdx === idx ? '#1a1a1a' : 'white',
                color: activeLotIdx === idx ? '#f5f1ea' : '#1a1a1a',
                border: '1px solid #1a1a1a', cursor: 'pointer',
                fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fontWeight: 500,
                letterSpacing: 1, textTransform: 'uppercase',
              }}>
              {l.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 32 }}>
        <div>
          <h2 className="serif" style={{ fontSize: 26, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.01em' }}>{lot.label}</h2>
          <p style={{ fontSize: 12, color: '#666', margin: '0 0 24px' }} className="sans">Edit any field — diagram updates live.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Address</label>
              <input value={lot.address || ''} onChange={e => updateProjectLot(activeLotIdx, { address: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div>
                <label>Zone</label>
                <input value={lot.zone || ''} onChange={e => updateProjectLot(activeLotIdx, { zone: e.target.value })} />
              </div>
              <div>
                <label>Lot size (m²)</label>
                <input type="number" value={lot.lotSize || ''} onChange={e => updateProjectLot(activeLotIdx, { lotSize: e.target.value })} />
              </div>
            </div>
            <div>
              <label>Overlays</label>
              <input value={lot.overlays || ''} onChange={e => updateProjectLot(activeLotIdx, { overlays: e.target.value })} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0, textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: 500, color: '#1a1a1a', cursor: 'pointer', padding: 12, background: lot.isCorner ? 'rgba(184, 118, 62, 0.08)' : '#f5f1ea', border: `1px solid ${lot.isCorner ? '#b8763e' : '#e0d9cd'}` }}>
              <input type="checkbox" checked={lot.isCorner || false} onChange={e => updateProjectLot(activeLotIdx, { isCorner: e.target.checked })} style={{ width: 'auto', margin: 0 }} />
              Corner block (has secondary frontage)
            </label>

            <div style={{ marginTop: 16 }}>
              <h3 className="serif" style={{ fontSize: 16, fontWeight: 500, margin: '0 0 4px' }}>Setbacks</h3>
              <p style={{ fontSize: 11, color: '#888', margin: '0 0 12px' }} className="sans">
                State minimums for {stateRules.useTerm}: F{stateRules.setbacks.front}m · R{stateRules.setbacks.rear}m · S{stateRules.setbacks.side}m
                {lot.isCorner && ` · Secondary ${stateRules.setbacks.secondary}m`}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <SetbackInput label="Front (primary)" value={lot.setbacks?.front} stateMin={stateRules.setbacks.front} onChange={v => updateProjectLotSetback(activeLotIdx, 'front', v)} />
                {lot.isCorner && (
                  <SetbackInput label="Side street (secondary)" value={lot.setbacks?.secondary} stateMin={stateRules.setbacks.secondary} onChange={v => updateProjectLotSetback(activeLotIdx, 'secondary', v)} />
                )}
                <SetbackInput label="Rear" value={lot.setbacks?.rear} stateMin={stateRules.setbacks.rear} onChange={v => updateProjectLotSetback(activeLotIdx, 'rear', v)} />
                <SetbackInput label="Side" value={lot.setbacks?.side} stateMin={stateRules.setbacks.side} onChange={v => updateProjectLotSetback(activeLotIdx, 'side', v)} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ position: 'sticky', top: 100 }}>
            <h3 className="serif" style={{ fontSize: 16, fontWeight: 500, margin: '0 0 12px' }}>{lot.label} setback diagram</h3>
            <PerLotDiagramWithRoads lot={lot} lotIdx={activeLotIdx} layout={project.layout} stateRules={stateRules} trees={project.trees} />
            <div style={{ marginTop: 12, padding: 12, background: '#f5f1ea', fontSize: 11, lineHeight: 1.5, color: '#666' }} className="sans">
              Top of diagram = primary road frontage for this lot.{lot.isCorner && ' Left side = secondary road.'} Setbacks apply automatically based on subdivision approach.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetbackInput({ label, value, stateMin, onChange }) {
  const numValue = parseFloat(value);
  const isUnder = !isNaN(numValue) && numValue < stateMin;
  return (
    <div>
      <label>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type="number" step="0.1" value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ paddingRight: 32, borderColor: isUnder ? '#c74343' : '#ccc' }} />
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#888' }} className="sans">m</span>
      </div>
      {isUnder && <div style={{ fontSize: 10, color: '#c74343', marginTop: 4 }} className="sans">Below state min ({stateMin}m)</div>}
    </div>
  );
}

function SetbackDiagram({ lot, stateRules }) {
  const lotSize = parseFloat(lot.lotSize) || 600;
  const lotWidth = Math.sqrt(lotSize / 1.5);
  const lotDepth = lotSize / lotWidth;
  const front = parseFloat(lot.setbacks?.front) || 0;
  const rear = parseFloat(lot.setbacks?.rear) || 0;
  const side = parseFloat(lot.setbacks?.side) || 0;
  const secondary = lot.isCorner ? (parseFloat(lot.setbacks?.secondary) || 0) : 0;

  const SVG_W = 360, SVG_H = 360, PAD = 30;
  const drawW = SVG_W - PAD * 2, drawH = SVG_H - PAD * 2;
  const scaleX = drawW / lotWidth, scaleY = drawH / lotDepth;
  const lotX = PAD, lotY = PAD;
  const lotPxW = lotWidth * scaleX, lotPxH = lotDepth * scaleY;

  const leftSetback = lot.isCorner ? secondary : side;
  const rightSetback = side;

  const buildX = lotX + leftSetback * scaleX;
  const buildY = lotY + front * scaleY;
  const buildW = Math.max(0, lotPxW - (leftSetback + rightSetback) * scaleX);
  const buildH = Math.max(0, lotPxH - (front + rear) * scaleY);

  const buildableArea = (lotWidth - leftSetback - rightSetback) * (lotDepth - front - rear);
  const siteCoveragePct = lotSize > 0 ? Math.max(0, Math.min(100, (buildableArea / lotSize) * 100)) : 0;
  const stateCovLimit = stateRules.siteCoverage;
  const overCoverage = typeof stateCovLimit === 'number' && siteCoveragePct > stateCovLimit;

  return (
    <div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', height: 'auto', background: 'white', border: '1px solid #e0d9cd' }}>
        <text x={SVG_W / 2} y={14} textAnchor="middle" fontFamily="IBM Plex Sans" fontSize="9" fill="#888" letterSpacing="1.5">PRIMARY FRONTAGE (STREET)</text>
        <rect x={lotX} y={lotY} width={lotPxW} height={lotPxH} fill="#f5f1ea" stroke="#1a1a1a" strokeWidth="2" />
        {buildW > 0 && buildH > 0 && (
          <rect x={buildX} y={buildY} width={buildW} height={buildH}
                fill={overCoverage ? '#fdecec' : 'rgba(184, 118, 62, 0.15)'}
                stroke={overCoverage ? '#c74343' : '#b8763e'} strokeWidth="1.5" strokeDasharray="4,3" />
        )}
        {buildW > 0 && buildH > 0 && (
          <text x={buildX + buildW / 2} y={buildY + buildH / 2} textAnchor="middle" dominantBaseline="middle"
                fontFamily="Fraunces, serif" fontSize="11" fill="#1a1a1a" fontStyle="italic">buildable</text>
        )}
        <line x1={lotX + lotPxW / 2} y1={lotY} x2={lotX + lotPxW / 2} y2={buildY} stroke="#666" strokeWidth="1" />
        <text x={lotX + lotPxW / 2 + 4} y={lotY + (buildY - lotY) / 2 + 3} fontFamily="IBM Plex Mono" fontSize="9" fill="#1a1a1a">{front}m</text>
        <line x1={lotX + lotPxW / 2} y1={buildY + buildH} x2={lotX + lotPxW / 2} y2={lotY + lotPxH} stroke="#666" strokeWidth="1" />
        <text x={lotX + lotPxW / 2 + 4} y={(buildY + buildH) + (lotY + lotPxH - buildY - buildH) / 2 + 3} fontFamily="IBM Plex Mono" fontSize="9" fill="#1a1a1a">{rear}m</text>
        <line x1={lotX} y1={lotY + lotPxH / 2} x2={buildX} y2={lotY + lotPxH / 2} stroke="#666" strokeWidth="1" />
        <text x={lotX + (buildX - lotX) / 2} y={lotY + lotPxH / 2 - 4} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9" fill={lot.isCorner ? '#b8763e' : '#1a1a1a'}>{leftSetback}m</text>
        {lot.isCorner && <text x={lotX + 6} y={lotY + lotPxH - 4} fontFamily="IBM Plex Sans" fontSize="8" fill="#b8763e" letterSpacing="1">SECONDARY</text>}
        <line x1={buildX + buildW} y1={lotY + lotPxH / 2} x2={lotX + lotPxW} y2={lotY + lotPxH / 2} stroke="#666" strokeWidth="1" />
        <text x={buildX + buildW + (lotX + lotPxW - buildX - buildW) / 2} y={lotY + lotPxH / 2 - 4} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9" fill="#1a1a1a">{rightSetback}m</text>
        <text x={lotX + 6} y={lotY + 14} fontFamily="IBM Plex Mono" fontSize="9" fill="#666">{lot.lotSize || '?'}m²</text>
        <text x={lotX + lotPxW - 6} y={lotY + 14} textAnchor="end" fontFamily="IBM Plex Mono" fontSize="9" fill="#666">~{lotWidth.toFixed(0)} × {lotDepth.toFixed(0)}m</text>
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

function PathwayTab({ project, steps, toggleStep, completedCount, totalSteps }) {
  return (
    <div style={{ maxWidth: 880 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>The pathway</h2>
          <div style={{ fontSize: 12, color: '#888' }} className="sans">{completedCount} / {totalSteps} complete</div>
        </div>
        <div style={{ height: 3, background: '#eee', marginBottom: 16 }}>
          <div style={{ height: '100%', width: `${(completedCount/totalSteps)*100}%`, background: '#b8763e' }} />
        </div>
        <p style={{ fontSize: 13, color: '#666', maxWidth: 600 }} className="sans">Click any item to mark it complete.</p>
      </div>

      {steps.map((phase, pIdx) => {
        const phaseCompleted = phase.items.filter((_, iIdx) => project.completedSteps[`${pIdx}-${iIdx}`]).length;
        return (
          <div key={pIdx} style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16 }}>
              <div className="serif" style={{ fontSize: 44, color: '#d4ccba', fontWeight: 400, lineHeight: 1 }}>{String(pIdx + 1).padStart(2, '0')}</div>
              <div style={{ flex: 1 }}>
                <h3 className="serif" style={{ fontSize: 24, fontWeight: 500, margin: '0 0 4px' }}>{phase.phase}</h3>
                <div style={{ fontSize: 11, color: '#888' }} className="sans">{phaseCompleted} / {phase.items.length} complete</div>
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #d4ccba', paddingLeft: 24, marginLeft: 22 }}>
              {phase.items.map((item, iIdx) => {
                const key = `${pIdx}-${iIdx}`;
                const done = project.completedSteps[key];
                return (
                  <div key={iIdx} onClick={() => toggleStep(pIdx, iIdx)}
                    style={{ padding: '12px 0', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid #f0eadf', opacity: done ? 0.5 : 1 }}>
                    {done ? <CheckCircle2 size={18} style={{ color: '#b8763e', flexShrink: 0, marginTop: 2 }} /> : <Circle size={18} style={{ color: '#bbb', flexShrink: 0, marginTop: 2 }} />}
                    <span style={{ fontSize: 14, lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none' }} className="sans">{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DesignTab({ project, sdaCat, updateProject }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 32, maxWidth: 1100 }}>
      <div>
        <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.01em' }}>{project.sdaCategory}</h2>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 24px', lineHeight: 1.6 }} className="sans">{sdaCat.description}</p>
        <h3 className="serif" style={{ fontSize: 18, fontWeight: 500, margin: '0 0 12px' }}>Required design features</h3>
        <div style={{ marginBottom: 32 }}>
          {sdaCat.keyFeatures.map((feature, i) => (
            <div key={i} style={{ padding: '14px 16px', background: 'white', border: '1px solid #e0d9cd', marginBottom: 6, fontSize: 13, lineHeight: 1.5, display: 'flex', gap: 12, alignItems: 'flex-start' }} className="sans">
              <div style={{ width: 24, height: 24, background: '#b8763e', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }} className="mono">{i + 1}</div>
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <h3 className="serif" style={{ fontSize: 18, fontWeight: 500, margin: '0 0 12px' }}>Universal SDA Design Standard requirements</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {['Pedestrian entry', 'Car parking', 'Doorways', 'Corridors', 'Windows', 'Sanitary facilities', 'Kitchen', 'Laundry', 'Bedroom', 'Living area', 'Switches and powerpoints', 'Flooring', 'Internal stairways', 'External areas', 'Storage', 'Luminance contrast', 'Heating and cooling', 'Emergency power', 'Assistive technology', 'Fire-safe design'].map((item, i) => (
            <div key={i} style={{ padding: '10px 14px', background: '#f5f1ea', fontSize: 11, fontWeight: 500 }} className="sans">{item}</div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ position: 'sticky', top: 100 }}>
          <div className="card" style={{ marginBottom: 16, background: '#1a1a1a', color: '#f5f1ea', borderColor: '#1a1a1a' }}>
            <div style={{ fontSize: 9, letterSpacing: 2.5, color: '#b8763e', fontWeight: 600, marginBottom: 12 }} className="sans">CATEGORY ECONOMICS</div>
            <h3 className="serif" style={{ fontSize: 18, fontWeight: 500, margin: '0 0 16px', lineHeight: 1.3 }}>{project.sdaCategory}</h3>
            <div style={{ fontSize: 11, lineHeight: 1.7, color: '#d4ccba' }} className="sans">
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#888', marginBottom: 2 }}>Build cost premium</div>
                <div style={{ fontSize: 14, color: '#f5f1ea', fontWeight: 500 }} className="mono">+{Math.round(sdaCat.estimatedPremium * 100)}%</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#888', marginBottom: 2 }}>Annual SDA funding (per resident)</div>
                <div style={{ fontSize: 13, color: '#f5f1ea', fontWeight: 500 }} className="mono">{sdaCat.annualSDAFundingRange}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#888', marginBottom: 2 }}>Typical participants</div>
                <div style={{ fontSize: 12, color: '#d4ccba' }}>{sdaCat.typicalParticipants}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <h3 className="serif" style={{ fontSize: 14, fontWeight: 500, margin: '0 0 12px' }}>Switch category</h3>
            <select value={project.sdaCategory} onChange={e => updateProject({ sdaCategory: e.target.value })}>
              {Object.keys(SDA_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function CostsTab({ cost, project, stateRules, updateCostOverride, resetCostOverrides }) {
  if (!cost) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }} className="sans">Set project type to see cost estimate.</div>;
  const hasOverrides = Object.values(project.costOverrides || {}).some(v => v !== '' && v !== null && v !== undefined);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 32, maxWidth: 1100 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>Cost estimate</h2>
          {hasOverrides && (
            <button className="btn-ghost" onClick={resetCostOverrides}>
              <RotateCcw size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Reset overrides
            </button>
          )}
        </div>
        <div style={{ padding: 14, background: '#fffbf5', border: '1px solid #e8d9bf', fontSize: 12, lineHeight: 1.5, marginBottom: 24 }} className="sans">
          <strong style={{ color: '#b8763e' }}>Override any line item with your real numbers from SDA Screener.</strong> Defaults are industry averages — your numbers always win.
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="serif" style={{ fontSize: 16, fontWeight: 500, margin: '0 0 4px' }}>Floor area & build rate</h3>
          <p style={{ fontSize: 11, color: '#888', margin: '0 0 16px' }} className="sans">Calculated from project type. {cost.dwellings > 1 && `${cost.dwellings} dwellings combined.`}</p>
          <div style={{ fontSize: 13 }} className="sans">
            <CostRow label="Estimated floor area" value={`${cost.floorArea} m²`} />
            <CostRow label={`Build cost per m² (${stateRules.name})`} value={formatCurrency(cost.buildCostPerSqm)} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="serif" style={{ fontSize: 16, fontWeight: 500, margin: '0 0 16px' }}>Cost lines</h3>
          {Object.entries(cost.costLines).map(([key, line]) => (
            <CostLineEditable key={key} label={key} defaultValue={line.default} override={line.override} onChange={v => updateCostOverride(key, v)} />
          ))}
        </div>

        <div className="card" style={{ background: '#1a1a1a', color: '#f5f1ea', borderColor: '#1a1a1a' }}>
          <div style={{ fontSize: 10, letterSpacing: 2.5, color: '#b8763e', fontWeight: 600, marginBottom: 8 }} className="sans">PROJECT TOTAL</div>
          <div className="serif" style={{ fontSize: 48, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em' }}>{formatCurrency(cost.grandTotal)}</div>
          <div style={{ fontSize: 11, color: '#d4ccba', marginTop: 8 }} className="sans">
            {cost.dwellings > 1 && `${formatCurrency(cost.perDwellingCost)} per dwelling. `}
            State multiplier: {stateRules.costMultiplier}x. Includes contingency.
          </div>
        </div>
      </div>

      <div>
        <div style={{ position: 'sticky', top: 100 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: '#b8763e', fontWeight: 600, marginBottom: 12 }} className="sans">REVENUE PROJECTION</div>
            <h3 className="serif" style={{ fontSize: 16, fontWeight: 500, margin: '0 0 16px' }}>Annual SDA funding</h3>
            <div style={{ fontSize: 12 }} className="sans">
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Low scenario</div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{formatCurrency(cost.annualRevenueLow)}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>High scenario</div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{formatCurrency(cost.annualRevenueHigh)}</div>
              </div>
              <div style={{ paddingTop: 12, borderTop: '1px solid #eee' }}>
                <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Gross yield</div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 500, color: '#b8763e' }}>{cost.yieldLow}% – {cost.yieldHigh}%</div>
              </div>
            </div>
          </div>
          <div className="card">
            <h3 className="serif" style={{ fontSize: 14, fontWeight: 500, margin: '0 0 8px' }}>Cost caveats</h3>
            <ul style={{ fontSize: 11, color: '#666', paddingLeft: 16, lineHeight: 1.6, margin: 0 }} className="sans">
              <li>Land cost not included</li>
              <li>Stamp duty, GST, holding costs excluded</li>
              <li>Use Screener feaso numbers as source of truth</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function CostLineEditable({ label, defaultValue, override, onChange }) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState(override || '');
  const isOverridden = override !== undefined && override !== null && override !== '';
  const finalValue = isOverridden ? parseInt(override) || 0 : defaultValue;

  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid #f0eadf', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }} className="sans">{label}</div>
        {isOverridden && <div style={{ fontSize: 10, color: '#888', marginTop: 2 }} className="sans">Default: {formatCurrency(defaultValue)} · <span style={{ color: '#b8763e', fontWeight: 600 }}>Your override</span></div>}
        {!isOverridden && <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }} className="sans">Industry default</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {editing ? (
          <>
            <span className="sans" style={{ fontSize: 12, color: '#888' }}>$</span>
            <input type="number" value={tempVal} onChange={e => setTempVal(e.target.value)}
              onBlur={() => { onChange(tempVal); setEditing(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { onChange(tempVal); setEditing(false); } if (e.key === 'Escape') { setTempVal(override || ''); setEditing(false); } }}
              autoFocus style={{ width: 120, padding: '4px 8px', textAlign: 'right' }} placeholder={defaultValue.toString()} className="mono" />
          </>
        ) : (
          <>
            <div className="mono" style={{ fontSize: 14, fontWeight: isOverridden ? 600 : 400, color: isOverridden ? '#b8763e' : '#1a1a1a', minWidth: 100, textAlign: 'right' }}>
              {formatCurrency(finalValue)}
            </div>
            <button onClick={() => { setTempVal(override || ''); setEditing(true); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#888' }} title="Edit">
              <Edit3 size={12} />
            </button>
            {isOverridden && (
              <button onClick={() => onChange('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#888' }} title="Reset to default">
                <RotateCcw size={12} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CostRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0eadf', gap: 16 }}>
      <span style={{ color: '#444' }}>{label}</span>
      <span className="mono" style={{ whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function ResourcesTab({ stateRules, project, updateProject }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 32, maxWidth: 1100 }}>
      <div>
        <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: '0 0 24px', letterSpacing: '-0.01em' }}>Resources</h2>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="serif" style={{ fontSize: 16, fontWeight: 500, margin: '0 0 12px' }}>{stateRules.name} Council planning portals</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {stateRules.councilLookups.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                 style={{ padding: '10px 14px', border: '1px solid #e0d9cd', fontSize: 12, color: '#1a1a1a', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="sans">
                <span>{link.name}</span>
                <ExternalLink size={11} style={{ color: '#888' }} />
              </a>
            ))}
          </div>
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="serif" style={{ fontSize: 16, fontWeight: 500, margin: '0 0 12px' }}>NDIS / SDA references</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'SDA Design Standard', url: 'https://www.ndis.gov.au/providers/housing-and-living-supports-and-services/specialist-disability-accommodation/sda-design-standard' },
              { label: 'SDA Pricing Arrangements', url: 'https://www.ndis.gov.au/providers/housing-and-living-supports-and-services/specialist-disability-accommodation/sda-pricing-and-payments' },
              { label: 'National Construction Code', url: 'https://ncc.abcb.gov.au/' },
              { label: 'Housing Hub (NDIS)', url: 'https://www.housinghub.org.au/' },
            ].map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                 style={{ padding: '10px 14px', border: '1px solid #e0d9cd', fontSize: 12, color: '#1a1a1a', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="sans">
                <span>{r.label}</span>
                <ExternalLink size={11} style={{ color: '#888' }} />
              </a>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="serif" style={{ fontSize: 16, fontWeight: 500, margin: '0 0 12px' }}>Project notes</h3>
          <textarea rows={8} value={project.notes || ''} onChange={e => updateProject({ notes: e.target.value })} placeholder="Track decisions, contractors, dates, contacts…" />
        </div>
      </div>
      <div>
        <div style={{ position: 'sticky', top: 100 }}>
          <div className="card">
            <h3 className="serif" style={{ fontSize: 14, fontWeight: 500, margin: '0 0 12px' }}>SDA configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label>SDA Category</label>
                <select value={project.sdaCategory} onChange={e => updateProject({ sdaCategory: e.target.value })}>
                  {Object.keys(SDA_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label>Building Class</label>
                <select value={project.buildingClass} onChange={e => updateProject({ buildingClass: e.target.value })}>
                  <option>Class 1a</option><option>Class 1b</option><option>Class 3</option><option>Class 2</option>
                </select>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5, padding: 16, marginTop: 16 }} className="sans">
            <strong>Disclaimer:</strong> Guidance only. All approvals must be obtained from your local council, private certifier, and accredited SDA assessor.
          </div>
        </div>
      </div>
    </div>
  );
}

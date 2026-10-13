import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NPCS, PARTY_OPTIONS, STATES, WORLD_VENUES } from './data.js';
import { createLocalPartyBranches } from './partyBranches.js';
import { PARTY_REGISTER_CHECKED_AT, PARTY_REGISTER_SOURCE } from './partyRegistry.js';
import { STATE_WORLD_PROFILES } from './stateWorldProfiles.js';
import { createLocalityVisualProfile } from './localityStyles.js';

const PALETTES = {
  coastal: { grass: '#859b7a', sand: '#c6b18a', water: '#5d9290', foliage: '#53745a' },
  southwest: { grass: '#93a87b', sand: '#c7b58c', water: '#789a89', foliage: '#55765a' },
  southeast: { grass: '#8ba67c', sand: '#c9b38b', water: '#6b9690', foliage: '#4f7659' },
  northcentral: { grass: '#a9a17b', sand: '#d0ba8e', water: '#7a988e', foliage: '#667852' },
  northeast: { grass: '#b4a17a', sand: '#d7bd91', water: '#7c9585', foliage: '#667552' },
  northwest: { grass: '#b6a17b', sand: '#d6b887', water: '#7e9582', foliage: '#687553' },
};

const REGIONAL_TONES = {
  upland: { grass: '#8b996f', sand: '#bc9871', water: '#5d8f91', foliage: '#4b704d', sky: '#bbc5b2' },
  river: { grass: '#929b70', sand: '#c1a879', water: '#4b8797', foliage: '#58794d', sky: '#bdc9bc' },
  coastal: { grass: '#7f9a78', sand: '#c9b18b', water: '#3e8997', foliage: '#3e7053', sky: '#b8c9c3' },
  savannah: { grass: '#a49d6b', sand: '#cbb07b', water: '#75958d', foliage: '#72794b', sky: '#c7c4a9' },
  delta: { grass: '#6e8b68', sand: '#b8a07c', water: '#347d86', foliage: '#37694d', sky: '#b5c7bd' },
  sahel: { grass: '#a79568', sand: '#d0ad76', water: '#80988a', foliage: '#6c7048', sky: '#cbbd9e' },
  forest: { grass: '#7c956b', sand: '#bd9c76', water: '#5b8988', foliage: '#3b6849', sky: '#b4c6b1' },
  highland: { grass: '#80947a', sand: '#b9ad93', water: '#698d8c', foliage: '#557352', sky: '#b7c4c4' },
  planned: { grass: '#96a078', sand: '#c7b48d', water: '#77989b', foliage: '#5a784e', sky: '#c0c9c0' },
  'sahel-city': { grass: '#a29165', sand: '#d1aa70', water: '#81968a', foliage: '#6b7148', sky: '#c9b99b' },
  confluence: { grass: '#89976d', sand: '#bea77c', water: '#3e8292', foliage: '#63774c', sky: '#bdc9bd' },
  'lagoon-city': { grass: '#718d70', sand: '#c2ae8d', water: '#348d98', foliage: '#47714f', sky: '#b8c8c2' },
  'urban-hills': { grass: '#8c946d', sand: '#bd9972', water: '#648d8e', foliage: '#58744a', sky: '#c1c5b4' },
  'mangrove-city': { grass: '#63856a', sand: '#b8a081', water: '#2f7882', foliage: '#32674c', sky: '#b2c5bf' },
  'highland-river': { grass: '#7a947b', sand: '#b8a98f', water: '#4f8790', foliage: '#4b724e', sky: '#b5c4c1' },
};

const ARCHITECTURE_PALETTES = {
  north: { houseColors: ['#d7c29d', '#c3a77e', '#e1d0aa', '#b89b73'], roofColors: ['#655b49', '#786a50', '#554f42'], compoundColor: '#c1b08d', awningColors: ['#bf8356', '#d6aa4e', '#71836b'], maxFloors: 2 },
  'north-urban': { houseColors: ['#d5c29d', '#c9ad7e', '#e1d0aa', '#b99c75'], roofColors: ['#655b49', '#786a50', '#554f42'], compoundColor: '#c1b08d', awningColors: ['#bf8356', '#d6aa4e', '#71836b'], maxFloors: 3 },
  southern: { houseColors: ['#dfc9a6', '#d8c6ac', '#b7c7ae', '#d8b7a7', '#d9d5be'], roofColors: ['#655c4f', '#716a5d', '#535d56'], compoundColor: '#c7b69b', awningColors: ['#d86f4c', '#eab94b', '#4d9980', '#577aaf'], maxFloors: 3 },
  coastal: { houseColors: ['#e0d1b5', '#d1c4a7', '#b8ccbb', '#d6b9a5'], roofColors: ['#5d655c', '#72685a', '#496258'], compoundColor: '#c9bea3', awningColors: ['#d7735e', '#e2b34e', '#489887', '#6288aa'], maxFloors: 3 },
  'middle-belt': { houseColors: ['#d8c5a2', '#ccb18a', '#c3c4a4', '#d9b79c'], roofColors: ['#655d4d', '#79705b', '#57635a'], compoundColor: '#c4b295', awningColors: ['#c67c58', '#d5ad4b', '#63886f'], maxFloors: 3 },
  upland: { houseColors: ['#d8c7a9', '#c9b398', '#b7c1a7', '#cbb4a4'], roofColors: ['#655f52', '#797163', '#536057'], compoundColor: '#c6b8a0', awningColors: ['#ce7957', '#d3ac4c', '#5e8e70'], maxFloors: 2 },
  planned: { houseColors: ['#ded9ca', '#c9d0c3', '#c7c9bf', '#d5c2a6'], roofColors: ['#59655f', '#727a75', '#4d5d60'], compoundColor: '#c8c9b9', awningColors: ['#d8795b', '#ddb84f', '#4b9b87'], maxFloors: 4 },
  'south-west': { houseColors: ['#dfc8a7', '#d2bd9e', '#bec7aa', '#d6b29a'], roofColors: ['#655e50', '#786f5d', '#4f5f57'], compoundColor: '#c6b59b', awningColors: ['#c96f4e', '#e1b54b', '#58856c'], maxFloors: 3 },
  'south-west-urban': { houseColors: ['#ded0b5', '#d0c4a9', '#b8c7b6', '#d6b3a0'], roofColors: ['#625c50', '#766c5b', '#52625a'], compoundColor: '#c5b8a0', awningColors: ['#d36d4b', '#e2b54c', '#4c9276'], maxFloors: 4 },
  'coastal-urban': { houseColors: ['#e1d5bf', '#d0c4aa', '#b4c9bd', '#d6b9a7'], roofColors: ['#58665f', '#766d5d', '#475e5d'], compoundColor: '#c6bda8', awningColors: ['#d96f57', '#e2b44d', '#459a8b'], maxFloors: 5 },
};

const WET_KINDS = new Set(['river', 'coastal', 'delta', 'confluence', 'lagoon-city', 'mangrove-city', 'highland-river']);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const hash = (value) => {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return result >>> 0;
};
const seeded = (seed) => {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

function labelSprite(text, accent = '#d8f36b') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(9,18,15,0.91)';
  context.beginPath();
  context.roundRect(8, 10, 496, 108, 23);
  context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(8, 10, 496, 108, 23);
  context.stroke();
  context.fillStyle = accent;
  context.fillRect(25, 34, 9, 60);
  context.font = '700 36px Arial, sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillStyle = '#f7f7ed';
  context.fillText(text.toUpperCase().slice(0, 22), 55, 65);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(4.9, 1.22, 1);
  return sprite;
}

function box(w, h, d, color, opts = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.78, metalness: opts.metalness ?? 0.02 })
  );
  if (opts.castShadow !== false) mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addDoorPortal(parent, { id, title, type = 'building', accent = '#e3b84d', partyId = null, metadata = null, x = 0, z = 0, width = 0.8, height = 1.25 }) {
  const portal = new THREE.Group();
  portal.position.set(x, 0, z);
  portal.name = `door-${id}`;
  const frame = box(width + 0.2, height + 0.16, 0.12, '#584a39', { castShadow: false });
  frame.position.y = height / 2;
  portal.add(frame);
  const door = box(width, height, 0.045, '#384c42', { castShadow: false, roughness: 0.68 });
  door.position.set(0, height / 2, 0.08);
  door.userData.interaction = { id, title, type, partyId, metadata };
  door.userData.isDoorPortal = true;
  portal.add(door);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: '#e1c36d', metalness: 0.55, roughness: 0.35 }));
  handle.position.set(width * 0.28, height * 0.49, 0.115);
  portal.add(handle);
  const lintel = box(width + 0.42, 0.16, 0.18, accent, { castShadow: false });
  lintel.position.set(0, height + 0.13, 0.015);
  portal.add(lintel);
  const sign = labelSprite(title, accent);
  sign.position.set(0, height + 0.58, 0.15);
  sign.scale.set(2.15, 0.54, 1);
  portal.add(sign);
  parent.add(portal);
  return door;
}

function makeTree(x, z, height, foliageColor, material) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, height * 0.48, 7), material.trunk);
  trunk.position.y = height * 0.24;
  trunk.castShadow = true;
  group.add(trunk);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(height * 0.43, 1), new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.9 }));
  crown.position.y = height * 0.68;
  crown.scale.set(1.05, 1.12, 0.95);
  crown.castShadow = true;
  group.add(crown);
  group.position.set(x, 0, z);
  return group;
}

function makePalmTree(x, z, height, foliageColor) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, height, 7), new THREE.MeshStandardMaterial({ color: '#886746', roughness: 0.94 }));
  trunk.position.y = height / 2;
  trunk.castShadow = true;
  group.add(trunk);
  const leaves = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.93, side: THREE.DoubleSide });
  for (let frond = 0; frond < 7; frond += 1) {
    const angle = (frond / 7) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 0.22), leaves);
    leaf.position.set(Math.cos(angle) * 0.42, height * 0.94, Math.sin(angle) * 0.42);
    leaf.rotation.y = -angle;
    leaf.rotation.z = -0.42;
    leaf.castShadow = true;
    group.add(leaf);
  }
  group.position.set(x, 0, z);
  return group;
}

function makeSavannahTree(x, z, height, foliageColor) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, height * 0.72, 7), new THREE.MeshStandardMaterial({ color: '#805e3e', roughness: 0.95 }));
  trunk.position.y = height * 0.36;
  trunk.castShadow = true;
  group.add(trunk);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(height * 0.27, 9, 6), new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.94 }));
  crown.position.y = height * 0.77;
  crown.scale.set(1.75, 0.62, 1.3);
  crown.castShadow = true;
  group.add(crown);
  group.position.set(x, 0, z);
  return group;
}

function makeMangroveTree(x, z, height, foliageColor) {
  const group = new THREE.Group();
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#665b3f', roughness: 0.95 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, height * 0.68, 7), trunkMaterial);
  trunk.position.y = height * 0.34;
  trunk.castShadow = true;
  group.add(trunk);
  for (let root = 0; root < 5; root += 1) {
    const angle = (root / 5) * Math.PI * 2;
    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.07, height * 0.48, 5), trunkMaterial);
    prop.position.set(Math.cos(angle) * 0.26, height * 0.18, Math.sin(angle) * 0.26);
    prop.rotation.z = Math.cos(angle) * 0.48;
    prop.rotation.x = Math.sin(angle) * 0.48;
    group.add(prop);
  }
  const canopyMaterial = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.94 });
  for (let crownIndex = 0; crownIndex < 3; crownIndex += 1) {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(height * (0.27 + crownIndex * 0.025), 1), canopyMaterial);
    crown.position.set((crownIndex - 1) * 0.36, height * (0.7 + (crownIndex % 2) * 0.06), (crownIndex % 2) * 0.22);
    crown.castShadow = true;
    group.add(crown);
  }
  group.position.set(x, 0, z);
  return group;
}

function makeRegionalTree(x, z, height, palette, material, rand) {
  if (palette.vegetation === 'mangrove') return makeMangroveTree(x, z, height, palette.foliage);
  if (palette.vegetation === 'dry' || palette.vegetation === 'savannah') return makeSavannahTree(x, z, height, palette.foliage);
  if (palette.vegetation === 'palm' && rand() > 0.34) return makePalmTree(x, z, height, palette.foliage);
  return makeTree(x, z, height, palette.foliage, material);
}

function makeBuilding(rand, x, z, index, palette, localityStyle = null) {
  const group = new THREE.Group();
  const form = localityStyle?.form || 'mixed';
  const widthBias = form === 'shopfront' || form === 'glass-front' ? 0.72 : form === 'courtyard' ? 0.9 : 1;
  const w = (2.1 + rand() * 2.5) * widthBias;
  const d = 2.2 + rand() * 2.3;
  const floors = 1 + Math.floor(rand() * (palette.maxFloors || 4));
  const h = 1.6 + floors * 0.78;
  if (form === 'stilt') {
    const supports = new THREE.Group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const post = box(0.13, 0.72, 0.13, '#866c4c', { castShadow: false });
      post.position.set(sx * (w / 2 - 0.16), 0.36, sz * (d / 2 - 0.16));
      supports.add(post);
    }
    group.add(supports);
  } else if (form === 'stone-base') {
    const base = box(w + 0.2, 0.32, d + 0.2, '#9a8a72', { castShadow: false });
    base.position.y = 0.16;
    group.add(base);
  }
  const wallColors = palette.houseColors || ['#dfc9a6', '#d8c6ac', '#b7c7ae', '#d8b7a7', '#d9d5be', '#b2c0b5', '#c5bba7', '#e0d2b7'];
  const wall = box(w, h, d, wallColors[Math.floor(rand() * wallColors.length)]);
  wall.position.y = h / 2;
  group.add(wall);
  const roofColors = palette.roofColors || ['#655c4f', '#716a5d', '#535d56'];
  const roof = box(w + 0.12, 0.18, d + 0.12, roofColors[index % roofColors.length]);
  roof.position.y = h + 0.09;
  group.add(roof);
  // Flat-roofed compounds, modest balconies, and shade canopies are common visual cues in many Nigerian city neighbourhoods.
  if (floors >= 2 && index % 4 === 2) {
    const balcony = box(w * 0.62, 0.12, 0.55, '#c8b99f', { castShadow: false });
    balcony.position.set(0, 1.47, d / 2 + 0.24);
    group.add(balcony);
    const rail = box(w * 0.62, 0.07, 0.055, '#525b53', { castShadow: false });
    rail.position.set(0, 1.82, d / 2 + 0.5);
    group.add(rail);
    for (const side of [-1, 0, 1]) {
      const post = box(0.055, 0.38, 0.055, '#525b53', { castShadow: false });
      post.position.set(side * w * 0.25, 1.63, d / 2 + 0.5);
      group.add(post);
    }
  }
  const awningColors = palette.awningColors || ['#d86f4c', '#eab94b', '#4d9980', '#577aaf'];
  const awningColor = awningColors[Math.floor(rand() * awningColors.length)];
  if (rand() > 0.38) {
    const awning = box(w * 0.85, 0.16, 0.36, awningColor, { castShadow: false });
    awning.position.set(0, 0.92, d / 2 + 0.12);
    group.add(awning);
  }
  const facadeAccent = localityStyle?.accent || palette.accent || '#d8f36b';
  if (form === 'shopfront' || form === 'glass-front') {
    const shopGlass = box(w * 0.78, 0.62, 0.055, form === 'glass-front' ? '#79a9a4' : '#49645d', { castShadow: false, metalness: 0.17, roughness: 0.3 });
    shopGlass.position.set(0, 0.7, d / 2 + 0.06);
    group.add(shopGlass);
    const shopSign = box(w * 0.86, 0.22, 0.08, facadeAccent, { castShadow: false });
    shopSign.position.set(0, 1.17, d / 2 + 0.09);
    group.add(shopSign);
    for (const side of [-1, 1]) {
      const jamb = box(0.09, 0.7, 0.09, '#eee1c1', { castShadow: false });
      jamb.position.set(side * w * 0.42, 0.7, d / 2 + 0.09);
      group.add(jamb);
    }
  }
  if (form === 'verandah') {
    const veranda = box(w * 0.92, 0.12, 0.74, facadeAccent, { castShadow: false });
    veranda.position.set(0, 1.58, d / 2 + 0.28);
    group.add(veranda);
    for (const postX of [-w * 0.39, w * 0.39]) {
      const verandaPost = box(0.08, 1.15, 0.08, '#8a775e', { castShadow: false });
      verandaPost.position.set(postX, 0.96, d / 2 + 0.56);
      group.add(verandaPost);
    }
  }
  const windowMat = new THREE.MeshStandardMaterial({ color: form === 'glass-front' ? '#8ab8b0' : rand() > 0.65 ? '#d3e0ca' : '#41534e', roughness: 0.42, metalness: 0.12 });
  const columns = Math.max(2, Math.floor(w / 0.65));
  const rows = Math.max(1, Math.floor(h / 0.9));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const windowX = -w / 2 + 0.38 + col * ((w - 0.55) / Math.max(1, columns - 1));
      const windowY = 0.54 + row * 0.73;
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.31, 0.055), windowMat);
      win.position.set(windowX, windowY, d / 2 + 0.035);
      group.add(win);
      if (index % 2 === 0 && row === 0) {
        for (const barOffset of [-0.075, 0, 0.075]) {
          const grille = box(0.025, 0.35, 0.035, '#59645a', { castShadow: false, metalness: 0.28, roughness: 0.55 });
          grille.position.set(windowX + barOffset, windowY, d / 2 + 0.08);
          group.add(grille);
        }
      }
    }
  }
  if (index % 4 === 1) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.48, 9), new THREE.MeshStandardMaterial({ color: '#738b80', roughness: 0.55 }));
    tank.position.set(w * 0.25, h + 0.43, -d * 0.18);
    tank.castShadow = true;
    group.add(tank);
  }
  if (index % 3 === 0) {
    const plotW = w + 1.25;
    const plotD = d + 1.35;
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(plotW, plotD), new THREE.MeshStandardMaterial({ color: ['#a98260', '#9d805d', '#b49772'][index % 3], roughness: 0.98 }));
    yard.rotation.x = -Math.PI / 2;
    yard.position.set(0, 0.018, 0.05);
    yard.receiveShadow = true;
    group.add(yard);
    const compoundColor = palette.compoundColor || ['#c8b99f', '#b7b09b', '#c7b99f'][index % 3];
    const wallHeight = 0.58;
    const wallThickness = 0.14;
    const gateWidth = 1.2;
    const frontRun = Math.max(0.8, (plotW - gateWidth) / 2);
    const sideWallL = box(wallThickness, wallHeight, plotD, compoundColor, { castShadow: false });
    sideWallL.position.set(-plotW / 2, wallHeight / 2, 0.05);
    const sideWallR = sideWallL.clone();
    sideWallR.position.x = plotW / 2;
    const rearWall = box(plotW, wallHeight, wallThickness, compoundColor, { castShadow: false });
    rearWall.position.set(0, wallHeight / 2, -plotD / 2 + 0.05);
    group.add(sideWallL, sideWallR, rearWall);
    for (const side of [-1, 1]) {
      const frontWall = box(frontRun, wallHeight, wallThickness, compoundColor, { castShadow: false });
      frontWall.position.set(side * (gateWidth / 2 + frontRun / 2), wallHeight / 2, plotD / 2 + 0.05);
      group.add(frontWall);
      const gatePost = box(0.18, 0.86, 0.18, '#88785e', { castShadow: false });
      gatePost.position.set(side * gateWidth / 2, 0.43, plotD / 2 + 0.05);
      group.add(gatePost);
    }
    const gateRail = box(gateWidth * 0.88, 0.065, 0.055, '#46524b', { castShadow: false, metalness: 0.25 });
    gateRail.position.set(0, 0.73, plotD / 2 + 0.05);
    group.add(gateRail);
    for (let gateBar = -3; gateBar <= 3; gateBar += 1) {
      const bar = box(0.035, 0.62, 0.045, '#46524b', { castShadow: false, metalness: 0.25 });
      bar.position.set(gateBar * 0.16, 0.36, plotD / 2 + 0.05);
      group.add(bar);
    }
    if (index % 2 === 0) {
      const generator = box(0.45, 0.34, 0.32, '#4f554d', { castShadow: false, metalness: 0.14 });
      generator.position.set(plotW / 2 - 0.38, 0.18, plotD / 2 - 0.36);
      group.add(generator);
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 6), new THREE.MeshStandardMaterial({ color: '#3d413b' }));
      exhaust.position.set(plotW / 2 - 0.46, 0.44, plotD / 2 - 0.36);
      group.add(exhaust);
    }
  }
  if (index % 5 === 2) {
    const acUnit = box(0.48, 0.28, 0.24, '#ded9c9', { castShadow: false, metalness: 0.08 });
    acUnit.position.set(w / 2 + 0.12, 1.75, -d * 0.15);
    group.add(acUnit);
    for (let vent = -1; vent <= 1; vent += 1) {
      const slat = box(0.26, 0.025, 0.025, '#6d756d', { castShadow: false });
      slat.position.set(w / 2 + 0.25, 1.75 + vent * 0.06, -d * 0.15 + 0.13);
      group.add(slat);
    }
  }
  if (index % 7 === 0) {
    const dish = new THREE.Mesh(new THREE.CircleGeometry(0.27, 12), new THREE.MeshStandardMaterial({ color: '#a6aaa0', metalness: 0.4, roughness: 0.52, side: THREE.DoubleSide }));
    dish.position.set(-w * 0.22, h + 0.19, -d * 0.22);
    dish.rotation.x = -0.7;
    group.add(dish);
  }
  addDoorPortal(group, { id: `home-${index}`, title: form === 'shopfront' ? 'Neighbourhood shop' : 'Community home', accent: facadeAccent, type: 'building', x: 0, z: d / 2 + 0.09, width: 0.54, height: 1.12 });
  group.position.set(x, 0, z);
  group.userData.groundHeight = palette.grass;
  return group;
}

function makePartyOffice(party, branch, x, z) {
  const group = new THREE.Group();
  const color = party.color || '#3b8c72';
  const base = box(3.55, 0.18, 3.65, '#b5a27f', { castShadow: false });
  base.position.y = 0.09;
  group.add(base);
  const front = box(3.05, 2.35, 2.28, '#d8c5a4');
  front.position.set(0, 1.28, 0.06);
  group.add(front);
  const roof = box(3.28, 0.22, 2.5, '#4a5248');
  roof.position.set(0, 2.58, 0.06);
  group.add(roof);
  const awning = box(3.14, 0.17, 0.58, color, { castShadow: false });
  awning.position.set(0, 1.82, 1.15);
  group.add(awning);
  const glass = box(1.1, 0.6, 0.055, '#52736d', { castShadow: false, metalness: 0.12, roughness: 0.3 });
  glass.position.set(-0.78, 0.96, 1.22);
  group.add(glass);
  const sign = box(2.85, 0.42, 0.12, color, { castShadow: false });
  sign.position.set(0, 2.2, 1.29);
  group.add(sign);
  const acronym = labelSprite(party.tag, '#fff5d7');
  acronym.position.set(0, 2.2, 1.38);
  acronym.scale.set(1.85, 0.46, 1);
  group.add(acronym);
  for (const side of [-1, 1]) {
    const column = box(0.13, 1.75, 0.13, '#efe3c9', { castShadow: false });
    column.position.set(side * 1.38, 0.97, 1.18);
    group.add(column);
  }
  const flag = box(0.46, 0.26, 0.035, color, { castShadow: false });
  flag.position.set(-1.28, 2.82, 0.72);
  group.add(flag);
  addDoorPortal(group, { id: `party-office-${party.id}`, title: `${party.tag} office`, type: 'party-office', partyId: party.id, accent: color, x: 0.48, z: 1.25, width: 0.56, height: 1.26, metadata: { partyId: party.id, partyName: party.name, branch } });
  group.position.set(x, 0, z);
  group.userData.partyId = party.id;
  group.userData.branch = branch;
  return group;
}

function makeCar(color, kind = 'sedan', accent = '#f1d846') {
  const g = new THREE.Group();
  const bus = ['bus', 'danfo', 'brt', 'minibus', 'city-bus', 'shuttle'].includes(kind);
  const keke = ['keke', 'tricycle'].includes(kind);
  const motorcycle = ['okada', 'motorcycle'].includes(kind);
  const pickup = kind === 'pickup';
  const bodyLength = bus ? 2.12 : keke ? 1.16 : pickup ? 1.7 : motorcycle ? 0.74 : kind === 'suv' ? 1.62 : 1.45;
  const bodyWidth = motorcycle ? 0.36 : keke ? 0.72 : bus ? 1.02 : 0.9;
  const body = box(bodyLength, bus ? 0.66 : motorcycle ? 0.23 : 0.38, bodyWidth, color, { roughness: 0.43, metalness: 0.08 });
  body.position.set(0, bus ? 0.59 : motorcycle ? 0.56 : 0.42, 0);
  g.add(body);
  const cabin = bus
    ? box(1.45, 0.62, bodyWidth * 0.84, '#304b46', { roughness: 0.28, metalness: 0.12 })
    : keke
      ? box(0.74, 0.43, bodyWidth * 0.9, '#31554b', { roughness: 0.32, metalness: 0.08 })
      : motorcycle
        ? box(0.28, 0.34, 0.25, '#222b29', { roughness: 0.4 })
        : box(pickup ? 0.8 : 0.76, pickup ? 0.44 : 0.42, bodyWidth * 0.83, kind === 'suv' ? '#374e46' : '#303f3e', { roughness: 0.31, metalness: 0.1 });
  cabin.position.set(-0.08, bus ? 1.18 : motorcycle ? 0.78 : keke ? 0.8 : 0.74, 0);
  g.add(cabin);
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#202522', roughness: 0.97 });
  if (motorcycle) {
    for (const wheelX of [-0.3, 0.31]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 7, 11), wheelMat);
      wheel.position.set(wheelX, 0.22, 0);
      g.add(wheel);
    }
    const rider = makePerson('#d5a542', '#704a35');
    rider.scale.set(0.48, 0.48, 0.48);
    rider.position.set(-0.03, 0.36, 0);
    rider.userData.legs?.forEach((leg) => { leg.rotation.x = -0.45; });
    g.add(rider);
  } else {
    for (const x of [-bodyLength * 0.32, bodyLength * 0.32]) {
      for (const z of [-bodyWidth * 0.51, bodyWidth * 0.51]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 9), wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, 0.2, z);
        g.add(wheel);
      }
    }
  }
  if (bus) {
    for (let i = 0; i < 4; i += 1) {
      const window = box(0.32, 0.25, 0.04, '#9bc3bd', { castShadow: false, metalness: 0.1, roughness: 0.25 });
      window.position.set(-0.58 + i * 0.38, 1.22, bodyWidth * 0.44);
      g.add(window);
    }
    const stripe = box(1.86, 0.12, bodyWidth + 0.035, accent, { castShadow: false });
    stripe.position.set(-0.02, 0.69, 0);
    g.add(stripe);
    const destination = labelSprite(kind === 'brt' ? 'BRT' : kind === 'danfo' ? 'LAGOS' : 'CITY BUS', '#fff5d7');
    destination.position.set(0.13, 1.5, bodyWidth * 0.46);
    destination.scale.set(1.25, 0.33, 1);
    g.add(destination);
  }
  if (keke) {
    const hood = box(0.34, 0.29, 0.66, '#e6cf55');
    hood.position.set(0.48, 0.49, 0);
    g.add(hood);
    const roof = box(0.78, 0.09, 0.74, accent || '#387a55');
    roof.position.set(-0.05, 1.05, 0);
    g.add(roof);
  }
  if (pickup) {
    const bed = box(0.56, 0.18, 0.82, '#525c56', { castShadow: false });
    bed.position.set(0.56, 0.7, 0);
    g.add(bed);
  }
  const vehicleTitle = motorcycle ? 'Okada motorcycle' : keke ? 'Keke Napep' : bus ? (kind === 'danfo' ? 'Danfo minibus' : kind === 'brt' ? 'BRT bus' : 'Public bus') : pickup ? 'Pickup vehicle' : kind === 'taxi' ? 'Yellow taxi' : 'Nigerian car';
  const vehicleDoor = addDoorPortal(g, { id: `vehicle-${kind}-${color.replace('#', '')}`, title: vehicleTitle, type: 'vehicle', accent, x: -0.12, z: bodyWidth / 2 + 0.035, width: 0.38, height: 0.68, metadata: { kind } });
  if (motorcycle) {
    vehicleDoor.visible = false;
    const touchTarget = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    touchTarget.position.set(0, 0.55, 0);
    touchTarget.userData.interaction = { id: `vehicle-${kind}-${color.replace('#', '')}`, title: vehicleTitle, type: 'vehicle', metadata: { kind } };
    g.add(touchTarget);
  }
  g.castShadow = true;
  return g;
}

function makeWaterTaxi(color = '#e9c94e', accent = '#257f89') {
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.62 }));
  hull.rotation.z = -Math.PI / 2;
  hull.scale.set(0.54, 0.42, 1);
  hull.position.y = 0.15;
  boat.add(hull);
  const cabin = box(0.62, 0.42, 0.53, '#f2eee0', { castShadow: false });
  cabin.position.set(-0.08, 0.48, 0);
  boat.add(cabin);
  const roof = box(0.73, 0.1, 0.64, accent, { castShadow: false });
  roof.position.set(-0.08, 0.74, 0);
  boat.add(roof);
  const glass = box(0.42, 0.18, 0.55, '#76abb0', { castShadow: false, metalness: 0.1, roughness: 0.28 });
  glass.position.set(-0.08, 0.51, 0.03);
  boat.add(glass);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.y = 0.4;
  hit.userData.interaction = { id: 'water-taxi', title: 'Water taxi', type: 'vehicle', metadata: { kind: 'water-taxi' } };
  boat.add(hit);
  return boat;
}

function makeStreetLight(scene, x, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 4.3, 7), new THREE.MeshStandardMaterial({ color: '#59625a', metalness: 0.2, roughness: 0.72 }));
  pole.position.set(x, 2.15, z);
  pole.castShadow = true;
  scene.add(pole);
  const arm = box(0.85, 0.075, 0.075, '#59625a', { castShadow: false, metalness: 0.2 });
  arm.position.set(x + 0.35, 4.17, z);
  scene.add(arm);
  const lamp = box(0.48, 0.16, 0.26, '#d7d8c3', { castShadow: false });
  lamp.position.set(x + 0.67, 4.08, z);
  scene.add(lamp);
}

function makeUtilityPole(scene, x, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 4.5, 7), new THREE.MeshStandardMaterial({ color: '#827760', roughness: 0.92 }));
  pole.position.set(x, 2.25, z);
  pole.castShadow = true;
  scene.add(pole);
  const crossarm = box(1.05, 0.1, 0.14, '#655e4e', { castShadow: false });
  crossarm.position.set(x, 4.42, z);
  scene.add(crossarm);
  for (const insulatorX of [-0.38, 0, 0.38]) {
    const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.15, 6), new THREE.MeshStandardMaterial({ color: '#c9c6b5', roughness: 0.75 }));
    insulator.position.set(x + insulatorX, 4.55, z);
    scene.add(insulator);
  }
}

function makeNigerianFlag(scene, x, z, scale = 1) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * scale, 0.05 * scale, 3.2 * scale, 7), new THREE.MeshStandardMaterial({ color: '#a9aa9a', metalness: 0.42, roughness: 0.48 }));
  pole.position.set(x, 1.6 * scale, z);
  scene.add(pole);
  const width = 0.84 * scale;
  const height = 0.48 * scale;
  ['#008751', '#f4f0df', '#008751'].forEach((color, index) => {
    const panel = box(width / 3, height, 0.025 * scale, color, { castShadow: false });
    panel.position.set(x + width / 2 + width * (index - 1) / 3, 2.78 * scale, z);
    scene.add(panel);
  });
}

function makeBusStop(scene, x, z) {
  const shelter = new THREE.Group();
  const roof = box(3.1, 0.15, 1.25, '#2d6d4c', { castShadow: false });
  roof.position.y = 2.1;
  shelter.add(roof);
  for (const px of [-1.35, 1.35]) {
    for (const pz of [-0.48, 0.48]) {
      const post = box(0.09, 2.0, 0.09, '#77796c', { castShadow: false });
      post.position.set(px, 1.0, pz);
      shelter.add(post);
    }
  }
  const bench = box(1.7, 0.11, 0.38, '#a37a4f', { castShadow: false });
  bench.position.set(0, 0.65, -0.22);
  shelter.add(bench);
  const sign = box(1.35, 0.48, 0.07, '#1d5139', { castShadow: false });
  sign.position.set(-0.88, 1.6, 0.56);
  shelter.add(sign);
  const signText = labelSprite('BUS STOP', '#d8f36b');
  signText.position.set(-0.88, 1.6, 0.61);
  signText.scale.set(1.2, 0.31, 1);
  shelter.add(signText);
  shelter.position.set(x, 0, z);
  scene.add(shelter);
}

function makeRoadsideStall(x, z, palette, accent, index = 0) {
  const group = new THREE.Group();
  const counter = box(1.7, 0.72, 1.05, ['#a87950', '#b98456', '#a98860'][index % 3]);
  counter.position.y = 0.42;
  group.add(counter);
  for (const sx of [-0.76, 0.76]) for (const sz of [-0.42, 0.42]) {
    const post = box(0.075, 1.68, 0.075, '#6a5b43', { castShadow: false });
    post.position.set(sx, 0.93, sz);
    group.add(post);
  }
  const awnings = palette.awningColors || ['#e0b34d', '#3d8b78', '#d9694f'];
  for (let stripe = 0; stripe < 4; stripe += 1) {
    const canopyStripe = box(0.44, 0.11, 1.32, stripe % 2 === 0 ? (index % 2 ? accent : awnings[index % awnings.length]) : awnings[(index + stripe) % awnings.length], { castShadow: false });
    canopyStripe.position.set(-0.66 + stripe * 0.44, 1.78, 0);
    group.add(canopyStripe);
  }
  const crateColors = ['#d47737', '#edc14e', '#6fa465'];
  crateColors.forEach((color, crateIndex) => {
    const produce = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    produce.position.set(-0.47 + crateIndex * 0.46, 0.92, 0.04);
    group.add(produce);
  });
  const sign = labelSprite(index % 2 ? 'FRESH FOOD' : 'MARKET', accent);
  sign.position.set(0, 1.45, 0.55);
  sign.scale.set(1.7, 0.44, 1);
  group.add(sign);
  group.position.set(x, 0, z);
  return group;
}

function makeLocalityMicroLandmark(locality, stateInfo, localityStyle, palette) {
  const group = new THREE.Group();
  const feature = localityStyle.microLandmark;
  const accent = localityStyle.accent || palette.accent || '#d8f36b';
  const base = new THREE.Mesh(new THREE.CircleGeometry(2.3, 24), new THREE.MeshStandardMaterial({ color: palette.sand, roughness: 0.95 }));
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.035;
  group.add(base);
  if (feature === 'water tank') {
    for (const [x, z] of [[-0.72, -0.58], [0.72, -0.58], [-0.72, 0.58], [0.72, 0.58]]) {
      const leg = box(0.12, 2.5, 0.12, '#59645a');
      leg.position.set(x, 1.25, z);
      group.add(leg);
    }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.94, 0.94, 0.78, 12), new THREE.MeshStandardMaterial({ color: '#76a8a8', roughness: 0.48, metalness: 0.08 }));
    tank.position.y = 2.73;
    group.add(tank);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.5, 12), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.65 }));
    cap.position.y = 3.36;
    group.add(cap);
  } else if (feature === 'market canopy') {
    const stall = makeRoadsideStall(0, 0, palette, accent, 2);
    group.add(stall);
  } else if (feature === 'bus shelter') {
    const roof = box(3.3, 0.16, 1.3, accent, { castShadow: false });
    roof.position.y = 2.05;
    group.add(roof);
    for (const x of [-1.45, 1.45]) for (const z of [-0.5, 0.5]) {
      const post = box(0.09, 1.92, 0.09, '#77796c', { castShadow: false });
      post.position.set(x, 0.96, z);
      group.add(post);
    }
    const bench = box(1.7, 0.12, 0.38, '#98734f');
    bench.position.set(0, 0.62, 0.12);
    group.add(bench);
  } else if (feature === 'civic roundabout') {
    const island = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.45, 0.45, 20), new THREE.MeshStandardMaterial({ color: '#7b9667' }));
    island.position.y = 0.23;
    group.add(island);
    const monument = box(0.55, 2.1, 0.55, accent);
    monument.position.y = 1.43;
    group.add(monument);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 7), new THREE.MeshStandardMaterial({ color: '#dfc46c' }));
    cap.position.y = 2.72;
    group.add(cap);
  } else if (feature === 'footbridge') {
    const deck = box(4.2, 0.22, 1.25, '#998a6c');
    deck.position.set(0, 1.35, 0);
    group.add(deck);
    for (const side of [-1, 1]) {
      const rail = box(4.2, 0.16, 0.08, accent, { castShadow: false });
      rail.position.set(0, 1.8, side * 0.57);
      group.add(rail);
      for (let x = -1.8; x <= 1.8; x += 0.9) {
        const post = box(0.08, 0.48, 0.08, '#86775e', { castShadow: false });
        post.position.set(x, 1.58, side * 0.57);
        group.add(post);
      }
    }
    for (const x of [-1.65, 1.65]) {
      const support = box(0.3, 1.3, 0.32, '#aaa18b');
      support.position.set(x, 0.67, 0);
      group.add(support);
    }
  } else {
    const hall = box(3.4, 1.8, 2.55, '#d5c4a2');
    hall.position.y = 0.95;
    group.add(hall);
    const roof = box(3.75, 0.22, 2.8, '#4b594e');
    roof.position.y = 1.98;
    group.add(roof);
    for (const x of [-1.15, 0, 1.15]) {
      const column = box(0.14, 1.3, 0.14, accent);
      column.position.set(x, 0.79, 1.34);
      group.add(column);
    }
  }
  const label = labelSprite(`${locality?.ward || stateInfo.capital} hub`, accent);
  label.position.set(0, feature === 'water tank' ? 4.15 : 3.05, 0.12);
  label.scale.set(3.4, 0.85, 1);
  group.add(label);
  addDoorPortal(group, { id: `locality-hub-${localityStyle.code}`, title: feature === 'community hall' ? 'Community hall' : feature, type: 'landmark', accent, x: 0, z: 1.68, width: 0.62, height: 1.18, metadata: { state: stateInfo.name, lga: locality?.lga, ward: locality?.ward, fictional: true } });
  group.position.set(17.5, 0, -17.5);
  group.name = `locality-micro-landmark-${localityStyle.code}`;
  return group;
}

function makePerson(shirt = '#f3a17b', skin = '#7d5138') {
  const group = new THREE.Group();
  const shirtMaterial = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.82 });
  const trouserMaterial = new THREE.MeshStandardMaterial({ color: '#363f38', roughness: 0.95 });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.86 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 3, 6), shirtMaterial);
  torso.position.y = 0.7;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skinMaterial);
  head.position.y = 1.22;
  head.castShadow = true;
  group.add(head);
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.43, 0);
    const trouser = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.24, 3, 6), trouserMaterial);
    trouser.position.y = -0.16;
    trouser.castShadow = true;
    leg.add(trouser);
    const shoe = box(0.14, 0.085, 0.25, '#292e2b', { castShadow: true });
    shoe.position.set(0, -0.34, 0.05);
    leg.add(shoe);
    group.add(leg);
    legs.push(leg);
  }
  group.userData.legs = legs;
  group.userData.torso = torso;
  return group;
}

function makeSeatedAttendee(shirt = '#d4b750', skin = '#7d5138') {
  const group = new THREE.Group();
  const shirtMaterial = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.84 });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.88 });
  const trouserMaterial = new THREE.MeshStandardMaterial({ color: '#37413b', roughness: 0.94 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.36, 3, 7), shirtMaterial);
  torso.position.set(0, 0.83, 0);
  torso.rotation.x = -0.08;
  torso.castShadow = true;
  group.add(torso);
  const hips = box(0.34, 0.18, 0.29, '#435044', { castShadow: true });
  hips.position.set(0, 0.58, 0);
  group.add(hips);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 9), skinMaterial);
  head.position.set(0, 1.24, 0.03);
  head.castShadow = true;
  group.add(head);
  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.23, 3, 6), trouserMaterial);
    thigh.rotation.x = Math.PI / 2;
    thigh.position.set(side * 0.12, 0.47, 0.2);
    group.add(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.22, 3, 6), trouserMaterial);
    shin.position.set(side * 0.12, 0.24, 0.39);
    group.add(shin);
    const shoe = box(0.16, 0.075, 0.24, '#292e2b', { castShadow: true });
    shoe.position.set(side * 0.12, 0.085, 0.49);
    group.add(shoe);
  }
  const makeArm = (side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.22, 0.96, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.2, 3, 5), shirtMaterial);
    upper.position.set(side * 0.045, -0.17, 0.025);
    upper.rotation.z = side * -0.16;
    arm.add(upper);
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.18, 3, 5), skinMaterial);
    forearm.position.set(side * 0.055, -0.37, 0.055);
    arm.add(forearm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.064, 8, 6), skinMaterial);
    hand.position.set(side * 0.055, -0.49, 0.06);
    arm.add(hand);
    arm.traverse((part) => { if (part.isMesh) part.castShadow = true; });
    group.add(arm);
    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  return { group, head, leftArm, rightArm };
}

function makeMeetingChair() {
  const chair = new THREE.Group();
  const metal = '#58645b';
  const seat = box(0.48, 0.08, 0.44, '#b49a70', { castShadow: false });
  seat.position.set(0, 0.5, 0);
  chair.add(seat);
  const back = box(0.46, 0.48, 0.07, '#8b795c', { castShadow: false });
  back.position.set(0, 0.77, -0.18);
  chair.add(back);
  for (const x of [-0.17, 0.17]) {
    for (const z of [-0.15, 0.15]) {
      const leg = box(0.045, 0.48, 0.045, metal, { castShadow: false, metalness: 0.16 });
      leg.position.set(x, 0.25, z);
      chair.add(leg);
    }
  }
  return chair;
}

function createSpeechBubble(text = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 220;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, opacity: 0.98 });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.9, 1.68, 1);
  const update = (name, body) => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(8,18,14,0.94)';
    context.strokeStyle = '#d8f36b';
    context.lineWidth = 5;
    context.beginPath();
    context.roundRect(10, 10, 620, 188, 26);
    context.fill();
    context.stroke();
    context.fillStyle = '#d8f36b';
    context.font = '700 21px Arial, sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText(String(name || 'SPEAKER').toUpperCase().slice(0, 34), 32, 27);
    context.fillStyle = '#f3f3e8';
    context.font = '600 24px Arial, sans-serif';
    const words = String(body || '').replace(/\s+/g, ' ').trim().slice(0, 115).split(' ');
    let line = '';
    let y = 66;
    let lines = 0;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > 565 && line) {
        context.fillText(line, 32, y);
        y += 34;
        lines += 1;
        line = word;
        if (lines >= 3) break;
      } else line = next;
    }
    if (line && lines < 3) context.fillText(line, 32, y);
    texture.needsUpdate = true;
  };
  update('THE FLOOR IS OPEN', text || 'Type a speech or reply to speak.');
  sprite.visible = false;
  return { sprite, update };
}

function makeStadium(group, material) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.7, 0.55, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#d5c7a5', side: THREE.DoubleSide, roughness: 0.84 }));
  base.rotation.x = 0;
  base.position.y = 0.5;
  group.add(base);
  const field = new THREE.Mesh(new THREE.CircleGeometry(1.92, 28), new THREE.MeshStandardMaterial({ color: '#619161', roughness: 0.96 }));
  field.rotation.x = -Math.PI / 2;
  field.position.y = 0.78;
  group.add(field);
  const inner = new THREE.Mesh(new THREE.RingGeometry(1.18, 1.67, 32), new THREE.MeshStandardMaterial({ color: '#c48e60', side: THREE.DoubleSide, roughness: 0.84 }));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.8;
  group.add(inner);
  const stands = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.2, 0.65, 28, 1, true), new THREE.MeshStandardMaterial({ color: '#b77857', side: THREE.DoubleSide, roughness: 0.84 }));
  stands.position.y = 0.64;
  group.add(stands);
  group.add(box(3.9, 0.12, 2.6, '#527052', { castShadow: false })).position.set(0, 0.21, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 3.3, 6), new THREE.MeshStandardMaterial({ color: '#6d756b', metalness: 0.23, roughness: 0.62 }));
      tower.position.set(sx * 2.9, 1.65, sz * 2.9);
      group.add(tower);
      const lights = box(0.55, 0.2, 0.18, '#e6dfb8', { castShadow: false, emissive: '#d2c98f', emissiveIntensity: 0.18 });
      lights.position.set(sx * 2.9, 3.22, sz * 2.9);
      group.add(lights);
    }
  }
  void material;
}

function makeVenue(venue, palette, sceneMaterials, stateLabel) {
  const g = new THREE.Group();
  const { x, z, type, color } = venue;
  if (type === 'stadium') {
    makeStadium(g, sceneMaterials);
  } else if (type === 'airport') {
    const runway = box(7.2, 0.07, 2.35, '#4c5551', { castShadow: false });
    runway.position.y = 0.07;
    g.add(runway);
    for (let i = 0; i < 7; i += 1) {
      const dash = box(0.43, 0.025, 0.08, '#ece6c8', { castShadow: false });
      dash.position.set(-2.5 + i * 0.83, 0.12, 0);
      g.add(dash);
    }
    const terminal = box(3.5, 0.9, 1.3, '#d7cfb6');
    terminal.position.set(0, 0.5, 2.1);
    g.add(terminal);
    const glass = box(2.4, 0.38, 0.07, '#78a8a3', { castShadow: false, metalness: 0.2 });
    glass.position.set(0, 0.59, 2.78);
    g.add(glass);
    const plane = new THREE.Group();
    const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.7, 4, 8), new THREE.MeshStandardMaterial({ color: '#ebe7d9', roughness: 0.48 }));
    fuselage.rotation.z = Math.PI / 2;
    fuselage.position.y = 0.9;
    plane.add(fuselage);
    const wing = box(0.36, 0.08, 2.5, '#a9b8ad');
    wing.position.set(0, 0.9, 0);
    plane.add(wing);
    plane.position.set(-1.5, 0.4, -0.15);
    plane.scale.set(0.8, 0.8, 0.8);
    g.add(plane);
  } else if (type === 'court' || type === 'assembly' || type === 'caucus' || type === 'office') {
    const width = type === 'assembly' ? 3.5 : 2.8;
    const main = box(width, type === 'assembly' ? 1.7 : 1.3, 2.35, type === 'court' ? '#d4d2c3' : '#d4bea0');
    main.position.y = type === 'assembly' ? 0.9 : 0.69;
    g.add(main);
    const roof = box(width + 0.32, 0.18, 2.6, type === 'court' ? '#9b9a87' : '#726c5a');
    roof.position.y = type === 'assembly' ? 1.83 : 1.38;
    g.add(roof);
    for (let i = -1; i <= 1; i += 1) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.15, 8), new THREE.MeshStandardMaterial({ color: '#ece7d4', roughness: 0.64 }));
      column.position.set(i * 0.72, 0.61, 1.2);
      column.castShadow = true;
      g.add(column);
    }
    const portico = box(3.05, 0.18, 0.46, '#e4ddc7');
    portico.position.set(0, 1.23, 1.33);
    g.add(portico);
    const steps = box(3.3, 0.18, 0.62, '#9d927a', { castShadow: false });
    steps.position.set(0, 0.11, 1.45);
    g.add(steps);
  } else if (type === 'market') {
    for (let i = 0; i < 4; i += 1) {
      const stall = new THREE.Group();
      const base = box(1.15, 0.65, 0.95, ['#c79563', '#b78455', '#d1a471'][i % 3]);
      base.position.y = 0.39;
      stall.add(base);
      const canopy = box(1.35, 0.16, 1.1, ['#e7a64d', '#be735a', '#658e71', '#547d99'][i]);
      canopy.position.set(0, 0.86, 0);
      stall.add(canopy);
      for (const px of [-0.52, 0.52]) {
        for (const pz of [-0.42, 0.42]) {
          const post = box(0.055, 0.77, 0.055, '#785c43', { castShadow: false });
          post.position.set(px, 0.43, pz);
          stall.add(post);
        }
      }
      for (let crate = 0; crate < 3; crate += 1) {
        const produce = box(0.27, 0.22, 0.25, ['#c95e43', '#71924d', '#e0a342'][crate], { castShadow: false });
        produce.position.set(-0.35 + crate * 0.34, 0.12, 0.53);
        stall.add(produce);
      }
      stall.position.set(-1.95 + i * 1.3, 0, (i % 2) * 1.15);
      g.add(stall);
    }
  } else if (type === 'square') {
    const base = new THREE.Mesh(new THREE.CircleGeometry(2.65, 30), new THREE.MeshStandardMaterial({ color: '#7d9b6f', roughness: 0.94 }));
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.025;
    g.add(base);
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(0.82, 22), new THREE.MeshStandardMaterial({ color: '#d4c6a2', roughness: 0.86 }));
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.06;
    g.add(plaza);
    const fountain = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.55, 16), new THREE.MeshStandardMaterial({ color: '#789e9b', metalness: 0.2, roughness: 0.35 }));
    fountain.position.y = 0.34;
    g.add(fountain);
    for (let benchIndex = 0; benchIndex < 4; benchIndex += 1) {
      const angle = (benchIndex / 4) * Math.PI * 2;
      const bench = new THREE.Group();
      const seat = box(1.25, 0.1, 0.34, '#8b6749', { castShadow: false });
      seat.position.y = 0.52;
      bench.add(seat);
      const back = box(1.25, 0.48, 0.09, '#8b6749', { castShadow: false });
      back.position.set(0, 0.78, -0.13);
      bench.add(back);
      for (const legX of [-0.48, 0.48]) {
        const leg = box(0.08, 0.48, 0.08, '#515c51', { castShadow: false });
        leg.position.set(legX, 0.27, 0);
        bench.add(leg);
      }
      bench.position.set(Math.cos(angle) * 1.9, 0, Math.sin(angle) * 1.9);
      bench.rotation.y = -angle;
      g.add(bench);
    }
  } else {
    const base = box(2.5, 0.9, 2.2, palette.sand);
    base.position.y = 0.48;
    g.add(base);
    const cap = box(2.75, 0.18, 2.4, '#746b58');
    cap.position.y = 1.0;
    g.add(cap);
  }

  if (['office', 'court', 'assembly', 'caucus'].includes(type)) {
    const compoundWidth = type === 'assembly' ? 5.6 : 4.8;
    const compoundDepth = 5.5;
    const wallHeight = 0.52;
    const wallColor = type === 'court' ? '#b8b9ad' : '#b7a88e';
    const compoundSideA = box(0.13, wallHeight, compoundDepth, wallColor, { castShadow: false });
    compoundSideA.position.set(-compoundWidth / 2, wallHeight / 2, 0.25);
    const compoundSideB = compoundSideA.clone();
    compoundSideB.position.x = compoundWidth / 2;
    const compoundRear = box(compoundWidth, wallHeight, 0.13, wallColor, { castShadow: false });
    compoundRear.position.set(0, wallHeight / 2, -compoundDepth / 2 + 0.25);
    g.add(compoundSideA, compoundSideB, compoundRear);
    const gateRun = (compoundWidth - 1.45) / 2;
    for (const side of [-1, 1]) {
      const frontWall = box(gateRun, wallHeight, 0.13, wallColor, { castShadow: false });
      frontWall.position.set(side * (0.725 + gateRun / 2), wallHeight / 2, compoundDepth / 2 + 0.25);
      g.add(frontWall);
      const post = box(0.2, 0.83, 0.2, '#82755e', { castShadow: false });
      post.position.set(side * 0.725, 0.415, compoundDepth / 2 + 0.25);
      g.add(post);
    }
    for (let bar = -4; bar <= 4; bar += 1) {
      const gateBar = box(0.035, 0.62, 0.045, '#48564d', { castShadow: false, metalness: 0.2 });
      gateBar.position.set(bar * 0.15, 0.34, compoundDepth / 2 + 0.25);
      g.add(gateBar);
    }
    if (type !== 'caucus') makeNigerianFlag(g, -1.55, 2.45, 0.68);
  }

  if (type !== 'square') {
    addDoorPortal(g, { id: `venue-${venue.id}`, title: venue.short || venue.label, type: 'venue', accent: color, x: 0, z: type === 'stadium' ? 3.0 : type === 'airport' ? 2.85 : 1.45, width: 0.82, height: 1.32, metadata: { venueId: venue.id, venueType: type } });
  }
  const pad = new THREE.Mesh(new THREE.CircleGeometry(type === 'stadium' ? 3.1 : 2.45, 30), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.105, depthWrite: false }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.045;
  pad.userData.venueId = venue.id;
  pad.userData.isHotspot = true;
  g.add(pad);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(type === 'stadium' ? 3.1 : 2.45, 0.07, 6, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.09;
  ring.userData.venueId = venue.id;
  ring.userData.isHotspot = true;
  g.add(ring);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color }));
  dot.position.set(0, type === 'stadium' ? 3.45 : 2.5, 0);
  dot.userData.venueId = venue.id;
  dot.userData.isHotspot = true;
  g.add(dot);
  const label = labelSprite(venue.short, color);
  label.position.set(0, type === 'stadium' ? 4.22 : 3.2, 0);
  label.userData.venueId = venue.id;
  label.userData.isHotspot = true;
  g.add(label);
  g.position.set(x, 0, z);
  g.userData.venueId = venue.id;
  g.userData.isHotspot = true;
  g.userData.title = venue.label;
  g.name = `landmark-${venue.id}-${stateLabel}`;
  return g;
}

function makeFlyover(scene, materials) {
  const road = box(22, 0.22, 2.4, '#404744', { castShadow: false });
  road.position.set(0, 2.05, -10.5);
  scene.add(road);
  const railA = box(22, 0.35, 0.12, '#d5c493', { castShadow: false });
  railA.position.set(0, 2.31, -11.7);
  scene.add(railA);
  const railB = railA.clone();
  railB.position.z = -9.3;
  scene.add(railB);
  for (let x = -8; x <= 8; x += 4) {
    const pier = box(0.52, 1.9, 0.52, '#b9b9a9');
    pier.position.set(x, 0.92, -10.5);
    scene.add(pier);
  }
  for (let x = -9; x <= 9; x += 3) {
    const dash = box(1.0, 0.015, 0.06, '#dfd6b2', { castShadow: false });
    dash.position.set(x, 2.17, -10.5);
    scene.add(dash);
  }
  void materials;
}

function addRegionalWater(scene, palette, kind, rand) {
  const depth = ['delta', 'mangrove-city', 'lagoon-city'].includes(kind) ? 15 : 10;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(80, depth), new THREE.MeshStandardMaterial({ color: palette.water, roughness: 0.38, metalness: 0.08 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.125, -30.2);
  water.receiveShadow = true;
  scene.add(water);
  const shoreline = box(80, 0.18, 0.58, palette.sand, { castShadow: false });
  shoreline.position.set(0, -0.03, -30.2 + depth / 2);
  scene.add(shoreline);
  const deck = box(11.2, 0.25, 1.45, '#8e8874');
  deck.position.set(0, 0.33, -24.8);
  scene.add(deck);
  for (const x of [-4.2, -2.1, 0, 2.1, 4.2]) {
    const pier = box(0.34, 0.85, 0.42, '#aaa18a');
    pier.position.set(x, -0.01, -24.8);
    scene.add(pier);
  }
  for (const side of [-1, 1]) {
    const rail = box(11.2, 0.21, 0.085, '#d4c7a4', { castShadow: false });
    rail.position.set(0, 0.56, -24.8 + side * 0.68);
    scene.add(rail);
  }
  const reedMaterial = new THREE.MeshStandardMaterial({ color: palette.foliage, roughness: 0.94 });
  for (let reedIndex = 0; reedIndex < 14; reedIndex += 1) {
    const x = -38 + rand() * 76;
    const reed = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.72 + rand() * 0.55, 5), reedMaterial);
    reed.position.set(x, 0.27, -24.0 - rand() * 0.8);
    reed.castShadow = true;
    scene.add(reed);
  }
}

function addRegionalRelief(scene, palette, profile, rand) {
  if (!profile || profile.relief < 0.28) return;
  const hillCount = Math.round(2 + profile.relief * 6);
  for (let hillIndex = 0; hillIndex < hillCount; hillIndex += 1) {
    let x = (rand() - 0.5) * 66;
    if (Math.abs(x) < 16) x = (x < 0 ? -1 : 1) * (18 + rand() * 13);
    const z = (rand() > 0.52 ? -1 : 1) * (22 + rand() * 13);
    const radius = 4.5 + rand() * 5.5;
    const height = 2.5 + profile.relief * (8 + rand() * 10);
    const hill = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7, 2), new THREE.MeshStandardMaterial({ color: hillIndex % 2 ? palette.sand : palette.foliage, roughness: 1 }));
    hill.position.set(x, height / 2 - 0.16, z);
    hill.rotation.y = rand() * Math.PI;
    hill.castShadow = true;
    hill.receiveShadow = true;
    scene.add(hill);
    if (profile.relief > 0.72) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.36, height * 0.47, 5, 1), new THREE.MeshStandardMaterial({ color: '#9b9380', roughness: 0.98 }));
      cap.position.set(x, height * 0.72, z);
      cap.rotation.y = rand() * Math.PI;
      scene.add(cap);
    }
  }
}

function landmarkFeature(label = '') {
  const text = label.toLowerCase();
  if (text.includes('stadium')) return 'stadium';
  if (text.includes('market')) return 'market';
  if (text.includes('palace')) return 'palace';
  if (text.includes('minaret')) return 'minaret';
  if (text.includes('mosque')) return 'mosque';
  if (text.includes('railway')) return 'railway';
  if (text.includes('bridge')) return 'bridge';
  if (text.includes('waterfront') || text.includes('marina') || text.includes('confluence')) return 'waterfront';
  if (text.includes('rock') || text.includes('hill') || text.includes('ridge')) return 'rock';
  if (text.includes('park') || text.includes('garden') || text.includes('wildlife')) return 'park';
  if (text.includes('moat')) return 'moat';
  if (text.includes('cultural') || text.includes('heritage') || text.includes('museum')) return 'heritage';
  if (text.includes('transit') || text.includes('three arms')) return 'transit';
  if (text.includes('roundabout')) return 'roundabout';
  return 'civic';
}

function makeStateSignature(stateInfo, palette, sceneMaterials) {
  const group = new THREE.Group();
  const feature = landmarkFeature(stateInfo.landmark);
  const base = new THREE.Mesh(new THREE.CircleGeometry(3.05, 28), new THREE.MeshStandardMaterial({ color: palette.sand, roughness: 0.9 }));
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.035;
  group.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.08, 6, 32), new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.72 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  group.add(ring);
  const featureColor = palette.accent || '#d8f36b';
  if (feature === 'market') {
    for (let stallIndex = 0; stallIndex < 3; stallIndex += 1) {
      const stall = new THREE.Group();
      const counter = box(1.25, 0.58, 0.86, ['#b78455', '#c89561', '#a97e57'][stallIndex]);
      counter.position.y = 0.38;
      stall.add(counter);
      const canopy = box(1.48, 0.15, 1.02, [featureColor, '#d7ad4c', '#5e9472'][stallIndex]);
      canopy.position.y = 0.88;
      stall.add(canopy);
      stall.position.set((stallIndex - 1) * 1.62, 0, 0);
      group.add(stall);
    }
  } else if (feature === 'palace' || feature === 'mosque' || feature === 'minaret') {
    const main = box(feature === 'minaret' ? 1.45 : 3.3, feature === 'minaret' ? 3.1 : 1.55, feature === 'minaret' ? 1.45 : 2.8, '#d8c6a3');
    main.position.y = feature === 'minaret' ? 1.62 : 0.83;
    group.add(main);
    if (feature !== 'minaret') {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: featureColor, roughness: 0.7 }));
      dome.position.y = 1.58;
      group.add(dome);
    }
    const towerCount = feature === 'minaret' ? 0 : 2;
    for (let towerIndex = 0; towerIndex < (towerCount || 1); towerIndex += 1) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, feature === 'minaret' ? 3.1 : 2.6, 9), new THREE.MeshStandardMaterial({ color: '#c6b38e', roughness: 0.72 }));
      tower.position.set(feature === 'minaret' ? 0 : (towerIndex === 0 ? -2.05 : 2.05), feature === 'minaret' ? 1.7 : 1.35, -0.15);
      group.add(tower);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.62, 9), new THREE.MeshStandardMaterial({ color: featureColor, roughness: 0.68 }));
      cap.position.set(tower.position.x, feature === 'minaret' ? 3.45 : 2.92, -0.15);
      group.add(cap);
    }
  } else if (feature === 'railway') {
    for (const z of [-0.65, 0.65]) {
      const rail = box(4.8, 0.09, 0.08, '#515b57', { castShadow: false, metalness: 0.22 });
      rail.position.set(0, 0.15, z);
      group.add(rail);
    }
    for (let tie = -2; tie <= 2; tie += 1) {
      const sleeper = box(0.12, 0.1, 1.7, '#6e5941', { castShadow: false });
      sleeper.position.set(tie * 0.9, 0.11, 0);
      group.add(sleeper);
    }
    const train = box(2.15, 0.78, 1.08, '#697e82');
    train.position.set(0, 0.65, 0);
    group.add(train);
    const stripe = box(2.18, 0.13, 1.1, featureColor, { castShadow: false });
    stripe.position.set(0, 0.73, 0);
    group.add(stripe);
  } else if (feature === 'waterfront' || feature === 'bridge') {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.2), new THREE.MeshStandardMaterial({ color: palette.water, roughness: 0.4, metalness: 0.08 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.08, -1.45);
    group.add(water);
    const pier = box(4.2, 0.2, 1.0, '#988a6e');
    pier.position.set(0, 0.38, -0.35);
    group.add(pier);
    for (let postIndex = -2; postIndex <= 2; postIndex += 1) {
      const post = box(0.18, 0.72, 0.18, '#9d927c');
      post.position.set(postIndex * 0.78, 0.29, -0.35);
      group.add(post);
    }
    if (feature === 'bridge') {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 6, 20, Math.PI), new THREE.MeshStandardMaterial({ color: featureColor, roughness: 0.7 }));
      arch.rotation.z = Math.PI;
      arch.position.set(0, 0.82, -0.35);
      group.add(arch);
    }
  } else if (feature === 'rock') {
    for (let rockIndex = 0; rockIndex < 4; rockIndex += 1) {
      const height = 1.7 + rockIndex * 0.34;
      const rock = new THREE.Mesh(new THREE.ConeGeometry(0.68 + rockIndex * 0.12, height, 5, 1), new THREE.MeshStandardMaterial({ color: rockIndex % 2 ? '#827d70' : '#958d7b', roughness: 1 }));
      rock.position.set((rockIndex - 1.5) * 0.72, height / 2 + 0.06, 0.1);
      rock.rotation.z = (rockIndex - 1.5) * 0.06;
      group.add(rock);
    }
  } else if (feature === 'park') {
    for (let treeIndex = 0; treeIndex < 4; treeIndex += 1) {
      const tree = makeRegionalTree(Math.cos(treeIndex * Math.PI / 2) * 2, Math.sin(treeIndex * Math.PI / 2) * 1.8, 2.7 + (treeIndex % 2) * 0.4, palette, sceneMaterials, () => 1);
      group.add(tree);
    }
    const monument = box(0.42, 1.6, 0.42, featureColor);
    monument.position.y = 0.83;
    group.add(monument);
  } else if (feature === 'moat') {
    const moat = new THREE.Mesh(new THREE.PlaneGeometry(4.65, 4.65), new THREE.MeshStandardMaterial({ color: palette.water, roughness: 0.45 }));
    moat.rotation.x = -Math.PI / 2;
    moat.position.y = 0.075;
    group.add(moat);
    const court = box(2.65, 1.15, 2.65, '#c4ad88');
    court.position.y = 0.68;
    group.add(court);
    const roof = box(2.85, 0.18, 2.85, featureColor);
    roof.position.y = 1.36;
    group.add(roof);
  } else if (feature === 'stadium') {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.85, 20, 1, true), new THREE.MeshStandardMaterial({ color: featureColor, side: THREE.DoubleSide, roughness: 0.78 }));
    bowl.position.y = 0.62;
    group.add(bowl);
    const field = new THREE.Mesh(new THREE.CircleGeometry(1.6, 20), new THREE.MeshStandardMaterial({ color: '#6d9664', roughness: 0.9 }));
    field.rotation.x = -Math.PI / 2;
    field.position.y = 1.06;
    group.add(field);
  } else if (feature === 'heritage') {
    const hall = box(3.7, 1.35, 2.6, '#c8b18d');
    hall.position.y = 0.72;
    group.add(hall);
    for (let pillarIndex = -1; pillarIndex <= 1; pillarIndex += 1) {
      const pillar = box(0.26, 2.0, 0.26, featureColor);
      pillar.position.set(pillarIndex * 0.76, 1.0, 1.0);
      group.add(pillar);
    }
  } else {
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(1.85, 22), new THREE.MeshStandardMaterial({ color: '#cbbd9d', roughness: 0.88 }));
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.09;
    group.add(plaza);
    const plinth = box(feature === 'transit' ? 1.1 : 0.72, feature === 'transit' ? 2.2 : 1.35, 0.72, featureColor);
    plinth.position.y = feature === 'transit' ? 1.1 : 0.67;
    group.add(plinth);
    if (feature === 'transit') {
      for (const side of [-1, 1]) {
        const arm = box(0.25, 2.4, 0.25, '#d6cfbb');
        arm.position.set(side * 1.0, 1.2, 0);
        arm.rotation.z = side * -0.25;
        group.add(arm);
      }
    }
    if (feature === 'roundabout') {
      const island = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.35, 20), new THREE.MeshStandardMaterial({ color: '#789267' }));
      island.position.set(0, 0.29, 0);
      group.add(island);
    }
  }
  const title = labelSprite(stateInfo.landmark, palette.accent);
  title.position.set(0, 4.15, 0.1);
  title.scale.set(4.1, 1.02, 1);
  group.add(title);
  addDoorPortal(group, { id: `state-landmark-${stateInfo.name}`, title: stateInfo.landmark, type: 'landmark', accent: palette.accent, x: 0, z: 2.75, width: 0.72, height: 1.24, metadata: { state: stateInfo.name } });
  group.position.set(-17.6, 0, 17.6);
  group.name = `regional-signature-${stateInfo.name}`;
  return group;
}

function buildInteriorRoom(info, palette, playerColor) {
  const group = new THREE.Group();
  group.name = `interior-${info.id || info.type}`;
  const wallMaterial = '#e3d8bf';
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshStandardMaterial({ color: '#bca985', roughness: 0.92, side: THREE.DoubleSide }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.05;
  group.add(floor);
  const walls = [
    { size: [13, 4.5, 0.22], pos: [0, 2.2, -6.4] },
    { size: [0.22, 4.5, 13], pos: [-6.4, 2.2, 0] },
    { size: [0.22, 4.5, 13], pos: [6.4, 2.2, 0] },
    { size: [13, 0.22, 13], pos: [0, 4.45, 0] },
    { size: [13, 4.5, 0.22], pos: [0, 2.2, 6.4] },
  ];
  walls.forEach(({ size, pos }, index) => {
    const wall = box(...size, index === 4 ? '#d4c5a8' : wallMaterial, { castShadow: false });
    wall.material.side = THREE.DoubleSide;
    wall.position.set(...pos);
    group.add(wall);
  });
  const title = labelSprite(info.title || 'COMMUNITY ROOM', palette.accent || '#d8f36b');
  title.position.set(0, 3.25, -6.22);
  title.scale.set(3.3, 0.76, 1);
  group.add(title);
  const windowColor = '#81aaa2';
  for (const side of [-1, 1]) {
    const window = box(1.65, 1.28, 0.06, windowColor, { castShadow: false, metalness: 0.1, roughness: 0.34 });
    window.position.set(side * 6.26, 2.48, -0.6);
    group.add(window);
  }
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 4.1), new THREE.MeshStandardMaterial({ color: info.type === 'party-office' ? '#9b684d' : '#627b62', roughness: 0.98, side: THREE.DoubleSide }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.015, 0.55);
  group.add(rug);
  const desk = box(info.type === 'party-office' ? 3.5 : 2.7, 0.18, 1.18, '#77563c');
  desk.position.set(0, 1.05, -0.75);
  group.add(desk);
  for (const x of [-1.2, 1.2]) {
    const leg = box(0.12, 0.98, 0.12, '#5b4635', { castShadow: false });
    leg.position.set(x, 0.5, -0.75);
    group.add(leg);
  }
  const purpose = info.type === 'party-office' ? 'LOCAL PARTY SECRETARIAT' : info.type === 'vehicle' ? 'NIGERIAN STREET TRANSPORT' : info.type === 'venue' ? 'CIVIC GATHERING PLACE' : 'COMMUNITY SPACE';
  const purposeLabel = labelSprite(purpose, palette.accent || '#d8f36b');
  purposeLabel.position.set(0, 2.35, -5.95);
  purposeLabel.scale.set(2.9, 0.62, 1);
  group.add(purposeLabel);

  if (info.type === 'party-office') {
    const branch = Array.isArray(info.branch) ? info.branch : [];
    const tag = labelSprite('SIMULATED LOCAL BRANCH', '#ffc978');
    tag.position.set(0, 1.92, -5.96);
    tag.scale.set(2.55, 0.5, 1);
    group.add(tag);
    for (let index = 0; index < Math.min(branch.length, 6); index += 1) {
      const exec = branch[index];
      const x = (index % 3 - 1) * 3.15;
      const z = index < 3 ? -2.0 : 1.35;
      const chair = makeMeetingChair();
      chair.position.set(x, 0, z);
      chair.rotation.y = Math.PI;
      group.add(chair);
      const person = makePerson(['#d18769', '#688a73', '#cfb256', '#7284a1', '#bb8056', '#937fa3'][index], '#775039');
      person.scale.set(0.76, 0.76, 0.76);
      person.position.set(x, 0, z + 0.45);
      person.rotation.y = Math.PI;
      group.add(person);
      person.userData.name = exec?.name || 'Simulated local officer';
      person.userData.office = exec?.position || 'Branch officer';
    }
  } else if (info.type === 'vehicle') {
    const dash = box(7.4, 0.64, 0.92, '#384844');
    dash.position.set(0, 1.1, 4.45);
    group.add(dash);
    const windscreen = box(6.0, 1.45, 0.12, '#7faeb3', { castShadow: false, metalness: 0.1, roughness: 0.3 });
    windscreen.position.set(0, 2.55, 6.19);
    group.add(windscreen);
    for (const x of [-2.65, 0, 2.65]) {
      const seat = box(1.85, 0.76, 0.8, '#354b44');
      seat.position.set(x, 0.65, 1.25);
      group.add(seat);
      const back = box(1.85, 1.15, 0.25, '#446458');
      back.position.set(x, 1.35, 0.85);
      group.add(back);
    }
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 20), new THREE.MeshStandardMaterial({ color: '#242b29' }));
    wheel.position.set(-1.85, 1.58, 3.85);
    group.add(wheel);
  } else if (info.metadata?.venueType === 'stadium') {
    for (let tier = 0; tier < 3; tier += 1) {
      const stand = box(8.2, 0.32, 0.8, ['#d4b958', '#597f66', '#9f6352'][tier]);
      stand.position.set(0, 0.35 + tier * 0.38, -2.65 + tier * 0.86);
      group.add(stand);
    }
    const field = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 3.4), new THREE.MeshStandardMaterial({ color: '#62905c', roughness: 0.96, side: THREE.DoubleSide }));
    field.rotation.x = -Math.PI / 2;
    field.position.set(0, 0.08, 2.05);
    group.add(field);
  } else if (info.type === 'venue') {
    for (let index = 0; index < 4; index += 1) {
      const seat = box(1.45, 0.36, 0.58, index % 2 ? '#546f64' : '#c7a84d');
      seat.position.set(-4.0 + index * 2.65, 0.45, 2.0);
      group.add(seat);
    }
  } else {
    const sofa = box(3.8, 0.62, 0.95, '#547263');
    sofa.position.set(0, 0.55, 2.5);
    group.add(sofa);
    for (const x of [-1.3, 0, 1.3]) {
      const chair = box(0.92, 0.54, 0.84, '#a9835b');
      chair.position.set(x, 0.48, -2.0);
      group.add(chair);
    }
  }
  const exitDoor = addDoorPortal(group, { id: `exit-${info.id || info.type}`, title: 'Exit to street', type: 'exit', accent: '#e5c465', x: 0, z: 5.77, width: 0.9, height: 1.8 });
  exitDoor.userData.interaction = { id: 'exit-interior', title: 'Exit to street', type: 'exit' };
  group.visible = false;
  void playerColor;
  return group;
}

function buildWorld(root, state, locality, onVenueSelect, playerRef, remoteRef, playerColor, meetingRef, meetingMessagesRef, focusRef, partyFocusRef, exitInteriorRef, interiorChangeRef) {
  const stateInfo = STATES.find((item) => item.name === state) || STATES[0];
  const profile = STATE_WORLD_PROFILES[stateInfo.name] || STATE_WORLD_PROFILES.Lagos;
  const localityStyle = createLocalityVisualProfile(stateInfo, profile, locality);
  const basePalette = PALETTES[stateInfo.terrain] || PALETTES.coastal;
  const tone = REGIONAL_TONES[profile.kind] || REGIONAL_TONES.upland;
  const architecture = ARCHITECTURE_PALETTES[profile.architecture] || ARCHITECTURE_PALETTES.southern;
  const palette = { ...basePalette, ...tone, ...profile, ...architecture, ...localityStyle, accent: localityStyle.accent || profile.accent };
  const localitySeed = locality ? `${locality.lga}/${locality.ward}/${locality.lat}/${locality.lon}` : stateInfo.capital;
  const rand = seeded(hash(`${stateInfo.name}/${localitySeed}`));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8ccde6');
  scene.fog = new THREE.Fog('#b9d8d6', 58, 112);

  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 180);
  camera.position.set(-4.2, 7.4, 16.5);
  camera.lookAt(-5.8, 1, 3.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;
  const sceneLabel = locality ? `Procedurally generated 3D neighbourhood for ${locality.ward}, ${locality.lga}, ${stateInfo.name}` : `Procedurally generated 3D district for ${stateInfo.capital}, ${stateInfo.name}`;
  renderer.domElement.setAttribute('aria-label', `${sceneLabel}; not a surveyed map. Tap or click open ground to walk, drag to orbit, and pinch or scroll to zoom. Desktop keyboard: WASD or arrow keys.`);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.style.touchAction = 'none';
  root.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight('#e7f7ff', '#6b6448', 2.05));
  const sun = new THREE.DirectionalLight('#fff1c8', 3.8);
  sun.position.set(-14, 31, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -28;
  sun.shadow.camera.right = 28;
  sun.shadow.camera.top = 28;
  sun.shadow.camera.bottom = -28;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#99b7cc', 0.72);
  fill.position.set(12, 9, -19);
  scene.add(fill);

  const groundMat = new THREE.MeshStandardMaterial({ color: palette.grass, roughness: 0.98 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.16;
  ground.receiveShadow = true;
  scene.add(ground);
  addRegionalRelief(scene, palette, profile, rand);
  if (WET_KINDS.has(profile.kind)) addRegionalWater(scene, palette, profile.kind, rand);

  const roadPlan = localityStyle.roadPlan;
  const roadScale = (locality?.settlement === 'local' ? 1.08 : (profile.architecture === 'planned' ? 1.16 : 1)) * localityStyle.roadWidthFactor;
  const localDensity = clamp(profile.density * localityStyle.densityFactor, 0.22, 1.08);
  const primaryRoadAt = roadPlan === 'offset-grid' ? 2.35 : roadPlan === 'waterfront' ? -1.5 : 0;
  const secondaryRoadAt = roadPlan === 'civic-ring' ? -12.2 : 12.5;
  const sideRoadAt = roadPlan === 'offset-grid' ? -3.3 : roadPlan === 'waterfront' ? 8.8 : -13.2;
  const asphaltMat = new THREE.MeshStandardMaterial({ color: roadPlan === 'waterfront' ? '#414d4d' : '#46504b', roughness: 0.87 });
  const curbMat = new THREE.MeshStandardMaterial({ color: '#dfcfaa', roughness: 0.91 });
  const mainRoadWidth = 4.1 * roadScale;
  const roads = [
    { axis: 'x', at: primaryRoadAt, width: mainRoadWidth, length: 58 },
    { axis: 'z', at: roadPlan === 'offset-grid' ? 0 : 0, width: mainRoadWidth, length: 58 },
    { axis: 'x', at: secondaryRoadAt, width: 2.35 * roadScale, length: 58 },
    { axis: 'z', at: sideRoadAt, width: 2.35 * roadScale, length: 58 },
  ];
  if (roadPlan === 'boulevard' || roadPlan === 'market-spine') {
    roads.push({ axis: 'x', at: primaryRoadAt + (roadPlan === 'boulevard' ? 7.2 : -6.8), width: 2.1 * roadScale, length: 52 });
  }
  if (roadPlan === 'switchback') {
    roads.push({ axis: 'x', at: primaryRoadAt + 8.2, width: 2.0 * roadScale, length: 42 });
    roads.push({ axis: 'x', at: primaryRoadAt - 8.2, width: 2.0 * roadScale, length: 42 });
  }
  for (const road of roads) {
    const alongX = road.axis === 'x';
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? road.length : road.width, alongX ? road.width : road.length), asphaltMat);
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(alongX ? 0 : road.at, -0.035, alongX ? road.at : 0);
    slab.receiveShadow = true;
    scene.add(slab);
    const curbN = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? road.length : 0.27, alongX ? 0.27 : road.length), curbMat);
    curbN.rotation.x = -Math.PI / 2;
    curbN.position.set(alongX ? 0 : road.at + road.width / 2 + 0.14, 0.002, alongX ? road.at + road.width / 2 + 0.14 : 0);
    scene.add(curbN);
    const curbS = curbN.clone();
    curbS.position.set(alongX ? 0 : road.at - road.width / 2 - 0.14, 0.002, alongX ? road.at - road.width / 2 - 0.14 : 0);
    scene.add(curbS);
    const dashCount = 16;
    for (let i = 0; i < dashCount; i += 1) {
      const position = -23 + i * 3.0;
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? 1.3 : 0.1, alongX ? 0.1 : 1.3), new THREE.MeshBasicMaterial({ color: '#e1d9b7', transparent: true, opacity: 0.86 }));
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(alongX ? position : road.at, 0.01, alongX ? road.at : position);
      scene.add(dash);
    }
  }

  // Zebra crossings, open roadside drains, and speed-calming details make the streets read as lived-in civic roads.
  for (let stripe = 0; stripe < 6; stripe += 1) {
    const crossingA = box(0.36, 0.025, 3.5, '#e3ddc7', { castShadow: false });
    crossingA.position.set(-3.25 + stripe * 0.66, 0.012, primaryRoadAt);
    scene.add(crossingA);
    const crossingB = box(3.6, 0.025, 0.34, '#e3ddc7', { castShadow: false });
    crossingB.position.set(secondaryRoadAt, 0.012, sideRoadAt + 1.2 + stripe * 0.66);
    scene.add(crossingB);
  }
  for (const side of [-1, 1]) {
    const drain = box(48, 0.08, 0.18, '#454e47', { castShadow: false });
    drain.position.set(0, -0.045, primaryRoadAt + side * (mainRoadWidth / 2 + 0.26));
    scene.add(drain);
  }
  for (let bump = -4; bump <= 4; bump += 1) {
    const marker = box(0.3, 0.085, 0.2, bump % 2 === 0 ? '#e6cb60' : '#39433d', { castShadow: false });
    marker.position.set(6.3, 0.045, primaryRoadAt + bump * 0.38);
    scene.add(marker);
  }
  [[-13.8, -4.1], [13.9, -3.4], [-14.2, 13.5], [14.3, 14.1], [3.5, 16.2]].forEach(([x, z]) => makeStreetLight(scene, x, z));
  const utilityXs = [-18, -9, 0, 9, 18];
  utilityXs.forEach((x) => makeUtilityPole(scene, x, 3.15));
  const wireMaterial = new THREE.LineBasicMaterial({ color: '#40453e', transparent: true, opacity: 0.72 });
  for (let span = 0; span < utilityXs.length - 1; span += 1) {
    for (let wire = 0; wire < 3; wire += 1) {
      const wireY = 4.62 + wire * 0.1;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(utilityXs[span], wireY, 3.15),
        new THREE.Vector3((utilityXs[span] + utilityXs[span + 1]) / 2, wireY - 0.38, 3.15),
        new THREE.Vector3(utilityXs[span + 1], wireY, 3.15),
      );
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(10)), wireMaterial));
    }
  }
  makeBusStop(scene, 8.6, primaryRoadAt + 2.25);

  const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: '#c9b996', roughness: 0.94 });
  for (const point of [primaryRoadAt - (mainRoadWidth / 2 + 2), primaryRoadAt + (mainRoadWidth / 2 + 2)]) {
    for (const other of [-9, 9]) {
      const paving = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 5.7), sidewalkMaterial);
      paving.rotation.x = -Math.PI / 2;
      paving.position.set(other, -0.04, point);
      scene.add(paving);
    }
  }

  const sceneMaterials = {
    trunk: new THREE.MeshStandardMaterial({ color: '#765940', roughness: 0.94 }),
  };
  const flyoverStates = new Set(['Federal Capital Territory', 'Kaduna', 'Kano', 'Lagos', 'Oyo', 'Rivers']);
  if (flyoverStates.has(stateInfo.name) && (!locality || locality.settlement === 'capital')) makeFlyover(scene, sceneMaterials);

  const blocks = [-17.8, -11.8, -5.8, 5.8, 11.8, 17.8];
  let buildingIndex = 0;
  for (const zBlock of blocks) {
    for (const xBlock of blocks) {
      if (Math.abs(xBlock) < 8 && Math.abs(zBlock) < 8) continue;
      if (Math.abs(zBlock + 10.5) < 4.8) continue;
      if ((xBlock === -17.8 && zBlock === 17.8) || (xBlock === 17.8 && zBlock === -17.8)) continue;
      if (rand() > Math.min(0.98, localDensity + 0.08)) continue;
      const count = rand() < localDensity ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const offsetX = (rand() - 0.5) * 2.0;
        const offsetZ = (rand() - 0.5) * 2.0;
        const building = makeBuilding(rand, xBlock + offsetX, zBlock + offsetZ, buildingIndex, palette, localityStyle);
        const s = 0.75 + rand() * 0.35;
        building.scale.setScalar(s);
        scene.add(building);
        buildingIndex += 1;
      }
    }
  }
  // A few detached homes and workshops keep the neighbourhood from feeling like a grid.
  for (let i = 0; i < Math.round(5 + localDensity * 7); i += 1) {
    const x = (rand() - 0.5) * 31;
    const z = (rand() - 0.5) * 31;
    if (Math.abs(x) < 5.5 || Math.abs(z) < 5.5) continue;
    if (Math.abs(z + 10.5) < 4.5 || Math.hypot(x + 17.6, z - 17.6) < 5.2 || Math.hypot(x - 17.5, z + 17.5) < 5.2) continue;
    scene.add(makeBuilding(rand, x, z, buildingIndex++, palette, localityStyle));
  }

  // Small green pockets, trees, kiosks, and benches vary by biome and settlement density.
  const vegetationCount = Math.round(16 + profile.relief * 5 + (['rainforest', 'mangrove'].includes(profile.vegetation) ? 7 : 0));
  for (let i = 0; i < vegetationCount; i += 1) {
    const x = (rand() - 0.5) * 37;
    const z = (rand() - 0.5) * 37;
    if (Math.abs(x) < 4.6 || Math.abs(z) < 4.6 || Math.abs(z + 10.5) < 3.1) continue;
    if (Math.abs(x) > 22 || Math.abs(z) > 22 || Math.hypot(x + 17.6, z - 17.6) < 4.2 || Math.hypot(x - 17.5, z + 17.5) < 4.2) continue;
    const tree = makeRegionalTree(x, z, 2.3 + rand() * 2.0, palette, sceneMaterials, rand);
    tree.scale.setScalar(0.73 + rand() * 0.42);
    scene.add(tree);
  }

  for (let stallIndex = 0; stallIndex < localityStyle.marketStalls; stallIndex += 1) {
    const rowIndex = Math.floor(stallIndex / 2);
    const side = stallIndex % 2 === 0 ? -1 : 1;
    const x = -12.5 + rowIndex * 5.1;
    const z = primaryRoadAt + side * (mainRoadWidth / 2 + 1.55);
    scene.add(makeRoadsideStall(x, z, palette, localityStyle.roadsideAccent, stallIndex));
  }
  scene.add(makeLocalityMicroLandmark(locality, stateInfo, localityStyle, palette));
  scene.add(makeStateSignature(stateInfo, palette, sceneMaterials));
  for (const venue of WORLD_VENUES) scene.add(makeVenue(venue, palette, sceneMaterials, stateInfo.name));

  const meetingStage = new THREE.Group();
  const meetingStageRing = new THREE.Mesh(new THREE.RingGeometry(4.25, 4.38, 40), new THREE.MeshBasicMaterial({ color: '#f0c777', transparent: true, opacity: 0.42, side: THREE.DoubleSide }));
  meetingStageRing.rotation.x = -Math.PI / 2;
  meetingStageRing.position.y = 0.045;
  meetingStage.add(meetingStageRing);
  const meetingActors = [];
  const meetingClothes = ['#d97d62', '#638d77', '#d0ac56', '#7586a3', '#b77d55', '#9181a8'];
  for (let attendee = 0; attendee < 6; attendee += 1) {
    const angle = (attendee / 6) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(angle) * 3.55;
    const z = Math.sin(angle) * 3.55;
    const chair = makeMeetingChair();
    chair.position.set(x, 0, z);
    chair.rotation.y = Math.atan2(-x, -z);
    meetingStage.add(chair);
    const person = makeSeatedAttendee(meetingClothes[attendee]);
    person.group.position.set(x, 0, z);
    person.group.rotation.y = chair.rotation.y;
    meetingStage.add(person.group);
    meetingActors.push(person);
  }
  const speechBubble = createSpeechBubble();
  meetingStage.add(speechBubble.sprite);
  meetingStage.visible = false;
  scene.add(meetingStage);
  let lastMeetingMessageId = null;
  let speakingActorIndex = -1;
  let speakingUntil = 0;
  let bubbleUntil = 0;

  // A small arrival gateway marks the selected generated community; it is not a surveyed boundary or street map.
  const gate = new THREE.Group();
  const signFrame = box(0.22, 2.1, 0.22, '#685e4c');
  signFrame.position.set(-18, 1.05, 0);
  gate.add(signFrame);
  const sign = box(4.2, 0.9, 0.24, '#294b3a');
  sign.position.set(-15.8, 2.1, 0);
  gate.add(sign);
  const signText = labelSprite(locality ? `${locality.ward} • ${locality.lga}` : `${stateInfo.capital} • ${stateInfo.name}`, palette.accent);
  signText.position.set(-15.8, 2.16, 0.18);
  signText.scale.set(4.05, 0.96, 1);
  gate.add(signText);
  scene.add(gate);

  const branchRoster = createLocalPartyBranches(PARTY_OPTIONS, {
    state: stateInfo.name,
    lga: locality?.lga || stateInfo.capital,
    ward: locality?.ward || 'Capital District',
    reservedNames: NPCS.map((person) => person.name),
  });
  const partyOfficeDoors = new Map();
  const partyStreetMaterial = new THREE.MeshStandardMaterial({ color: '#424a45', roughness: 0.9 });
  for (const row of [-1, 1]) {
    const street = new THREE.Mesh(new THREE.PlaneGeometry(58, 3.9), partyStreetMaterial);
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, -0.035, row * 26.5);
    scene.add(street);
    for (let dashIndex = -8; dashIndex <= 8; dashIndex += 1) {
      const dash = box(1.1, 0.02, 0.07, '#e6ddb9', { castShadow: false });
      dash.position.set(dashIndex * 3.1, 0.01, row * 26.5);
      scene.add(dash);
    }
    const streetLabel = labelSprite('WARD PARTY STREET', localityStyle.accent);
    streetLabel.position.set(0, 2.9, row * 31.3);
    streetLabel.scale.set(4.6, 1.0, 1);
    scene.add(streetLabel);
  }
  const partyRowSize = Math.ceil(PARTY_OPTIONS.length / 2);
  PARTY_OPTIONS.forEach((party, index) => {
    const row = index < partyRowSize ? -1 : 1;
    const slot = index % partyRowSize;
    const x = -20.5 + slot * 4.1;
    const z = row * 29;
    const branch = branchRoster[party.id] || [];
    const office = makePartyOffice(party, branch, x, z);
    if (row > 0) office.rotation.y = Math.PI;
    scene.add(office);
    office.traverse((object) => {
      if (object.userData?.interaction?.type === 'party-office') partyOfficeDoors.set(party.id, object);
    });
  });

  const traffic = [];
  const heroTaxi = makeCar('#f1c53d', 'taxi', '#28694e');
  heroTaxi.position.set(-6.45, 0, primaryRoadAt + 2.72);
  scene.add(heroTaxi);
  const routeBrand = palette.accent;
  const routeAccent = ['#203b32', '#f2d95d', '#efe5ce', '#263a57', '#f3ead5', '#283a32'][hash(stateInfo.name) % 6];
  const roadKinds = localityStyle.trafficMix.filter((kind) => kind !== 'water-taxi');
  const roadVehicleKinds = roadKinds.length ? roadKinds : ['sedan', 'minibus', 'keke'];
  const trafficColors = [routeBrand, '#f0c84b', '#d85539', '#e9e1ca', '#548cbd', '#365e47', '#6e5140'];
  const horizontalCount = Math.max(3, Math.min(6, Math.round(2 + localDensity * 3)));
  for (let i = 0; i < horizontalCount; i += 1) {
    const kind = roadVehicleKinds[(i + hash(localityStyle.identity)) % roadVehicleKinds.length];
    const color = trafficColors[(i + hash(stateInfo.name)) % trafficColors.length];
    const direction = i % 2 === 0 ? 1 : -1;
    const car = makeCar(color, kind, routeAccent);
    car.position.set(-19 + i * (38 / Math.max(1, horizontalCount - 1)), 0, primaryRoadAt + (direction > 0 ? -0.78 : 0.78));
    car.rotation.y = direction > 0 ? 0 : Math.PI;
    scene.add(car);
    traffic.push({ object: car, axis: 'x', speed: 0.68 + (i % 3) * 0.23, min: -25, max: 25, dir: direction });
  }
  const verticalCount = Math.max(2, Math.min(4, Math.round(1 + localDensity * 2)));
  for (let i = 0; i < verticalCount; i += 1) {
    const kind = roadVehicleKinds[(i + 2 + hash(localityStyle.identity)) % roadVehicleKinds.length];
    const direction = i % 2 === 0 ? 1 : -1;
    const car = makeCar(trafficColors[(i + 2) % trafficColors.length], kind, routeAccent);
    car.position.set(sideRoadAt + (direction > 0 ? -0.74 : 0.74), 0, -18 + i * 12.5);
    car.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(car);
    traffic.push({ object: car, axis: 'z', speed: 0.66 + (i % 2) * 0.27, min: -25, max: 25, dir: direction });
  }
  if (localityStyle.trafficMix.includes('water-taxi')) {
    const boat = makeWaterTaxi('#f0c84b', routeAccent);
    boat.position.set(-18, 0.06, -28.2);
    scene.add(boat);
    traffic.push({ object: boat, axis: 'x', speed: 0.68, min: -26, max: 26, dir: 1 });
  }

  const pedestrians = [];
  const clothing = ['#df8066', '#527c6e', '#d4b750', '#657ca0', '#b87c49', '#9b87ba'];
  for (let i = 0; i < Math.round(6 + localDensity * 13); i += 1) {
    const x = -18 + rand() * 36;
    const z = -18 + rand() * 36;
    if (Math.abs(x) < 3.0 && Math.abs(z) < 3.0) continue;
    if (Math.abs(z + 10.5) < 1.6 || Math.abs(x) < 1.8) continue;
    const person = makePerson(clothing[i % clothing.length]);
    person.position.set(x, 0, z);
    person.scale.setScalar(0.8 + rand() * 0.28);
    scene.add(person);
    pedestrians.push({ object: person, phase: rand() * Math.PI * 2, speed: 0.35 + rand() * 0.35, startX: x, startZ: z, walkX: rand() > 0.5 });
  }

  const player = makePerson(playerColor || '#d8f36b', '#764c37');
  player.scale.set(1.15, 1.15, 1.15);
  player.position.set(-5.8, 0, 3.5);
  const playerHalo = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 8, 26), new THREE.MeshBasicMaterial({ color: '#d8f36b' }));
  playerHalo.rotation.x = Math.PI / 2;
  playerHalo.position.y = 0.055;
  player.add(playerHalo);
  player.userData.playerId = 'local';
  scene.add(player);

  const remoteGroup = new THREE.Group();
  scene.add(remoteGroup);
  const remoteSprites = new Map();
  const updateRemotePlayers = (players = []) => {
    const presentIds = new Set();
    for (const item of players) {
      if (!item || item.id === 'local') continue;
      presentIds.add(item.id);
      let avatar = remoteSprites.get(item.id);
      if (!avatar) {
        avatar = makePerson(item.color || '#8cb9ff', '#734c38');
        avatar.scale.set(1.05, 1.05, 1.05);
        const badge = labelSprite(item.name || 'VISITOR', '#8cb9ff');
        badge.position.y = 2.15;
        badge.scale.set(3.1, 0.78, 1);
        avatar.add(badge);
        remoteGroup.add(avatar);
        remoteSprites.set(item.id, avatar);
      }
      const priorPosition = avatar.position.clone();
      avatar.position.set(clamp(Number(item.x) || 0, -24, 24), 0, clamp(Number(item.z) || 0, -33, 33));
      avatar.userData.walking = priorPosition.distanceTo(avatar.position) > 0.006;
    }
    for (const [id, avatar] of remoteSprites.entries()) {
      if (!presentIds.has(id)) {
        remoteGroup.remove(avatar);
        remoteSprites.delete(id);
      }
    }
  };

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-5.8, 1, 3.5);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.minDistance = 7;
  controls.maxDistance = 62;
  controls.maxPolarAngle = Math.PI / 2.18;
  controls.minPolarAngle = Math.PI / 8;
  controls.enablePan = true;
  controls.panSpeed = 0.55;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.75;
  controls.update();

  const clickable = [];
  scene.traverse((object) => {
    if (object.userData?.interaction || object.userData?.isHotspot || object.userData?.venueId) clickable.push(object);
  });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const moveTarget = new THREE.Vector3(-5.8, 0, 3.5);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersection = new THREE.Vector3();
  let isMoving = false;
  let interiorActive = false;
  let interiorGroup = null;
  let pendingInteraction = null;
  let savedExteriorPosition = null;
  let savedCameraPosition = null;
  let savedCameraTarget = null;
  let previousPlayerPosition = player.position.clone();
  let lastEmit = 0;
  let activePointer = null;
  let activeTouchCount = 0;
  let multiTouchGesture = false;
  let isFocusingCamera = false;
  const cameraFocusTarget = new THREE.Vector3();
  const cameraFocusPosition = new THREE.Vector3();
  const disposeGroup = (group) => {
    group?.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material.map) material.map.dispose();
          material.dispose();
        });
      }
    });
  };
  let activeInteriorClickables = [];
  const exitInterior = () => {
    if (!interiorActive) return;
    for (const object of activeInteriorClickables) {
      const index = clickable.indexOf(object);
      if (index >= 0) clickable.splice(index, 1);
    }
    activeInteriorClickables = [];
    scene.add(player);
    if (interiorGroup) {
      scene.remove(interiorGroup);
      disposeGroup(interiorGroup);
      interiorGroup = null;
    }
    if (savedExteriorPosition) player.position.copy(savedExteriorPosition);
    if (savedCameraPosition) camera.position.copy(savedCameraPosition);
    if (savedCameraTarget) controls.target.copy(savedCameraTarget);
    previousPlayerPosition.copy(player.position);
    interiorActive = false;
    isMoving = false;
    pendingInteraction = null;
    controls.minDistance = 7;
    controls.maxDistance = 62;
    controls.maxPolarAngle = Math.PI / 2.18;
    controls.update();
    interiorChangeRef?.current?.(null);
  };
  const enterInterior = (interaction) => {
    if (!interaction || interiorActive) return;
    savedExteriorPosition = player.position.clone();
    savedCameraPosition = camera.position.clone();
    savedCameraTarget = controls.target.clone();
    if (interiorGroup) {
      scene.remove(interiorGroup);
      disposeGroup(interiorGroup);
    }
    const office = interaction.type === 'party-office' ? PARTY_OPTIONS.find((item) => item.id === interaction.partyId) : null;
    const info = {
      ...interaction,
      title: office ? `${office.tag} · ${office.name}` : interaction.title || 'Community space',
      branch: interaction.metadata?.branch || [],
      party: office || null,
      nationalOfficers: office ? { chair: office.chair, secretary: office.secretary, checkedAt: PARTY_REGISTER_CHECKED_AT, source: PARTY_REGISTER_SOURCE } : null,
      fictional: interaction.type === 'party-office' || interaction.type === 'building' || interaction.type === 'landmark',
    };
    interiorGroup = buildInteriorRoom(info, palette, playerColor);
    scene.add(interiorGroup);
    interiorGroup.add(player);
    player.position.set(0, 0, 3.15);
    player.rotation.y = Math.PI;
    interiorGroup.visible = true;
    activeInteriorClickables = [];
    interiorGroup.traverse((object) => {
      if (object.userData?.interaction) {
        activeInteriorClickables.push(object);
        clickable.push(object);
      }
    });
    interiorActive = true;
    isMoving = false;
    pendingInteraction = null;
    camera.position.set(0, 3.35, 4.45);
    controls.target.set(0, 1.28, -0.2);
    controls.minDistance = 3.0;
    controls.maxDistance = 8.8;
    controls.maxPolarAngle = Math.PI / 1.85;
    controls.update();
    interiorChangeRef?.current?.(info);
  };
  const beginDoorInteraction = (interaction, portalGroup) => {
    if (!interaction) return;
    if (interaction.type === 'exit') {
      if (!interiorActive) return;
      const portal = portalGroup || player;
      portal.updateWorldMatrix?.(true, false);
      const point = new THREE.Vector3();
      portal.getWorldPosition(point);
      const rotation = new THREE.Quaternion();
      portal.getWorldQuaternion(rotation);
      const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation).normalize();
      const approach = point.add(facing.multiplyScalar(-0.82));
      moveTarget.set(clamp(approach.x, -5.5, 5.5), 0, clamp(approach.z, -5.3, 5.3));
      pendingInteraction = interaction;
      isMoving = true;
      if (player.position.distanceTo(moveTarget) < 1.25) exitInterior();
      return;
    }
    if (interiorActive) return;
    const portal = portalGroup || player;
    portal.updateWorldMatrix?.(true, false);
    const point = new THREE.Vector3();
    portal.getWorldPosition(point);
    const rotation = new THREE.Quaternion();
    portal.getWorldQuaternion(rotation);
    const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation).normalize();
    const approach = point.add(facing.multiplyScalar(1.75));
    moveTarget.set(clamp(approach.x, -24, 24), 0, clamp(approach.z, -33, 33));
    pendingInteraction = interaction;
    isMoving = true;
    if (player.position.distanceTo(moveTarget) < 1.25) enterInterior(interaction);
  };
  const focusVenue = (venueId) => {
    const venue = WORLD_VENUES.find((item) => item.id === venueId);
    if (!venue) return;
    if (interiorActive) exitInterior();
    moveTarget.set(clamp(venue.x - 2.5, -24, 24), 0, clamp(venue.z + 3.0, -33, 33));
    isMoving = true;
    pendingInteraction = null;
    cameraFocusTarget.set(venue.x, 0.8, venue.z);
    cameraFocusPosition.set(venue.x + 8.7, 7.3, venue.z + 12.5);
    isFocusingCamera = true;
  };
  if (focusRef) focusRef.current = focusVenue;
  if (exitInteriorRef) exitInteriorRef.current = exitInterior;
  if (partyFocusRef) {
    partyFocusRef.current = (partyId) => {
      const door = partyOfficeDoors.get(partyId);
      if (door) beginDoorInteraction(door.userData.interaction, door.parent);
    };
  }

  const setTargetFromEvent = (event) => {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const activeTargets = interiorActive ? activeInteriorClickables : clickable.filter((object) => !activeInteriorClickables.includes(object));
    const hits = raycaster.intersectObjects(activeTargets, true);
    const interactionHit = hits.find((hit) => hit.object.userData?.interaction);
    if (interactionHit) {
      const portalGroup = interactionHit.object.parent || interactionHit.object;
      beginDoorInteraction(interactionHit.object.userData.interaction, portalGroup);
      return;
    }
    const venueHit = hits.find((hit) => hit.object.userData?.venueId);
    if (venueHit) {
      const venueGroup = venueHit.object.parent?.userData?.venueId ? venueHit.object.parent : venueHit.object;
      moveTarget.set(clamp(venueGroup.position.x - 2.2, -24, 24), 0, clamp(venueGroup.position.z + 2.2, -33, 33));
      isMoving = true;
      pendingInteraction = null;
      onVenueSelect?.(venueHit.object.userData.venueId);
      return;
    }
    if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
      const limit = interiorActive ? 5.8 : 33;
      if (Math.abs(intersection.x) < (interiorActive ? 6.1 : 24) && Math.abs(intersection.z) < limit) {
        moveTarget.set(intersection.x, 0, intersection.z);
        isMoving = true;
        pendingInteraction = null;
      }
    }
  };
  const onPointerDown = (event) => {
    isFocusingCamera = false;
    if (event.pointerType === 'touch') {
      activeTouchCount += 1;
      if (activeTouchCount > 1) { multiTouchGesture = true; activePointer = null; return; }
    }
    if (!multiTouchGesture) activePointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const releasePointer = (event) => {
    if (event.pointerType === 'touch') activeTouchCount = Math.max(0, activeTouchCount - 1);
    if (activePointer?.id === event.pointerId && !multiTouchGesture) {
      const moved = Math.hypot(event.clientX - activePointer.x, event.clientY - activePointer.y);
      if (moved < 7) setTargetFromEvent(event);
      activePointer = null;
    }
    if (activeTouchCount === 0) multiTouchGesture = false;
  };
  const onPointerUp = (event) => releasePointer(event);
  const onPointerCancel = (event) => {
    if (event.pointerType === 'touch') activeTouchCount = Math.max(0, activeTouchCount - 1);
    if (activePointer?.id === event.pointerId) activePointer = null;
    if (activeTouchCount === 0) multiTouchGesture = false;
  };
  const keyState = new Set();
  const onKeyDown = (event) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (event.key === 'Escape' && interiorActive) { exitInterior(); return; }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) {
      keyState.add(event.key.toLowerCase());
      event.preventDefault();
    }
  };
  const onKeyUp = (event) => keyState.delete(event.key.toLowerCase());
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const resize = () => {
    const width = root.clientWidth || 1;
    const height = root.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(root);
  resize();

  let frame = 0;
  const clock = new THREE.Clock();
  const animate = () => {
    frame = requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.04);
    const elapsed = clock.elapsedTime;
    for (const item of traffic) {
      if (item.axis === 'x') {
        item.object.position.x += item.speed * item.dir * delta;
        if (item.dir > 0 && item.object.position.x > item.max) item.object.position.x = item.min;
        if (item.dir < 0 && item.object.position.x < item.min) item.object.position.x = item.max;
      } else {
        item.object.position.z += item.speed * item.dir * delta;
        if (item.dir > 0 && item.object.position.z > item.max) item.object.position.z = item.min;
        if (item.dir < 0 && item.object.position.z < item.min) item.object.position.z = item.max;
      }
    }
    pedestrians.forEach((p) => {
      const phase = elapsed * p.speed + p.phase;
      const walk = Math.sin(phase) * 0.46;
      p.object.position.x = p.startX + (p.walkX ? walk : 0);
      p.object.position.z = p.startZ + (!p.walkX ? walk : 0);
      p.object.position.y = Math.abs(Math.sin(elapsed * 2.2 + p.phase)) * 0.035;
      p.object.userData.legs?.forEach((leg, index) => { leg.rotation.x = Math.sin(phase + index * Math.PI) * 0.48; });
      if (p.object.userData.torso) p.object.userData.torso.position.y = 0.7 + Math.abs(Math.sin(phase * 2)) * 0.025;
    });
    const currentMeeting = meetingRef?.current;
    const meetingIsVisible = Boolean(currentMeeting?.id && ['open', 'closed'].includes(currentMeeting.status));
    meetingStage.visible = meetingIsVisible;
    if (meetingIsVisible) {
      const meetingVenue = WORLD_VENUES.find((item) => item.id === currentMeeting.location?.venueId) || WORLD_VENUES.find((item) => item.id === 'square');
      meetingStage.position.set(meetingVenue?.x || 0, 0, meetingVenue?.z || 0);
      const messages = Array.isArray(meetingMessagesRef?.current) ? meetingMessagesRef.current : [];
      const latestMessage = [...messages].reverse().find((item) => ['speech', 'reply'].includes(item?.kind) && (item.body || item.message));
      if (latestMessage && latestMessage.id !== lastMeetingMessageId) {
        lastMeetingMessageId = latestMessage.id;
        speakingActorIndex = Math.abs(hash(latestMessage.senderName || latestMessage.name || 'Community speaker')) % meetingActors.length;
        speakingUntil = elapsed + 3.1;
        bubbleUntil = elapsed + 7.5;
        const speaker = meetingActors[speakingActorIndex];
        speechBubble.update(latestMessage.senderName || latestMessage.name || 'COMMUNITY SPEAKER', latestMessage.body || latestMessage.message);
        speechBubble.sprite.position.set(speaker.group.position.x, 2.72, speaker.group.position.z);
      }
      meetingActors.forEach((actor, index) => {
        const talking = index === speakingActorIndex && elapsed < speakingUntil;
        const beat = Math.sin(elapsed * 7.4);
        actor.rightArm.rotation.z = talking ? -0.2 - Math.max(0, beat) * 0.82 : 0;
        actor.rightArm.rotation.x = talking ? 0.22 + beat * 0.28 : 0;
        actor.leftArm.rotation.z = talking ? 0.08 + Math.max(0, -beat) * 0.42 : 0;
        actor.head.rotation.x = talking ? Math.sin(elapsed * 4.2) * 0.075 : Math.sin(elapsed * 1.25 + index) * 0.018;
      });
      const bubbleTimeLeft = bubbleUntil - elapsed;
      speechBubble.sprite.visible = bubbleTimeLeft > 0;
      speechBubble.sprite.material.opacity = Math.min(0.98, bubbleTimeLeft < 1.1 ? bubbleTimeLeft / 1.1 : 0.98);
    } else {
      speechBubble.sprite.visible = false;
      speakingActorIndex = -1;
      lastMeetingMessageId = null;
    }
    const speed = (interiorActive ? 5.8 : 7.2) * delta;
    let dx = 0;
    let dz = 0;
    if (keyState.has('w') || keyState.has('arrowup')) dz -= 1;
    if (keyState.has('s') || keyState.has('arrowdown')) dz += 1;
    if (keyState.has('a') || keyState.has('arrowleft')) dx -= 1;
    if (keyState.has('d') || keyState.has('arrowright')) dx += 1;
    const wasWalking = Boolean(dx || dz || isMoving);
    if (dx || dz) {
      const len = Math.hypot(dx, dz) || 1;
      const boundX = interiorActive ? 5.55 : 24;
      const boundZ = interiorActive ? 5.45 : 33;
      player.position.x = clamp(player.position.x + (dx / len) * speed, -boundX, boundX);
      player.position.z = clamp(player.position.z + (dz / len) * speed, -boundZ, boundZ);
      player.rotation.y = Math.atan2(dx, dz);
      isMoving = false;
      pendingInteraction = null;
    } else if (isMoving) {
      const difference = new THREE.Vector3(moveTarget.x - player.position.x, 0, moveTarget.z - player.position.z);
      if (difference.length() < speed * 1.25) {
        player.position.x = moveTarget.x;
        player.position.z = moveTarget.z;
        isMoving = false;
        if (pendingInteraction?.type === 'exit') exitInterior();
        else if (pendingInteraction) enterInterior(pendingInteraction);
      } else {
        difference.normalize().multiplyScalar(speed * 0.8);
        player.position.add(difference);
        player.rotation.y = Math.atan2(difference.x, difference.z);
      }
    }
    const walkingNow = wasWalking && (dx || dz || isMoving || pendingInteraction === null);
    player.userData.legs?.forEach((leg, index) => {
      leg.rotation.x = walkingNow ? Math.sin(elapsed * 11 + index * Math.PI) * 0.52 : THREE.MathUtils.damp(leg.rotation.x, 0, 8, delta);
    });
    if (player.userData.torso) player.userData.torso.position.y = 0.7 + (walkingNow ? Math.abs(Math.sin(elapsed * 11 * 2)) * 0.03 : 0);
    if (!interiorActive && !isFocusingCamera) {
      const followDelta = new THREE.Vector3(player.position.x - previousPlayerPosition.x, 0, player.position.z - previousPlayerPosition.z);
      if (followDelta.lengthSq() > 0) { camera.position.add(followDelta); controls.target.add(followDelta); }
    }
    previousPlayerPosition.copy(player.position);
    if (elapsed - lastEmit > 0.18) {
      lastEmit = elapsed;
      if (!interiorActive) playerRef.current = { x: player.position.x, z: player.position.z };
    }
    updateRemotePlayers(remoteRef.current);
    for (const avatar of remoteSprites.values()) {
      avatar.userData.legs?.forEach((leg, index) => {
        leg.rotation.x = avatar.userData.walking ? Math.sin(elapsed * 9.5 + index * Math.PI) * 0.44 : THREE.MathUtils.damp(leg.rotation.x, 0, 8, delta);
      });
    }
    if (isFocusingCamera) {
      const focusEase = 1 - Math.exp(-2.6 * delta);
      camera.position.lerp(cameraFocusPosition, focusEase);
      controls.target.lerp(cameraFocusTarget, focusEase);
      if (camera.position.distanceTo(cameraFocusPosition) < 0.12 && controls.target.distanceTo(cameraFocusTarget) < 0.08) {
        camera.position.copy(cameraFocusPosition);
        controls.target.copy(cameraFocusTarget);
        isFocusingCamera = false;
      }
    }
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    if (focusRef?.current === focusVenue) focusRef.current = null;
    if (partyFocusRef) partyFocusRef.current = null;
    if (exitInteriorRef) exitInteriorRef.current = null;
    interiorChangeRef?.current?.(null);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    controls.dispose();
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material.map) material.map.dispose();
          material.dispose();
        });
      }
    });
    renderer.dispose();
    renderer.domElement.remove();
  };
}

export default function World({ state, locality = null, locationKey = 'state-capital', selectedVenueId = 'square', focusRequest = 0, onVenueSelect, onMove, remotePlayers = [], playerColor = '#d8f36b', meeting = null, meetingMessages = [], partyOfficeActionRef, exitInteriorActionRef, onInteriorChange }) {
  const mountRef = useRef(null);
  const positionRef = useRef({ x: -5.8, z: 3.5 });
  const remoteRef = useRef(remotePlayers);
  const moveCallbackRef = useRef(onMove);
  const venueCallbackRef = useRef(onVenueSelect);
  const meetingRef = useRef(meeting);
  const meetingMessagesRef = useRef(meetingMessages);
  const focusRef = useRef(null);
  const hasMountedFocusRef = useRef(false);
  const interiorChangeRef = useRef(onInteriorChange);
  const [worldError, setWorldError] = useState(false);
  remoteRef.current = remotePlayers;
  moveCallbackRef.current = onMove;
  venueCallbackRef.current = onVenueSelect;
  meetingRef.current = meeting;
  meetingMessagesRef.current = meetingMessages;
  interiorChangeRef.current = onInteriorChange;

  useEffect(() => {
    if (!mountRef.current) return undefined;
    setWorldError(false);
    try {
      const cleanup = buildWorld(
        mountRef.current,
        state,
        locality,
        (id) => venueCallbackRef.current?.(id),
        positionRef,
        remoteRef,
        playerColor,
        meetingRef,
        meetingMessagesRef,
        focusRef,
        partyOfficeActionRef,
        exitInteriorActionRef,
        interiorChangeRef,
      );
      return cleanup;
    } catch (error) {
      console.error('NIGERIA 2027 3D scene failed to initialize:', error);
      setWorldError(true);
      return undefined;
    }
  }, [state, playerColor, locationKey]);

  useEffect(() => {
    if (!hasMountedFocusRef.current) { hasMountedFocusRef.current = true; return; }
    if (selectedVenueId) focusRef.current?.(selectedVenueId);
  }, [selectedVenueId, focusRequest]);

  useEffect(() => {
    const interval = window.setInterval(() => moveCallbackRef.current?.(positionRef.current), 180);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="world-layer">
      <div className="world-canvas" ref={mountRef} />
      {worldError && <div className="world-error-banner" role="status"><strong>3D view unavailable</strong><span>The interactive scene could not start in this browser. The rest of the game should still work. Refresh the page or enable WebGL/hardware acceleration.</span></div>}
    </div>
  );
}

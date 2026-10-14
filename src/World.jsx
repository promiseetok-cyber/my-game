import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NPCS, PARTY_OPTIONS, STATES, WORLD_VENUES } from './data.js';
import { createLocalPartyBranches } from './partyBranches.js';
import { PARTY_REGISTER_CHECKED_AT, PARTY_REGISTER_SOURCE } from './partyRegistry.js';
import { STATE_WORLD_PROFILES } from './stateWorldProfiles.js';
import { createLocalityVisualProfile } from './localityStyles.js';
import { meetingArrivalPoint } from './meetingWorld.js';

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

function pointCollidesWithRect(x, z, radius, rect) {
  const nearestX = clamp(x, rect.minX, rect.maxX);
  const nearestZ = clamp(z, rect.minZ, rect.maxZ);
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return dx * dx + dz * dz < radius * radius;
}

function circleBlockedAt(x, z, radius, colliders) {
  return colliders.some((rect) => pointCollidesWithRect(x, z, radius, rect));
}

function aabbBlockedAt(x, z, halfX, halfZ, colliders) {
  return colliders.some((rect) => x + halfX > rect.minX && x - halfX < rect.maxX && z + halfZ > rect.minZ && z - halfZ < rect.maxZ);
}

function segmentIntersectsAabb(x0, z0, x1, z1, minX, maxX, minZ, maxZ) {
  let near = 0;
  let far = 1;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const clip = (p, q) => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const t = q / p;
    if (p < 0) near = Math.max(near, t);
    else far = Math.min(far, t);
    return near <= far;
  };
  return clip(-dx, x0 - minX) && clip(dx, maxX - x0) && clip(-dz, z0 - minZ) && clip(dz, maxZ - z0);
}

function segmentWithinCircle(x0, z0, x1, z1, centerX, centerZ, radius) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 1e-9 ? clamp(((centerX - x0) * dx + (centerZ - z0) * dz) / lengthSq, 0, 1) : 0;
  const nearestX = x0 + dx * t;
  const nearestZ = z0 + dz * t;
  const distanceX = nearestX - centerX;
  const distanceZ = nearestZ - centerZ;
  return distanceX * distanceX + distanceZ * distanceZ < radius * radius;
}

function circlePathBlocked(x0, z0, x1, z1, radius, colliders) {
  return colliders.some((rect) => (
    segmentIntersectsAabb(x0, z0, x1, z1, rect.minX - radius, rect.maxX + radius, rect.minZ, rect.maxZ)
    || segmentIntersectsAabb(x0, z0, x1, z1, rect.minX, rect.maxX, rect.minZ - radius, rect.maxZ + radius)
    || segmentWithinCircle(x0, z0, x1, z1, rect.minX, rect.minZ, radius)
    || segmentWithinCircle(x0, z0, x1, z1, rect.minX, rect.maxZ, radius)
    || segmentWithinCircle(x0, z0, x1, z1, rect.maxX, rect.minZ, radius)
    || segmentWithinCircle(x0, z0, x1, z1, rect.maxX, rect.maxZ, radius)
  ));
}

function aabbPathBlocked(x0, z0, x1, z1, halfX, halfZ, colliders) {
  return colliders.some((rect) => segmentIntersectsAabb(
    x0, z0, x1, z1,
    rect.minX - halfX, rect.maxX + halfX,
    rect.minZ - halfZ, rect.maxZ + halfZ,
  ));
}

function moveCircleSafely(position, dx, dz, radius, colliders, bounds) {
  const startX = position.x;
  const startZ = position.z;
  const targetX = clamp(startX + dx, bounds.minX + radius, bounds.maxX - radius);
  const targetZ = clamp(startZ + dz, bounds.minZ + radius, bounds.maxZ - radius);
  if ((Math.abs(targetX - startX) > 1e-5 || Math.abs(targetZ - startZ) > 1e-5)
    && !circlePathBlocked(startX, startZ, targetX, targetZ, radius, colliders)) {
    position.x = targetX;
    position.z = targetZ;
  } else {
    if (Math.abs(targetX - startX) > 1e-5 && !circlePathBlocked(startX, startZ, targetX, startZ, radius, colliders)) position.x = targetX;
    if (Math.abs(targetZ - startZ) > 1e-5 && !circlePathBlocked(position.x, startZ, position.x, targetZ, radius, colliders)) position.z = targetZ;
  }
  return { x: position.x - startX, z: position.z - startZ, moved: Math.abs(position.x - startX) + Math.abs(position.z - startZ) > 1e-5 };
}

function findNearestFreePoint(x, z, radius, colliders, bounds, maxRadius = 5.5) {
  const candidate = { x: clamp(x, bounds.minX + radius, bounds.maxX - radius), z: clamp(z, bounds.minZ + radius, bounds.maxZ - radius) };
  if (!circleBlockedAt(candidate.x, candidate.z, radius, colliders)) return candidate;
  for (let distance = 0.35; distance <= maxRadius; distance += 0.35) {
    const count = Math.max(12, Math.ceil(distance * 5));
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const nextX = clamp(x + Math.cos(angle) * distance, bounds.minX + radius, bounds.maxX - radius);
      const nextZ = clamp(z + Math.sin(angle) * distance, bounds.minZ + radius, bounds.maxZ - radius);
      if (!circleBlockedAt(nextX, nextZ, radius, colliders)) return { x: nextX, z: nextZ };
    }
  }
  return null;
}

function findWalkPath(start, target, radius, colliders, bounds, cellSize = 0.25) {
  const isFree = (x, z) => x >= bounds.minX + radius && x <= bounds.maxX - radius
    && z >= bounds.minZ + radius && z <= bounds.maxZ - radius
    && !circleBlockedAt(x, z, radius, colliders);
  const startPoint = { x: start.x, z: start.z };
  const targetPoint = { x: target.x, z: target.z };
  const findGridPoint = (point) => {
    const baseX = Math.round(point.x / cellSize);
    const baseZ = Math.round(point.z / cellSize);
    for (let ring = 0; ring <= 8; ring += 1) {
      let closest = null;
      let closestDistance = Infinity;
      for (let offsetX = -ring; offsetX <= ring; offsetX += 1) {
        for (let offsetZ = -ring; offsetZ <= ring; offsetZ += 1) {
          if (Math.max(Math.abs(offsetX), Math.abs(offsetZ)) !== ring) continue;
          const candidate = { x: (baseX + offsetX) * cellSize, z: (baseZ + offsetZ) * cellSize };
          if (!isFree(candidate.x, candidate.z) || circlePathBlocked(point.x, point.z, candidate.x, candidate.z, radius, colliders)) continue;
          const distance = (candidate.x - point.x) ** 2 + (candidate.z - point.z) ** 2;
          if (distance < closestDistance) { closest = candidate; closestDistance = distance; }
        }
      }
      if (closest) return closest;
    }
    return null;
  };
  const startGrid = findGridPoint(startPoint);
  const targetGrid = findGridPoint(targetPoint);
  if (!startGrid || !targetGrid) return null;
  const keyFor = (x, z) => `${x},${z}`;
  const startIX = Math.round(startGrid.x / cellSize);
  const startIZ = Math.round(startGrid.z / cellSize);
  const targetIX = Math.round(targetGrid.x / cellSize);
  const targetIZ = Math.round(targetGrid.z / cellSize);
  const startKey = keyFor(startIX, startIZ);
  const targetKey = keyFor(targetIX, targetIZ);
  if (startKey === targetKey) return circlePathBlocked(startPoint.x, startPoint.z, targetPoint.x, targetPoint.z, radius, colliders) ? null : [targetPoint];

  const searchMargin = 8;
  const searchBounds = {
    minX: Math.max(bounds.minX + radius, Math.min(startGrid.x, targetGrid.x) - searchMargin),
    maxX: Math.min(bounds.maxX - radius, Math.max(startGrid.x, targetGrid.x) + searchMargin),
    minZ: Math.max(bounds.minZ + radius, Math.min(startGrid.z, targetGrid.z) - searchMargin),
    maxZ: Math.min(bounds.maxZ - radius, Math.max(startGrid.z, targetGrid.z) + searchMargin),
  };
  const heuristic = (x, z) => Math.hypot(targetGrid.x - x * cellSize, targetGrid.z - z * cellSize);
  const open = [];
  const push = (node) => {
    let index = open.push(node) - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (open[parent].f <= open[index].f) break;
      [open[parent], open[index]] = [open[index], open[parent]];
      index = parent;
    }
  };
  const pop = () => {
    const first = open[0];
    const last = open.pop();
    if (open.length && last) {
      open[0] = last;
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < open.length && open[left].f < open[smallest].f) smallest = left;
        if (right < open.length && open[right].f < open[smallest].f) smallest = right;
        if (smallest === index) break;
        [open[index], open[smallest]] = [open[smallest], open[index]];
        index = smallest;
      }
    }
    return first;
  };
  const gScore = new Map([[startKey, 0]]);
  const parents = new Map();
  const points = new Map([[startKey, startGrid]]);
  const closed = new Set();
  push({ x: startIX, z: startIZ, key: startKey, g: 0, f: heuristic(startIX, startIZ) });
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let found = false;
  let expanded = 0;
  while (open.length && expanded < 40000) {
    const current = pop();
    if (closed.has(current.key) || current.g !== gScore.get(current.key)) continue;
    if (current.key === targetKey) { found = true; break; }
    closed.add(current.key);
    expanded += 1;
    const currentPoint = points.get(current.key);
    for (const [stepX, stepZ] of directions) {
      const nextX = current.x + stepX;
      const nextZ = current.z + stepZ;
      const worldX = nextX * cellSize;
      const worldZ = nextZ * cellSize;
      if (worldX < searchBounds.minX || worldX > searchBounds.maxX || worldZ < searchBounds.minZ || worldZ > searchBounds.maxZ) continue;
      if (!isFree(worldX, worldZ) || circlePathBlocked(currentPoint.x, currentPoint.z, worldX, worldZ, radius, colliders)) continue;
      const nextKey = keyFor(nextX, nextZ);
      if (closed.has(nextKey)) continue;
      const nextCost = current.g + cellSize * (stepX && stepZ ? Math.SQRT2 : 1);
      if (nextCost >= (gScore.get(nextKey) ?? Infinity)) continue;
      gScore.set(nextKey, nextCost);
      parents.set(nextKey, current.key);
      points.set(nextKey, { x: worldX, z: worldZ });
      push({ x: nextX, z: nextZ, key: nextKey, g: nextCost, f: nextCost + heuristic(nextX, nextZ) });
    }
  }
  if (!found) return null;
  const gridPath = [];
  let cursor = targetKey;
  while (cursor !== startKey) {
    gridPath.push(points.get(cursor));
    cursor = parents.get(cursor);
    if (!cursor) return null;
  }
  gridPath.push(startGrid);
  gridPath.reverse();
  const fullPath = [startPoint];
  for (const point of gridPath.slice(1)) {
    if (Math.hypot(point.x - fullPath[fullPath.length - 1].x, point.z - fullPath[fullPath.length - 1].z) > 0.02) fullPath.push(point);
  }
  if (Math.hypot(targetPoint.x - fullPath[fullPath.length - 1].x, targetPoint.z - fullPath[fullPath.length - 1].z) > 0.02) fullPath.push(targetPoint);
  const smoothed = [fullPath[0]];
  let pathIndex = 0;
  while (pathIndex < fullPath.length - 1) {
    let nextIndex = fullPath.length - 1;
    while (nextIndex > pathIndex + 1 && circlePathBlocked(
      fullPath[pathIndex].x, fullPath[pathIndex].z, fullPath[nextIndex].x, fullPath[nextIndex].z, radius, colliders,
    )) nextIndex -= 1;
    smoothed.push(fullPath[nextIndex]);
    pathIndex = nextIndex;
  }
  return smoothed.slice(1);
}

function worldVehicleFootprint(vehicle) {
  const footprint = vehicle.userData.vehicleFootprint || { halfLength: 0.8, halfWidth: 0.5 };
  const angle = vehicle.rotation.y || 0;
  const alongX = Math.abs(Math.cos(angle));
  const alongZ = Math.abs(Math.sin(angle));
  return {
    halfX: alongX * footprint.halfLength + alongZ * footprint.halfWidth,
    halfZ: alongZ * footprint.halfLength + alongX * footprint.halfWidth,
  };
}
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
  const collisionRects = [{ x: 0, z: 0, halfX: w / 2 + 0.12, halfZ: d / 2 + 0.12 }];
  if (index % 3 === 0) {
    const plotW = w + 1.25;
    const plotD = d + 1.35;
    const wallThickness = 0.14;
    const gateWidth = 1.2;
    const frontRun = Math.max(0.8, (plotW - gateWidth) / 2);
    collisionRects.push(
      { x: -plotW / 2, z: 0.05, halfX: wallThickness / 2 + 0.04, halfZ: plotD / 2 + 0.08 },
      { x: plotW / 2, z: 0.05, halfX: wallThickness / 2 + 0.04, halfZ: plotD / 2 + 0.08 },
      { x: 0, z: -plotD / 2 + 0.05, halfX: plotW / 2 + 0.05, halfZ: wallThickness / 2 + 0.04 },
      { x: -(gateWidth / 2 + frontRun / 2), z: plotD / 2 + 0.05, halfX: frontRun / 2 + 0.04, halfZ: wallThickness / 2 + 0.04 },
      { x: gateWidth / 2 + frontRun / 2, z: plotD / 2 + 0.05, halfX: frontRun / 2 + 0.04, halfZ: wallThickness / 2 + 0.04 },
      { x: -gateWidth / 2, z: plotD / 2 + 0.05, halfX: 0.09, halfZ: 0.09 },
      { x: gateWidth / 2, z: plotD / 2 + 0.05, halfX: 0.09, halfZ: 0.09 },
    );
  }
  group.userData.collisionRects = collisionRects;
  group.userData.groundHeight = palette.grass;
  return group;
}

function makePartyOffice(party, branch, x, z) {
  const group = new THREE.Group();
  const color = party.color || '#3b8c72';
  const base = box(3.55, 0.18, 3.65, '#b5a27f', { castShadow: false });
  base.position.y = 0.09;
  group.add(base);
  // Keep the exterior building sealed; entering swaps to a separate fully enclosed room interior.
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
  const officeDoor = addDoorPortal(group, { id: `party-office-${party.id}`, title: `ENTER ${party.tag}`, type: 'party-office', partyId: party.id, accent: color, x: 0.48, z: 1.25, width: 0.56, height: 1.26, metadata: { partyId: party.id, partyName: party.name, branch } });
  // The whole office facade is an entry target, so touch users do not have to hit a tiny door leaf.
  group.userData.interaction = officeDoor.userData.interaction;
  group.userData.interactionPortal = officeDoor.parent;
  group.position.set(x, 0, z);
  group.userData.partyId = party.id;
  group.userData.branch = branch;
  group.userData.collisionRects = [
    { x: 0, z: 0.06, halfX: 1.62, halfZ: 1.24 },
    // Compound walls deliberately stop short of the front gate; the gap stays walkable.
    { x: -2.8, z: 0.25, halfX: 0.105, halfZ: 2.82 },
    { x: 2.8, z: 0.25, halfX: 0.105, halfZ: 2.82 },
    { x: 0, z: -2.5, halfX: 2.82, halfZ: 0.105 },
    { x: -1.7625, z: 3.0, halfX: 1.06, halfZ: 0.105 },
    { x: 1.7625, z: 3.0, halfX: 1.06, halfZ: 0.105 },
    { x: -0.725, z: 3.0, halfX: 0.11, halfZ: 0.12 },
    { x: 0.725, z: 3.0, halfX: 0.11, halfZ: 0.12 },
  ];
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
  g.userData.vehicleFootprint = { halfLength: bodyLength / 2 + 0.12, halfWidth: bodyWidth / 2 + 0.12 };
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
  boat.userData.vehicleFootprint = { halfLength: 0.88, halfWidth: 0.43 };
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
  lamp.material.emissive.set('#f4cf8a');
  lamp.material.emissiveIntensity = 0;
  scene.add(lamp);
  const light = new THREE.PointLight('#ffd99b', 0, 15, 2);
  light.position.set(x + 0.67, 3.98, z);
  scene.add(light);
  return { light, bulb: lamp.material };
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
  if (feature === 'water tank') {
    group.userData.collisionRects = [-0.72, 0.72].flatMap((x) => [-0.58, 0.58].map((z) => ({ x, z, halfX: 0.14, halfZ: 0.14 })));
  } else if (feature === 'market canopy') {
    group.userData.collisionRects = [{ x: 0, z: 0, halfX: 0.9, halfZ: 0.58 }];
  } else if (feature === 'bus shelter') {
    group.userData.collisionRects = [
      { x: -1.45, z: 0, halfX: 0.11, halfZ: 0.58 },
      { x: 1.45, z: 0, halfX: 0.11, halfZ: 0.58 },
      { x: 0, z: 0.12, halfX: 0.92, halfZ: 0.24 },
    ];
  } else if (feature === 'civic roundabout') {
    group.userData.collisionRects = [{ x: 0, z: 0, halfX: 1.4, halfZ: 1.4 }];
  } else if (feature === 'footbridge') {
    group.userData.collisionRects = [-1.65, 1.65].map((x) => ({ x, z: 0, halfX: 0.2, halfZ: 0.3 }));
  } else {
    group.userData.collisionRects = [{ x: 0, z: 0, halfX: 1.78, halfZ: 1.36 }];
  }
  group.position.set(17.5, 0, -17.5);
  group.name = `locality-micro-landmark-${localityStyle.code}`;
  return group;
}

function makePerson(shirt = '#f3a17b', skin = '#7d5138', appearance = {}) {
  const group = new THREE.Group();
  const headStyle = ['close', 'natural', 'wrap', 'cap'].includes(appearance.headStyle) ? appearance.headStyle : 'close';
  const shirtColor = appearance.outfitColor || shirt;
  const skinColor = appearance.skinTone || skin;
  const shirtMaterial = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.82 });
  const trouserMaterial = new THREE.MeshStandardMaterial({ color: '#363f38', roughness: 0.95 });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.86 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: '#201d1a', roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 3, 8), shirtMaterial);
  torso.position.y = 0.7;
  torso.castShadow = true;
  group.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.17, 8), skinMaterial);
  neck.position.y = 1.11;
  neck.castShadow = true;
  group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), skinMaterial);
  head.position.y = 1.25;
  head.castShadow = true;
  group.add(head);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.043, 8, 8), skinMaterial);
    ear.position.set(side * 0.182, 1.245, 0.005);
    group.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.023, 7, 6), darkMaterial);
    eye.position.set(side * 0.064, 1.272, 0.164);
    group.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 7, 6), skinMaterial);
  nose.scale.set(0.75, 1.2, 0.7);
  nose.position.set(0, 1.218, 0.184);
  group.add(nose);
  const hairMaterial = new THREE.MeshStandardMaterial({ color: '#232521', roughness: 0.97 });
  if (headStyle === 'wrap') {
    const wrap = new THREE.Mesh(new THREE.SphereGeometry(0.207, 12, 8), new THREE.MeshStandardMaterial({ color: '#d5b96f', roughness: 0.9 }));
    wrap.position.set(0, 1.355, -0.005);
    wrap.scale.set(1.02, 0.49, 1.02);
    wrap.castShadow = true;
    group.add(wrap);
    const fold = new THREE.Mesh(new THREE.TorusGeometry(0.157, 0.018, 5, 14), new THREE.MeshStandardMaterial({ color: '#b8924d', roughness: 0.95 }));
    fold.rotation.x = Math.PI / 2;
    fold.position.set(0, 1.32, 0);
    group.add(fold);
  } else if (headStyle === 'cap') {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.205, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#263b35', roughness: 0.92 }));
    crown.position.set(0, 1.295, -0.005);
    crown.castShadow = true;
    group.add(crown);
    const brim = box(0.31, 0.035, 0.2, '#263b35', { castShadow: true });
    brim.position.set(0, 1.31, 0.095);
    group.add(brim);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(headStyle === 'natural' ? 0.202 : 0.194, 12, 8), hairMaterial);
    hair.position.set(0, headStyle === 'natural' ? 1.345 : 1.335, -0.005);
    hair.scale.set(1, headStyle === 'natural' ? 0.68 : 0.4, 1.02);
    hair.castShadow = true;
    group.add(hair);
  }
  const legs = [];
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.245, 0.89, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.22, 3, 7), shirtMaterial);
    sleeve.position.y = -0.13;
    sleeve.castShadow = true;
    arm.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), skinMaterial);
    hand.position.y = -0.3;
    arm.add(hand);
    group.add(arm);
    arms.push(arm);

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
  group.userData.arms = arms;
  group.userData.torso = torso;
  group.userData.head = head;
  group.userData.neck = neck;
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

function makeAirliner(cabinClass = 'economy', livery = '#1c6b52') {
  const privateJet = cabinClass === 'private-jet';
  const regional = cabinClass === 'executive';
  const group = new THREE.Group();
  const shellMaterial = new THREE.MeshStandardMaterial({ color: privateJet ? '#f1eee2' : '#e9ebe5', roughness: 0.48, metalness: 0.08 });
  const liveryMaterial = new THREE.MeshStandardMaterial({ color: livery, roughness: 0.52, metalness: 0.12 });
  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(privateJet ? 0.4 : 0.58, privateJet ? 4.4 : regional ? 6.0 : 7.6, 5, 10), shellMaterial);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);
  const wingspan = privateJet ? 6.4 : regional ? 9.5 : 12.8;
  const wing = box(wingspan, 0.16, privateJet ? 1.55 : 2.0, livery, { castShadow: true, metalness: 0.12 });
  wing.position.set(0, -0.04, -0.25);
  group.add(wing);
  const tailPlane = box(privateJet ? 2.4 : 4.2, 0.1, 0.86, livery, { castShadow: false });
  tailPlane.position.set(0, 0.12, privateJet ? -2.6 : -3.65);
  group.add(tailPlane);
  const fin = box(0.18, privateJet ? 1.0 : 1.55, privateJet ? 1.0 : 1.4, livery, { castShadow: true });
  fin.position.set(0, privateJet ? 0.55 : 0.75, privateJet ? -2.7 : -3.65);
  group.add(fin);
  const stripe = box(privateJet ? 0.12 : 0.1, 0.12, privateJet ? 4.1 : 6.5, livery, { castShadow: false });
  stripe.position.set(privateJet ? 0.37 : 0.54, 0.08, privateJet ? -0.05 : -0.2);
  group.add(stripe);
  if (!privateJet) {
    for (const side of [-1, 1]) {
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.36, 1.35, 12), liveryMaterial);
      engine.rotation.z = Math.PI / 2;
      engine.position.set(side * (regional ? 1.9 : 2.45), -0.42, -0.1);
      group.add(engine);
    }
  }
  const windowCount = privateJet ? 7 : regional ? 9 : 13;
  for (const side of [-1, 1]) {
    for (let index = 0; index < windowCount; index += 1) {
      const z = (privateJet ? -1.8 : regional ? -2.7 : -3.75) + index * (privateJet ? 0.55 : regional ? 0.64 : 0.61);
      const porthole = box(0.045, 0.16, 0.2, '#315964', { castShadow: false, roughness: 0.28, metalness: 0.14 });
      porthole.position.set(side * (privateJet ? 0.39 : 0.56), 0.18, z);
      group.add(porthole);
    }
  }
  const windscreen = box(privateJet ? 0.65 : 0.92, 0.32, 0.08, '#2a4d58', { castShadow: false, roughness: 0.25, metalness: 0.15 });
  windscreen.position.set(0, 0.36, privateJet ? 2.65 : 4.24);
  group.add(windscreen);
  const door = box(0.05, privateJet ? 0.82 : 1.05, 0.62, '#46635f', { castShadow: false, roughness: 0.55 });
  door.position.set(privateJet ? 0.4 : 0.57, -0.02, privateJet ? 1.0 : 1.2);
  group.add(door);
  for (const [x, z, scale] of [[0, 0.85, 1], [-1.75, -0.05, 0.85], [1.75, -0.05, 0.85]]) {
    const strut = box(0.08, 0.52, 0.08, '#65716f', { castShadow: false });
    strut.position.set(x, -0.73, z);
    group.add(strut);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16 * scale, 0.055, 6, 10), new THREE.MeshStandardMaterial({ color: '#242b2a', roughness: 0.82 }));
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(x, -1.03, z);
    group.add(wheel);
  }
  group.userData.cabinClass = cabinClass;
  group.userData.isAircraft = true;
  return group;
}

function makeCloudCluster() {
  const cloud = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: '#f5f8f2', roughness: 1, transparent: true, opacity: 0.9 });
  const puffs = [[0, 0, 0, 1.25], [0.9, 0.1, 0.2, 0.9], [-0.85, -0.08, -0.1, 0.88], [0.1, 0.42, -0.16, 0.92]];
  puffs.forEach(([x, y, z, scale]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.75 * scale, 8, 7), material);
    puff.position.set(x, y, z);
    puff.scale.set(1.35, 0.72, 1.0);
    cloud.add(puff);
  });
  return cloud;
}

function makeVenue(venue, palette, sceneMaterials, stateLabel, propertyProfile = null, propertyOwner = 'PLAYER') {
  const g = new THREE.Group();
  const { x, z, type, color } = venue;
  if (type === 'stadium') {
    makeStadium(g, sceneMaterials);
  } else if (type === 'airport') {
    const apron = box(13.2, 0.08, 7.4, '#606965', { castShadow: false, roughness: 0.92 });
    apron.position.set(0, 0.04, -0.4);
    g.add(apron);
    const runway = box(11.0, 0.045, 2.15, '#414b48', { castShadow: false, roughness: 0.94 });
    runway.position.set(0, 0.095, -1.2);
    g.add(runway);
    for (let i = 0; i < 8; i += 1) {
      const dash = box(0.54, 0.025, 0.075, '#eee7cd', { castShadow: false });
      dash.position.set(-4.55 + i * 1.3, 0.13, -1.2);
      g.add(dash);
    }
    for (const x of [-5.6, 5.6]) {
      const edge = box(0.045, 0.025, 6.8, '#e9dfbf', { castShadow: false });
      edge.position.set(x, 0.13, -0.4);
      g.add(edge);
    }
    const airportWallColors = palette.houseColors || ['#d5d2c4'];
    const airportRoofColors = palette.roofColors || ['#4d5d58'];
    const airportWall = airportWallColors[hash(stateLabel) % airportWallColors.length];
    const airportRoof = airportRoofColors[(hash(stateLabel) + 1) % airportRoofColors.length];
    const terminal = box(6.0, 1.22, 2.25, airportWall);
    terminal.position.set(0, 0.68, 3.3);
    g.add(terminal);
    const terminalRoof = box(6.35, 0.22, 2.5, airportRoof);
    terminalRoof.position.set(0, 1.42, 3.3);
    g.add(terminalRoof);
    for (const x of [-2.0, 0, 2.0]) {
      const glass = box(1.65, 0.55, 0.06, '#78a8a3', { castShadow: false, metalness: 0.2, roughness: 0.3 });
      glass.position.set(x, 0.88, 4.45);
      g.add(glass);
    }
    const controlTower = box(1.0, 2.25, 0.9, '#c8c4b2');
    controlTower.position.set(4.2, 1.16, 3.35);
    g.add(controlTower);
    const controlGlass = box(1.2, 0.55, 1.1, '#6d9aa0', { castShadow: false, roughness: 0.32, metalness: 0.12 });
    controlGlass.position.set(4.2, 2.02, 3.35);
    g.add(controlGlass);
    const parkedFleet = [
      { cabin: 'economy', color: '#24754f', pos: [-3.85, 0.65, -1.7], scale: 0.35, yaw: -0.14 },
      { cabin: 'executive', color: '#396c96', pos: [3.75, 0.52, -2.1], scale: 0.28, yaw: 0.13 },
      { cabin: 'business', color: '#af6b3c', pos: [-1.2, 0.42, -4.3], scale: 0.25, yaw: 0.02 },
      { cabin: 'private-jet', color: '#454e6d', pos: [1.6, 0.45, 0.1], scale: 0.23, yaw: -0.28 },
    ];
    parkedFleet.forEach((item) => {
      const aircraft = makeAirliner(item.cabin, item.color);
      aircraft.position.set(...item.pos);
      aircraft.rotation.y = item.yaw;
      aircraft.scale.setScalar(item.scale);
      g.add(aircraft);
    });
  } else if (type === 'home') {
    const houseLevel = clamp(Number(propertyProfile?.houseLevel) || 1, 1, 5);
    const garageLevel = clamp(Number(propertyProfile?.garageLevel) || 0, 0, 4);
    const extraPlots = clamp(Number(propertyProfile?.extraPlots) || 0, 0, 3);
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 6.2), new THREE.MeshStandardMaterial({ color: '#73936c', roughness: 0.97, side: THREE.DoubleSide }));
    yard.rotation.x = -Math.PI / 2;
    yard.position.y = 0.025;
    g.add(yard);
    const plinth = box(4.8, 0.28, 3.7, '#9d8b6e', { castShadow: false });
    plinth.position.set(0, 0.16, -0.15);
    g.add(plinth);
    const wallColors = palette.houseColors || ['#e1d0aa', '#d7c29d'];
    const roofColors = palette.roofColors || ['#655b49'];
    const house = box(3.8, 1.75, 3.0, wallColors[hash(stateLabel) % wallColors.length]);
    house.position.set(-0.15, 1.15, -0.2);
    g.add(house);
    const roof = box(4.12, 0.2, 3.35, roofColors[0]);
    roof.position.set(-0.15, 2.14, -0.2);
    g.add(roof);
    if (houseLevel >= 3) {
      const upperFloor = box(2.55, 1.22, 2.55, wallColors[(hash(stateLabel) + 1) % wallColors.length]);
      upperFloor.position.set(-0.15, 2.82, -0.25);
      g.add(upperFloor);
      const upperRoof = box(2.9, 0.18, 2.9, roofColors[0]);
      upperRoof.position.set(-0.15, 3.54, -0.25);
      g.add(upperRoof);
      const balcony = box(2.85, 0.1, 0.65, '#9b8560');
      balcony.position.set(-0.15, 2.2, 1.54);
      g.add(balcony);
    }
    const entryDoor = box(0.62, 1.08, 0.05, '#604633', { castShadow: false });
    entryDoor.position.set(0.68, 0.82, 1.32);
    g.add(entryDoor);
    for (const x of [-1.25, 0.88]) {
      const window = box(0.55, 0.48, 0.05, '#78a8a3', { castShadow: false, roughness: 0.32, metalness: 0.08 });
      window.position.set(x, 1.3, 1.33);
      g.add(window);
    }
    const garageWidth = garageLevel >= 3 ? 2.1 : 1.45;
    const garage = box(garageWidth, 1.25, 1.65, garageLevel ? '#596c61' : '#8e836d');
    garage.position.set(1.82, 0.68, -1.28);
    g.add(garage);
    const garageRoof = box(2.25, 0.15, 1.85, roofColors[0]);
    garageRoof.position.set(1.82, 1.36, -1.28);
    g.add(garageRoof);
    for (let line = 0; line < 4; line += 1) {
      const panel = box(garageWidth - 0.14, 0.045, 0.035, '#d2ccb9', { castShadow: false });
      panel.position.set(1.82, 0.23 + line * 0.28, -0.43);
      g.add(panel);
    }
    for (let plot = 0; plot < extraPlots; plot += 1) {
      const planter = box(0.9, 0.3, 0.75, ['#896a4f', '#9a7957', '#6f7153'][plot % 3]);
      planter.position.set(-2.4 + plot * 1.5, 0.22, 2.25);
      g.add(planter);
      const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: '#477c4e', roughness: 0.9 }));
      shrub.position.set(-2.4 + plot * 1.5, 0.6, 2.25);
      g.add(shrub);
    }
    const ownerLabel = labelSprite(propertyOwner === 'New Candidate' ? 'MY HOME' : `${propertyOwner} HOME`, color);
    ownerLabel.position.set(-0.1, houseLevel >= 3 ? 5.0 : 4.35, -0.18);
    ownerLabel.scale.set(2.8, 0.62, 1);
    g.add(ownerLabel);
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
    addDoorPortal(g, { id: `venue-${venue.id}`, title: venue.short || venue.label, type: 'venue', accent: color, x: type === 'home' ? 0.68 : 0, z: type === 'stadium' ? 3.0 : type === 'airport' ? 4.45 : type === 'home' ? 1.34 : 1.45, width: 0.82, height: 1.32, metadata: { venueId: venue.id, venueType: type } });
  }
  if (type === 'airport') {
    const boardingPoints = [
      { id: 'economy', cabin: 'economy', x: -3.85, z: -0.06, accent: '#30925e', title: 'ECONOMY GATE' },
      { id: 'executive', cabin: 'executive', x: -4.25, z: -4.45, accent: '#488a7e', title: 'EXECUTIVE GATE' },
      { id: 'business', cabin: 'business', x: -1.15, z: -4.0, accent: '#4c78a8', title: 'BUSINESS GATE' },
      { id: 'first', cabin: 'first', x: 1.72, z: -3.65, accent: '#b9934b', title: 'FIRST CLASS' },
      { id: 'private-jet', cabin: 'private-jet', x: 3.45, z: -0.16, accent: '#74789e', title: 'PRIVATE JET' },
    ];
    boardingPoints.forEach((gate) => addDoorPortal(g, { id: `boarding-${gate.id}`, title: gate.title, type: 'plane', accent: gate.accent, x: gate.x, z: gate.z, width: 0.78, height: 1.18, metadata: { venueType: 'plane', cabinClass: gate.cabin } }));
  }
  if (type === 'home') {
    addDoorPortal(g, { id: 'home-garage', title: 'HOME GARAGE', type: 'garage', accent: '#a7895d', x: 1.82, z: -0.43, width: 0.92, height: 1.22, metadata: { venueType: 'garage' } });
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
  if (type === 'airport') {
    g.userData.collisionRects = [
      { x: 0, z: 3.34, halfX: 3.12, halfZ: 1.24 },
      { x: 4.2, z: 3.35, halfX: 0.64, halfZ: 0.68 },
    ];
  } else if (type === 'home') {
    g.userData.collisionRects = [
      { x: -0.84, z: 1.32, halfX: 1.21, halfZ: 0.105 },
      { x: 1.37, z: 1.32, halfX: 0.39, halfZ: 0.105 },
      { x: -2.05, z: -0.2, halfX: 0.11, halfZ: 1.5 },
      { x: 1.75, z: -0.2, halfX: 0.11, halfZ: 1.5 },
      { x: -0.15, z: -1.72, halfX: 1.9, halfZ: 0.11 },
      { x: 1.82, z: -1.28, halfX: 1.15, halfZ: 0.92 },
    ];
  } else if (['office', 'court', 'assembly', 'caucus'].includes(type)) {
    const compoundWidth = type === 'assembly' ? 5.6 : 4.8;
    const compoundDepth = 5.5;
    const gateWidth = 1.45;
    const gateRun = (compoundWidth - gateWidth) / 2;
    g.userData.collisionRects = [
      { x: 0, z: 0, halfX: (type === 'assembly' ? 3.5 : 2.8) / 2 + 0.14, halfZ: 1.27 },
      { x: -compoundWidth / 2, z: 0.25, halfX: 0.105, halfZ: compoundDepth / 2 + 0.08 },
      { x: compoundWidth / 2, z: 0.25, halfX: 0.105, halfZ: compoundDepth / 2 + 0.08 },
      { x: 0, z: -compoundDepth / 2 + 0.25, halfX: compoundWidth / 2 + 0.05, halfZ: 0.105 },
      { x: -(0.725 + gateRun / 2), z: compoundDepth / 2 + 0.25, halfX: gateRun / 2 + 0.04, halfZ: 0.105 },
      { x: 0.725 + gateRun / 2, z: compoundDepth / 2 + 0.25, halfX: gateRun / 2 + 0.04, halfZ: 0.105 },
      { x: -0.725, z: compoundDepth / 2 + 0.25, halfX: 0.11, halfZ: 0.12 },
      { x: 0.725, z: compoundDepth / 2 + 0.25, halfX: 0.11, halfZ: 0.12 },
    ];
  } else if (type === 'market') {
    g.userData.collisionRects = Array.from({ length: 4 }, (_, index) => ({
      x: -1.95 + index * 1.3,
      z: (index % 2) * 1.15,
      halfX: 0.64,
      halfZ: 0.56,
    }));
  } else if (type === 'square') {
    g.userData.collisionRects = [
      { x: 0, z: 0, halfX: 0.52, halfZ: 0.52 },
      { x: -1.9, z: 0, halfX: 0.76, halfZ: 0.42 },
      { x: 1.9, z: 0, halfX: 0.76, halfZ: 0.42 },
      { x: 0, z: -1.9, halfX: 0.42, halfZ: 0.76 },
      { x: 0, z: 1.9, halfX: 0.42, halfZ: 0.76 },
    ];
  } else if (type !== 'stadium') {
    g.userData.collisionRects = [{ x: 0, z: 0, halfX: 1.38, halfZ: 1.22 }];
  }
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
  if (feature === 'market') {
    group.userData.collisionRects = [-1.62, 0, 1.62].map((x) => ({ x, z: 0, halfX: 0.66, halfZ: 0.48 }));
  } else if (feature === 'palace' || feature === 'mosque' || feature === 'minaret') {
    group.userData.collisionRects = [
      { x: 0, z: 0, halfX: feature === 'minaret' ? 0.84 : 1.78, halfZ: feature === 'minaret' ? 0.84 : 1.5 },
      ...(feature === 'minaret' ? [] : [-2.05, 2.05].map((x) => ({ x, z: -0.15, halfX: 0.32, halfZ: 0.36 }))),
    ];
  } else if (feature === 'railway') {
    group.userData.collisionRects = [{ x: 0, z: 0, halfX: 1.22, halfZ: 0.68 }];
  } else if (feature === 'waterfront' || feature === 'bridge') {
    group.userData.collisionRects = [{ x: 0, z: -0.35, halfX: 2.22, halfZ: 0.62 }];
  } else if (feature === 'rock') {
    group.userData.collisionRects = [{ x: 0, z: 0.1, halfX: 2.18, halfZ: 0.96 }];
  } else if (feature === 'park') {
    group.userData.collisionRects = [
      ...[-1, 1].flatMap((xSign) => [-1, 1].map((zSign) => ({ x: xSign * 2, z: zSign * 1.8, halfX: 0.42, halfZ: 0.42 }))),
      { x: 0, z: 0, halfX: 0.3, halfZ: 0.3 },
    ];
  } else if (feature === 'moat') {
    group.userData.collisionRects = [{ x: 0, z: 0, halfX: 1.42, halfZ: 1.42 }];
  } else if (feature === 'heritage') {
    group.userData.collisionRects = [{ x: 0, z: 0, halfX: 1.92, halfZ: 1.38 }];
  } else if (feature === 'stadium') {
    group.userData.collisionRects = [
      { x: -2.02, z: 0, halfX: 0.42, halfZ: 1.68 },
      { x: 2.02, z: 0, halfX: 0.42, halfZ: 1.68 },
      { x: -0.95, z: 2.02, halfX: 0.62, halfZ: 0.42 },
      { x: 0.95, z: 2.02, halfX: 0.62, halfZ: 0.42 },
      { x: 0, z: -2.02, halfX: 1.35, halfZ: 0.42 },
    ];
  } else {
    group.userData.collisionRects = [{ x: 0, z: 0, halfX: feature === 'transit' ? 0.75 : 0.54, halfZ: 0.55 }];
  }
  group.position.set(-17.6, 0, 17.6);
  group.name = `regional-signature-${stateInfo.name}`;
  return group;
}

function addInteriorHotspot(parent, interaction, { x = 0, y = 0.9, z = 0, width = 0.9, height = 1.7, depth = 0.9 } = {}) {
  const hotspot = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false, depthWrite: false }),
  );
  hotspot.position.set(x, y, z);
  hotspot.userData.interaction = interaction;
  parent.add(hotspot);
  return hotspot;
}

function addInteriorSeat(parent, { seatId, seatLabel = 'Visitor chair', x, z, rotationY = Math.PI, approachPoint = null }) {
  const anchor = new THREE.Group();
  anchor.position.set(x, 0, z);
  anchor.rotation.y = rotationY;
  const interaction = {
    id: seatId,
    title: `Sit in ${seatLabel.toLowerCase()}`,
    type: 'seat',
    seatId,
    seatLabel,
    targetObject: anchor,
    approachPoint: approachPoint || { x, z: z + (rotationY === 0 ? 0.8 : -0.8) },
    rotationY,
  };
  addInteriorHotspot(anchor, interaction, { y: 0.76, width: 1.0, height: 1.65, depth: 0.95 });
  parent.add(anchor);
  return interaction;
}

function buildPartyOfficeInterior(info, palette, playerColor) {
  const group = new THREE.Group();
  group.name = `interior-${info.id || 'party-office'}`;
  const branch = Array.isArray(info.branch) ? info.branch.slice(0, 6) : [];
  const accent = info.party?.color || palette.accent || '#2d754a';
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 13), new THREE.MeshStandardMaterial({ color: '#d7c9ab', roughness: 0.86, side: THREE.DoubleSide }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.06;
  floor.receiveShadow = true;
  group.add(floor);

  const wallColor = '#eee3cc';
  const wallBase = '#9f714e';
  const wallHeight = 4.35;
  const wallZ = 6.42;
  const walls = [
    { size: [14, wallHeight, 0.24], pos: [0, wallHeight / 2, -6.42] },
    { size: [0.24, wallHeight, 13], pos: [-7, wallHeight / 2, 0] },
    { size: [0.24, wallHeight, 13], pos: [7, wallHeight / 2, 0] },
    { size: [5.8, wallHeight, 0.24], pos: [-4.1, wallHeight / 2, wallZ] },
    { size: [5.8, wallHeight, 0.24], pos: [4.1, wallHeight / 2, wallZ] },
    { size: [2.25, 1.85, 0.24], pos: [0, 3.43, wallZ] },
    { size: [14, 0.18, 13], pos: [0, 4.42, 0], color: '#f5eddd' },
  ];
  walls.forEach(({ size, pos, color }) => {
    const wall = box(...size, color || wallColor, { castShadow: true, roughness: 0.94 });
    wall.material.side = THREE.DoubleSide;
    wall.position.set(...pos);
    group.add(wall);
  });
  group.userData.collisionRects = [
    { x: 0, z: -6.42, halfX: 7, halfZ: 0.14 },
    { x: -7, z: 0, halfX: 0.14, halfZ: 6.5 },
    { x: 7, z: 0, halfX: 0.14, halfZ: 6.5 },
    { x: -4.1, z: wallZ, halfX: 2.9, halfZ: 0.14 },
    { x: 4.1, z: wallZ, halfX: 2.9, halfZ: 0.14 },
    { x: 0, z: 0, halfX: 2.62, halfZ: 0.88 },
    { x: -5.7, z: -3.1, halfX: 0.75, halfZ: 1.0 },
    { x: 5.95, z: -2.9, halfX: 0.58, halfZ: 0.9 },
  ];

  // Warm plaster walls, a tiled floor, a real doorway and window frames make this a room, not a dark street backdrop.
  const baseboards = [
    { size: [13.8, 0.22, 0.12], pos: [0, 0.12, -6.24] },
    { size: [0.12, 0.22, 12.7], pos: [-6.82, 0.12, 0] },
    { size: [0.12, 0.22, 12.7], pos: [6.82, 0.12, 0] },
    { size: [5.5, 0.22, 0.12], pos: [-4.08, 0.12, 6.24] },
    { size: [5.5, 0.22, 0.12], pos: [4.08, 0.12, 6.24] },
  ];
  baseboards.forEach(({ size, pos }, index) => {
    const board = box(...size, index < 3 ? '#8a674d' : '#8a674d', { castShadow: false, roughness: 0.86 });
    board.position.set(...pos);
    group.add(board);
  });
  for (let index = -6; index <= 6; index += 1) {
    const grout = box(13.8, 0.012, 0.018, '#b8a98b', { castShadow: false, roughness: 1 });
    grout.position.set(0, -0.028, index * 0.86);
    group.add(grout);
    const cross = box(0.018, 0.012, 12.6, '#b8a98b', { castShadow: false, roughness: 1 });
    cross.position.set(index * 1.05, -0.027, 0);
    group.add(cross);
  }
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.1), new THREE.MeshStandardMaterial({ color: '#8e5342', roughness: 0.96, side: THREE.DoubleSide }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, -0.012, 0);
  group.add(rug);
  const rugBorder = new THREE.Mesh(new THREE.PlaneGeometry(6.65, 3.55), new THREE.MeshStandardMaterial({ color: '#c6a66b', roughness: 0.94, side: THREE.DoubleSide }));
  rugBorder.rotation.x = -Math.PI / 2;
  rugBorder.position.set(0, -0.004, 0);
  group.add(rugBorder);
  const rugInner = new THREE.Mesh(new THREE.PlaneGeometry(6.35, 3.25), new THREE.MeshStandardMaterial({ color: '#56715a', roughness: 0.96, side: THREE.DoubleSide }));
  rugInner.rotation.x = -Math.PI / 2;
  rugInner.position.set(0, 0.003, 0);
  group.add(rugInner);

  // Fixed local lighting keeps the office readable through the accelerated night cycle.
  group.add(new THREE.AmbientLight('#fff0d7', 1.05));
  const ceilingLight = new THREE.PointLight('#ffe7bf', 2.15, 21, 1.7);
  ceilingLight.position.set(0, 3.85, 0);
  group.add(ceilingLight);
  for (const x of [-4.1, 4.1]) {
    const wallLight = new THREE.PointLight('#ffe8c7', 0.78, 10, 2);
    wallLight.position.set(x, 3.05, -1.6);
    group.add(wallLight);
  }
  for (const x of [-4.1, 0, 4.1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.34), new THREE.MeshStandardMaterial({ color: '#fff1d3', emissive: '#f0be71', emissiveIntensity: 0.55, roughness: 0.44 }));
    lamp.position.set(x, 4.22, -0.2);
    group.add(lamp);
  }

  // Side windows, curtains, wall-mounted air conditioner and a slowly turning ceiling fan.
  for (const side of [-1, 1]) {
    const windowFrame = box(0.12, 1.45, 2.6, '#725943', { castShadow: false, roughness: 0.75 });
    windowFrame.position.set(side * 6.79, 2.45, -0.25);
    group.add(windowFrame);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 1.22), new THREE.MeshBasicMaterial({ color: '#94c8c6', transparent: true, opacity: 0.72, side: THREE.DoubleSide }));
    glass.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    glass.position.set(side * 6.64, 2.48, -0.25);
    group.add(glass);
    for (const dz of [-1.13, 1.13]) {
      const curtain = box(0.1, 1.5, 0.24, dz < 0 ? '#8d4f3f' : '#c2905e', { castShadow: false });
      curtain.position.set(side * 6.55, 2.48, -0.25 + dz);
      group.add(curtain);
    }
    const sill = box(0.42, 0.12, 2.9, '#9c7755', { castShadow: false });
    sill.position.set(side * 6.54, 1.72, -0.25);
    group.add(sill);
    const mullion = box(0.07, 1.22, 0.08, '#ead9b9', { castShadow: false });
    mullion.position.set(side * 6.52, 2.48, -0.25);
    group.add(mullion);
  }
  const ac = box(1.55, 0.43, 0.46, '#e3e4d8', { castShadow: false, roughness: 0.6 });
  ac.position.set(-4.55, 3.45, -6.15);
  group.add(ac);
  const acVent = box(1.05, 0.035, 0.05, '#9a9d90', { castShadow: false });
  acVent.position.set(-4.55, 3.32, -5.88);
  group.add(acVent);
  const fan = new THREE.Group();
  fan.position.set(0, 4.07, 0.1);
  const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.22, 12), new THREE.MeshStandardMaterial({ color: '#8b7758', metalness: 0.22, roughness: 0.52 }));
  fanHub.rotation.x = Math.PI / 2;
  fan.add(fanHub);
  for (let bladeIndex = 0; bladeIndex < 4; bladeIndex += 1) {
    const blade = box(1.12, 0.07, 0.23, '#967b57', { castShadow: false, roughness: 0.7 });
    blade.position.set(0.62, 0, 0);
    const bladePivot = new THREE.Group();
    bladePivot.rotation.y = bladeIndex * Math.PI / 2;
    bladePivot.add(blade);
    fan.add(bladePivot);
  }
  fan.userData.officeFan = true;
  group.userData.officeFan = fan;
  group.add(fan);

  // Keep the noticeboard as one uncluttered focal point: a header, branch label, and visible pinned notices.
  const wallBoard = box(5.9, 1.18, 0.12, '#3d6549', { castShadow: false, roughness: 0.9 });
  wallBoard.position.set(0, 3.05, -6.16);
  group.add(wallBoard);
  const boardLabel = labelSprite(`${info.party?.tag || 'WARD'} NOTICEBOARD`, accent);
  boardLabel.position.set(0, 3.42, -6.04);
  boardLabel.scale.set(2.95, 0.44, 1);
  group.add(boardLabel);
  for (const [index, noteColor] of ['#eee0bd', '#dce7d8', '#ead0ad'].entries()) {
    const noticePaper = box(1.35, 0.32, 0.035, noteColor, { castShadow: false, roughness: 0.98 });
    noticePaper.position.set((index - 1) * 1.75, 2.88, -6.045);
    group.add(noticePaper);
    const noticeLine = box(0.83, 0.025, 0.018, '#83735b', { castShadow: false, roughness: 1 });
    noticeLine.position.set((index - 1) * 1.75, 2.88, -6.022);
    group.add(noticeLine);
  }
  const noticeAnchor = new THREE.Group();
  noticeAnchor.position.set(0, 0, -5.62);
  const noticeInteraction = {
    id: `noticeboard-${info.id || 'party-office'}`,
    title: 'Read the ward noticeboard',
    type: 'office-activity',
    activity: { id: 'noticeboard', title: 'Ward noticeboard', fictional: true },
    targetObject: noticeAnchor,
    approachPoint: { x: 0, z: -4.72 },
  };
  addInteriorHotspot(noticeAnchor, noticeInteraction, { y: 2.85, width: 4.4, height: 1.45, depth: 0.72 });
  group.add(noticeAnchor);
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.9, 8), new THREE.MeshStandardMaterial({ color: '#a98d5b', metalness: 0.45, roughness: 0.45 }));
  flagPole.position.set(-5.15, 2.72, -6.05);
  group.add(flagPole);
  for (const [index, color] of ['#16834b', '#f4f0de', '#16834b'].entries()) {
    const stripe = box(0.38, 0.56, 0.035, color, { castShadow: false, roughness: 0.9 });
    stripe.position.set(-4.83 + index * 0.14, 3.28, -6.03);
    group.add(stripe);
  }
  const shelf = box(0.28, 2.85, 1.95, '#72543b', { castShadow: false });
  shelf.position.set(-5.8, 1.45, -3.1);
  group.add(shelf);
  for (let shelfLevel = 0; shelfLevel < 4; shelfLevel += 1) {
    const plank = box(0.88, 0.09, 1.92, '#a27b51', { castShadow: false });
    plank.position.set(-5.57, 0.48 + shelfLevel * 0.67, -3.1);
    group.add(plank);
    for (let bookIndex = 0; bookIndex < 4; bookIndex += 1) {
      const book = box(0.22, 0.43 + (bookIndex % 2) * 0.1, 0.22, ['#55735a', '#b36c4e', '#d0b263', '#556c89'][(bookIndex + shelfLevel) % 4], { castShadow: false });
      book.position.set(-5.54 + (bookIndex - 1.5) * 0.23, 0.75 + shelfLevel * 0.67, -3.7 + bookIndex * 0.38);
      group.add(book);
    }
  }
  const cabinet = box(1.0, 1.08, 1.4, '#755a42', { castShadow: false });
  cabinet.position.set(5.95, 0.54, -2.9);
  group.add(cabinet);
  for (let drawer = 0; drawer < 3; drawer += 1) {
    const front = box(0.045, 0.25, 1.12, '#b08b5c', { castShadow: false });
    front.position.set(5.43, 0.25 + drawer * 0.34, -2.9);
    group.add(front);
  }
  const recordsAnchor = new THREE.Group();
  recordsAnchor.position.set(5.28, 0, -2.9);
  const recordsInteraction = {
    id: `records-cabinet-${info.id || 'party-office'}`,
    title: 'Review the ward office files',
    type: 'office-activity',
    activity: { id: 'records-cabinet', title: 'Ward office records', fictional: true },
    targetObject: recordsAnchor,
    approachPoint: { x: 4.45, z: -2.9 },
  };
  addInteriorHotspot(recordsAnchor, recordsInteraction, { y: 0.9, width: 1.0, height: 1.5, depth: 1.1 });
  group.add(recordsAnchor);
  const waterCooler = new THREE.Group();
  const coolerBase = box(0.62, 0.92, 0.56, '#d7ddd3', { castShadow: false, roughness: 0.55 });
  coolerBase.position.y = 0.46;
  waterCooler.add(coolerBase);
  const waterBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.58, 12), new THREE.MeshStandardMaterial({ color: '#86bdc2', transparent: true, opacity: 0.72, roughness: 0.25 }));
  waterBottle.position.y = 1.22;
  waterCooler.add(waterBottle);
  waterCooler.position.set(5.4, 0, 2.0);
  group.add(waterCooler);
  const breakAnchor = new THREE.Group();
  breakAnchor.position.set(5.0, 0, 2.0);
  const breakInteraction = {
    id: `water-break-${info.id || 'party-office'}`,
    title: 'Take a short water break',
    type: 'office-activity',
    activity: { id: 'water-break', title: 'Water break', fictional: true },
    targetObject: breakAnchor,
    approachPoint: { x: 4.15, z: 2.0 },
  };
  addInteriorHotspot(breakAnchor, breakInteraction, { y: 0.9, width: 0.9, height: 1.7, depth: 1.0 });
  group.add(breakAnchor);

  // Conference table, visitor chairs and all six fictional branch executives.
  const table = box(5.55, 0.17, 1.55, '#77563c', { castShadow: true, roughness: 0.72 });
  table.position.set(0, 0.9, 0);
  group.add(table);
  for (const x of [-2.3, 2.3]) {
    const tableLeg = box(0.14, 0.86, 0.14, '#503e30', { castShadow: false });
    tableLeg.position.set(x, 0.44, 0);
    group.add(tableLeg);
  }
  const runner = box(2.2, 0.025, 0.62, '#d4b768', { castShadow: false });
  runner.position.set(0, 1.0, 0);
  group.add(runner);
  for (let bottleIndex = 0; bottleIndex < 3; bottleIndex += 1) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.36, 10), new THREE.MeshStandardMaterial({ color: '#83aeb0', transparent: true, opacity: 0.72, roughness: 0.24 }));
    bottle.position.set(-1.3 + bottleIndex * 1.3, 1.17, 0.18);
    group.add(bottle);
    const folder = box(0.55, 0.045, 0.42, bottleIndex % 2 ? '#b85f48' : '#53765b', { castShadow: false });
    folder.position.set(-1.3 + bottleIndex * 1.3, 1.04, -0.27);
    group.add(folder);
  }
  const executiveTargets = new Map();
  const rowPositions = [
    { x: -1.95, z: -2.25, rotation: 0 }, { x: 0, z: -2.25, rotation: 0 }, { x: 1.95, z: -2.25, rotation: 0 },
    { x: -1.95, z: 2.25, rotation: Math.PI }, { x: 0, z: 2.25, rotation: Math.PI }, { x: 1.95, z: 2.25, rotation: Math.PI },
  ];
  const executiveShirts = ['#267b56', '#ba8556', '#6c83a2', '#bc654d', '#8275a3', '#4f8c8a'];
  const executiveSkin = ['#774a35', '#986747', '#623e2f', '#b07b57', '#76513b', '#925e42'];
  branch.forEach((executive, index) => {
    const position = rowPositions[index];
    const anchor = new THREE.Group();
    anchor.position.set(position.x, 0, position.z);
    anchor.rotation.y = position.rotation;
    const chair = makeMeetingChair();
    anchor.add(chair);
    const attendee = makeSeatedAttendee(executiveShirts[index % executiveShirts.length], executiveSkin[index % executiveSkin.length]);
    attendee.group.rotation.y = position.rotation;
    attendee.group.position.z = position.rotation === 0 ? -0.06 : 0.06;
    anchor.add(attendee.group);
    const roleTag = labelSprite(executive.position || 'WARD EXECUTIVE', accent);
    roleTag.position.set(0, 1.9, 0.08);
    roleTag.scale.set(1.55, 0.42, 1);
    roleTag.material.opacity = 0.82;
    anchor.add(roleTag);
    const interaction = {
      id: `executive-${executive.id}`,
      title: `Meet ${executive.name}`,
      type: 'executive',
      executive: { id: executive.id, name: executive.name, position: executive.position, partyId: executive.partyId, partyName: executive.partyName, fictional: true },
      targetObject: anchor,
      approachPoint: { x: position.x, z: position.z + (position.rotation === 0 ? 0.8 : -0.8) },
    };
    addInteriorHotspot(anchor, interaction, { y: 1.0, width: 1.15, height: 1.9, depth: 1.0 });
    group.add(anchor);
    executiveTargets.set(executive.id, interaction);
  });
  const seatTargets = new Map();
  for (const [index, x] of [-5.15, 5.15].entries()) {
    const anchor = new THREE.Group();
    anchor.position.set(x, 0, 3.65);
    anchor.rotation.y = Math.PI;
    anchor.add(makeMeetingChair());
    const interaction = { id: `visitor-seat-${index + 1}`, title: 'Sit in visitor chair', type: 'seat', seatId: `visitor-seat-${index + 1}`, seatLabel: `Visitor chair ${index + 1}`, targetObject: anchor, approachPoint: { x, z: 4.45 }, rotationY: Math.PI };
    addInteriorHotspot(anchor, interaction, { y: 0.72, width: 0.8, height: 1.45, depth: 0.9 });
    group.add(anchor);
    seatTargets.set(interaction.seatId, interaction);
  }
  group.userData.executiveTargets = executiveTargets;
  group.userData.seatTargets = seatTargets;

  const exitDoor = addDoorPortal(group, { id: `exit-${info.id || 'party-office'}`, title: 'Exit to street', type: 'exit', accent: '#e5c465', x: 0, z: wallZ - 0.02, width: 1.55, height: 2.48 });
  exitDoor.userData.interaction = { id: 'exit-interior', title: 'Exit to street', type: 'exit' };
  group.userData.officeFan = fan;
  group.visible = false;
  void playerColor;
  return group;
}

function addStadiumInstancedBoxes(group, dimensions, entries) {
  if (!entries.length) return null;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(...dimensions),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.86 }),
    entries.length,
  );
  const transform = new THREE.Object3D();
  entries.forEach((entry, index) => {
    transform.position.set(entry.x, entry.y, entry.z);
    transform.rotation.set(0, entry.rotationY || 0, 0);
    transform.scale.set(1, 1, 1);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    mesh.setColorAt(index, new THREE.Color(entry.color || '#557365'));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);
  return mesh;
}

function addStadiumCrowd(group, fans) {
  if (!fans.length) return;
  const torso = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.15, 0.24, 2, 6),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }),
    fans.length,
  );
  const heads = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.13, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 }),
    fans.length,
  );
  const arms = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.048, 0.22, 2, 5),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }),
    fans.length * 2,
  );
  const transform = new THREE.Object3D();
  fans.forEach((fan, index) => {
    transform.position.set(fan.x, fan.baseY + 0.36, fan.z);
    transform.rotation.set(0, fan.facing, 0);
    transform.scale.set(1, 1, 1);
    transform.updateMatrix();
    torso.setMatrixAt(index, transform.matrix);
    torso.setColorAt(index, new THREE.Color(fan.shirt));
    transform.position.set(fan.x, fan.baseY + 0.77, fan.z);
    transform.updateMatrix();
    heads.setMatrixAt(index, transform.matrix);
    heads.setColorAt(index, new THREE.Color(fan.skin));
    for (const side of [-1, 1]) {
      const armIndex = index * 2 + (side > 0 ? 1 : 0);
      const offsetX = side * 0.205 * Math.cos(fan.facing);
      const offsetZ = -side * 0.205 * Math.sin(fan.facing);
      transform.position.set(fan.x + offsetX, fan.baseY + (fan.cheering ? 0.54 : 0.42), fan.z + offsetZ);
      transform.rotation.set(0, fan.facing, side * (fan.cheering ? -0.85 : 0.22));
      transform.updateMatrix();
      arms.setMatrixAt(armIndex, transform.matrix);
      arms.setColorAt(armIndex, new THREE.Color(fan.shirt));
    }
  });
  for (const mesh of [torso, heads, arms]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
  }
}

function buildStadiumInterior(info, palette) {
  const group = new THREE.Group();
  group.name = `interior-${info.id || 'unity-stadium'}`;
  group.userData.interiorKind = 'stadium';
  group.userData.interiorBounds = { minX: -29.2, maxX: 29.2, minZ: -27.8, maxZ: 27.4 };
  const accent = palette.accent || '#d8f36b';
  const standGrey = '#7a827c';
  const seatColors = [accent, '#f3f0df', '#19734d', '#d5b04b', '#3f7896', '#b95c46'];
  const shirtColors = ['#17844d', '#f4f0df', '#d9b64d', '#396e8c', '#c15a43', '#74609a', '#34775c', accent];
  const skinColors = ['#4f3025', '#633d2b', '#795039', '#8c5d40', '#a36c49', '#b67e58'];
  const rand = seeded(hash(`${info.id || 'unity-stadium'}:${accent}:crowd`));

  const concourseFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 61),
    new THREE.MeshStandardMaterial({ color: '#68736d', roughness: 0.94, side: THREE.DoubleSide }),
  );
  concourseFloor.rotation.x = -Math.PI / 2;
  concourseFloor.position.y = -0.08;
  group.add(concourseFloor);

  const runningTrack = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 32),
    new THREE.MeshStandardMaterial({ color: '#974f43', roughness: 0.92, side: THREE.DoubleSide }),
  );
  runningTrack.rotation.x = -Math.PI / 2;
  runningTrack.position.y = 0.015;
  group.add(runningTrack);
  const trackLine = (width, depth, x, z) => {
    const line = box(width, 0.025, depth, '#e5d9c5', { castShadow: false, roughness: 0.8 });
    line.position.set(x, 0.045, z);
    group.add(line);
  };
  for (const z of [-15.3, -13.9, -12.5, 12.5, 13.9, 15.3]) trackLine(42, 0.055, 0, z);
  for (const x of [-21, -19.6, -18.2, 18.2, 19.6, 21]) trackLine(0.055, 29, x, 0);

  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 20),
    new THREE.MeshStandardMaterial({ color: '#347b47', roughness: 0.96, side: THREE.DoubleSide }),
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.y = 0.065;
  group.add(pitch);
  for (let stripe = 0; stripe < 8; stripe += 1) {
    const grassStripe = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 2.5),
      new THREE.MeshStandardMaterial({ color: stripe % 2 ? '#39834a' : '#2f7341', roughness: 0.96, side: THREE.DoubleSide }),
    );
    grassStripe.rotation.x = -Math.PI / 2;
    grassStripe.position.set(0, 0.075, -8.75 + stripe * 2.5);
    group.add(grassStripe);
  }
  const fieldLine = (width, depth, x, z) => {
    const line = box(width, 0.026, depth, '#f1f0df', { castShadow: false, roughness: 0.8 });
    line.position.set(x, 0.105, z);
    group.add(line);
  };
  fieldLine(34, 0.075, 0, -9.95);
  fieldLine(34, 0.075, 0, 9.95);
  fieldLine(0.075, 20, -16.95, 0);
  fieldLine(0.075, 20, 16.95, 0);
  fieldLine(0.06, 19.8, 0, 0);
  const centerCircle = new THREE.Mesh(
    new THREE.RingGeometry(2.62, 2.7, 56),
    new THREE.MeshStandardMaterial({ color: '#f1f0df', side: THREE.DoubleSide, roughness: 0.8 }),
  );
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.y = 0.11;
  group.add(centerCircle);
  const centerSpot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshStandardMaterial({ color: '#f1f0df' }));
  centerSpot.rotation.x = -Math.PI / 2;
  centerSpot.position.y = 0.112;
  group.add(centerSpot);
  for (const sign of [-1, 1]) {
    fieldLine(4.4, 0.065, sign * 14.75, 0);
    fieldLine(0.065, 13.1, sign * 14.75, 0);
    fieldLine(4.4, 0.065, sign * 14.75, -6.52);
    fieldLine(4.4, 0.065, sign * 14.75, 6.52);
    fieldLine(2.0, 0.055, sign * 16.0, 0);
    fieldLine(0.055, 6.5, sign * 16.0, 0);
    fieldLine(2.0, 0.055, sign * 16.0, -3.25);
    fieldLine(2.0, 0.055, sign * 16.0, 3.25);
    const penaltySpot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), new THREE.MeshStandardMaterial({ color: '#f1f0df' }));
    penaltySpot.rotation.x = -Math.PI / 2;
    penaltySpot.position.set(sign * 12.2, 0.112, 0);
    group.add(penaltySpot);

    for (const z of [-3.66, 3.66]) {
      const post = box(0.14, 2.44, 0.14, '#f3f0df', { castShadow: false, roughness: 0.62 });
      post.position.set(sign * 17.05, 1.25, z);
      group.add(post);
    }
    const crossbar = box(0.14, 0.14, 7.42, '#f3f0df', { castShadow: false, roughness: 0.62 });
    crossbar.position.set(sign * 17.05, 2.47, 0);
    group.add(crossbar);
    const rearFrame = box(0.08, 2.3, 7.35, '#d9e0d2', { castShadow: false });
    rearFrame.position.set(sign * 18.25, 1.18, 0);
    group.add(rearFrame);
    const netTop = box(1.2, 0.07, 7.35, '#d8ded2', { castShadow: false });
    netTop.position.set(sign * 17.65, 2.33, 0);
    group.add(netTop);
    for (const z of [-3.66, 3.66]) {
      const netSide = box(1.2, 2.3, 0.07, '#d8ded2', { castShadow: false });
      netSide.position.set(sign * 17.65, 1.18, z);
      group.add(netSide);
    }
  }
  for (const x of [-16.65, 16.65]) {
    for (const z of [-9.55, 9.55]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.35, 7), new THREE.MeshStandardMaterial({ color: '#ece6d5', roughness: 0.72 }));
      pole.position.set(x, 0.7, z);
      group.add(pole);
      const flag = box(0.42, 0.25, 0.035, '#d3b44f', { castShadow: false });
      flag.position.set(x + (x > 0 ? -0.2 : 0.2), 1.18, z);
      group.add(flag);
    }
  }

  const rowSpecs = [];
  for (let row = 0; row < 18; row += 1) {
    if (row < 10) rowSpecs.push({ y: 0.5 + row * 0.4, distance: 15.45 + row * 0.47 });
    else rowSpecs.push({ y: 5.05 + (row - 10) * 0.42, distance: 21.0 + (row - 10) * 0.47 });
  }
  const seatBasesSide = [];
  const seatBacksSide = [];
  const seatBasesEnd = [];
  const seatBacksEnd = [];
  const fans = [];
  for (const sign of [-1, 1]) {
    rowSpecs.forEach((row, rowIndex) => {
      const deck = box(47, 0.32, 0.66, rowIndex % 2 ? '#626f68' : standGrey, { castShadow: false });
      deck.position.set(0, row.y, sign * row.distance);
      group.add(deck);
      for (let section = 0, x = -19.6; x <= 19.6; section += 1, x += 2.8) {
        if (sign > 0 && Math.abs(x) < 2.6) continue;
        const seatColor = seatColors[(section + rowIndex + (sign > 0 ? 1 : 0)) % seatColors.length];
        seatBasesSide.push({ x, y: row.y + 0.23, z: sign * (row.distance - 0.13), color: seatColor });
        seatBacksSide.push({ x, y: row.y + 0.43, z: sign * (row.distance + 0.12), color: seatColor });
      }
      for (let index = 0, x = -20.0; x <= 20.0; index += 1, x += 2.35) {
        if (sign > 0 && Math.abs(x) < 2.9) continue;
        if (rand() < 0.17) continue;
        fans.push({
          x,
          baseY: row.y + 0.18,
          z: sign * (row.distance - 0.08),
          facing: sign > 0 ? Math.PI : 0,
          cheering: rand() > 0.73,
          shirt: shirtColors[Math.floor(rand() * shirtColors.length)],
          skin: skinColors[Math.floor(rand() * skinColors.length)],
        });
      }
    });
  }
  rowSpecs.slice(0, 16).forEach((row, rowIndex) => {
    for (const sign of [-1, 1]) {
      const distance = rowIndex < 10 ? 21.1 + rowIndex * 0.43 : 25.7 + (rowIndex - 10) * 0.44;
      const deck = box(0.66, 0.32, 27.0, rowIndex % 2 ? '#626f68' : standGrey, { castShadow: false });
      deck.position.set(sign * distance, row.y, 0);
      group.add(deck);
      for (let section = 0, z = -11.2; z <= 11.2; section += 1, z += 2.8) {
        const seatColor = seatColors[(section + rowIndex + (sign > 0 ? 2 : 0)) % seatColors.length];
        seatBasesEnd.push({ x: sign * (distance - 0.13), y: row.y + 0.23, z, color: seatColor });
        seatBacksEnd.push({ x: sign * (distance + 0.12), y: row.y + 0.43, z, color: seatColor });
      }
      for (let index = 0, z = -11.2; z <= 11.2; index += 1, z += 2.65) {
        if (rand() < 0.19) continue;
        fans.push({
          x: sign * (distance - 0.08),
          baseY: row.y + 0.18,
          z,
          facing: sign > 0 ? -Math.PI / 2 : Math.PI / 2,
          cheering: rand() > 0.72,
          shirt: shirtColors[Math.floor(rand() * shirtColors.length)],
          skin: skinColors[Math.floor(rand() * skinColors.length)],
        });
      }
    }
  });
  for (const sign of [-1, 1]) {
    const lowerWalkway = box(47, 0.25, 1.0, '#535e57', { castShadow: false });
    lowerWalkway.position.set(0, 4.83, sign * 20.45);
    group.add(lowerWalkway);
    const endWalkway = box(1.0, 0.25, 27.0, '#535e57', { castShadow: false });
    endWalkway.position.set(sign * 25.3, 4.83, 0);
    group.add(endWalkway);
  }
  addStadiumInstancedBoxes(group, [2.45, 0.13, 0.38], seatBasesSide);
  addStadiumInstancedBoxes(group, [2.45, 0.32, 0.1], seatBacksSide);
  addStadiumInstancedBoxes(group, [0.38, 0.13, 2.35], seatBasesEnd);
  addStadiumInstancedBoxes(group, [0.1, 0.32, 2.35], seatBacksEnd);
  addStadiumCrowd(group, fans);

  let sidelineSeatIndex = 0;
  for (const sign of [-1, 1]) {
    for (const x of [-6, -2, 2, 6]) {
      const z = sign * 12.0;
      const rotationY = sign > 0 ? Math.PI : 0;
      const chair = makeMeetingChair();
      chair.position.set(x, 0, z);
      chair.rotation.y = rotationY;
      group.add(chair);
      addInteriorSeat(group, {
        seatId: `stadium-seat-${sidelineSeatIndex + 1}`,
        seatLabel: 'sideline seat',
        x,
        z,
        rotationY,
        approachPoint: { x, z: z + sign * 0.9 },
      });
      sidelineSeatIndex += 1;
    }
  }

  for (const sign of [-1, 1]) {
    const adCenters = sign > 0 ? [-13, 13] : [0];
    for (const centerX of adCenters) {
      const adWidth = sign > 0 ? 18 : 44;
      const sideAd = box(adWidth, 0.72, 0.22, sign > 0 ? '#20513c' : '#244c60', { castShadow: false });
      sideAd.position.set(centerX, 0.56, sign * 15.0);
      group.add(sideAd);
      const sideAdText = labelSprite(sign > 0 ? 'UNITY • SPORT • COMMUNITY' : 'GAME DAY • UNITY STADIUM', accent);
      sideAdText.position.set(centerX, 0.95, sign * 14.82);
      sideAdText.scale.set(sign > 0 ? 5.0 : 7.8, 0.9, 1);
      group.add(sideAdText);
    }
  }

  const wallColor = '#626b65';
  for (const sign of [-1, 1]) {
    const endWall = box(0.72, 13.4, 56, wallColor, { castShadow: false });
    endWall.position.set(sign * 30.0, 6.65, 0);
    group.add(endWall);
    const canopy = box(54, 0.48, 5.4, '#46524c', { castShadow: false, roughness: 0.72, metalness: 0.12 });
    canopy.position.set(0, 13.45, sign * 23.25);
    group.add(canopy);
    const canopyBeam = box(54, 0.42, 0.42, '#a7b0a5', { castShadow: false, metalness: 0.24 });
    canopyBeam.position.set(0, 13.0, sign * 20.85);
    group.add(canopyBeam);
    const endCanopy = box(5.4, 0.48, 46, '#46524c', { castShadow: false, roughness: 0.72, metalness: 0.12 });
    endCanopy.position.set(sign * 26.9, 13.45, 0);
    group.add(endCanopy);
    const supportXs = sign > 0 ? [-21, 21] : [-21, 0, 21];
    for (const x of supportXs) {
      const support = box(0.42, 12.2, 0.42, '#5b665f', { castShadow: false, metalness: 0.17 });
      support.position.set(x, 6.25, sign * 26.0);
      group.add(support);
    }
  }
  const northWall = box(59, 13.4, 0.72, wallColor, { castShadow: false });
  northWall.position.set(0, 6.65, -29.0);
  group.add(northWall);
  for (const centerX of [-16.5, 16.5]) {
    const entryWall = box(26, 13.4, 0.72, wallColor, { castShadow: false });
    entryWall.position.set(centerX, 6.65, 29.0);
    group.add(entryWall);
  }

  const tunnelColor = '#49554e';
  for (const sign of [-1, 1]) {
    const tunnelSide = box(0.3, 4.2, 5.6, tunnelColor, { castShadow: false });
    tunnelSide.position.set(sign * 2.25, 2.1, 26.1);
    group.add(tunnelSide);
  }
  const tunnelRoof = box(4.8, 0.42, 5.6, '#59645d', { castShadow: false });
  tunnelRoof.position.set(0, 4.1, 26.1);
  group.add(tunnelRoof);
  const exitDoor = addDoorPortal(group, { id: 'exit-stadium', title: 'Exit stadium', type: 'exit', accent: '#e5c465', x: 0, z: 28.35, width: 2.7, height: 3.5 });
  exitDoor.userData.interaction = { id: 'exit-interior', title: 'Exit stadium', type: 'exit' };

  const scoreboard = box(11.2, 4.2, 0.62, '#263631', { castShadow: false, metalness: 0.12 });
  scoreboard.position.set(0, 10.15, -28.35);
  group.add(scoreboard);
  const screen = box(10.4, 3.25, 0.08, '#15221f', { castShadow: false, emissive: '#08100d', emissiveIntensity: 0.3 });
  screen.position.set(0, 10.2, -28.0);
  group.add(screen);
  const stadiumSign = labelSprite('UNITY STADIUM', accent);
  stadiumSign.position.set(0, 10.8, -27.92);
  stadiumSign.scale.set(8.2, 1.6, 1);
  group.add(stadiumSign);
  const matchSign = labelSprite('MATCH DAY • LIVE', '#f2d36e');
  matchSign.position.set(0, 9.6, -27.9);
  matchSign.scale.set(6.7, 1.2, 1);
  group.add(matchSign);

  group.add(new THREE.AmbientLight('#dce9de', 1.35));
  for (const x of [-19, 19]) {
    for (const z of [-21, 21]) {
      const lamp = new THREE.PointLight('#fff1ce', 4.2, 46, 1.8);
      lamp.position.set(x, 12.25, z);
      group.add(lamp);
      const floodlight = box(2.5, 0.5, 0.25, '#d7decf', { castShadow: false, emissive: '#fff1c2', emissiveIntensity: 0.78 });
      floodlight.position.set(x, 12.8, z);
      group.add(floodlight);
    }
  }
  for (const x of [-22, 22]) {
    const spot = new THREE.SpotLight('#fff4d7', 17, 62, Math.PI / 5.5, 0.62, 1.25);
    spot.position.set(x, 12.5, 0);
    spot.target.position.set(0, 0.2, 0);
    group.add(spot);
    group.add(spot.target);
  }
  group.userData.collisionRects = [
    { x: 0, z: -20.15, halfX: 23.2, halfZ: 4.35 },
    { x: -13.5, z: 20.15, halfX: 10.85, halfZ: 4.35 },
    { x: 13.5, z: 20.15, halfX: 10.85, halfZ: 4.35 },
    { x: -25.25, z: 0, halfX: 4.15, halfZ: 13.4 },
    { x: 25.25, z: 0, halfX: 4.15, halfZ: 13.4 },
    { x: -30.0, z: 0, halfX: 0.36, halfZ: 29.0 },
    { x: 30.0, z: 0, halfX: 0.36, halfZ: 29.0 },
    { x: 0, z: -29.0, halfX: 30.0, halfZ: 0.36 },
    { x: -16.5, z: 29.0, halfX: 13.0, halfZ: 0.36 },
    { x: 16.5, z: 29.0, halfX: 13.0, halfZ: 0.36 },
    { x: -2.25, z: 26.1, halfX: 0.15, halfZ: 2.8 },
    { x: 2.25, z: 26.1, halfX: 0.15, halfZ: 2.8 },
    { x: -13, z: 15.0, halfX: 9.0, halfZ: 0.14 },
    { x: 13, z: 15.0, halfX: 9.0, halfZ: 0.14 },
    { x: 0, z: -15.0, halfX: 22.0, halfZ: 0.14 },
  ];
  return group;
}

function buildEnclosedInteriorShell(info, palette, { floorColor = '#c6b48d', wallColor = '#e9e1d1', ceilingColor = '#d9d0bd', accent = palette.accent || '#d8f36b', sign = info.title || 'COMMUNITY ROOM' } = {}) {
  const group = new THREE.Group();
  group.name = `interior-${info.metadata?.venueType || info.type || 'room'}`;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.9, side: THREE.DoubleSide }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.055;
  floor.receiveShadow = true;
  group.add(floor);
  const wallHeight = 4.45;
  const wallZ = 6.38;
  const walls = [
    { size: [13, wallHeight, 0.24], pos: [0, wallHeight / 2, -6.38] },
    { size: [0.24, wallHeight, 13], pos: [-6.38, wallHeight / 2, 0] },
    { size: [0.24, wallHeight, 13], pos: [6.38, wallHeight / 2, 0] },
    { size: [5.55, wallHeight, 0.24], pos: [-3.72, wallHeight / 2, wallZ] },
    { size: [5.55, wallHeight, 0.24], pos: [3.72, wallHeight / 2, wallZ] },
    { size: [1.9, 1.82, 0.24], pos: [0, 3.54, wallZ] },
    { size: [13, 0.18, 13], pos: [0, 4.48, 0], color: ceilingColor },
  ];
  walls.forEach(({ size, pos, color }) => {
    const wall = box(...size, color || wallColor, { castShadow: true, roughness: 0.92 });
    wall.material.side = THREE.DoubleSide;
    wall.position.set(...pos);
    group.add(wall);
  });
  group.userData.collisionRects = [
    { x: 0, z: -6.38, halfX: 6.5, halfZ: 0.14 },
    { x: -6.38, z: 0, halfX: 0.14, halfZ: 6.5 },
    { x: 6.38, z: 0, halfX: 0.14, halfZ: 6.5 },
    { x: -3.72, z: wallZ, halfX: 2.78, halfZ: 0.14 },
    { x: 3.72, z: wallZ, halfX: 2.78, halfZ: 0.14 },
  ];
  for (const z of [-6.18, 6.14]) {
    const trim = box(12.72, 0.18, 0.12, accent, { castShadow: false, roughness: 0.78 });
    trim.position.set(0, 0.19, z);
    group.add(trim);
  }
  for (const side of [-1, 1]) {
    const window = box(0.08, 1.34, 2.25, '#79a7aa', { castShadow: false, roughness: 0.32, metalness: 0.1 });
    window.position.set(side * 6.21, 2.46, -0.68);
    group.add(window);
    const windowBar = box(0.12, 1.36, 0.075, '#e7ddc9', { castShadow: false });
    windowBar.position.set(side * 6.12, 2.46, -0.68);
    group.add(windowBar);
  }
  group.add(new THREE.AmbientLight('#fff2de', 0.93));
  const roomLight = new THREE.PointLight('#ffe8ca', 1.9, 20, 1.7);
  roomLight.position.set(0, 3.82, 0.1);
  group.add(roomLight);
  const ceilingLamp = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.58), new THREE.MeshStandardMaterial({ color: '#fff2d6', emissive: '#f1c177', emissiveIntensity: 0.38, roughness: 0.48 }));
  ceilingLamp.position.set(0, 4.32, -0.1);
  group.add(ceilingLamp);
  const title = labelSprite(sign, accent);
  title.position.set(0, 3.55, -6.16);
  title.scale.set(3.7, 0.78, 1);
  group.add(title);
  const interiorVenue = info.metadata?.venueType || info.type;
  const exitTitle = interiorVenue === 'plane' ? 'RETURN TO TERMINAL' : interiorVenue === 'airport' ? 'EXIT TO AIRPORT APRON' : interiorVenue === 'home' ? 'EXIT TO YARD' : interiorVenue === 'garage' ? 'EXIT TO HOME' : interiorVenue === 'market' ? 'EXIT TO MARKET STREET' : interiorVenue === 'court' ? 'EXIT TO COURT GROUNDS' : interiorVenue === 'assembly' ? 'EXIT TO ASSEMBLY GROUNDS' : 'EXIT TO STREET';
  const exitDoor = addDoorPortal(group, { id: `exit-${info.id || interiorVenue}`, title: exitTitle, type: 'exit', accent: '#e8c36d', x: 0, z: wallZ - 0.02, width: 1.6, height: 2.3 });
  exitDoor.userData.interaction = { id: 'exit-interior', title: exitTitle, type: 'exit' };
  return group;
}

function addInteriorChair(group, x, z, { color = '#426c58', seatId = `interior-seat-${x}-${z}`, label = 'visitor chair', width = 0.78, rotationY = Math.PI, approachZ = z - 0.92, y = 0.52 } = {}) {
  const chair = new THREE.Group();
  chair.position.set(x, 0, z);
  const cushion = box(width, 0.14, 0.72, color, { castShadow: false, roughness: 0.82 });
  cushion.position.set(0, y, 0);
  chair.add(cushion);
  const back = box(width, 0.74, 0.15, color, { castShadow: false, roughness: 0.86 });
  back.position.set(0, y + 0.35, 0.29);
  chair.add(back);
  for (const side of [-1, 1]) {
    const arm = box(0.08, 0.29, 0.68, '#75634c', { castShadow: false });
    arm.position.set(side * (width / 2 + 0.025), y + 0.14, 0.02);
    chair.add(arm);
    for (const zLeg of [-0.26, 0.26]) {
      const leg = box(0.045, 0.48, 0.045, '#58645b', { castShadow: false, metalness: 0.13 });
      leg.position.set(side * (width / 2 - 0.08), 0.25, zLeg);
      chair.add(leg);
    }
  }
  group.add(chair);
  addInteriorSeat(group, { seatId, seatLabel: label, x, z, rotationY, approachPoint: { x, z: approachZ } });
  return chair;
}

function addSimulatedMeetingActor(group, { id, name, position, x, z, shirt = '#42785d', skin = '#79513b', accent = '#527867' }) {
  const anchor = new THREE.Group();
  anchor.position.set(x, 0, z);
  anchor.rotation.y = Math.PI;
  anchor.add(makeMeetingChair());
  const attendee = makeSeatedAttendee(shirt, skin);
  attendee.group.rotation.y = Math.PI;
  attendee.group.position.z = 0.06;
  anchor.add(attendee.group);
  const tag = labelSprite(position || 'SIMULATED STAFF', accent);
  tag.position.set(0, 1.95, 0.08);
  tag.scale.set(1.72, 0.42, 1);
  anchor.add(tag);
  const executive = { id, name, position, fictional: true };
  const interaction = {
    id: `executive-${id}`,
    title: `Meet ${name}`,
    type: 'executive',
    executive,
    targetObject: anchor,
    approachPoint: { x, z: z + 0.88 },
  };
  addInteriorHotspot(anchor, interaction, { y: 1.0, width: 1.2, height: 1.95, depth: 1.0 });
  group.add(anchor);
  return interaction;
}

function buildAirportTerminalInterior(info, palette) {
  const group = buildEnclosedInteriorShell(info, palette, { floorColor: '#c4c7bc', wallColor: '#e8e7de', ceilingColor: '#cfd6d1', accent: '#4e7683', sign: 'DEPARTURES · CHECK-IN' });
  group.name = `airport-terminal-${info.metadata?.venueId || info.id}`;
  const concourse = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 11.4), new THREE.MeshStandardMaterial({ color: '#43565b', roughness: 0.9, side: THREE.DoubleSide }));
  concourse.rotation.x = -Math.PI / 2;
  concourse.position.set(0, 0.008, 0.2);
  group.add(concourse);
  for (const [index, x] of [-4.0, -1.4, 1.4, 4.0].entries()) {
    const counter = box(2.05, 0.9, 0.72, index % 2 ? '#67766f' : '#536a6d');
    counter.position.set(x, 0.54, -3.45);
    group.add(counter);
    const deskTop = box(2.18, 0.12, 0.82, '#e6dfca', { castShadow: false });
    deskTop.position.set(x, 1.02, -3.45);
    group.add(deskTop);
    const terminalScreen = box(0.67, 0.45, 0.08, '#263b3d', { castShadow: false });
    terminalScreen.position.set(x, 1.36, -3.72);
    group.add(terminalScreen);
    const counterTag = labelSprite(`CHECK-IN ${String.fromCharCode(65 + index)}`, '#f1d48b');
    counterTag.position.set(x, 1.75, -3.35);
    counterTag.scale.set(1.45, 0.36, 1);
    group.add(counterTag);
  }
  const board = box(7.5, 1.48, 0.18, '#152d33', { castShadow: false, roughness: 0.58 });
  board.position.set(0, 2.55, -6.08);
  group.add(board);
  const boardHeader = labelSprite('SIMULATED STATE ROUTES', '#f0d277');
  boardHeader.position.set(0, 3.12, -5.94);
  boardHeader.scale.set(2.8, 0.4, 1);
  group.add(boardHeader);
  const boardRows = [
    ['ABV · ABUJA', 'GAME ROUTE'], ['ENU · ENUGU', 'GAME ROUTE'], ['PHC · PORT HARCOURT', 'GAME ROUTE'],
  ];
  boardRows.forEach(([destination, status], index) => {
    const row = labelSprite(`${destination}      ${status}`, index === 1 ? '#c0e7d2' : '#f4f0e3');
    row.position.set(0, 2.65 - index * 0.38, -5.89);
    row.scale.set(3.65, 0.3, 1);
    group.add(row);
  });
  for (const x of [-3.7, 3.7]) {
    const pillar = box(0.42, 3.55, 0.42, '#d3d7cf');
    pillar.position.set(x, 1.78, 0.25);
    group.add(pillar);
  }
  for (let index = 0; index < 4; index += 1) {
    const x = -4.35 + index * 2.9;
    const bench = box(2.15, 0.16, 0.58, '#4a6d70');
    bench.position.set(x, 0.53, 2.0);
    group.add(bench);
    addInteriorChair(group, x, 2.0, { color: '#507677', seatId: `airport-seat-${index}`, label: 'departure lounge seat', width: 1.55, approachZ: 2.95 });
  }
  const entrySign = labelSprite('BOARDING GATES · 01—04', '#f6df9d');
  entrySign.position.set(0, 2.75, 4.9);
  entrySign.scale.set(2.8, 0.48, 1);
  group.add(entrySign);
  return group;
}

function buildAircraftCabinInterior(info, palette) {
  const cabinClass = info.metadata?.cabinClass || 'economy';
  const classData = {
    economy: { name: 'ECONOMY CABIN', color: '#37644f', rows: [2.55, 1.0, -0.55, -2.1, -3.65], width: 0.68, kind: 'economy' },
    executive: { name: 'EXECUTIVE CABIN', color: '#446b7c', rows: [2.3, 0.0, -2.3], width: 0.94, kind: 'executive' },
    business: { name: 'BUSINESS CLASS', color: '#315b4c', rows: [2.4, 0.0, -2.4], width: 1.12, kind: 'business' },
    first: { name: 'FIRST CLASS SUITES', color: '#8b7046', rows: [2.45, -0.25, -2.95], width: 1.28, kind: 'first' },
    'private-jet': { name: 'PRIVATE JET CABIN', color: '#4b526d', rows: [1.8, -1.65], width: 1.1, kind: 'private' },
  }[cabinClass] || { name: 'ECONOMY CABIN', color: '#37644f', rows: [2.55, 1, -0.55, -2.1, -3.65], width: 0.68, kind: 'economy' };
  const group = buildEnclosedInteriorShell(info, palette, { floorColor: '#b4b8ae', wallColor: '#f0f1eb', ceilingColor: '#e1e5de', accent: classData.color, sign: classData.name });
  group.name = `aircraft-cabin-${cabinClass}`;
  const aisle = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 10.6), new THREE.MeshStandardMaterial({ color: cabinClass === 'private-jet' ? '#77707d' : '#63716c', roughness: 0.96, side: THREE.DoubleSide }));
  aisle.rotation.x = -Math.PI / 2;
  aisle.position.set(0, 0.008, -0.05);
  group.add(aisle);
  for (const side of [-1, 1]) {
    const overhead = box(1.18, 0.48, 10.55, '#dfe4dd', { castShadow: false, roughness: 0.62 });
    overhead.position.set(side * 5.37, 2.78, -0.15);
    group.add(overhead);
    const overheadLine = box(1.0, 0.05, 10.3, '#aab7b2', { castShadow: false });
    overheadLine.position.set(side * 5.37, 2.51, -0.15);
    group.add(overheadLine);
    for (let row = 0; row < classData.rows.length; row += 1) {
      const window = box(0.075, 0.57, 0.78, '#6c9cac', { castShadow: false, roughness: 0.3, metalness: 0.08 });
      window.position.set(side * 6.18, 2.08, classData.rows[row]);
      group.add(window);
      const windowFrame = box(0.105, 0.75, 0.93, '#e4e6df', { castShadow: false, roughness: 0.7 });
      windowFrame.position.set(side * 6.1, 2.08, classData.rows[row]);
      group.add(windowFrame);
      window.position.x = side * 6.03;
    }
    const luggageTag = labelSprite(side < 0 ? 'BAGGAGE BIN' : 'CABIN LIGHTS', '#d2dbce');
    luggageTag.position.set(side * 5.25, 3.15, -4.2);
    luggageTag.scale.set(1.6, 0.35, 1);
    group.add(luggageTag);
  }
  const seatColor = classData.color;
  const makeCabinSeat = (x, z, rowIndex, seatIndex, wider = false) => {
    const width = wider ? classData.width + 0.35 : classData.width;
    const seat = new THREE.Group();
    seat.position.set(x, 0, z);
    const cushion = box(width, 0.2, wider ? 1.0 : 0.78, seatColor, { castShadow: true, roughness: 0.85 });
    cushion.position.set(0, 0.61, 0);
    seat.add(cushion);
    const back = box(width, wider ? 1.0 : 0.8, 0.18, seatColor, { castShadow: true, roughness: 0.83 });
    back.position.set(0, wider ? 1.14 : 1.03, 0.31);
    seat.add(back);
    const headrest = box(width * 0.72, 0.28, 0.17, cabinClass === 'first' || cabinClass === 'private-jet' ? '#c8ad73' : '#d1d8d1', { castShadow: false });
    headrest.position.set(0, wider ? 1.7 : 1.53, 0.32);
    seat.add(headrest);
    for (const side of [-1, 1]) {
      const arm = box(0.09, 0.23, 0.69, '#9ba39b', { castShadow: false, roughness: 0.7 });
      arm.position.set(side * (width / 2 + 0.04), 0.75, 0);
      seat.add(arm);
      const support = box(0.08, 0.52, 0.08, '#606a64', { castShadow: false });
      support.position.set(side * (width / 2 - 0.07), 0.27, 0.03);
      seat.add(support);
    }
    group.add(seat);
    addInteriorSeat(group, { seatId: `cabin-${cabinClass}-${rowIndex}-${seatIndex}`, seatLabel: `${classData.name.toLowerCase()} seat`, x, z, rotationY: Math.PI, approachPoint: { x, z: z - 0.94 } });
    const belt = box(width * 0.72, 0.045, 0.06, '#e5d7a3', { castShadow: false });
    belt.position.set(x, 0.76, z - 0.04);
    group.add(belt);
  };
  if (classData.kind === 'economy') {
    classData.rows.forEach((z, row) => [...[-2.6, -1.8, -1.0, 1.0, 1.8, 2.6]].forEach((x, seat) => makeCabinSeat(x, z, row, seat)));
  } else if (classData.kind === 'executive') {
    classData.rows.forEach((z, row) => [-1.8, -0.95, 0.95, 1.8].forEach((x, seat) => makeCabinSeat(x, z, row, seat, true)));
  } else if (classData.kind === 'business') {
    classData.rows.forEach((z, row) => [-2.05, -0.95, 0.95, 2.05].forEach((x, seat) => makeCabinSeat(x, z, row, seat, true)));
  } else if (classData.kind === 'first') {
    classData.rows.forEach((z, row) => [-2.15, 2.15].forEach((x, seat) => {
      makeCabinSeat(x, z, row, seat, true);
      const suiteDivider = box(0.11, 1.25, 1.45, '#d9d4c6', { castShadow: false, roughness: 0.76 });
      suiteDivider.position.set(x + (x < 0 ? 0.92 : -0.92), 1.0, z + 0.1);
      group.add(suiteDivider);
    }));
  } else {
    classData.rows.forEach((z, row) => [-2.3, 2.3].forEach((x, seat) => makeCabinSeat(x, z, row, seat, true)));
    const meetingTable = box(1.7, 0.15, 1.25, '#8a744f');
    meetingTable.position.set(0, 0.78, -0.05);
    group.add(meetingTable);
    const tableTop = box(1.74, 0.06, 1.29, '#c1a767', { castShadow: false });
    tableTop.position.set(0, 0.89, -0.05);
    group.add(tableTop);
    const lounge = labelSprite('PRIVATE CHARTER · QUIET CABIN', '#f2d886');
    lounge.position.set(0, 2.0, -4.8);
    lounge.scale.set(2.85, 0.48, 1);
    group.add(lounge);
  }
  for (let index = 0; index < Math.min(classData.rows.length, 5); index += 1) {
    const rowMark = labelSprite(String(index + 1).padStart(2, '0'), '#eef0e8');
    rowMark.position.set(-0.74, 1.02, classData.rows[index]);
    rowMark.scale.set(0.3, 0.26, 1);
    group.add(rowMark);
  }
  const safetyCard = box(1.35, 0.13, 0.58, '#f2ead7', { castShadow: false });
  safetyCard.position.set(0, 2.05, 4.8);
  group.add(safetyCard);
  const cabinTag = labelSprite('CLEAN CABIN · BOARDING COMPLETE', '#426b5d');
  cabinTag.position.set(0, 2.33, 4.68);
  cabinTag.scale.set(2.95, 0.45, 1);
  group.add(cabinTag);
  return group;
}

function buildHomeInterior(info, palette) {
  const property = info.propertyProfile || {};
  const level = clamp(Number(property.houseLevel) || 1, 1, 5);
  const garageLevel = clamp(Number(property.garageLevel) || 0, 0, 4);
  const owner = String(info.propertyOwner || 'PLAYER').slice(0, 24).toUpperCase();
  const group = buildEnclosedInteriorShell(info, palette, { floorColor: '#c6ac83', wallColor: '#eee1cd', ceilingColor: '#e0d4c0', accent: palette.accent || '#d8f36b', sign: `${owner}'S HOME` });
  group.name = `player-home-level-${level}`;
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(level >= 3 ? 7.0 : 5.6, 3.5), new THREE.MeshStandardMaterial({ color: level >= 4 ? '#7e5558' : '#537259', roughness: 0.95, side: THREE.DoubleSide }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.014, 2.15);
  group.add(rug);
  const sofa = box(level >= 3 ? 4.4 : 3.4, 0.58, 0.9, level >= 4 ? '#76566a' : '#4b7964');
  sofa.position.set(0, 0.57, 3.48);
  group.add(sofa);
  const sofaBack = box(level >= 3 ? 4.4 : 3.4, 0.7, 0.23, level >= 4 ? '#76566a' : '#4b7964');
  sofaBack.position.set(0, 1.15, 3.78);
  group.add(sofaBack);
  addInteriorSeat(group, { seatId: 'home-sofa', seatLabel: 'living room sofa', x: 0, z: 3.43, rotationY: Math.PI, approachPoint: { x: 0, z: 2.45 } });
  const coffeeTable = box(2.35, 0.16, 1.05, '#8b6747');
  coffeeTable.position.set(0, 0.5, 1.35);
  group.add(coffeeTable);
  for (const x of [-0.62, 0.62]) {
    const tableLeg = box(0.11, 0.42, 0.11, '#644b38', { castShadow: false });
    tableLeg.position.set(x, 0.24, 1.35);
    group.add(tableLeg);
  }
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.37, 10), new THREE.MeshStandardMaterial({ color: '#d2a557', roughness: 0.6 }));
  vase.position.set(0.65, 0.77, 1.35);
  group.add(vase);
  const kitchenCabinet = box(3.45, 0.8, 0.58, '#8a775e');
  kitchenCabinet.position.set(-3.45, 0.5, -3.85);
  group.add(kitchenCabinet);
  const kitchenCounter = box(3.65, 0.14, 0.7, '#d3c4aa');
  kitchenCounter.position.set(-3.45, 0.98, -3.85);
  group.add(kitchenCounter);
  const fridge = box(0.82, 1.95, 0.82, '#d9ddd8');
  fridge.position.set(-5.45, 1.02, -4.75);
  group.add(fridge);
  const fridgeHandle = box(0.045, 0.68, 0.06, '#6a746d', { castShadow: false });
  fridgeHandle.position.set(-5.03, 1.04, -4.72);
  group.add(fridgeHandle);
  const pictureFrame = box(1.55, 1.02, 0.08, '#745b3e', { castShadow: false });
  pictureFrame.position.set(0, 2.55, -6.08);
  group.add(pictureFrame);
  const framedArt = box(1.31, 0.79, 0.025, '#93a988', { castShadow: false, roughness: 0.94 });
  framedArt.position.set(0, 2.55, -6.01);
  group.add(framedArt);
  const bedroomScreen = box(0.14, 2.3, 3.2, '#ddcfb8');
  bedroomScreen.position.set(3.35, 1.2, -3.65);
  group.add(bedroomScreen);
  const bed = box(2.15, 0.42, 2.2, level >= 4 ? '#d8d0c3' : '#c4b4a0');
  bed.position.set(4.35, 0.47, -3.55);
  group.add(bed);
  const bedding = box(2.0, 0.16, 1.55, level >= 4 ? '#65788d' : '#ede2cf', { castShadow: false });
  bedding.position.set(4.35, 0.75, -3.8);
  group.add(bedding);
  for (let cushion = 0; cushion < 2; cushion += 1) {
    const pillow = box(0.62, 0.16, 0.42, '#f3efe4', { castShadow: false });
    pillow.position.set(3.8 + cushion * 1.1, 0.86, -4.2);
    group.add(pillow);
  }
  if (level >= 3) {
    const upperMark = labelSprite('UPSTAIRS · FAMILY ROOMS', '#735b3e');
    upperMark.position.set(3.9, 2.4, -2.0);
    upperMark.scale.set(1.9, 0.42, 1);
    group.add(upperMark);
    for (const x of [-5.1, 5.1]) {
      const sideChair = makeMeetingChair();
      sideChair.position.set(x, 0, 2.5);
      group.add(sideChair);
      addInteriorSeat(group, { seatId: `home-chair-${x}`, seatLabel: 'home lounge chair', x, z: 2.5, rotationY: Math.PI, approachPoint: { x, z: 1.55 } });
    }
  }
  if (garageLevel >= 2) {
    const toolShelf = box(1.7, 1.55, 0.36, '#77664e');
    toolShelf.position.set(5.65, 0.84, 1.0);
    group.add(toolShelf);
    const tools = box(1.4, 0.18, 0.24, '#b09563', { castShadow: false });
    tools.position.set(5.65, 1.32, 0.77);
    group.add(tools);
  }
  const homeNote = labelSprite(`HOUSE LEVEL ${level} · PERSONAL SAVE`, '#736044');
  homeNote.position.set(0, 2.05, 5.88);
  homeNote.scale.set(2.6, 0.42, 1);
  group.add(homeNote);
  return group;
}

function buildHomeGarageInterior(info, palette) {
  const property = info.propertyProfile || {};
  const garageLevel = clamp(Number(property.garageLevel) || 0, 0, 4);
  const group = buildEnclosedInteriorShell(info, palette, { floorColor: '#555c56', wallColor: '#d3d1c7', ceilingColor: '#bdc2ba', accent: '#ba955f', sign: 'HOME GARAGE · SAFE VEHICLE BAY' });
  group.name = `player-garage-level-${garageLevel}`;
  for (let bay = -1; bay <= (garageLevel >= 3 ? 1 : 0); bay += 2) {
    const yellowLine = box(0.07, 0.015, 10.6, '#dbbb4e', { castShadow: false });
    yellowLine.position.set(bay * 2.55, 0.015, 0.05);
    group.add(yellowLine);
  }
  const car = makeCar('#e4bd43', 'sedan', '#1b6348');
  car.position.set(-2.15, 0, -0.7);
  car.rotation.y = Math.PI;
  car.scale.setScalar(0.62);
  group.add(car);
  if (garageLevel >= 3) {
    const secondCar = makeCar('#637f9b', 'compact', '#c0d5c9');
    secondCar.position.set(2.35, 0, -0.65);
    secondCar.rotation.y = Math.PI;
    secondCar.scale.setScalar(0.57);
    group.add(secondCar);
  }
  const workbench = box(2.45, 0.86, 0.7, '#805d3e');
  workbench.position.set(-4.3, 0.55, -4.1);
  group.add(workbench);
  for (let tool = 0; tool < 5; tool += 1) {
    const toolShape = box(0.12, 0.6 + (tool % 2) * 0.22, 0.08, ['#c8aa67', '#657a69', '#a86a4b'][tool % 3], { castShadow: false });
    toolShape.position.set(-5.15 + tool * 0.38, 1.7, -5.97);
    group.add(toolShape);
  }
  const shelf = box(1.0, 1.7, 0.45, '#7d715e');
  shelf.position.set(5.3, 0.92, -3.5);
  group.add(shelf);
  const garageTitle = labelSprite(garageLevel ? `GARAGE TIER ${garageLevel}` : 'STARTER PARKING BAY', '#66543b');
  garageTitle.position.set(0, 2.0, 5.84);
  garageTitle.scale.set(2.6, 0.44, 1);
  group.add(garageTitle);
  addInteriorChair(group, 4.3, 2.9, { color: '#8b7652', seatId: 'garage-stool', label: 'garage workshop stool', width: 0.65, approachZ: 2.0 });
  return group;
}

function buildMarketHallInterior(info, palette) {
  const group = buildEnclosedInteriorShell(info, palette, { floorColor: '#b9a277', wallColor: '#e5d2ae', ceilingColor: '#d6c29d', accent: '#bd6d43', sign: 'COMMUNITY MARKET · TRADING HALL' });
  group.name = `market-hall-${info.metadata?.venueId || info.id}`;
  const aisle = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 11.2), new THREE.MeshStandardMaterial({ color: '#cbb990', roughness: 0.96, side: THREE.DoubleSide }));
  aisle.rotation.x = -Math.PI / 2;
  aisle.position.set(0, 0.01, 0.15);
  group.add(aisle);
  const stallNames = ['GRAINS & BEANS', 'FRESH PRODUCE', 'FABRIC & PRINT', 'SPICES & TEA'];
  const crateColors = ['#d99e43', '#d45c45', '#619160', '#8064a0', '#c3a950', '#57788b'];
  for (let stall = 0; stall < 4; stall += 1) {
    const side = stall < 2 ? -1 : 1;
    const row = stall % 2;
    const x = side * 4.05;
    const z = row ? -2.55 : 2.0;
    const counter = box(3.5, 0.83, 1.45, stall % 2 ? '#725640' : '#8a6546');
    counter.position.set(x, 0.54, z);
    group.add(counter);
    const awning = box(3.72, 0.13, 1.78, ['#bd6d43', '#4f8a6b', '#ae844a', '#735c8d'][stall]);
    awning.position.set(x, 2.22, z - 0.05);
    group.add(awning);
    const name = labelSprite(stallNames[stall], '#f4e5c9');
    name.position.set(x, 1.96, z + 0.84);
    name.scale.set(1.95, 0.39, 1);
    group.add(name);
    for (let crate = 0; crate < 5; crate += 1) {
      const produce = box(0.48, 0.4 + (crate % 2) * 0.14, 0.48, crateColors[(stall + crate) % crateColors.length], { castShadow: false, roughness: 0.85 });
      produce.position.set(x - 1.25 + (crate % 3) * 0.62, 1.2 + (crate % 2) * 0.1, z - 0.1 + Math.floor(crate / 3) * 0.58);
      group.add(produce);
    }
    const vendor = makeSeatedAttendee(['#c97855', '#406d56', '#bd7f4b', '#596f87'][stall], '#764a35');
    vendor.group.position.set(x, 0, z + (side < 0 ? 1.05 : -1.05));
    vendor.group.rotation.y = side < 0 ? Math.PI : 0;
    vendor.group.scale.setScalar(0.78);
    group.add(vendor.group);
    addInteriorChair(group, x, z + (side < 0 ? 1.05 : -1.05), { color: '#806346', seatId: `market-seat-${stall}`, label: 'market waiting seat', width: 0.62, approachZ: z + (side < 0 ? 1.95 : -0.1) });
  }
  for (const x of [-5.8, 5.8]) {
    const pillar = box(0.34, 4.15, 0.34, '#9e8762');
    pillar.position.set(x, 2.05, 0);
    group.add(pillar);
  }
  const marketNote = labelSprite('LOCAL TRADERS · MANY VOICES', '#704f37');
  marketNote.position.set(0, 2.1, 5.87);
  marketNote.scale.set(2.85, 0.42, 1);
  group.add(marketNote);
  return group;
}

function buildCourtInterior(info, palette) {
  const group = buildEnclosedInteriorShell(info, palette, { floorColor: '#7e715d', wallColor: '#e5e0d3', ceilingColor: '#d3c7af', accent: '#4b6379', sign: 'ELECTION PETITION COURT' });
  group.name = `courtroom-${info.metadata?.venueId || info.id}`;
  const raisedBench = box(7.6, 0.4, 2.15, '#5c4534');
  raisedBench.position.set(0, 0.33, -4.25);
  group.add(raisedBench);
  const judgeDesk = box(5.4, 0.92, 1.05, '#714e37');
  judgeDesk.position.set(0, 0.98, -4.25);
  group.add(judgeDesk);
  const deskTop = box(5.65, 0.14, 1.18, '#aa7c52', { castShadow: false });
  deskTop.position.set(0, 1.47, -4.25);
  group.add(deskTop);
  const courtSeal = new THREE.Mesh(new THREE.CircleGeometry(0.68, 24), new THREE.MeshStandardMaterial({ color: '#d5bd77', roughness: 0.62 }));
  courtSeal.position.set(0, 2.35, -6.12);
  group.add(courtSeal);
  const sealText = labelSprite('JUSTICE · EVIDENCE · DUE PROCESS', '#213a44');
  sealText.position.set(0, 2.33, -6.0);
  sealText.scale.set(2.6, 0.45, 1);
  group.add(sealText);
  for (const x of [-4.0, 4.0]) {
    const table = box(2.65, 0.16, 1.2, '#79573f');
    table.position.set(x, 0.96, -0.9);
    group.add(table);
    for (const seatX of [x - 0.72, x + 0.72]) addInteriorChair(group, seatX, 0.2, { color: '#425c65', seatId: `court-seat-${seatX}`, label: 'court visitor chair', width: 0.7, approachZ: -0.78 });
  }
  const witnessStand = box(1.45, 1.15, 1.25, '#74533c');
  witnessStand.position.set(0, 0.68, 1.65);
  group.add(witnessStand);
  const witnessLabel = labelSprite('WITNESS BOX', '#d8c393');
  witnessLabel.position.set(0, 1.65, 1.64);
  witnessLabel.scale.set(1.55, 0.35, 1);
  group.add(witnessLabel);
  addSimulatedMeetingActor(group, { id: 'sim-court-clerk', name: 'Fictional Court Clerk', position: 'Simulated Court Clerk', x: -2.05, z: -2.45, shirt: '#58728e', skin: '#754d3b', accent: '#627d95' });
  addSimulatedMeetingActor(group, { id: 'sim-court-facilitator', name: 'Fictional Hearing Facilitator', position: 'Simulated Hearing Facilitator', x: 2.05, z: -2.45, shirt: '#7a6351', skin: '#916242', accent: '#627d95' });
  const courtRoomNote = labelSprite('SIMULATED HEARING · FICTIONAL PROCEEDINGS', '#263c46');
  courtRoomNote.position.set(0, 2.1, 5.84);
  courtRoomNote.scale.set(2.95, 0.42, 1);
  group.add(courtRoomNote);
  return group;
}

function buildAssemblyInterior(info, palette) {
  const group = buildEnclosedInteriorShell(info, palette, { floorColor: '#8c8b78', wallColor: '#e2ddce', ceilingColor: '#d1cbb8', accent: '#367466', sign: 'STATE ASSEMBLY CHAMBER' });
  group.name = `assembly-chamber-${info.metadata?.venueId || info.id}`;
  const dais = box(8.4, 0.42, 2.15, '#59746a');
  dais.position.set(0, 0.36, -4.3);
  group.add(dais);
  const podium = box(3.25, 1.1, 0.92, '#785a3e');
  podium.position.set(0, 1.1, -4.25);
  group.add(podium);
  const podiumTop = box(3.55, 0.16, 1.15, '#c4a665');
  podiumTop.position.set(0, 1.7, -4.25);
  group.add(podiumTop);
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshStandardMaterial({ color: '#d5b95c', roughness: 0.56 }));
  seal.position.set(0, 2.55, -6.08);
  group.add(seal);
  for (const side of [-1, 1]) {
    const lectern = box(0.9, 1.18, 0.7, side < 0 ? '#387254' : '#e1e1ce');
    lectern.position.set(side * 4.4, 0.98, -4.5);
    group.add(lectern);
  }
  const chamberRows = [
    { z: -1.8, y: 0.45, xs: [-4.6, -2.8, -0.95, 0.95, 2.8, 4.6] },
    { z: 0.2, y: 0.78, xs: [-4.6, -2.8, -0.95, 0.95, 2.8, 4.6] },
    { z: 2.2, y: 1.1, xs: [-4.6, -2.8, -0.95, 0.95, 2.8, 4.6] },
  ];
  chamberRows.forEach((row, rowIndex) => {
    const bench = box(10.2, 0.16, 0.68, rowIndex % 2 ? '#516f64' : '#46685e');
    bench.position.set(0, row.y + 0.24, row.z);
    group.add(bench);
    row.xs.forEach((x, seatIndex) => {
      const chair = makeMeetingChair();
      chair.position.set(x, row.y, row.z);
      chair.rotation.y = Math.PI;
      group.add(chair);
      addInteriorSeat(group, { seatId: `assembly-seat-${rowIndex}-${seatIndex}`, seatLabel: 'assembly gallery chair', x, z: row.z, rotationY: Math.PI, approachPoint: { x, z: row.z + 0.8 } });
    });
  });
  addSimulatedMeetingActor(group, { id: 'sim-assembly-clerk', name: 'Fictional Committee Clerk', position: 'Simulated Committee Clerk', x: -3.15, z: -3.05, shirt: '#3b735b', skin: '#734b36', accent: '#3d776b' });
  addSimulatedMeetingActor(group, { id: 'sim-assembly-facilitator', name: 'Fictional Hearing Facilitator', position: 'Simulated Hearing Facilitator', x: 3.15, z: -3.05, shirt: '#8c7652', skin: '#936145', accent: '#3d776b' });
  const chamberNote = labelSprite('PUBLIC HEARING · OVERSIGHT · LAWMAKING', '#3f5d52');
  chamberNote.position.set(0, 2.1, 5.84);
  chamberNote.scale.set(3.0, 0.42, 1);
  group.add(chamberNote);
  return group;
}

function buildInstitutionOfficeInterior(info, palette) {
  const venueId = String(info.metadata?.venueId || info.id || 'office');
  const isInec = venueId.includes('inec');
  const isSiec = venueId.includes('siec');
  const isCbn = venueId.includes('cbn');
  const sectionTitle = isInec ? 'ELECTION ADMINISTRATION DESK' : isSiec ? 'STATE ELECTION OPERATIONS' : isCbn ? 'MONETARY POLICY BRIEFING' : venueId.includes('ward') ? 'WARD COMMUNITY OFFICE' : 'PUBLIC SERVICE OFFICE';
  const accent = isCbn ? '#527094' : isInec || isSiec ? '#237b56' : palette.accent || '#527866';
  const group = buildEnclosedInteriorShell(info, palette, { floorColor: isCbn ? '#a9b2b6' : '#b9ad91', wallColor: '#e8e2d2', ceilingColor: '#d5d2c5', accent, sign: sectionTitle });
  group.name = `institution-office-${venueId}`;
  const desk = box(isInec || isSiec ? 5.25 : 4.4, 0.84, 1.0, isCbn ? '#405b72' : '#75573d');
  desk.position.set(0, 0.55, -3.35);
  group.add(desk);
  const deskSurface = box(isInec || isSiec ? 5.55 : 4.7, 0.13, 1.12, '#c1ac84', { castShadow: false });
  deskSurface.position.set(0, 1.03, -3.35);
  group.add(deskSurface);
  for (const x of [-1.55, 0, 1.55]) {
    const screen = box(0.7, 0.53, 0.08, '#23383a', { castShadow: false });
    screen.position.set(x, 1.38, -3.7);
    group.add(screen);
  }
  if (isInec || isSiec) {
    const ballotBox = box(0.95, 1.2, 0.82, '#dedfd5');
    ballotBox.position.set(-4.6, 0.63, -0.4);
    group.add(ballotBox);
    const ballotSlot = box(0.48, 0.05, 0.06, '#324e42', { castShadow: false });
    ballotSlot.position.set(-4.6, 1.25, -0.4);
    group.add(ballotSlot);
    const privacyScreen = box(1.1, 2.0, 0.12, '#c7d1c6');
    privacyScreen.position.set(4.6, 1.0, -1.0);
    group.add(privacyScreen);
    const boxLabel = labelSprite(isInec ? 'BALLOT & RESULTS DESK' : 'LOCAL ELECTIONS DESK', '#315d49');
    boxLabel.position.set(0, 2.0, 5.85);
    boxLabel.scale.set(2.75, 0.44, 1);
    group.add(boxLabel);
  } else if (isCbn) {
    const chart = box(4.4, 1.65, 0.14, '#253f50', { castShadow: false });
    chart.position.set(0, 2.35, -6.08);
    group.add(chart);
    for (let index = 0; index < 6; index += 1) {
      const bar = box(0.34, 0.35 + index * 0.15, 0.05, ['#66a696', '#d6ba72', '#83a7c4'][index % 3], { castShadow: false });
      bar.position.set(-1.45 + index * 0.58, 1.8 + index * 0.075, -5.96);
      group.add(bar);
    }
  } else {
    const communityDesk = box(2.25, 0.1, 1.1, '#8b7355');
    communityDesk.position.set(0, 0.92, 1.5);
    group.add(communityDesk);
  }
  for (const [index, x] of [-3.9, -1.3, 1.3, 3.9].entries()) {
    addInteriorChair(group, x, 0.65, { color: isCbn ? '#526b83' : '#3f7156', seatId: `office-public-seat-${index}`, label: 'public service visitor chair', width: 0.76, approachZ: 1.52 });
  }
  const officePeople = isInec
    ? [['sim-inec-desk-lead', 'Fictional Desk Lead', 'Simulated election-service lead'], ['sim-inec-operations', 'Fictional Operations Officer', 'Simulated operations officer'], ['sim-inec-community', 'Fictional Community Liaison', 'Simulated community liaison']]
    : isSiec
      ? [['sim-siec-desk-lead', 'Fictional State Desk Lead', 'Simulated state-election lead'], ['sim-siec-operations', 'Fictional Field Coordinator', 'Simulated field coordinator'], ['sim-siec-community', 'Fictional Service Liaison', 'Simulated service liaison']]
      : isCbn
        ? [['sim-cbn-policy-lead', 'Fictional Policy Lead', 'Simulated policy facilitator'], ['sim-cbn-research', 'Fictional Research Officer', 'Simulated research officer'], ['sim-cbn-community', 'Fictional Public Liaison', 'Simulated public liaison']]
        : [['sim-office-coordinator', 'Fictional Office Coordinator', 'Simulated office coordinator'], ['sim-office-service', 'Fictional Service Officer', 'Simulated service officer'], ['sim-office-community', 'Fictional Community Liaison', 'Simulated community liaison']];
  officePeople.forEach(([id, name, position], index) => addSimulatedMeetingActor(group, {
    id, name, position, x: -3.15 + index * 3.15, z: -1.6,
    shirt: ['#377353', '#bc8355', '#52779a'][index], skin: ['#79513b', '#996a49', '#684332'][index], accent,
  }));
  const disclaimer = labelSprite('SIMULATED PUBLIC SERVICE · NO OFFICIAL BUSINESS', '#4f5a4d');
  disclaimer.position.set(0, 2.02, 5.86);
  disclaimer.scale.set(3.25, 0.44, 1);
  group.add(disclaimer);
  return group;
}

function buildCommunityHallInterior(info, palette) {
  const group = buildEnclosedInteriorShell(info, palette, { floorColor: '#bba57f', wallColor: '#e9dec8', ceilingColor: '#d4c8ad', accent: palette.accent || '#bd8051', sign: info.title || 'COMMUNITY HALL' });
  group.name = `community-hall-${info.metadata?.venueType || info.type}`;
  const roundTable = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.16, 32), new THREE.MeshStandardMaterial({ color: '#815e40', roughness: 0.79 }));
  roundTable.position.set(0, 0.86, -0.6);
  group.add(roundTable);
  const tableStem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.86, 10), new THREE.MeshStandardMaterial({ color: '#6d503b', roughness: 0.76 }));
  tableStem.position.set(0, 0.42, -0.6);
  group.add(tableStem);
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const x = Math.cos(angle) * 3.1;
    const z = -0.6 + Math.sin(angle) * 3.1;
    addInteriorChair(group, x, z, { color: index % 2 ? '#4d765b' : '#b48352', seatId: `community-seat-${index}`, label: 'community meeting chair', rotationY: Math.atan2(-x, -z), approachZ: z + Math.sign(z || 1) * 0.9 });
  }
  const hallNote = labelSprite('OPEN COMMUNITY MEETING · TYPE YOUR REPLIES', '#644e37');
  hallNote.position.set(0, 2.12, 5.86);
  hallNote.scale.set(3.1, 0.42, 1);
  group.add(hallNote);
  return group;
}

function buildInteriorRoom(info, palette, playerColor) {
  if (info.type === 'party-office') return buildPartyOfficeInterior(info, palette, playerColor);
  const venueType = info.metadata?.venueType || info.type;
  if (venueType === 'stadium') return buildStadiumInterior(info, palette);
  if (venueType === 'airport') return buildAirportTerminalInterior(info, palette);
  if (venueType === 'plane') return buildAircraftCabinInterior(info, palette);
  if (venueType === 'home') return buildHomeInterior(info, palette);
  if (venueType === 'garage') return buildHomeGarageInterior(info, palette);
  if (venueType === 'market') return buildMarketHallInterior(info, palette);
  if (venueType === 'court') return buildCourtInterior(info, palette);
  if (venueType === 'assembly') return buildAssemblyInterior(info, palette);
  if (venueType === 'office') return buildInstitutionOfficeInterior(info, palette);
  if (venueType === 'caucus' || venueType === 'square') return buildCommunityHallInterior(info, palette);
  const group = new THREE.Group();
  group.name = `interior-${info.id || info.type}`;
  const wallMaterial = '#e3d8bf';
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshStandardMaterial({ color: '#bca985', roughness: 0.92, side: THREE.DoubleSide }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.05;
  group.add(floor);
  const walls = [
    { size: [13, 4.5, 0.22], pos: [0, 2.2, -6.4], color: wallMaterial },
    { size: [0.22, 4.5, 13], pos: [-6.4, 2.2, 0], color: wallMaterial },
    { size: [0.22, 4.5, 13], pos: [6.4, 2.2, 0], color: wallMaterial },
    { size: [13, 0.22, 13], pos: [0, 4.45, 0], color: '#d4c5a8' },
    { size: [5.55, 4.45, 0.22], pos: [-3.72, 2.2, 6.4], color: wallMaterial },
    { size: [5.55, 4.45, 0.22], pos: [3.72, 2.2, 6.4], color: wallMaterial },
    { size: [1.9, 1.85, 0.22], pos: [0, 3.475, 6.4], color: '#d4c5a8' },
  ];
  group.userData.collisionRects = [
    { x: 0, z: -6.4, halfX: 6.5, halfZ: 0.13 },
    { x: -6.4, z: 0, halfX: 0.13, halfZ: 6.5 },
    { x: 6.4, z: 0, halfX: 0.13, halfZ: 6.5 },
    { x: -3.72, z: 6.4, halfX: 2.78, halfZ: 0.13 },
    { x: 3.72, z: 6.4, halfX: 2.78, halfZ: 0.13 },
    { x: 0, z: -0.75, halfX: 1.42, halfZ: 0.68 },
  ];
  walls.forEach(({ size, pos, color }) => {
    const wall = box(...size, color || wallMaterial, { castShadow: false });
    wall.material.side = THREE.DoubleSide;
    wall.position.set(...pos);
    group.add(wall);
  });
  group.add(new THREE.AmbientLight('#fff0d7', 0.9));
  const roomLight = new THREE.PointLight('#ffe6c2', 1.7, 19, 1.8);
  roomLight.position.set(0, 3.75, 0);
  group.add(roomLight);
  const ceilingLamp = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 0.52), new THREE.MeshStandardMaterial({ color: '#fff1d3', emissive: '#f0be71', emissiveIntensity: 0.5, roughness: 0.5 }));
  ceilingLamp.position.set(0, 4.25, 0);
  group.add(ceilingLamp);
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
      addInteriorSeat(group, { seatId: `vehicle-seat-${x}`, seatLabel: 'vehicle seat', x, z: 1.25, rotationY: 0, approachPoint: { x, z: 2.05 } });
    }
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 20), new THREE.MeshStandardMaterial({ color: '#242b29' }));
    wheel.position.set(-1.85, 1.58, 3.85);
    group.add(wheel);
  } else if (info.type === 'venue') {
    for (let index = 0; index < 4; index += 1) {
      const x = -4.0 + index * 2.65;
      const seat = box(1.45, 0.36, 0.58, index % 2 ? '#546f64' : '#c7a84d');
      seat.position.set(x, 0.45, 2.0);
      group.add(seat);
      addInteriorSeat(group, { seatId: `venue-seat-${index + 1}`, seatLabel: 'venue chair', x, z: 2.0, rotationY: Math.PI, approachPoint: { x, z: 2.8 } });
    }
  } else {
    const sofa = box(3.8, 0.62, 0.95, '#547263');
    sofa.position.set(0, 0.55, 2.5);
    group.add(sofa);
    for (const x of [-1.3, 0, 1.3]) {
      const chair = box(0.92, 0.54, 0.84, '#a9835b');
      chair.position.set(x, 0.48, -2.0);
      group.add(chair);
      addInteriorSeat(group, { seatId: `room-seat-${x}`, seatLabel: 'room chair', x, z: -2.0, rotationY: 0, approachPoint: { x, z: -1.2 } });
    }
  }
  const exitDoor = addDoorPortal(group, { id: `exit-${info.id || info.type}`, title: 'Exit to street', type: 'exit', accent: '#e5c465', x: 0, z: 6.3, width: 1.6, height: 2.3 });
  exitDoor.userData.interaction = { id: 'exit-interior', title: 'Exit to street', type: 'exit' };
  group.visible = false;
  void playerColor;
  return group;
}

function buildWorld(root, state, locality, onVenueSelect, playerRef, remoteRef, playerColor, playerAppearance, worldMinuteRef, meetingRef, meetingMessagesRef, meetingContextRef, meetingTravelRef, focusRef, partyFocusRef, exitInteriorRef, interiorChangeRef, executiveFocusRef, interiorActionRef, planeBoardActionRef, flightActionRef, propertyProfileRef, propertyOwnerRef, flightPhaseRef, flightCompleteRef) {
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

  const ambientSky = new THREE.HemisphereLight('#e7f7ff', '#6b6448', 2.05);
  scene.add(ambientSky);
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
  const worldBounds = { minX: -24, maxX: 24, minZ: -33, maxZ: 33 };
  const worldColliders = [];
  const registerGroupColliders = (group, destination = worldColliders) => {
    const localRects = group.userData?.collisionRects || [];
    const cosine = Math.cos(group.rotation.y || 0);
    const sine = Math.sin(group.rotation.y || 0);
    for (const rect of localRects) {
      const corners = [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
      ].map(([signX, signZ]) => {
        const localX = (rect.x + signX * rect.halfX) * group.scale.x;
        const localZ = (rect.z + signZ * rect.halfZ) * group.scale.z;
        return {
          x: group.position.x + cosine * localX + sine * localZ,
          z: group.position.z - sine * localX + cosine * localZ,
        };
      });
      destination.push({
        minX: Math.min(...corners.map((point) => point.x)),
        maxX: Math.max(...corners.map((point) => point.x)),
        minZ: Math.min(...corners.map((point) => point.z)),
        maxZ: Math.max(...corners.map((point) => point.z)),
      });
    }
  };
  const hasRoadClearance = (x, z, halfX, halfZ, clearance = 0.9) => roads.some((road) => {
    if (road.axis === 'x') {
      return Math.abs(z - road.at) < halfZ + road.width / 2 + clearance && Math.abs(x) < halfX + road.length / 2;
    }
    return Math.abs(x - road.at) < halfX + road.width / 2 + clearance && Math.abs(z) < halfZ + road.length / 2;
  });
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
  const streetLampFixtures = [[-13.8, -4.1], [13.9, -3.4], [-14.2, 13.5], [14.3, 14.1], [3.5, 16.2]].map(([x, z]) => makeStreetLight(scene, x, z));
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
        const candidateX = xBlock + offsetX;
        const candidateZ = zBlock + offsetZ;
        if (Math.hypot(candidateX - 16, candidateZ - 17) < 6.2) { buildingIndex += 1; continue; }
        const building = makeBuilding(rand, candidateX, candidateZ, buildingIndex, palette, localityStyle);
        const s = 0.75 + rand() * 0.35;
        building.scale.setScalar(s);
        const collisionRects = building.userData.collisionRects || [];
        const halfX = collisionRects.reduce((extent, rect) => Math.max(extent, Math.abs(rect.x) + rect.halfX), 0) * s;
        const halfZ = collisionRects.reduce((extent, rect) => Math.max(extent, Math.abs(rect.z) + rect.halfZ), 0) * s;
        if (hasRoadClearance(candidateX, candidateZ, halfX, halfZ, 0.55)) { buildingIndex += 1; continue; }
        scene.add(building);
        registerGroupColliders(building);
        buildingIndex += 1;
      }
    }
  }
  // A few detached homes and workshops keep the neighbourhood from feeling like a grid.
  for (let i = 0; i < Math.round(5 + localDensity * 7); i += 1) {
    const x = (rand() - 0.5) * 31;
    const z = (rand() - 0.5) * 31;
    if (Math.abs(x) < 5.5 || Math.abs(z) < 5.5) continue;
    if (Math.abs(z + 10.5) < 4.5 || Math.hypot(x + 17.6, z - 17.6) < 5.2 || Math.hypot(x - 17.5, z + 17.5) < 5.2 || Math.hypot(x - 16, z - 17) < 6.2) continue;
    const building = makeBuilding(rand, x, z, buildingIndex++, palette, localityStyle);
    const halfX = (building.userData.collisionRects || []).reduce((extent, rect) => Math.max(extent, Math.abs(rect.x) + rect.halfX), 0);
    const halfZ = (building.userData.collisionRects || []).reduce((extent, rect) => Math.max(extent, Math.abs(rect.z) + rect.halfZ), 0);
    if (hasRoadClearance(x, z, halfX, halfZ, 0.6)) continue;
    scene.add(building);
    registerGroupColliders(building);
  }

  // Small green pockets, trees, kiosks, and benches vary by biome and settlement density.
  const vegetationCount = Math.round(16 + profile.relief * 5 + (['rainforest', 'mangrove'].includes(profile.vegetation) ? 7 : 0));
  for (let i = 0; i < vegetationCount; i += 1) {
    const x = (rand() - 0.5) * 37;
    const z = (rand() - 0.5) * 37;
    if (Math.abs(x) < 4.6 || Math.abs(z) < 4.6 || Math.abs(z + 10.5) < 3.1) continue;
    if (Math.abs(x) > 22 || Math.abs(z) > 22 || Math.hypot(x + 17.6, z - 17.6) < 4.2 || Math.hypot(x - 17.5, z + 17.5) < 4.2 || Math.hypot(x - 16, z - 17) < 6.2) continue;
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
  const microLandmark = makeLocalityMicroLandmark(locality, stateInfo, localityStyle, palette);
  scene.add(microLandmark);
  registerGroupColliders(microLandmark);
  const stateSignature = makeStateSignature(stateInfo, palette, sceneMaterials);
  scene.add(stateSignature);
  registerGroupColliders(stateSignature);
  for (const venue of WORLD_VENUES) {
    const venueGroup = makeVenue(venue, palette, sceneMaterials, stateInfo.name, propertyProfileRef?.current, propertyOwnerRef?.current);
    scene.add(venueGroup);
    registerGroupColliders(venueGroup);
    venueGroup.traverse((object) => {
      const interaction = object.userData?.interaction;
      if (interaction?.type === 'plane' && interaction.metadata?.cabinClass) planeBoardingDoors.set(interaction.metadata.cabinClass, object);
    });
  }

  const safeMeetingPoint = (meetingId, venueId, playerId, slot) => {
    const point = meetingArrivalPoint(meetingId, venueId, playerId, slot);
    return findNearestFreePoint(point.x, point.z, 0.5, worldColliders, worldBounds, 3.25) || point;
  };
  const meetingParticipantIsAtSeat = (actor, activeMeeting) => {
    if (!activeMeeting?.id || actor.userData.meetingId !== activeMeeting.id || !['at-venue', 'in-session'].includes(actor.userData.meetingStatus)) return false;
    const meetingSlot = Number.isInteger(Number(actor.userData.meetingSlot)) ? Number(actor.userData.meetingSlot) : null;
    const seat = safeMeetingPoint(
      activeMeeting.id,
      activeMeeting.location?.venueId || 'square',
      actor.userData.playerId || 'local-player',
      meetingSlot,
    );
    return Math.hypot(actor.position.x - seat.x, actor.position.z - seat.z) < 0.82;
  };
  const meetingStage = new THREE.Group();
  const meetingStageRing = new THREE.Mesh(new THREE.RingGeometry(5.06, 5.16, 48), new THREE.MeshBasicMaterial({ color: '#f0c777', transparent: true, opacity: 0.38, side: THREE.DoubleSide }));
  meetingStageRing.rotation.x = -Math.PI / 2;
  meetingStageRing.position.y = 0.045;
  meetingStage.add(meetingStageRing);
  const meetingSeats = new Map();
  const syncMeetingSeats = (currentMeeting, meetingVenue) => {
    const participants = meetingContextRef.current?.meetingParticipants || [];
    const visibleIds = new Set();
    for (const person of participants) {
      if (!person?.id || person.meetingId !== currentMeeting.id || !Number.isInteger(Number(person.meetingSlot)) || !['at-venue', 'in-session'].includes(person.meetingStatus)) continue;
      visibleIds.add(person.id);
      let chair = meetingSeats.get(person.id);
      if (!chair) {
        chair = makeMeetingChair();
        meetingStage.add(chair);
        meetingSeats.set(person.id, chair);
      }
      const position = safeMeetingPoint(currentMeeting.id, meetingVenue.id, person.id, Number(person.meetingSlot));
      const localX = position.x - meetingVenue.x;
      const localZ = position.z - meetingVenue.z;
      chair.position.set(localX, 0, localZ);
      chair.rotation.y = Math.atan2(-localX, -localZ);
      chair.visible = true;
    }
    for (const [id, chair] of meetingSeats) {
      if (!visibleIds.has(id)) { meetingStage.remove(chair); disposeGroup(chair); meetingSeats.delete(id); }
    }
  };
  const speechBubble = createSpeechBubble();
  meetingStage.add(speechBubble.sprite);
  meetingStage.visible = false;
  scene.add(meetingStage);
  let lastMeetingMessageId = null;
  let speakingAvatar = null;
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
  const planeBoardingDoors = new Map();
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
    registerGroupColliders(office);
    office.traverse((object) => {
      if (object.userData?.interaction?.type === 'party-office') partyOfficeDoors.set(party.id, object);
    });
  });

  const traffic = [];
  const heroTaxi = makeCar('#f1c53d', 'taxi', '#28694e');
  heroTaxi.position.set(-9.2, 0, primaryRoadAt + 2.72);
  if (!aabbBlockedAt(heroTaxi.position.x, heroTaxi.position.z, worldVehicleFootprint(heroTaxi).halfX, worldVehicleFootprint(heroTaxi).halfZ, worldColliders)) scene.add(heroTaxi);
  const addTrafficVehicle = (object, route) => {
    const footprint = worldVehicleFootprint(object);
    if (aabbBlockedAt(object.position.x, object.position.z, footprint.halfX, footprint.halfZ, worldColliders)) return false;
    scene.add(object);
    traffic.push({ object, ...route });
    return true;
  };
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
    addTrafficVehicle(car, { axis: 'x', speed: 0.68 + (i % 3) * 0.23, min: -25, max: 25, dir: direction });
  }
  const verticalCount = Math.max(2, Math.min(4, Math.round(1 + localDensity * 2)));
  for (let i = 0; i < verticalCount; i += 1) {
    const kind = roadVehicleKinds[(i + 2 + hash(localityStyle.identity)) % roadVehicleKinds.length];
    const direction = i % 2 === 0 ? 1 : -1;
    const car = makeCar(trafficColors[(i + 2) % trafficColors.length], kind, routeAccent);
    car.position.set(sideRoadAt + (direction > 0 ? -0.74 : 0.74), 0, -18 + i * 12.5);
    car.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    addTrafficVehicle(car, { axis: 'z', speed: 0.66 + (i % 2) * 0.27, min: -25, max: 25, dir: direction });
  }
  if (localityStyle.trafficMix.includes('water-taxi')) {
    const boat = makeWaterTaxi('#f0c84b', routeAccent);
    boat.position.set(-18, 0.06, -28.2);
    addTrafficVehicle(boat, { axis: 'x', speed: 0.68, min: -26, max: 26, dir: 1 });
  }
  const getWorldActorColliders = () => {
    const colliders = worldColliders.slice();
    const vehicles = [...(heroTaxi.parent ? [heroTaxi] : []), ...traffic.map((item) => item.object)];
    for (const vehicle of vehicles) {
      const { halfX, halfZ } = worldVehicleFootprint(vehicle);
      colliders.push({
        minX: vehicle.position.x - halfX,
        maxX: vehicle.position.x + halfX,
        minZ: vehicle.position.z - halfZ,
        maxZ: vehicle.position.z + halfZ,
      });
    }
    return colliders;
  };

  const pedestrians = [];
  const clothing = ['#df8066', '#527c6e', '#d4b750', '#657ca0', '#b87c49', '#9b87ba'];
  for (let i = 0; i < Math.round(6 + localDensity * 13); i += 1) {
    const x = -18 + rand() * 36;
    const z = -18 + rand() * 36;
    if (Math.abs(x) < 3.0 && Math.abs(z) < 3.0) continue;
    if (Math.abs(z + 10.5) < 1.6 || Math.abs(x) < 1.8) continue;
    const person = makePerson(clothing[i % clothing.length]);
    const personScale = 0.8 + rand() * 0.28;
    const collisionRadius = 0.33 * personScale;
    const safeStart = findNearestFreePoint(x, z, collisionRadius, getWorldActorColliders(), worldBounds, 4.5);
    if (!safeStart) continue;
    person.position.set(safeStart.x, 0, safeStart.z);
    person.scale.setScalar(personScale);
    scene.add(person);
    pedestrians.push({ object: person, phase: rand() * Math.PI * 2, speed: 0.35 + rand() * 0.35, startX: safeStart.x, startZ: safeStart.z, walkX: rand() > 0.5, collisionRadius });
  }

  const player = makePerson(playerColor || '#d8f36b', playerAppearance?.skinTone || '#764c37', playerAppearance || {});
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
      avatar.userData.playerId = item.id;
      avatar.userData.playerName = item.name || 'VISITOR';
      avatar.userData.meetingId = item.meetingId || null;
      avatar.userData.meetingStatus = item.meetingStatus || null;
      avatar.userData.meetingSlot = Number.isInteger(Number(item.meetingSlot)) ? Number(item.meetingSlot) : null;
      const activeMeeting = meetingRef?.current;
      const hasArrivedAtMeeting = activeMeeting?.id && item.meetingId === activeMeeting.id && ['at-venue', 'in-session'].includes(item.meetingStatus) && avatar.userData.meetingSlot !== null;
      const savedMeetingPosition = hasArrivedAtMeeting ? safeMeetingPoint(activeMeeting.id, activeMeeting.location?.venueId || 'square', item.id, avatar.userData.meetingSlot) : null;
      const targetX = clamp(savedMeetingPosition?.x ?? (Number(item.x) || 0), worldBounds.minX, worldBounds.maxX);
      const targetZ = clamp(savedMeetingPosition?.z ?? (Number(item.z) || 0), worldBounds.minZ, worldBounds.maxZ);
      const priorPosition = avatar.position.clone();
      if (!avatar.userData.collisionReady) {
        const safeStart = findNearestFreePoint(targetX, targetZ, 0.47, worldColliders, worldBounds, 12);
        if (safeStart) avatar.position.set(safeStart.x, 0, safeStart.z);
        else avatar.position.set(-5.8, 0, 3.5);
        avatar.userData.collisionReady = true;
      } else {
        const movement = moveCircleSafely(avatar.position, targetX - avatar.position.x, targetZ - avatar.position.z, 0.47, worldColliders, worldBounds);
        if (movement.moved) avatar.rotation.y = Math.atan2(movement.x, movement.z);
      }
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
  const fitInteriorCameraFov = () => {
    const aspect = camera.aspect;
    if (interiorGroup?.userData?.interiorKind === 'stadium') {
      // A wider vertical view on narrow phones keeps the pitch and nearby stands in frame.
      camera.fov = aspect < 0.68 ? 92 : aspect < 1.1 ? 68 : 52;
    } else {
      // Keep enclosed rooms immersive without cropping the meeting table on wider screens.
      camera.fov = aspect < 0.68 ? 78 : aspect < 1.1 ? 62 : 48;
    }
    camera.updateProjectionMatrix();
  };

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
  let movementWaypoints = [];
  let movementWaypointIndex = 0;
  let interiorActive = false;
  let interiorGroup = null;
  let activeFlight = null;
  const interiorColliders = [];
  const activeCollisionRects = () => (interiorActive ? interiorColliders : getWorldActorColliders());
  const activeWorldBounds = () => (interiorActive
    ? interiorGroup?.userData?.interiorBounds || { minX: -5.55, maxX: 5.55, minZ: -5.45, maxZ: 5.45 }
    : worldBounds);
  const setSafeWalkTarget = (x, z, maxRadius = 5.5) => {
    const radius = interiorActive ? 0.46 : 0.5;
    const colliders = activeCollisionRects();
    const bounds = activeWorldBounds();
    const safePoint = findNearestFreePoint(x, z, radius, colliders, bounds, maxRadius);
    if (!safePoint) {
      isMoving = false;
      movementWaypoints = [];
      return false;
    }
    const path = findWalkPath(player.position, safePoint, radius, colliders, bounds);
    if (!path) {
      isMoving = false;
      movementWaypoints = [];
      return false;
    }
    moveTarget.set(safePoint.x, 0, safePoint.z);
    movementWaypoints = path;
    movementWaypointIndex = 0;
    isMoving = movementWaypoints.length > 0;
    return true;
  };
  let pendingInteraction = null;
  let activeMeetingRoute = null;
  const travelToMeeting = (request) => {
    if (!request?.meetingId) {
      if (activeMeetingRoute && isMoving && Math.hypot(moveTarget.x - activeMeetingRoute.target.x, moveTarget.z - activeMeetingRoute.target.z) < 0.12) {
        isMoving = false; movementWaypoints = []; movementWaypointIndex = 0; pendingInteraction = null;
      }
      activeMeetingRoute = null;
      return;
    }
    const meetingId = String(request.meetingId);
    const slot = request.slot !== null && request.slot !== undefined && Number.isInteger(Number(request.slot)) ? Number(request.slot) : null;
    if (activeMeetingRoute?.meetingId === meetingId && activeMeetingRoute.playerId === request.playerId && activeMeetingRoute.slot === slot) {
      if (activeMeetingRoute.confirmed) return;
      const alreadyFollowingRoute = isMoving && Math.hypot(moveTarget.x - activeMeetingRoute.target.x, moveTarget.z - activeMeetingRoute.target.z) < 0.12;
      if (alreadyFollowingRoute) return;
      const restarted = setSafeWalkTarget(activeMeetingRoute.target.x, activeMeetingRoute.target.z, 3.25);
      if (restarted) activeMeetingRoute.target = { x: moveTarget.x, z: moveTarget.z };
      return;
    }
    const venueId = request.venueId || 'square';
    const venue = WORLD_VENUES.find((item) => item.id === venueId) || WORLD_VENUES.find((item) => item.id === 'square');
    const arrival = safeMeetingPoint(meetingId, venue.id, request.playerId, slot);
    if (interiorActive) exitInterior();
    pendingInteraction = null;
    const started = setSafeWalkTarget(arrival.x, arrival.z, 3.25);
    if (!started) { activeMeetingRoute = null; return; }
    activeMeetingRoute = { meetingId, venueId: venue.id, playerId: request.playerId, slot, target: { x: moveTarget.x, z: moveTarget.z }, confirmed: false };
    isFocusingCamera = false;
    if (Math.hypot(player.position.x - moveTarget.x, player.position.z - moveTarget.z) < 0.28) {
      activeMeetingRoute.confirmed = true;
      player.rotation.y = Math.atan2(venue.x - player.position.x, venue.z - player.position.z);
      meetingContextRef.current?.onMeetingArrival?.(meetingId);
    }
  };
  if (meetingTravelRef) meetingTravelRef.current = travelToMeeting;
  let savedExteriorPosition = null;
  let savedCameraPosition = null;
  let savedCameraTarget = null;
  let savedCameraFov = null;
  let savedExteriorVisibility = null;
  let savedSceneBackground = null;
  let savedSceneFog = null;
  const interiorBackdrop = new THREE.Color('#d8c9ad');
  const stadiumInteriorBackdrop = new THREE.Color('#829ca4');
  let activeInteriorBackdrop = interiorBackdrop;
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
  let seatedInteriorSeatId = null;
  const interiorExecutiveTargets = new Map();
  const notifyInteriorAction = (action) => interiorActionRef?.current?.(action);
  const standFromSeat = (notify = true) => {
    if (!seatedInteriorSeatId) return;
    seatedInteriorSeatId = null;
    if (notify) notifyInteriorAction({ type: 'stood-up' });
  };
  const exitInterior = () => {
    if (!interiorActive || activeFlight) return;
    standFromSeat(false);
    interiorExecutiveTargets.clear();
    if (executiveFocusRef) executiveFocusRef.current = null;
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
    for (const [object, wasVisible] of savedExteriorVisibility || []) {
      if (object.parent === scene) object.visible = wasVisible;
    }
    savedExteriorVisibility = null;
    if (savedSceneBackground) scene.background = savedSceneBackground;
    activeInteriorBackdrop = interiorBackdrop;
    if (savedSceneFog !== null) scene.fog = savedSceneFog;
    savedSceneBackground = null;
    savedSceneFog = null;
    if (savedExteriorPosition) player.position.copy(savedExteriorPosition);
    if (savedCameraPosition) camera.position.copy(savedCameraPosition);
    if (savedCameraTarget) controls.target.copy(savedCameraTarget);
    if (savedCameraFov !== null) {
      camera.fov = savedCameraFov;
      camera.updateProjectionMatrix();
      savedCameraFov = null;
    }
    previousPlayerPosition.copy(player.position);
    interiorColliders.length = 0;
    interiorActive = false;
    isMoving = false;
    movementWaypoints = [];
    movementWaypointIndex = 0;
    pendingInteraction = null;
    controls.minDistance = 7;
    controls.maxDistance = 62;
    controls.minPolarAngle = Math.PI / 8;
    controls.maxPolarAngle = Math.PI / 2.18;
    controls.update();
    interiorChangeRef?.current?.(null);
  };
  const enterInterior = (interaction) => {
    if (!interaction || interiorActive) return;
    savedExteriorPosition = player.position.clone();
    savedCameraPosition = camera.position.clone();
    savedCameraTarget = controls.target.clone();
    savedCameraFov = camera.fov;
    if (interiorGroup) {
      scene.remove(interiorGroup);
      disposeGroup(interiorGroup);
    }
    const office = interaction.type === 'party-office' ? PARTY_OPTIONS.find((item) => item.id === interaction.partyId) : null;
    const info = {
      ...interaction,
      title: office ? `${office.tag} · ${office.name}` : interaction.title || 'Community space',
      branch: interaction.metadata?.branch || [],
      propertyProfile: propertyProfileRef?.current || {},
      propertyOwner: propertyOwnerRef?.current || 'PLAYER',
      party: office || null,
      nationalOfficers: office ? { chair: office.chair, secretary: office.secretary, checkedAt: PARTY_REGISTER_CHECKED_AT, source: PARTY_REGISTER_SOURCE } : null,
      fictional: interaction.type === 'party-office' || interaction.type === 'building' || interaction.type === 'landmark',
    };
    interiorGroup = buildInteriorRoom(info, palette, playerColor);
    interiorGroup.userData.venueType = info.metadata?.venueType || info.type;
    interiorGroup.userData.cabinClass = info.metadata?.cabinClass || null;
    interiorGroup.userData.interiorInfo = info;
    interiorColliders.length = 0;
    registerGroupColliders(interiorGroup, interiorColliders);
    // Isolate the enclosed room from the street scene; no roads, trees, traffic or exterior lights render through it.
    savedExteriorVisibility = [];
    for (const object of scene.children) {
      if (object === player) continue;
      savedExteriorVisibility.push([object, object.visible]);
      object.visible = false;
    }
    savedSceneBackground = scene.background;
    savedSceneFog = scene.fog;
    const stadiumInterior = info.metadata?.venueType === 'stadium';
    activeInteriorBackdrop = stadiumInterior ? stadiumInteriorBackdrop : interiorBackdrop;
    scene.background = activeInteriorBackdrop.clone();
    scene.fog = null;
    scene.add(interiorGroup);
    interiorGroup.add(player);
    player.position.set(0, 0, stadiumInterior ? 25.2 : 4.9);
    player.rotation.y = Math.PI;
    previousPlayerPosition.copy(player.position);
    interiorGroup.visible = true;
    activeInteriorClickables = [];
    interiorExecutiveTargets.clear();
    interiorGroup.traverse((object) => {
      const action = object.userData?.interaction;
      if (action) {
        activeInteriorClickables.push(object);
        clickable.push(object);
        if (action.type === 'executive' && action.executive?.id) interiorExecutiveTargets.set(action.executive.id, action);
      }
    });
    interiorActive = true;
    isMoving = false;
    movementWaypoints = [];
    movementWaypointIndex = 0;
    pendingInteraction = null;
    const aspect = (root.clientWidth || 1) / Math.max(root.clientHeight || 1, 1);
    if (stadiumInterior) {
      camera.position.set(0, 15.5, 26.2);
      controls.target.set(0, 1.7, 0);
      fitInteriorCameraFov();
      controls.minDistance = 13;
      controls.maxDistance = 34;
      controls.minPolarAngle = 0.52;
      controls.maxPolarAngle = 1.52;
    } else {
      camera.position.set(0, aspect < 0.68 ? 2.65 : 2.5, 5.55);
      controls.target.set(0, 1.15, -0.8);
      fitInteriorCameraFov();
      controls.minDistance = 2.8;
      controls.maxDistance = 6.7;
      controls.minPolarAngle = 1.12;
      controls.maxPolarAngle = 1.6;
    }
    controls.update();
    if (executiveFocusRef) executiveFocusRef.current = (executiveId) => {
      const action = interiorExecutiveTargets.get(executiveId);
      if (action) beginDoorInteraction(action, action.targetObject);
    };
    interiorChangeRef?.current?.(info);
  };
  const announceFlightPhase = (phase, progress, request) => {
    flightPhaseRef?.current?.({ phase, progress: clamp(progress, 0, 1), origin: request.origin, destination: request.destination, cabinClass: request.cabinClass });
  };
  const placeArrivalScene = (flight) => {
    if (flight.stage) {
      scene.remove(flight.stage);
      disposeGroup(flight.stage);
    }
    const stage = new THREE.Group();
    stage.name = 'arrival-deplaning-stage';
    stage.add(new THREE.HemisphereLight('#eef8ed', '#59635a', 1.75));
    const arrivalSun = new THREE.DirectionalLight('#fff0c9', 2.35);
    arrivalSun.position.set(-12, 20, 11);
    stage.add(arrivalSun);
    const apron = box(75, 0.12, 75, '#636a66', { castShadow: false, roughness: 0.95 });
    apron.position.set(0, -0.12, 0);
    stage.add(apron);
    const runway = box(65, 0.035, 5.6, '#444b49', { castShadow: false, roughness: 0.95 });
    runway.position.set(0, -0.045, -8.5);
    stage.add(runway);
    for (let dash = -9; dash <= 9; dash += 1) {
      const mark = box(1.05, 0.025, 0.12, '#ede4ca', { castShadow: false });
      mark.position.set(dash * 3.0, -0.01, -8.5);
      stage.add(mark);
    }
    const terminal = box(20, 4.15, 2.0, '#d2d4cb');
    terminal.position.set(0, 2.02, -12.0);
    stage.add(terminal);
    const terminalGlass = box(15.5, 1.55, 0.06, '#6b99a2', { castShadow: false, roughness: 0.35, metalness: 0.1 });
    terminalGlass.position.set(0, 2.6, -10.95);
    stage.add(terminalGlass);
    const airportName = labelSprite(`${flight.request.destination.toUpperCase()} · ARRIVALS`, '#f2d886');
    airportName.position.set(0, 4.0, -10.84);
    airportName.scale.set(3.8, 0.74, 1);
    stage.add(airportName);
    const aircraft = makeAirliner(flight.request.cabinClass, '#196a54');
    aircraft.position.set(-1.35, 1.08, -1.25);
    aircraft.rotation.y = -0.06;
    aircraft.scale.setScalar(0.78);
    stage.add(aircraft);
    const stairX = -0.9;
    for (let step = 0; step < 9; step += 1) {
      const tread = box(0.92, 0.1, 0.42, step % 2 ? '#9f9d91' : '#b3afa0', { castShadow: false, roughness: 0.83 });
      tread.position.set(stairX, 0.91 - step * 0.1, 0.15 + step * 0.42);
      stage.add(tread);
      const railPost = box(0.07, 0.62, 0.07, '#667774', { castShadow: false, metalness: 0.15 });
      railPost.position.set(stairX + (step % 2 ? 0.55 : -0.55), 1.16 - step * 0.1, 0.15 + step * 0.42);
      stage.add(railPost);
    }
    for (const side of [-1, 1]) {
      const rail = box(0.07, 0.08, 3.75, '#6f827b', { castShadow: false, metalness: 0.14 });
      rail.rotation.x = -0.22;
      rail.position.set(stairX + side * 0.55, 1.18, 1.9);
      stage.add(rail);
    }
    const redCarpet = box(0.66, 0.04, 3.85, '#a84b3c', { castShadow: false, roughness: 0.92 });
    redCarpet.position.set(stairX, 1.0, 1.8);
    stage.add(redCarpet);
    const baggageCart = box(1.4, 0.62, 0.7, '#a18d64');
    baggageCart.position.set(3.8, 0.34, 1.2);
    stage.add(baggageCart);
    const cartWheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.065, 6, 12), new THREE.MeshStandardMaterial({ color: '#242b2a', roughness: 0.8 }));
    for (const x of [3.3, 4.3]) {
      const wheel = cartWheel.clone();
      wheel.position.set(x, 0.2, 1.5);
      stage.add(wheel);
    }
    flight.stage = stage;
    flight.plane = aircraft;
    flight.clouds = [];
    flight.arrivalStage = true;
    scene.add(stage);
    if (interiorGroup) interiorGroup.visible = false;
    if (player.parent) player.parent.remove(player);
    stage.add(player);
    player.visible = true;
    player.position.set(stairX, 0.98, 0.05);
    player.rotation.y = 0;
    flight.avatarStart = player.position.clone();
    flight.avatarEnd = new THREE.Vector3(stairX, 0, 3.8);
    scene.background = new THREE.Color('#a4c5c5');
    scene.fog = null;
    camera.position.set(10.5, 8.1, 10.7);
    controls.target.set(-0.9, 1.15, 1.2);
    camera.fov = 46;
    camera.updateProjectionMatrix();
    controls.minDistance = 7;
    controls.maxDistance = 22;
    controls.minPolarAngle = 0.62;
    controls.maxPolarAngle = 1.48;
    controls.update();
  };
  const finishFlightSequence = (flight) => {
    if (flight.stage) {
      flight.stage.remove(player);
      scene.remove(flight.stage);
      disposeGroup(flight.stage);
    }
    if (interiorGroup) {
      interiorGroup.add(player);
      interiorGroup.visible = false;
    } else scene.add(player);
    player.visible = false;
    player.position.set(0, 0, 4.9);
    player.rotation.y = Math.PI;
    scene.background = flight.savedBackground || interiorBackdrop;
    scene.fog = flight.savedFog;
    if (flight.savedCameraPosition) camera.position.copy(flight.savedCameraPosition);
    if (flight.savedCameraTarget) controls.target.copy(flight.savedCameraTarget);
    camera.fov = flight.savedCameraFov || camera.fov;
    camera.updateProjectionMatrix();
    controls.minDistance = 2.8;
    controls.maxDistance = 6.7;
    controls.minPolarAngle = 1.12;
    controls.maxPolarAngle = 1.6;
    controls.update();
    activeFlight = null;
    flightCompleteRef?.current?.(flight.request);
  };
  const startPlaneTrip = (rawRequest) => {
    if (activeFlight || !interiorActive || interiorGroup?.userData.venueType !== 'plane') return;
    const request = {
      ...rawRequest,
      origin: rawRequest.origin || stateInfo.name,
      cabinClass: rawRequest.cabinClass || interiorGroup.userData.cabinClass || 'economy',
    };
    const stage = new THREE.Group();
    stage.name = 'in-flight-aircraft-exterior';
    stage.add(new THREE.HemisphereLight('#effaff', '#6b7985', 2.0));
    const flightSun = new THREE.DirectionalLight('#fff4da', 2.65);
    flightSun.position.set(-14, 21, 12);
    stage.add(flightSun);
    const clouds = [];
    const cloudDeck = new THREE.Mesh(new THREE.PlaneGeometry(120, 90), new THREE.MeshStandardMaterial({ color: '#b7d9df', roughness: 1, side: THREE.DoubleSide }));
    cloudDeck.rotation.x = -Math.PI / 2;
    cloudDeck.position.y = -3.0;
    stage.add(cloudDeck);
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), new THREE.MeshBasicMaterial({ color: '#fff0c7' }));
    sunGlow.position.set(-15, 15, -24);
    stage.add(sunGlow);
    const aircraft = makeAirliner(request.cabinClass, '#176c53');
    aircraft.position.set(0, 5.3, 0);
    aircraft.rotation.y = 0.28;
    aircraft.scale.setScalar(request.cabinClass === 'private-jet' ? 1.3 : 1.18);
    stage.add(aircraft);
    for (let index = 0; index < 7; index += 1) {
      const cloud = makeCloudCluster();
      cloud.scale.setScalar(1.15 + (index % 3) * 0.35);
      cloud.position.set(-21 + index * 7.0, 2.3 + (index % 2) * 2.5, -15 + (index % 4) * 8.0);
      clouds.push(cloud);
      stage.add(cloud);
    }
    activeFlight = {
      request,
      stage,
      plane: aircraft,
      clouds,
      startedAt: performance.now() / 1000,
      phaseStartedAt: performance.now() / 1000,
      phase: 'takeoff',
      statusUpdatedAt: 0,
      savedBackground: scene.background?.clone?.() || new THREE.Color('#d8c9ad'),
      savedFog: scene.fog,
      savedCameraPosition: camera.position.clone(),
      savedCameraTarget: controls.target.clone(),
      savedCameraFov: camera.fov,
      arrivalStage: false,
      deboardDuration: 3.2,
    };
    scene.add(stage);
    standFromSeat(false);
    if (interiorGroup) interiorGroup.visible = false;
    isMoving = false;
    movementWaypoints = [];
    movementWaypointIndex = 0;
    keyState.clear();
    player.visible = false;
    scene.background = new THREE.Color('#86c5e3');
    scene.fog = new THREE.Fog('#c9e3e6', 52, 125);
    camera.position.set(11.5, 9.5, 17.5);
    controls.target.set(0, 5.2, 0);
    camera.fov = 48;
    camera.updateProjectionMatrix();
    controls.minDistance = 8;
    controls.maxDistance = 34;
    controls.minPolarAngle = 0.4;
    controls.maxPolarAngle = 1.48;
    controls.update();
    announceFlightPhase('takeoff', 0, request);
  };
  if (flightActionRef) flightActionRef.current = startPlaneTrip;
  if (planeBoardActionRef) planeBoardActionRef.current = (cabinClass) => {
    if (!interiorActive || interiorGroup?.userData.venueType !== 'airport') return;
    const door = planeBoardingDoors.get(cabinClass) || planeBoardingDoors.get('economy');
    const interaction = door?.userData?.interaction;
    if (!interaction) return;
    exitInterior();
    enterInterior(interaction);
  };
  const sitAtInteriorSeat = (interaction) => {
    const target = interaction?.targetObject;
    if (!interiorActive || !target) return;
    target.updateWorldMatrix?.(true, false);
    const point = new THREE.Vector3();
    target.getWorldPosition(point);
    const rotation = new THREE.Quaternion();
    target.getWorldQuaternion(rotation);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation).normalize();
    player.position.set(point.x - forward.x * 0.04, 0, point.z - forward.z * 0.04);
    player.rotation.y = Number.isFinite(interaction.rotationY) ? interaction.rotationY : Math.atan2(forward.x, forward.z);
    previousPlayerPosition.copy(player.position);
    seatedInteriorSeatId = interaction.seatId || null;
    isMoving = false;
    movementWaypoints = [];
    movementWaypointIndex = 0;
    pendingInteraction = null;
    notifyInteriorAction({ type: 'seated', seatId: interaction.seatId, seatLabel: interaction.seatLabel || 'Visitor chair' });
  };
  const completeInteriorInteraction = (interaction) => {
    if (!interaction) return;
    pendingInteraction = null;
    if (interaction.type === 'exit') { exitInterior(); return; }
    if (interaction.type === 'seat') { sitAtInteriorSeat(interaction); return; }
    if (interaction.type === 'executive' || interaction.type === 'office-activity') {
      const target = interaction.targetObject;
      if (target) {
        target.updateWorldMatrix?.(true, false);
        const position = new THREE.Vector3();
        target.getWorldPosition(position);
        player.rotation.y = Math.atan2(position.x - player.position.x, position.z - player.position.z);
      }
      if (interaction.type === 'executive') notifyInteriorAction({ type: 'executive-ready', executive: interaction.executive });
      else notifyInteriorAction({ type: 'activity-ready', activity: interaction.activity });
      return;
    }
    enterInterior(interaction);
  };
  const beginDoorInteraction = (interaction, portalGroup) => {
    if (!interaction) return;
    if (interiorActive && ['seat', 'executive', 'office-activity'].includes(interaction.type)) {
      const approach = interaction.approachPoint;
      let target = null;
      if (approach && Number.isFinite(approach.x) && Number.isFinite(approach.z)) {
        target = { x: approach.x, z: approach.z };
      } else {
        const targetObject = interaction.targetObject || portalGroup || player;
        targetObject.updateWorldMatrix?.(true, false);
        const point = new THREE.Vector3();
        targetObject.getWorldPosition(point);
        const rotation = new THREE.Quaternion();
        targetObject.getWorldQuaternion(rotation);
        const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation).normalize();
        const distance = interaction.type === 'executive' ? 1.45 : 0.72;
        const approachPoint = point.add(facing.multiplyScalar(distance));
        target = { x: approachPoint.x, z: approachPoint.z };
      }
      const searchRadius = interaction.type === 'executive' ? 4.6 : interaction.type === 'office-activity' ? 3.6 : 2.6;
      if (!setSafeWalkTarget(target.x, target.z, searchRadius)) return;
      standFromSeat();
      pendingInteraction = interaction;
      if (player.position.distanceTo(moveTarget) < 1.25) completeInteriorInteraction(interaction);
      return;
    }
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
      if (!setSafeWalkTarget(approach.x, approach.z, 1.6)) return;
      pendingInteraction = interaction;
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
    const approachDistance = interaction.type === 'venue' && ['office', 'court', 'assembly', 'caucus'].includes(interaction.metadata?.venueType) ? 2.35 : 1.75;
    const approach = point.add(facing.multiplyScalar(approachDistance));
    if (!setSafeWalkTarget(approach.x, approach.z, interaction.type === 'party-office' ? 4.5 : 2.5)) {
      // Never leave a party office unusable if its compact frontage blocks automatic pathfinding.
      if (interaction.type === 'party-office') enterInterior(interaction);
      return;
    }
    pendingInteraction = interaction;
    if (player.position.distanceTo(moveTarget) < 1.25) enterInterior(interaction);
  };
  const focusVenue = (venueId) => {
    const venue = WORLD_VENUES.find((item) => item.id === venueId);
    if (!venue) return;
    if (interiorActive) exitInterior();
    setSafeWalkTarget(venue.x - 2.5, venue.z + 3.0, 4.5);
    pendingInteraction = null;
    cameraFocusTarget.set(venue.x, 0.8, venue.z);
    cameraFocusPosition.set(venue.x + 8.7, 7.3, venue.z + 12.5);
    isFocusingCamera = true;
  };
  if (focusRef) focusRef.current = focusVenue;
  if (exitInteriorRef) exitInteriorRef.current = exitInterior;
  if (partyFocusRef) {
    // The directory button is an explicit ENTER action; place the avatar at the office frontage, then open inside.
    partyFocusRef.current = (partyId) => {
      const door = partyOfficeDoors.get(partyId);
      if (!door) return;
      if (interiorActive) exitInterior();
      const portal = door.parent || door;
      portal.updateWorldMatrix?.(true, false);
      const entrance = new THREE.Vector3();
      portal.getWorldPosition(entrance);
      const rotation = new THREE.Quaternion();
      portal.getWorldQuaternion(rotation);
      const outward = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation).normalize();
      entrance.add(outward.multiplyScalar(1.75));
      const safeEntrance = findNearestFreePoint(entrance.x, entrance.z, 0.5, worldColliders, worldBounds, 4.5);
      if (safeEntrance) {
        const shift = new THREE.Vector3(safeEntrance.x - player.position.x, 0, safeEntrance.z - player.position.z);
        player.position.set(safeEntrance.x, 0, safeEntrance.z);
        camera.position.add(shift);
        controls.target.add(shift);
        previousPlayerPosition.copy(player.position);
      }
      enterInterior(door.userData.interaction);
    };
  }

  const setTargetFromEvent = (event) => {
    if (activeFlight) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const activeTargets = interiorActive ? activeInteriorClickables : clickable.filter((object) => !activeInteriorClickables.includes(object));
    const hits = raycaster.intersectObjects(activeTargets, true);
    const interactionHit = hits.map((hit) => {
      let node = hit.object;
      while (node && node !== scene && !node.userData?.interaction) node = node.parent;
      return node?.userData?.interaction ? { hit, node } : null;
    }).find(Boolean);
    if (interactionHit) {
      const { hit, node } = interactionHit;
      const portalGroup = node.userData.interactionPortal || (node === hit.object ? node.parent || node : node);
      beginDoorInteraction(node.userData.interaction, portalGroup);
      return;
    }
    const venueHit = hits.find((hit) => hit.object.userData?.venueId);
    if (venueHit) {
      const venueGroup = venueHit.object.parent?.userData?.venueId ? venueHit.object.parent : venueHit.object;
      setSafeWalkTarget(venueGroup.position.x - 2.2, venueGroup.position.z + 2.2, 4.5);
      pendingInteraction = null;
      onVenueSelect?.(venueHit.object.userData.venueId);
      return;
    }
    if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
      const limit = interiorActive ? 5.8 : 33;
      if (Math.abs(intersection.x) < (interiorActive ? 6.1 : 24) && Math.abs(intersection.z) < limit) {
        if (setSafeWalkTarget(intersection.x, intersection.z, 5.5)) {
          standFromSeat();
          pendingInteraction = null;
        }
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
    if (activeFlight || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
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
    if (activeFlight) camera.updateProjectionMatrix();
    else if (interiorActive) fitInteriorCameraFov();
    else camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(root);
  resize();

  let frame = 0;
  let lastLightingMinute = -1;
  const skyDay = new THREE.Color('#8ccde6');
  const skyDusk = new THREE.Color('#d48a69');
  const skyNight = new THREE.Color('#172435');
  const fogDay = new THREE.Color('#b9d8d6');
  const fogDusk = new THREE.Color('#9a7a75');
  const fogNight = new THREE.Color('#293746');
  const currentSky = new THREE.Color();
  const currentFog = new THREE.Color();
  const clock = new THREE.Clock();
  const updateTimeOfDay = () => {
    const minute = ((Number(worldMinuteRef?.current) || 0) % 1440 + 1440) % 1440;
    if (minute === lastLightingMinute) return;
    lastLightingMinute = minute;
    const hour = minute / 60;
    const solarArc = Math.sin(((hour - 6) / 12) * Math.PI);
    const daylight = clamp((solarArc + 0.06) / 1.06, 0.035, 1);
    const dawn = clamp(1 - Math.abs(hour - 6.5) / 1.8, 0, 1);
    const dusk = clamp(1 - Math.abs(hour - 18) / 1.8, 0, 1);
    const twilight = Math.max(dawn, dusk);
    currentSky.copy(skyNight).lerp(skyDay, daylight);
    currentFog.copy(fogNight).lerp(fogDay, daylight);
    if (twilight > 0) {
      currentSky.lerp(skyDusk, twilight * 0.63);
      currentFog.lerp(fogDusk, twilight * 0.45);
    }
    if (activeFlight) {
      // The flight cutscene owns its sky and horizon while the character is in transit.
    } else if (interiorActive) {
      scene.background.copy(activeInteriorBackdrop);
    } else {
      scene.background.copy(currentSky);
      if (scene.fog) scene.fog.color.copy(currentFog);
    }
    ambientSky.intensity = 0.56 + daylight * 1.52;
    sun.intensity = 0.36 + daylight * 3.42;
    const sunAngle = ((hour - 12) / 12) * Math.PI;
    sun.position.set(Math.cos(sunAngle) * 23, Math.max(3.2, daylight * 31), Math.sin(sunAngle) * 23);
    fill.intensity = 0.22 + daylight * 0.5;
    renderer.toneMappingExposure = 0.95 + daylight * 0.37;
    const lampPower = clamp((0.48 - daylight) * 2.2, 0, 1);
    streetLampFixtures.forEach(({ light, bulb }) => {
      light.intensity = lampPower * 1.45;
      bulb.emissiveIntensity = lampPower * 1.2;
    });
  };
  const updateFlightSequence = (delta, now = performance.now() / 1000) => {
    const flight = activeFlight;
    if (!flight) return;
    const takeoffDuration = 2.35;
    const cruiseDuration = 4.15;
    const landingDuration = 2.35;
    const totalBeforeDeboard = takeoffDuration + cruiseDuration + landingDuration;
    const elapsed = now - flight.startedAt;
    const totalDuration = totalBeforeDeboard + flight.deboardDuration;
    const phase = elapsed < takeoffDuration ? 'takeoff'
      : elapsed < takeoffDuration + cruiseDuration ? 'cruise'
        : elapsed < totalBeforeDeboard ? 'landing' : 'deboarding';
    if (phase !== flight.phase) {
      flight.phase = phase;
      flight.phaseStartedAt = now;
      if (phase === 'deboarding') placeArrivalScene(flight);
      announceFlightPhase(phase, elapsed / totalDuration, flight.request);
      flight.statusUpdatedAt = now;
    }
    const progress = clamp(elapsed / totalDuration, 0, 1);
    if (phase === 'takeoff' && !flight.arrivalStage) {
      const t = clamp(elapsed / takeoffDuration, 0, 1);
      flight.plane.position.set(Math.sin(elapsed * 0.52) * 0.42, 4.8 + t * 1.15, Math.sin(elapsed * 0.3) * 0.3);
      flight.plane.rotation.x = -0.08 - t * 0.07;
      flight.plane.rotation.y = 0.28 + Math.sin(elapsed * 0.7) * 0.04;
      flight.plane.rotation.z = Math.sin(elapsed * 0.55) * 0.025;
    } else if (phase === 'cruise' && !flight.arrivalStage) {
      flight.plane.position.set(Math.sin(elapsed * 0.24) * 0.78, 6.0 + Math.sin(elapsed * 0.9) * 0.12, Math.sin(elapsed * 0.18) * 0.5);
      flight.plane.rotation.x = Math.sin(elapsed * 0.55) * 0.012;
      flight.plane.rotation.y = 0.28 + Math.sin(elapsed * 0.35) * 0.035;
      flight.plane.rotation.z = Math.sin(elapsed * 0.42) * 0.025;
    } else if (phase === 'landing' && !flight.arrivalStage) {
      const t = clamp((elapsed - takeoffDuration - cruiseDuration) / landingDuration, 0, 1);
      flight.plane.position.set(Math.sin(elapsed * 0.35) * 0.5, 6.0 - t * 1.2, Math.cos(elapsed * 0.35) * 0.4);
      flight.plane.rotation.x = 0.035 + t * 0.055;
      flight.plane.rotation.y = 0.28 - t * 0.08;
      flight.plane.rotation.z = Math.sin(elapsed * 0.4) * 0.018;
    } else if (phase === 'deboarding' && flight.arrivalStage) {
      const t = clamp((now - flight.phaseStartedAt) / flight.deboardDuration, 0, 1);
      const eased = t * t * (3 - 2 * t);
      player.position.lerpVectors(flight.avatarStart, flight.avatarEnd, eased);
      player.rotation.y = t > 0.58 ? Math.sin(t * Math.PI) * 0.08 : 0;
      flight.walking = t > 0.035 && t < 0.98;
      if (t >= 1) {
        flight.walking = false;
        finishFlightSequence(flight);
        return;
      }
    }
    if (!flight.arrivalStage) {
      flight.clouds.forEach((cloud, index) => {
        cloud.position.x += delta * (0.8 + (index % 3) * 0.15);
        cloud.position.z -= delta * 0.12;
        if (cloud.position.x > 25) cloud.position.x = -25;
        if (cloud.position.z < -24) cloud.position.z = 24;
      });
    }
    if (now - flight.statusUpdatedAt > 0.55) {
      announceFlightPhase(phase, progress, flight.request);
      flight.statusUpdatedAt = now;
    }
  };
  const animate = () => {
    frame = requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.04);
    const elapsed = clock.elapsedTime;
    updateTimeOfDay();
    updateFlightSequence(delta);
    if (interiorActive && !activeFlight && interiorGroup?.userData.officeFan) interiorGroup.userData.officeFan.rotation.y += delta * 2.7;
    for (const item of traffic) {
      const { x: currentX, z: currentZ } = item.object.position;
      let nextX = currentX;
      let nextZ = currentZ;
      let wrapping = false;
      if (item.axis === 'x') {
        nextX += item.speed * item.dir * delta;
        if (item.dir > 0 && nextX > item.max) { nextX = item.min; wrapping = true; }
        if (item.dir < 0 && nextX < item.min) { nextX = item.max; wrapping = true; }
      } else {
        nextZ += item.speed * item.dir * delta;
        if (item.dir > 0 && nextZ > item.max) { nextZ = item.min; wrapping = true; }
        if (item.dir < 0 && nextZ < item.min) { nextZ = item.max; wrapping = true; }
      }
      const { halfX, halfZ } = worldVehicleFootprint(item.object);
      const blocked = wrapping
        ? aabbBlockedAt(nextX, nextZ, halfX, halfZ, worldColliders)
        : aabbPathBlocked(currentX, currentZ, nextX, nextZ, halfX, halfZ, worldColliders);
      if (!blocked) item.object.position.set(nextX, item.object.position.y, nextZ);
    }
    const pedestrianBlockers = getWorldActorColliders();
    pedestrians.forEach((p) => {
      const phase = elapsed * p.speed + p.phase;
      const walk = Math.sin(phase) * 0.46;
      const targetX = p.startX + (p.walkX ? walk : 0);
      const targetZ = p.startZ + (!p.walkX ? walk : 0);
      const movement = moveCircleSafely(p.object.position, targetX - p.object.position.x, targetZ - p.object.position.z, p.collisionRadius, pedestrianBlockers, worldBounds);
      p.object.userData.walking = movement.moved;
      if (movement.moved) p.object.rotation.y = Math.atan2(movement.x, movement.z);
      p.object.position.y = Math.abs(Math.sin(elapsed * 2.2 + p.phase)) * 0.035;
      p.object.userData.legs?.forEach((leg, index) => {
        leg.rotation.x = movement.moved ? Math.sin(phase + index * Math.PI) * 0.48 : THREE.MathUtils.damp(leg.rotation.x, 0, 8, delta);
      });
      p.object.userData.arms?.forEach((arm, index) => {
        arm.rotation.x = movement.moved ? Math.sin(phase + index * Math.PI + Math.PI) * 0.25 : THREE.MathUtils.damp(arm.rotation.x, 0, 8, delta);
      });
      if (p.object.userData.torso) p.object.userData.torso.position.y = 0.7 + (movement.moved ? Math.abs(Math.sin(phase * 2)) * 0.025 : 0);
    });
    const currentMeeting = meetingRef?.current;
    const meetingIsVisible = Boolean(currentMeeting?.id && ['open', 'closed'].includes(currentMeeting.status));
    meetingStage.visible = meetingIsVisible;
    if (meetingIsVisible) {
      const meetingVenue = WORLD_VENUES.find((item) => item.id === currentMeeting.location?.venueId) || WORLD_VENUES.find((item) => item.id === 'square');
      meetingStage.position.set(meetingVenue.x || 0, 0, meetingVenue.z || 0);
      syncMeetingSeats(currentMeeting, meetingVenue);
      const context = meetingContextRef.current || {};
      const participants = Array.isArray(context.meetingParticipants) ? context.meetingParticipants : [];
      const selfParticipant = participants.find((person) => person.id === context.playerId);
      player.userData.playerId = context.playerId || 'local-player';
      player.userData.playerName = selfParticipant?.name || currentMeeting.hostName || player.userData.playerName || 'Player';
      player.userData.meetingId = selfParticipant?.meetingId || (currentMeeting.status === 'open' ? currentMeeting.id : null);
      player.userData.meetingStatus = selfParticipant?.meetingStatus || (currentMeeting.status === 'open' ? ['at-venue', 'discussion'].includes(context.meetingPhase) ? 'at-venue' : 'en-route' : null);
      player.userData.meetingSlot = Number.isInteger(Number(selfParticipant?.meetingSlot ?? context.meetingSlot)) ? Number(selfParticipant?.meetingSlot ?? context.meetingSlot) : null;
      const messages = Array.isArray(meetingMessagesRef?.current) ? meetingMessagesRef.current : [];
      const latestMessage = [...messages].reverse().find((item) => ['speech', 'reply'].includes(item?.kind) && (item.body || item.message));
      if (latestMessage && latestMessage.id !== lastMeetingMessageId) {
        lastMeetingMessageId = latestMessage.id;
        const speakerName = latestMessage.senderName || latestMessage.name || 'Community speaker';
        const senderSocketId = latestMessage.senderSocketId || null;
        speakingAvatar = senderSocketId === player.userData.playerId || (!senderSocketId && speakerName === player.userData.playerName)
          ? player
          : [...remoteSprites.entries()].find(([id, avatar]) => id === senderSocketId || (!senderSocketId && avatar.userData.playerName === speakerName))?.[1] || null;
        speakingUntil = elapsed + 3.1;
        bubbleUntil = elapsed + 7.5;
        speechBubble.update(speakerName, latestMessage.body || latestMessage.message);
      }
      const bubbleTimeLeft = bubbleUntil - elapsed;
      if (bubbleTimeLeft > 0) {
        if (speakingAvatar) {
          const speakerPosition = new THREE.Vector3();
          speakingAvatar.updateWorldMatrix(true, false);
          speakingAvatar.getWorldPosition(speakerPosition);
          speechBubble.sprite.position.set(speakerPosition.x - meetingVenue.x, speakerPosition.y + 1.9, speakerPosition.z - meetingVenue.z);
        } else speechBubble.sprite.position.set(0, 2.6, 0);
        speechBubble.sprite.visible = true;
        speechBubble.sprite.material.opacity = Math.min(0.98, bubbleTimeLeft < 1.1 ? bubbleTimeLeft / 1.1 : 0.98);
      } else speechBubble.sprite.visible = false;
    } else {
      speechBubble.sprite.visible = false;
      speakingAvatar = null;
      lastMeetingMessageId = null;
      meetingSeats.forEach((chair) => { meetingStage.remove(chair); disposeGroup(chair); });
      meetingSeats.clear();
    }
    const speed = (interiorActive ? 5.8 : 7.2) * delta;
    let dx = 0;
    let dz = 0;
    if (keyState.has('w') || keyState.has('arrowup')) dz -= 1;
    if (keyState.has('s') || keyState.has('arrowdown')) dz += 1;
    if (keyState.has('a') || keyState.has('arrowleft')) dx -= 1;
    if (keyState.has('d') || keyState.has('arrowright')) dx += 1;
    const playerRadius = 0.5;
    const movementColliders = activeCollisionRects();
    const movementBounds = activeWorldBounds();
    let playerMoved = false;
    if (dx || dz) {
      standFromSeat();
      const len = Math.hypot(dx, dz) || 1;
      const movement = moveCircleSafely(player.position, (dx / len) * speed, (dz / len) * speed, playerRadius, movementColliders, movementBounds);
      playerMoved = movement.moved;
      if (movement.moved) player.rotation.y = Math.atan2(movement.x, movement.z);
      isMoving = false;
      movementWaypoints = [];
      movementWaypointIndex = 0;
      pendingInteraction = null;
    } else if (isMoving) {
      const waypoint = movementWaypoints[movementWaypointIndex] || { x: moveTarget.x, z: moveTarget.z };
      const remainingX = waypoint.x - player.position.x;
      const remainingZ = waypoint.z - player.position.z;
      const remaining = Math.hypot(remainingX, remainingZ);
      const scale = remaining > 1e-6 ? Math.min(1, (speed * 0.8) / remaining) : 1;
      const movement = moveCircleSafely(player.position, remainingX * scale, remainingZ * scale, playerRadius, movementColliders, movementBounds);
      playerMoved = movement.moved;
      if (movement.moved) player.rotation.y = Math.atan2(movement.x, movement.z);
      const distanceToWaypoint = Math.hypot(waypoint.x - player.position.x, waypoint.z - player.position.z);
      if (distanceToWaypoint < 0.06) {
        if (movementWaypointIndex < movementWaypoints.length - 1) {
          movementWaypointIndex += 1;
        } else if (Math.hypot(moveTarget.x - player.position.x, moveTarget.z - player.position.z) < 0.06
          && !circleBlockedAt(moveTarget.x, moveTarget.z, playerRadius, movementColliders)) {
          isMoving = false;
          movementWaypoints = [];
          movementWaypointIndex = 0;
          if (pendingInteraction) completeInteriorInteraction(pendingInteraction);
        }
      } else if (!movement.moved) {
        const retryPath = findWalkPath(player.position, moveTarget, playerRadius, movementColliders, movementBounds);
        if (retryPath?.length) {
          movementWaypoints = retryPath;
          movementWaypointIndex = 0;
        } else {
          isMoving = false;
          movementWaypoints = [];
          movementWaypointIndex = 0;
          pendingInteraction = null;
        }
      }
    }
    if (activeMeetingRoute && !activeMeetingRoute.confirmed && activeMeetingRoute.meetingId === currentMeeting?.id
      && Math.hypot(player.position.x - activeMeetingRoute.target.x, player.position.z - activeMeetingRoute.target.z) < 0.36) {
      activeMeetingRoute.confirmed = true;
      isMoving = false; movementWaypoints = []; movementWaypointIndex = 0; pendingInteraction = null;
      const venue = WORLD_VENUES.find((item) => item.id === activeMeetingRoute.venueId) || WORLD_VENUES.find((item) => item.id === 'square');
      player.rotation.y = Math.atan2(venue.x - player.position.x, venue.z - player.position.z);
      meetingContextRef.current?.onMeetingArrival?.(activeMeetingRoute.meetingId);
    }
    const walkingNow = playerMoved || Boolean(activeFlight?.walking);
    // Meeting attendance can outlive a movement update; only use the seated pose while physically at that attendee's chair.
    const playerSeatedAtMeeting = Boolean(!walkingNow && !isMoving && meetingParticipantIsAtSeat(player, currentMeeting));
    const playerSeatedInOffice = Boolean(interiorActive && seatedInteriorSeatId);
    const playerSeated = playerSeatedAtMeeting || playerSeatedInOffice;
    const playerIsSpeaking = speakingAvatar === player && elapsed < speakingUntil;
    player.userData.legs?.forEach((leg, index) => {
      leg.rotation.x = walkingNow ? Math.sin(elapsed * 11 + index * Math.PI) * 0.52 : THREE.MathUtils.damp(leg.rotation.x, playerSeated ? -1.12 : 0, 8, delta);
    });
    player.userData.arms?.forEach((arm, index) => {
      arm.rotation.x = walkingNow ? Math.sin(elapsed * 11 + index * Math.PI + Math.PI) * 0.25 : THREE.MathUtils.damp(arm.rotation.x, playerSeatedInOffice ? (index === 0 ? -0.08 : 0.08) : 0, 8, delta);
      arm.rotation.z = THREE.MathUtils.damp(arm.rotation.z, playerIsSpeaking && index === 0 ? -0.5 - Math.max(0, Math.sin(elapsed * 7.4)) * 0.55 : 0, 8, delta);
    });
    if (player.userData.head) {
      player.userData.head.position.y = THREE.MathUtils.damp(player.userData.head.position.y, playerSeatedInOffice ? 1.11 : 1.25, 8, delta);
      player.userData.head.rotation.x = playerIsSpeaking ? Math.sin(elapsed * 4.2) * 0.075 : THREE.MathUtils.damp(player.userData.head.rotation.x, 0, 6, delta);
    }
    if (player.userData.neck) player.userData.neck.position.y = THREE.MathUtils.damp(player.userData.neck.position.y, playerSeatedInOffice ? 0.99 : 1.11, 8, delta);
    if (player.userData.torso) {
      const torsoTarget = playerSeatedInOffice ? 0.59 : playerSeatedAtMeeting ? 0.735 : 0.7;
      player.userData.torso.position.y = walkingNow ? 0.7 + Math.abs(Math.sin(elapsed * 11 * 2)) * 0.03 : THREE.MathUtils.damp(player.userData.torso.position.y, torsoTarget, 8, delta);
    }
    if ((!interiorActive || interiorGroup?.userData?.interiorKind === 'stadium') && !isFocusingCamera) {
      const followDelta = new THREE.Vector3(player.position.x - previousPlayerPosition.x, 0, player.position.z - previousPlayerPosition.z);
      if (followDelta.lengthSq() > 0) { camera.position.add(followDelta); controls.target.add(followDelta); }
    }
    previousPlayerPosition.copy(player.position);
    if (elapsed - lastEmit > 0.18) {
      lastEmit = elapsed;
      if (!interiorActive) playerRef.current = { x: player.position.x, z: player.position.z, heading: player.rotation.y };
    }
    updateRemotePlayers(remoteRef.current);
    for (const avatar of remoteSprites.values()) {
      const avatarSeatedAtMeeting = !avatar.userData.walking && meetingParticipantIsAtSeat(avatar, currentMeeting);
      const avatarIsSpeaking = speakingAvatar === avatar && elapsed < speakingUntil;
      avatar.userData.legs?.forEach((leg, index) => {
        leg.rotation.x = avatar.userData.walking ? Math.sin(elapsed * 9.5 + index * Math.PI) * 0.44 : THREE.MathUtils.damp(leg.rotation.x, avatarSeatedAtMeeting ? -1.12 : 0, 8, delta);
      });
      avatar.userData.arms?.forEach((arm, index) => {
        arm.rotation.x = avatar.userData.walking ? Math.sin(elapsed * 9.5 + index * Math.PI + Math.PI) * 0.22 : THREE.MathUtils.damp(arm.rotation.x, 0, 8, delta);
        arm.rotation.z = THREE.MathUtils.damp(arm.rotation.z, avatarIsSpeaking && index === 0 ? -0.5 - Math.max(0, Math.sin(elapsed * 7.4)) * 0.55 : 0, 8, delta);
      });
      if (avatar.userData.head) avatar.userData.head.rotation.x = avatarIsSpeaking ? Math.sin(elapsed * 4.2) * 0.075 : THREE.MathUtils.damp(avatar.userData.head.rotation.x, 0, 6, delta);
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
    if (meetingTravelRef?.current === travelToMeeting) meetingTravelRef.current = null;
    if (partyFocusRef) partyFocusRef.current = null;
    if (exitInteriorRef) exitInteriorRef.current = null;
    if (executiveFocusRef) executiveFocusRef.current = null;
    if (planeBoardActionRef) planeBoardActionRef.current = null;
    if (flightActionRef) flightActionRef.current = null;
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

export default function World({ state, locality = null, locationKey = 'state-capital', selectedVenueId = 'square', focusRequest = 0, onVenueSelect, onMove, remotePlayers = [], playerColor = '#d8f36b', playerAppearance = {}, propertyProfile = {}, propertyOwner = 'PLAYER', worldMinute = 942, meeting = null, meetingMessages = [], meetingParticipants = [], meetingPhase = 'idle', meetingSlot = null, playerId = 'local-player', onMeetingArrival, partyOfficeActionRef, planeBoardActionRef, exitInteriorActionRef, executiveFocusRef, onInteriorChange, onInteriorAction, flightCommand = null, onFlightPhase, onFlightComplete }) {
  const mountRef = useRef(null);
  const positionRef = useRef({ x: -5.8, z: 3.5, heading: 0 });
  const worldMinuteRef = useRef(worldMinute);
  worldMinuteRef.current = worldMinute;
  const remoteRef = useRef(remotePlayers);
  const moveCallbackRef = useRef(onMove);
  const venueCallbackRef = useRef(onVenueSelect);
  const meetingRef = useRef(meeting);
  const meetingMessagesRef = useRef(meetingMessages);
  const meetingContextRef = useRef(null);
  const meetingTravelRef = useRef(null);
  const focusRef = useRef(null);
  const hasMountedFocusRef = useRef(false);
  const interiorChangeRef = useRef(onInteriorChange);
  const interiorActionRef = useRef(onInteriorAction);
  const flightActionRef = useRef(null);
  const flightPhaseRef = useRef(onFlightPhase);
  const flightCompleteRef = useRef(onFlightComplete);
  const propertyProfileRef = useRef(propertyProfile);
  const propertyOwnerRef = useRef(propertyOwner);
  const lastFlightCommandIdRef = useRef(null);
  const [worldError, setWorldError] = useState(false);
  remoteRef.current = remotePlayers;
  moveCallbackRef.current = onMove;
  venueCallbackRef.current = onVenueSelect;
  meetingRef.current = meeting;
  meetingMessagesRef.current = meetingMessages;
  meetingContextRef.current = { playerId, meetingSlot, meetingPhase, meetingParticipants, onMeetingArrival };
  interiorChangeRef.current = onInteriorChange;
  interiorActionRef.current = onInteriorAction;
  flightPhaseRef.current = onFlightPhase;
  flightCompleteRef.current = onFlightComplete;
  propertyProfileRef.current = propertyProfile;
  propertyOwnerRef.current = propertyOwner;

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
        playerAppearance,
        worldMinuteRef,
        meetingRef,
        meetingMessagesRef,
        meetingContextRef,
        meetingTravelRef,
        focusRef,
        partyOfficeActionRef,
        exitInteriorActionRef,
        interiorChangeRef,
        executiveFocusRef,
        interiorActionRef,
        planeBoardActionRef,
        flightActionRef,
        propertyProfileRef,
        propertyOwnerRef,
        flightPhaseRef,
        flightCompleteRef,
      );
      return cleanup;
    } catch (error) {
      console.error('NIGERIA 2027 3D scene failed to initialize:', error);
      setWorldError(true);
      return undefined;
    }
  }, [state, playerColor, playerAppearance?.skinTone, playerAppearance?.headStyle, playerAppearance?.outfitColor, locationKey]);

  useEffect(() => {
    if (!flightCommand?.id) { lastFlightCommandIdRef.current = null; return; }
    if (lastFlightCommandIdRef.current === flightCommand.id) return;
    lastFlightCommandIdRef.current = flightCommand.id;
    flightActionRef.current?.(flightCommand);
  }, [flightCommand?.id]);

  useEffect(() => {
    if (!hasMountedFocusRef.current) { hasMountedFocusRef.current = true; return; }
    if (meeting?.id) {
      if (meeting.status === 'open' && meetingPhase === 'en-route') meetingTravelRef.current?.({ meetingId: meeting.id, venueId: meeting.location?.venueId || 'square', playerId, slot: meetingSlot });
      return;
    }
    if (selectedVenueId) focusRef.current?.(selectedVenueId);
  }, [selectedVenueId, focusRequest, meeting?.id, meeting?.status, meeting?.location?.venueId, meetingPhase, meetingSlot, playerId]);

  useEffect(() => {
    const travel = meetingTravelRef.current;
    if (!travel) return;
    if (meeting?.id && meeting.status === 'open' && meetingPhase === 'en-route') {
      travel({ meetingId: meeting.id, venueId: meeting.location?.venueId || 'square', playerId, slot: meetingSlot });
    } else travel(null);
  }, [meeting?.id, meeting?.status, meeting?.location?.venueId, meetingPhase, meetingSlot, playerId, locationKey, focusRequest]);

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

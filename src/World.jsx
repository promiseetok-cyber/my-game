import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STATES, WORLD_VENUES } from './data.js';

const PALETTES = {
  coastal: { grass: '#859b7a', sand: '#c6b18a', water: '#5d9290', foliage: '#53745a' },
  southwest: { grass: '#93a87b', sand: '#c7b58c', water: '#789a89', foliage: '#55765a' },
  southeast: { grass: '#8ba67c', sand: '#c9b38b', water: '#6b9690', foliage: '#4f7659' },
  northcentral: { grass: '#a9a17b', sand: '#d0ba8e', water: '#7a988e', foliage: '#667852' },
  northeast: { grass: '#b4a17a', sand: '#d7bd91', water: '#7c9585', foliage: '#667552' },
  northwest: { grass: '#b6a17b', sand: '#d6b887', water: '#7e9582', foliage: '#687553' },
};

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

function makeBuilding(rand, x, z, index, palette) {
  const group = new THREE.Group();
  const w = 2.1 + rand() * 2.5;
  const d = 2.2 + rand() * 2.3;
  const floors = 1 + Math.floor(rand() * 4);
  const h = 1.6 + floors * 0.78;
  const wallColors = ['#dfc9a6', '#d8c6ac', '#b7c7ae', '#d8b7a7', '#d9d5be', '#b2c0b5', '#c5bba7', '#e0d2b7'];
  const wall = box(w, h, d, wallColors[Math.floor(rand() * wallColors.length)]);
  wall.position.y = h / 2;
  group.add(wall);
  const roof = box(w + 0.12, 0.18, d + 0.12, ['#655c4f', '#716a5d', '#535d56'][index % 3]);
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
  const awningColor = ['#d86f4c', '#eab94b', '#4d9980', '#577aaf'][Math.floor(rand() * 4)];
  if (rand() > 0.38) {
    const awning = box(w * 0.85, 0.16, 0.36, awningColor, { castShadow: false });
    awning.position.set(0, 0.92, d / 2 + 0.12);
    group.add(awning);
  }
  const windowMat = new THREE.MeshStandardMaterial({ color: rand() > 0.65 ? '#d3e0ca' : '#41534e', roughness: 0.42, metalness: 0.12 });
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
    const compoundColor = ['#c8b99f', '#b7b09b', '#c7b99f'][index % 3];
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
  group.position.set(x, 0, z);
  group.userData.groundHeight = palette.grass;
  return group;
}

function makeCar(color, kind = 'sedan', accent = '#f1d846') {
  const g = new THREE.Group();
  const bodyLength = kind === 'bus' ? 1.9 : kind === 'keke' ? 1.12 : 1.45;
  const bodyWidth = kind === 'keke' ? 0.7 : 0.9;
  const body = box(bodyLength, kind === 'bus' ? 0.55 : 0.35, bodyWidth, color, { roughness: 0.47, metalness: 0.08 });
  body.position.y = kind === 'bus' ? 0.55 : 0.42;
  g.add(body);
  const cabin = box(kind === 'bus' ? 1.2 : 0.73, 0.42, bodyWidth * 0.83, kind === 'bus' ? '#d5d3bd' : '#303f3e', { roughness: 0.34, metalness: 0.08 });
  cabin.position.set(-0.08, kind === 'bus' ? 1.0 : 0.72, 0);
  g.add(cabin);
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#202522', roughness: 0.97 });
  for (const x of [-bodyLength * 0.32, bodyLength * 0.32]) {
    for (const z of [-bodyWidth * 0.51, bodyWidth * 0.51]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 9), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.2, z);
      g.add(wheel);
    }
  }
  if (kind === 'bus') {
    for (let i = 0; i < 3; i += 1) {
      const stripe = box(0.43, 0.05, 0.92, i === 1 ? accent : '#213b32', { castShadow: false });
      stripe.position.set(-0.47 + i * 0.45, 0.79, 0);
      g.add(stripe);
    }
  }
  if (kind === 'keke') {
    const hood = box(0.38, 0.3, 0.64, '#e6cf55');
    hood.position.set(0.5, 0.5, 0);
    g.add(hood);
    const roof = box(0.76, 0.09, 0.72, '#387a55');
    roof.position.set(-0.05, 1.02, 0);
    g.add(roof);
  }
  g.castShadow = true;
  return g;
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

function makePerson(shirt = '#f3a17b', skin = '#7d5138') {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 3, 6), new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.82 }));
  torso.position.y = 0.62;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.86 }));
  head.position.y = 1.14;
  head.castShadow = true;
  group.add(head);
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.43, 7), new THREE.MeshStandardMaterial({ color: '#363f38', roughness: 0.95 }));
  legs.position.y = 0.22;
  group.add(legs);
  return group;
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

function buildWorld(root, state, onVenueSelect, playerRef, remoteRef, playerColor, touchRef, focusRef) {
  const stateInfo = STATES.find((item) => item.name === state) || STATES[0];
  const palette = PALETTES[stateInfo.terrain] || PALETTES.coastal;
  const rand = seeded(hash(`${stateInfo.name}/${stateInfo.capital}`));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b8c4ac');
  scene.fog = new THREE.Fog('#b8c4ac', 42, 94);

  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 150);
  camera.position.set(26, 28, 31);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-label', `Interactive 3D map of ${stateInfo.capital}, ${stateInfo.name}`);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.style.touchAction = 'none';
  root.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight('#e6f4df', '#6c6954', 1.75));
  const sun = new THREE.DirectionalLight('#fff2d7', 3.1);
  sun.position.set(-14, 27, 15);
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

  const asphaltMat = new THREE.MeshStandardMaterial({ color: '#46504b', roughness: 0.91 });
  const curbMat = new THREE.MeshStandardMaterial({ color: '#d8c9a3', roughness: 0.91 });
  const roads = [
    { axis: 'x', at: 0, width: 4.1, length: 52 },
    { axis: 'z', at: 0, width: 4.1, length: 52 },
    { axis: 'x', at: 12.5, width: 2.35, length: 52 },
    { axis: 'z', at: -13.2, width: 2.35, length: 52 },
  ];
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
    crossingA.position.set(-3.25 + stripe * 0.66, 0.012, 0);
    scene.add(crossingA);
    const crossingB = box(3.6, 0.025, 0.34, '#e3ddc7', { castShadow: false });
    crossingB.position.set(12.5, 0.012, -11.15 + stripe * 0.66);
    scene.add(crossingB);
  }
  for (const side of [-1, 1]) {
    const drain = box(48, 0.08, 0.18, '#454e47', { castShadow: false });
    drain.position.set(0, -0.045, side * 2.34);
    scene.add(drain);
  }
  for (let bump = -4; bump <= 4; bump += 1) {
    const marker = box(0.3, 0.085, 0.2, bump % 2 === 0 ? '#e6cb60' : '#39433d', { castShadow: false });
    marker.position.set(6.3, 0.045, bump * 0.38);
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
  makeBusStop(scene, 8.6, 1.6);

  const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: '#c9b996', roughness: 0.94 });
  for (const point of [-4.5, 4.5]) {
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
  makeFlyover(scene, sceneMaterials);

  const buildingPalette = [];
  const blocks = [-17.8, -11.8, -5.8, 5.8, 11.8, 17.8];
  let buildingIndex = 0;
  for (const zBlock of blocks) {
    for (const xBlock of blocks) {
      if (Math.abs(xBlock) < 8 && Math.abs(zBlock) < 8) continue;
      if (Math.abs(zBlock + 10.5) < 4.8) continue;
      const count = 1 + Math.floor(rand() * 2);
      for (let i = 0; i < count; i += 1) {
        const offsetX = (rand() - 0.5) * 2.0;
        const offsetZ = (rand() - 0.5) * 2.0;
        const building = makeBuilding(rand, xBlock + offsetX, zBlock + offsetZ, buildingIndex, palette);
        const s = 0.75 + rand() * 0.35;
        building.scale.setScalar(s);
        scene.add(building);
        buildingIndex += 1;
      }
    }
  }
  // A few detached homes and workshops keep the neighbourhood from feeling like a grid.
  for (let i = 0; i < 11; i += 1) {
    const x = (rand() - 0.5) * 31;
    const z = (rand() - 0.5) * 31;
    if (Math.abs(x) < 5.5 || Math.abs(z) < 5.5) continue;
    if (Math.abs(z + 10.5) < 4.5) continue;
    scene.add(makeBuilding(rand, x, z, buildingIndex++, palette));
  }

  // Small green pockets, trees, kiosks, and benches.
  for (let i = 0; i < 25; i += 1) {
    const x = (rand() - 0.5) * 37;
    const z = (rand() - 0.5) * 37;
    if (Math.abs(x) < 4.6 || Math.abs(z) < 4.6 || Math.abs(z + 10.5) < 3.1) continue;
    if (Math.abs(x) > 22 || Math.abs(z) > 22) continue;
    const southernTerrain = ['coastal', 'southwest', 'southeast'].includes(stateInfo.terrain);
    const usePalm = southernTerrain && rand() > 0.72;
    const tree = usePalm
      ? makePalmTree(x, z, 3.2 + rand() * 1.8, palette.foliage)
      : makeTree(x, z, 1.9 + rand() * 1.7, palette.foliage, sceneMaterials);
    tree.scale.setScalar(0.73 + rand() * 0.42);
    scene.add(tree);
  }

  for (const venue of WORLD_VENUES) scene.add(makeVenue(venue, palette, sceneMaterials, stateInfo.name));

  // A roadside gateway gives the current capital a distinct sense of place without claiming to be a full survey map.
  const gate = new THREE.Group();
  const signFrame = box(0.22, 2.1, 0.22, '#685e4c');
  signFrame.position.set(-18, 1.05, 0);
  gate.add(signFrame);
  const sign = box(4.2, 0.9, 0.24, '#294b3a');
  sign.position.set(-15.8, 2.1, 0);
  gate.add(sign);
  const signText = labelSprite(`${stateInfo.capital} • ${stateInfo.name}`, '#d8f36b');
  signText.position.set(-15.8, 2.16, 0.18);
  signText.scale.set(4.05, 0.96, 1);
  gate.add(signText);
  scene.add(gate);

  const traffic = [];
  const routeBrands = ['#e7c642', '#41a37f', '#537fbd', '#d66b51', '#e8a845', '#b66d9f'];
  const routeBrand = routeBrands[hash(stateInfo.name) % routeBrands.length];
  const routeAccent = ['#203b32', '#f2d95d', '#efe5ce', '#263a57', '#f3ead5', '#283a32'][hash(stateInfo.name) % 6];
  const cars = [
    [routeBrand, 'bus', -18, -0.82, 1.05],
    ['#3c88bc', 'sedan', -4, 0.76, 1.38],
    ['#eee2c0', 'sedan', 10, -0.76, 1.18],
    ['#d86644', 'bus', 19, 0.76, 0.8],
  ];
  cars.forEach(([color, type, x, z, speed], i) => {
    const car = makeCar(color, type, routeAccent);
    car.position.set(x, 0, z);
    if ((i % 2) === 0) car.rotation.y = Math.PI;
    scene.add(car);
    traffic.push({ object: car, axis: 'x', speed, min: -25, max: 25, dir: (i % 2) === 0 ? 1 : -1 });
  });
  const verticalCars = [
    [routeBrand, 'keke', 0.72, -17, 1.05],
    ['#ddd9ca', 'sedan', -0.7, 18, 1.12],
    [routeAccent, 'keke', 12.8, -18, 0.82],
  ];
  verticalCars.forEach(([color, type, x, z, speed], i) => {
    const car = makeCar(color, type);
    car.position.set(x, 0, z);
    car.rotation.y = Math.PI / 2 * (i % 2 === 0 ? 1 : -1);
    scene.add(car);
    traffic.push({ object: car, axis: 'z', speed, min: -25, max: 25, dir: i % 2 === 0 ? 1 : -1 });
  });

  const pedestrians = [];
  const clothing = ['#df8066', '#527c6e', '#d4b750', '#657ca0', '#b87c49', '#9b87ba'];
  for (let i = 0; i < 19; i += 1) {
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
      avatar.position.set(clamp(Number(item.x) || 0, -22, 22), 0, clamp(Number(item.z) || 0, -22, 22));
    }
    for (const [id, avatar] of remoteSprites.entries()) {
      if (!presentIds.has(id)) {
        remoteGroup.remove(avatar);
        remoteSprites.delete(id);
      }
    }
  };

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.35, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.minDistance = 12;
  controls.maxDistance = 62;
  controls.maxPolarAngle = Math.PI / 2.18;
  controls.minPolarAngle = Math.PI / 5;
  controls.enablePan = true;
  controls.panSpeed = 0.55;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.75;
  controls.update();

  const clickable = [];
  scene.traverse((object) => {
    if (object.userData?.isHotspot || object.userData?.venueId) clickable.push(object);
  });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const moveTarget = new THREE.Vector3(-5.8, 0, 3.5);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersection = new THREE.Vector3();
  let isMoving = false;
  let lastEmit = 0;
  let activePointer = null;
  let isFocusingCamera = false;
  const cameraFocusTarget = new THREE.Vector3();
  const cameraFocusPosition = new THREE.Vector3();
  const focusVenue = (venueId) => {
    const venue = WORLD_VENUES.find((item) => item.id === venueId);
    if (!venue) return;
    moveTarget.set(clamp(venue.x - 2.5, -20, 20), 0, clamp(venue.z + 3.0, -20, 20));
    isMoving = true;
    cameraFocusTarget.set(venue.x, 0.35, venue.z);
    cameraFocusPosition.set(venue.x + 12.5, 14.5, venue.z + 13.5);
    isFocusingCamera = true;
  };
  if (focusRef) focusRef.current = focusVenue;

  const setTargetFromEvent = (event) => {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickable, true);
    const venueHit = hits.find((hit) => hit.object.userData?.venueId);
    if (venueHit) {
      const venueGroup = venueHit.object.parent?.userData?.venueId ? venueHit.object.parent : venueHit.object;
      moveTarget.set(clamp(venueGroup.position.x - 2.2, -20, 20), 0, clamp(venueGroup.position.z + 2.2, -20, 20));
      isMoving = true;
      onVenueSelect?.(venueHit.object.userData.venueId);
      return;
    }
    if (raycaster.ray.intersectPlane(groundPlane, intersection) && Math.abs(intersection.x) < 22 && Math.abs(intersection.z) < 22) {
      moveTarget.set(intersection.x, 0, intersection.z);
      isMoving = true;
    }
  };
  const onPointerDown = (event) => { isFocusingCamera = false; activePointer = { x: event.clientX, y: event.clientY, id: event.pointerId }; };
  const onPointerUp = (event) => {
    if (!activePointer || activePointer.id !== event.pointerId) return;
    const moved = Math.hypot(event.clientX - activePointer.x, event.clientY - activePointer.y);
    if (moved < 5) setTargetFromEvent(event);
    activePointer = null;
  };
  const keyState = new Set();
  const onKeyDown = (event) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) {
      keyState.add(event.key.toLowerCase());
      event.preventDefault();
    }
  };
  const onKeyUp = (event) => keyState.delete(event.key.toLowerCase());
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
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
      const walk = Math.sin(elapsed * p.speed + p.phase) * 0.46;
      p.object.position.x = p.startX + (p.walkX ? walk : 0);
      p.object.position.z = p.startZ + (!p.walkX ? walk : 0);
      p.object.position.y = Math.abs(Math.sin(elapsed * 2.2 + p.phase)) * 0.035;
    });
    const speed = 7.2 * delta;
    let dx = 0;
    let dz = 0;
    if (keyState.has('w') || keyState.has('arrowup')) dz -= 1;
    if (keyState.has('s') || keyState.has('arrowdown')) dz += 1;
    if (keyState.has('a') || keyState.has('arrowleft')) dx -= 1;
    if (keyState.has('d') || keyState.has('arrowright')) dx += 1;
    const touch = touchRef.current || { x: 0, z: 0 };
    if (Math.hypot(touch.x, touch.z) > 0.04) { dx += touch.x; dz += touch.z; }
    if (dx || dz) {
      const len = Math.hypot(dx, dz) || 1;
      player.position.x = clamp(player.position.x + (dx / len) * speed, -22, 22);
      player.position.z = clamp(player.position.z + (dz / len) * speed, -22, 22);
      isMoving = false;
    } else if (isMoving) {
      const difference = new THREE.Vector3(moveTarget.x - player.position.x, 0, moveTarget.z - player.position.z);
      if (difference.length() < speed * 1.25) {
        player.position.x = moveTarget.x;
        player.position.z = moveTarget.z;
        isMoving = false;
      } else {
        difference.normalize().multiplyScalar(speed * 0.8);
        player.position.add(difference);
      }
    }
    player.rotation.y = Math.sin(elapsed * 0.65) * 0.055;
    if (elapsed - lastEmit > 0.18) {
      lastEmit = elapsed;
      playerRef.current = { x: player.position.x, z: player.position.z };
    }
    updateRemotePlayers(remoteRef.current);
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
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
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

export default function World({ state, selectedVenueId = 'square', focusRequest = 0, onVenueSelect, onMove, remotePlayers = [], playerColor = '#d8f36b' }) {
  const mountRef = useRef(null);
  const positionRef = useRef({ x: -5.8, z: 3.5 });
  const remoteRef = useRef(remotePlayers);
  const moveCallbackRef = useRef(onMove);
  const venueCallbackRef = useRef(onVenueSelect);
  const touchRef = useRef({ x: 0, z: 0 });
  const focusRef = useRef(null);
  const stickPointerRef = useRef(null);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const [worldError, setWorldError] = useState(false);
  remoteRef.current = remotePlayers;
  moveCallbackRef.current = onMove;
  venueCallbackRef.current = onVenueSelect;

  const updateStick = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = Math.min(bounds.width, bounds.height) * 0.34;
    const rawX = event.clientX - (bounds.left + bounds.width / 2);
    const rawY = event.clientY - (bounds.top + bounds.height / 2);
    const length = Math.hypot(rawX, rawY) || 1;
    const scale = Math.min(1, radius / length);
    const x = rawX * scale;
    const y = rawY * scale;
    touchRef.current = { x: x / radius, z: y / radius };
    setStickOffset({ x, y });
  };
  const onStickDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    stickPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateStick(event);
  };
  const onStickMove = (event) => {
    if (stickPointerRef.current === event.pointerId) updateStick(event);
  };
  const onStickRelease = (event) => {
    if (stickPointerRef.current !== event.pointerId) return;
    stickPointerRef.current = null;
    touchRef.current = { x: 0, z: 0 };
    setStickOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!mountRef.current) return undefined;
    setWorldError(false);
    try {
      const cleanup = buildWorld(
        mountRef.current,
        state,
        (id) => venueCallbackRef.current?.(id),
        positionRef,
        remoteRef,
        playerColor,
        touchRef,
        focusRef,
      );
      focusRef.current?.(selectedVenueId);
      return cleanup;
    } catch (error) {
      console.error('NIGERIA 2027 3D scene failed to initialize:', error);
      setWorldError(true);
      return undefined;
    }
  }, [state, playerColor]);

  useEffect(() => {
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
      <div className="mobile-controls">
        <div className="mobile-move-label">MOVE</div>
        <div
          className="virtual-stick"
          role="application"
          aria-label="Virtual joystick. Drag in any direction to move your candidate."
          onPointerDown={onStickDown}
          onPointerMove={onStickMove}
          onPointerUp={onStickRelease}
          onPointerCancel={onStickRelease}
          onLostPointerCapture={onStickRelease}
        >
          <span className="stick-groove stick-groove-x" />
          <span className="stick-groove stick-groove-y" />
          <span className="stick-center" />
          <span className="virtual-stick-thumb" style={{ transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)` }} />
        </div>
        <div className="mobile-move-foot">DRAG TO WALK</div>
      </div>
    </div>
  );
}

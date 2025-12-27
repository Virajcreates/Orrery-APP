import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { format } from 'date-fns';
import gsap from 'gsap';
import { PLANETS } from './planets.js';
import { calculatePosition } from './physics.js';

// --- Configuration ---
const CONFIG = {
    sunSize: 2,
    orbitScale: 10,
    planetScale: 1,
    timeScale: 1,
    isPaused: false,
    date: new Date(),
    showLabels: true
};

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 50, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffff, 2, 500, 1);
scene.add(sunLight);

// --- Texture Loader ---
const textureLoader = new THREE.TextureLoader();
const texturePath = '/textures/';

// --- Objects ---
// 1. Stars (Procedural Starfield)
function createStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 10000;
    const posArray = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i++) {
        // Random position in a sphere roughly
        posArray[i] = (Math.random() - 0.5) * 2000; // Spread out to 2000 units
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const starMat = new THREE.PointsMaterial({
        size: 0.7, // Small sharp points
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });

    const starMesh = new THREE.Points(starGeo, starMat);
    return starMesh;
}

const stars = createStarfield();
scene.add(stars);
scene.background = new THREE.Color(0x000000); // Pitch black void

// 2. Sun
const sunGeo = new THREE.SphereGeometry(CONFIG.sunSize, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ map: textureLoader.load(texturePath + 'sun.jpg') });
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.userData = { name: "Sun", type: "Star", distance: "0 AU", desc: "The Sun.", isInteractable: true };
scene.add(sun);

// 3. Planets
const planetMeshes = [];
PLANETS.forEach(data => {
    // System Group (Moves around Sun)
    const systemGroup = new THREE.Object3D();
    scene.add(systemGroup);

    const size = Math.max(0.2, data.size * 0.3 * CONFIG.planetScale);
    const geo = new THREE.SphereGeometry(size, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
        map: textureLoader.load(texturePath + data.texture),
        roughness: 0.8
    });
    const mesh = new THREE.Mesh(geo, mat);
    // Planet rotates on its own axis, child of systemGroup
    systemGroup.add(mesh);

    // Data association
    mesh.userData = { ...data, isPlanet: true, isInteractable: true, parentSystem: systemGroup };

    // Rings
    if (data.hasRings) {
        const ringGeo = new THREE.RingGeometry(size * 1.4, size * 2.2, 32);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xAA8866, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        systemGroup.add(ring);
    }

    // Label
    const div = document.createElement('div');
    div.className = 'planet-label';
    div.textContent = data.name;
    const label = new CSS2DObject(div);
    systemGroup.add(label);
    label.position.set(0, size + 0.5, 0);

    // Orbit Line (Sun Orbit)
    const points = [];
    const orbitDate = new Date(CONFIG.date);
    const periodDays = data.elements.period * 365.25;
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps * periodDays;
        const simDate = new Date(orbitDate.getTime() + t * 24 * 60 * 60 * 1000);
        const pos = calculatePosition(data.elements, simDate);
        points.push(new THREE.Vector3(pos.x * CONFIG.orbitScale, pos.y * CONFIG.orbitScale, pos.z * CONFIG.orbitScale));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);

    // Moons
    const moonMeshes = [];
    if (data.moons) {
        // Calculate min/max real distances to normalize orbits
        const minRealDist = Math.min(...data.moons.map(m => m.distance));
        const maxRealDist = Math.max(...data.moons.map(m => m.distance));
        const rangeReal = maxRealDist - minRealDist;

        data.moons.forEach(moonData => {
            const mSize = Math.max(0.05, moonData.size * 0.3 * CONFIG.planetScale);
            const mGeo = new THREE.SphereGeometry(mSize, 16, 16);
            const mMat = new THREE.MeshStandardMaterial({
                color: moonData.color,
                roughness: 0.9,
                map: moonData.texture ? textureLoader.load("/textures/" + moonData.texture) : null
            });
            const mMesh = new THREE.Mesh(mGeo, mMat);

            // Calculate Visual Distance (Clamped range relative to planet size)
            // Range: 1.8x to 3.5x Planet Radius (mesh size) determined earlier 'size'
            // If only one moon, use 2.5x
            let visualDist;
            if (data.moons.length === 1 || rangeReal === 0) {
                visualDist = size * 2.5;
                // Ensure a minimum visual distance so small planets don't clip lines
                if (visualDist < 0.5) visualDist = 0.5;
            } else {
                const norm = (moonData.distance - minRealDist) / rangeReal;
                const minVis = size * 1.8;
                const maxVis = size * 3.5;
                visualDist = minVis + (norm * (maxVis - minVis));
            }
            // Additional safety padding
            if (visualDist < size + 0.2) visualDist = size + 0.3;

            mMesh.userData = {
                ...moonData,
                isMoon: true,
                parentPlanet: data.name,
                isInteractable: true,
                visualDistance: visualDist // Store for animation
            };
            systemGroup.add(mMesh);
            moonMeshes.push({ mesh: mMesh, data: moonData });

            // Moon Orbit Line (Visual aid relative to planet)
            const mCurve = new THREE.EllipseCurve(
                0, 0,
                visualDist, visualDist,
                0, 2 * Math.PI,
                false,
                0
            );
            const mPoints = mCurve.getPoints(64);
            const mOrbitGeo = new THREE.BufferGeometry().setFromPoints(mPoints);
            const mOrbitMat = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.4 });
            const mOrbit = new THREE.Line(mOrbitGeo, mOrbitMat);
            mOrbit.rotation.x = Math.PI / 2;
            systemGroup.add(mOrbit);
        });
    }

    planetMeshes.push({ systemGroup, mesh, data, label, size, moonMeshes });
});

// --- 4. Asteroid Belt (Updated V2) ---
function createAsteroids() {
    const count = 3500;
    const geometry = new THREE.DodecahedronGeometry(0.5, 0); // Size: 0.5
    const material = new THREE.MeshStandardMaterial({ color: 0xAAAAAA, roughness: 0.8 });
    const asteroidBelt = new THREE.InstancedMesh(geometry, material, count);

    const dummy = new THREE.Object3D();
    const center = 2.8 * CONFIG.orbitScale;
    const variation = 0.5 * CONFIG.orbitScale;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = center + (Math.random() - 0.5) * 2 * variation;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 2;

        dummy.position.set(x, y, z);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.scale.setScalar(Math.random() * 0.8 + 0.2);
        dummy.updateMatrix();
        asteroidBelt.setMatrixAt(i, dummy.matrix);
    }

    asteroidBelt.userData = {
        name: "Asteroid Belt",
        type: "Belt",
        desc: "Region between Mars and Jupiter containing many rocky bodies.",
        distance: "2.2 - 3.2 AU",
        texture: "asteroid_field.png",
        isInteractable: true
    };
    scene.add(asteroidBelt);
    return asteroidBelt;
}

// Helper: Create a soft radial gradient texture programmatically
function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Bright center
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)'); // Soft falloff
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent edge
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

const asteroidBelt = createAsteroids();

// --- 5. Comets ---
// --- 5. Comets ---
const COMETS = [
    {
        name: "1P/Halley",
        size: 0.5,
        texture: "comet_halley.png",
        color: 0xADD8E6,
        type: "Periodic Comet",
        desc: "Halley's Comet orbits the Sun every 75-76 years. It is the only known short-period comet that is regularly visible to the naked eye from Earth.",
        elements: { a: 17.834, e: 0.967, i: 162.26, O: 58.42, w: 111.33, M: 38.38, period: 75.32 }
    },
    {
        name: "67P/C-Gerasimenko",
        size: 0.4,
        texture: "comet_67p.png",
        color: 0xAAAAAA,
        type: "Jupiter-family Comet",
        desc: "Visited by the Rosetta spacecraft in 2014, this comet has a distinct bi-lobed 'rubber duck' shape.",
        elements: { a: 3.46, e: 0.641, i: 7.04, O: 50.14, w: 12.78, M: 20.0, period: 6.44 }
    },
    {
        name: "C/2020 F3 (NEOWISE)",
        size: 0.6,
        texture: "comet_neowise.png",
        color: 0xFFD700,
        type: "Long-period Comet",
        desc: "A bright comet discovered in 2020. Parameters simplified for visualization.",
        elements: { a: 50, e: 0.95, i: 128.9, O: 61.0, w: 37.2, M: 0.1, period: 350 }
    },
    {
        name: "2P/Encke",
        size: 0.3,
        texture: "comet_encke_texture_1765207559923.png",
        color: 0x88FF88,
        type: "Periodic Comet",
        desc: "Has the shortest period of any known comet, taking just 3.3 years to orbit the Sun.",
        elements: { a: 2.21, e: 0.848, i: 11.78, O: 334.56, w: 186.5, M: 0.0, period: 3.30 }
    }
];

const cometMeshes = [];

COMETS.forEach(data => {
    // Irregular Geometry (Distorted Sphere)
    const geo = new THREE.SphereGeometry(0.15, 12, 12);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF, // Use white to let texture/light dictate color
        roughness: 0.7,
        map: data.texture ? textureLoader.load(texturePath + data.texture) : null
    });
    const mesh = new THREE.Mesh(geo, mat);

    // Simulate irregular shape by chaotic scaling
    mesh.scale.set(
        1 + Math.random() * 0.5,
        1 + Math.random() * 0.5,
        1 + Math.random() * 0.5
    );
    // Random initial rotation
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

    mesh.userData = { ...data, isComet: true, isInteractable: true };
    scene.add(mesh);

    // Comet Glow (Sprite attached to mesh)
    const glowMap = textureLoader.load(texturePath + 'comet_tail_texture_1765207643666.png');
    const glowMat = new THREE.SpriteMaterial({
        map: glowMap,
        color: data.color,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(4, 4, 4); // Glow size relatives to comet
    mesh.add(glow); // Moves with comet automatically

    // No separate tail object
    const tail = null;

    const div = document.createElement('div');
    div.className = 'planet-label';
    div.style.color = '#AAF';
    div.textContent = data.name;
    const label = new CSS2DObject(div);
    scene.add(label);

    const points = [];
    const orbitSteps = 360; // 1 degree geometric resolution
    const d2r = Math.PI / 180;

    // Geometric constants
    const e = data.elements.e;
    const a = data.elements.a;
    const b = a * Math.sqrt(1 - e * e); // Semi-minor axis

    // Pre-calculate rotations
    const i_rad = data.elements.i * d2r;
    const O_rad = data.elements.O * d2r;
    const w_rad = data.elements.w * d2r;
    const cos_i = Math.cos(i_rad), sin_i = Math.sin(i_rad);
    const cos_O = Math.cos(O_rad), sin_O = Math.sin(O_rad);
    const cos_w = Math.cos(w_rad), sin_w = Math.sin(w_rad);

    for (let s = 0; s <= orbitSteps; s++) {
        // Eccentric Anomaly from 0 to 2PI
        const E = (s / orbitSteps) * 2 * Math.PI;

        // 2D position in orbital plane
        const x_orb = a * (Math.cos(E) - e);
        const y_orb = b * Math.sin(E);

        // 3D Ecliptic Rotation
        const x = x_orb * (cos_w * cos_O - sin_w * sin_O * cos_i) - y_orb * (sin_w * cos_O + cos_w * sin_O * cos_i);
        const y = x_orb * (cos_w * sin_O + sin_w * cos_O * cos_i) - y_orb * (sin_w * sin_O - cos_w * cos_O * cos_i);
        const z = x_orb * (sin_w * sin_i) + y_orb * (cos_w * sin_i);

        // Map to Three.js (x -> x, y -> z, z -> -y) consistent with physics.js
        points.push(new THREE.Vector3(x * CONFIG.orbitScale, z * CONFIG.orbitScale, -y * CONFIG.orbitScale));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.3 });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);

    // Add to main planets array for UI finding, but flag it
    // Actually, let's keep a separate reference or just add to planetMeshes?
    // The existing code used planetMeshes.
    planetMeshes.push({ mesh, data, label, size: data.size, tail });
});

// --- UI Logic ---
let currentTargetMesh = null;

// Navigation List
const navList = document.getElementById('nav-list');
if (navList) {
    const destinations = [
        ...PLANETS,
        { name: "Asteroid Belt", type: "Belt", desc: "A torus-shaped region in the Solar System.", texture: "asteroid_field.png", size: 0.1 },
        ...COMETS
    ];

    destinations.forEach(data => {
        const btn = document.createElement('button');
        btn.className = 'nav-item w-full text-left px-4 py-3 text-sm font-mono text-gray-300 border-l-2 border-transparent transition-all flex items-center gap-3 hover:bg-white/5 hover:border-blue-500';
        btn.innerHTML = `<div class="w-2 h-2 rounded-full bg-blue-500/50"></div>${data.name}`;

        btn.addEventListener('click', () => {
            let target = planetMeshes.find(pm => pm.data.name === data.name);
            if (data.name === "Asteroid Belt") {
                target = { mesh: asteroidBelt, data: asteroidBelt.userData };
            }
            if (target) {
                selectObject(target.mesh);
            }
        });
        navList.appendChild(btn);
    });
}

// Detail Panel
const speedSlider = document.getElementById('speed-slider');

const btnPanelFocus = document.getElementById('btn-panel-focus');
const btnPanelCompare = document.getElementById('btn-panel-compare');
const closeCompareBtn = document.getElementById('close-compare');
const compareModal = document.getElementById('compare-modal');

const detailPanel = document.getElementById('jpl-detail-panel');
const closeDetailBtn = document.getElementById('close-detail');
if (closeDetailBtn && detailPanel) {
    closeDetailBtn.addEventListener('click', () => detailPanel.classList.add('-translate-x-full'));
}

const btnPause = document.getElementById('btn-pause');
const btnPlay = document.getElementById('btn-play');
const btnReverse = document.getElementById('btn-reverse');
const btnLive = document.getElementById('btn-live');

// Time Controls
if (btnPause) {
    btnPause.addEventListener('click', () => {
        CONFIG.isPaused = true;
    });
}

if (btnPlay) {
    btnPlay.addEventListener('click', () => {
        CONFIG.isPaused = false;
        if (CONFIG.timeScale < 0) CONFIG.timeScale *= -1;
        if (CONFIG.timeScale === 0) CONFIG.timeScale = 1;
    });
}

if (btnReverse) {
    btnReverse.addEventListener('click', () => {
        CONFIG.isPaused = false;
        if (CONFIG.timeScale > 0) CONFIG.timeScale *= -1;
        if (CONFIG.timeScale === 0) CONFIG.timeScale = -1;
    });
}

if (btnLive) {
    btnLive.addEventListener('click', () => {
        CONFIG.date = new Date();
        CONFIG.timeScale = 1;
        CONFIG.isPaused = false;
        if (speedSlider) speedSlider.value = 1;
    });
}

if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (val === 0) {
            CONFIG.isPaused = true;
            CONFIG.timeScale = 0;
        } else {
            CONFIG.isPaused = false;
            // Exponential curve mapping
            const power = (val - 20) / 20;
            CONFIG.timeScale = Math.pow(2, power);
        }
    });
}

// Detail Panel Actions
if (btnPanelFocus) {
    btnPanelFocus.addEventListener('click', () => {
        if (currentTargetMesh) {
            focusCamera(currentTargetMesh);
        }
    });
}

if (btnPanelCompare) {
    btnPanelCompare.addEventListener('click', () => {
        if (!currentTargetMesh) return;

        const targetCircle = document.getElementById('compare-target-circle');
        const targetLabel = document.getElementById('compare-target-label');

        const targetRadius = currentTargetMesh.userData.size || 1;
        let sizePx = 100 * targetRadius;
        if (sizePx > 200) sizePx = 200;
        if (sizePx < 10) sizePx = 10;

        targetCircle.style.width = `${sizePx}px`;
        targetCircle.style.height = `${sizePx}px`;
        targetLabel.innerText = `${currentTargetMesh.userData.name.toUpperCase()} (${targetRadius.toFixed(2)}x Earth)`;

        compareModal.classList.remove('hidden');
    });
}

if (closeCompareBtn) {
    closeCompareBtn.addEventListener('click', () => {
        compareModal.classList.add('hidden');
    });
}

// Functions
function selectObject(mesh) {
    currentTargetMesh = mesh;
    showModelCard(mesh.userData);
    focusCamera(mesh);
}

function showModelCard(data) {
    if (!detailPanel) return;
    document.getElementById('detail-title').innerText = data.name;
    document.getElementById('detail-subtitle').innerText = data.type || "Celestial Body";
    document.getElementById('detail-desc').innerText = data.desc || "No description.";
    document.getElementById('detail-distance').innerText = data.distance || (data.elements ? data.elements.a + " AU" : "N/A");
    document.getElementById('detail-radius').innerText = data.size ? Math.round(data.size * 6371) + " km" : "N/A";

    const img = document.getElementById('detail-image');
    if (img) {
        img.src = data.texture ? `/textures/${data.texture}` : '/textures/sun.jpg';
    }

    // Moon List Logic
    const contentArea = detailPanel.querySelector('.space-y-6'); // The scrollable content div
    // Remove existing moon list if any
    const existingList = document.getElementById('moon-list-container');
    if (existingList) existingList.remove();

    if (data.moons) {
        const moonContainer = document.createElement('div');
        moonContainer.id = 'moon-list-container';
        moonContainer.className = 'mt-6 border-t border-white/10 pt-4';

        const header = document.createElement('h3');
        header.className = 'text-xs font-bold text-gray-300 uppercase font-mono mb-3';
        header.innerText = 'Satellites';
        moonContainer.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 gap-2';

        data.moons.forEach(m => {
            const btn = document.createElement('button');
            btn.className = 'bg-white/5 hover:bg-blue-600/20 text-blue-300 text-xs py-2 px-3 rounded border border-white/5 font-mono text-left transition-colors';
            btn.innerText = m.name;
            btn.onclick = () => {
                // Find the actual mesh object
                // We need to look inside planetMeshes to find the child mesh
                const parentSys = planetMeshes.find(p => p.data.name === data.name);
                if (parentSys) {
                    const moonObj = parentSys.moonMeshes.find(mm => mm.data.name === m.name);
                    if (moonObj) selectObject(moonObj.mesh);
                }
            };
            grid.appendChild(btn);
        });

        moonContainer.appendChild(grid);
        contentArea.appendChild(moonContainer);
    }

    detailPanel.classList.remove('-translate-x-full');
}

function focusCamera(target) {
    const targetPos = new THREE.Vector3();
    target.getWorldPosition(targetPos);

    // Dynamic offset based on object size
    let size = target.userData.size || 1;
    // Cap minimum size for camera distance calculation to avoid clipping
    if (size < 0.1) size = 0.1;

    let dist = size * 4.0; // Multiplier for "good view"
    if (target.userData.name === "Sun") dist = 25; // Fixed for Sun

    const offset = new THREE.Vector3(dist, dist * 0.5, dist);
    const newCamPos = targetPos.clone().add(offset);

    gsap.to(camera.position, { duration: 1.5, x: newCamPos.x, y: newCamPos.y, z: newCamPos.z, onUpdate: () => controls.update() });
    gsap.to(controls.target, { duration: 1.5, x: targetPos.x, y: targetPos.y, z: targetPos.z, onUpdate: () => controls.update() });
}

// --- Interaction ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    if (event.target.closest('#jpl-detail-panel') || event.target.closest('.nav-item') || event.target.closest('#compare-modal')) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    for (let i = 0; i < intersects.length; i++) {
        let obj = intersects[i].object;
        while (obj && !obj.userData.isInteractable && obj.parent) obj = obj.parent;
        if (obj && obj.userData.isInteractable) {
            selectObject(obj);
            break;
        }
    }
});

// --- Animation ---
const dateDisplay = document.getElementById('timeline-date');
const timeDisplay = document.getElementById('timeline-time');

function animate() {
    requestAnimationFrame(animate);

    if (!CONFIG.isPaused) {
        const deltaDays = CONFIG.timeScale * (1 / 60);
        CONFIG.date = new Date(CONFIG.date.getTime() + deltaDays * 24 * 60 * 60 * 1000);
    }

    planetMeshes.forEach(p => {
        const pos = calculatePosition(p.data.elements, CONFIG.date);

        if (p.systemGroup) {
            // Planet System
            p.systemGroup.position.set(pos.x * CONFIG.orbitScale, pos.y * CONFIG.orbitScale, pos.z * CONFIG.orbitScale);
            // Planet Rotation
            p.mesh.rotation.y += 0.005 / p.data.elements.period;
        } else {
            // Standalone Object (e.g. Comets)
            p.mesh.position.set(pos.x * CONFIG.orbitScale, pos.y * CONFIG.orbitScale, pos.z * CONFIG.orbitScale);

            // Rotate comet to show off 3D shape
            p.mesh.rotation.x += 0.01;
            p.mesh.rotation.y += 0.02;

            // Update Label Position
            if (p.label) {
                p.label.position.copy(p.mesh.position);
                p.label.position.y += 0.5; // Offset label slightly above the comet
            }

            // Update Label Position
            if (p.label) {
                p.label.position.copy(p.mesh.position);
                p.label.position.y += 0.5; // Offset label slightly above the comet
            }
        }

        // Moon Orbits
        if (p.moonMeshes) {
            p.moonMeshes.forEach(m => {
                const time = CONFIG.date.getTime() / (1000 * 60 * 60 * 24); // Days
                const angle = (time / (m.data.period * 365.25)) * Math.PI * 2; // Approximate circular orbit

                const dist = m.mesh.userData.visualDistance || 2;

                m.mesh.position.x = Math.cos(angle) * dist;
                m.mesh.position.z = Math.sin(angle) * dist;
                // Add slight rotation to the moon itself
                m.mesh.rotation.y += 0.01;
            });
        }
    });

    if (dateDisplay) dateDisplay.innerText = format(CONFIG.date, 'yyyy-MM-dd');
    if (timeDisplay) timeDisplay.innerText = format(CONFIG.date, 'HH:mm:ss') + ' UTC';

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

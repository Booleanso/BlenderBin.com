'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';

interface Point {
  x: number;
  y: number;
  z: number;
}

interface ThreeSceneProps {
  className?: string;
}

const ThreeScene: React.FC<ThreeSceneProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const pointsRef = useRef<THREE.Points>();
  const controlsRef = useRef<OrbitControlsImpl>();

  const seededRandom = (seed: number) => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const initScene = () => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(3, 3, 3);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls setup
    const controls = new OrbitControlsImpl(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.target.set(0, 0, 0);
    controls.update();
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(3, 10, 3);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    // Shadow settings
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;

    // Ground plane
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.ShadowMaterial({ 
      color: 0x000000, 
      opacity: 0.5,
      transparent: true 
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1;
    plane.receiveShadow = true;
    scene.add(plane);

    // Initial cube
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x808080,
      roughness: 0.7,
      metalness: 0.3
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);

    // Initial points distribution
    distributePoints(25, 0.04, 0);

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  };

  const distributePoints = (density: number, radius: number, seed: number) => {
    if (!sceneRef.current) return;

    // Remove existing points
    if (pointsRef.current) {
      sceneRef.current.remove(pointsRef.current);
      pointsRef.current.geometry.dispose();
      (pointsRef.current.material as THREE.Material).dispose();
    }

    const cubeSize = 1;
    const points: Point[] = [];
    
    // Generate points
    for (let i = 0; i < density * 100; i++) {
      const x = seededRandom(seed + i) * cubeSize - cubeSize / 2;
      const y = seededRandom(seed + i + 1) * cubeSize - cubeSize / 2;
      const z = seededRandom(seed + i + 2) * cubeSize - cubeSize / 2;
      
      if (Math.abs(x) > cubeSize / 2 - 0.1 || 
          Math.abs(y) > cubeSize / 2 - 0.1 || 
          Math.abs(z) > cubeSize / 2 - 0.1) {
        points.push({ x, y, z });
      }
    }

    // Create points geometry
    const pointsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    
    points.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    });
    
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create points material
    const pointsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: radius,
      sizeAttenuation: true,
      alphaTest: 0.5,
      transparent: true,
      vertexColors: false
    });

    // Create points object
    const pointsObject = new THREE.Points(pointsGeometry, pointsMaterial);
    pointsRef.current = pointsObject;
    sceneRef.current.add(pointsObject);
  };

  // Handle window resize
  const handleResize = () => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height, false);
  };

  useEffect(() => {
    const cleanup = initScene();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cleanup?.();
      
      // Cleanup Three.js resources
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }

      // Clean up geometries and materials
      if (pointsRef.current) {
        pointsRef.current.geometry.dispose();
        (pointsRef.current.material as THREE.Material).dispose();
      }
    };
  }, []);

  return (
    <div className={className}>
      <div className="controls absolute top-[20%] right-[20%] bg-[#2c2c2c] p-3 rounded z-10 text-white w-[200px]">
        <label className="block mb-1 text-sm text-[#b0b0b0]">Density</label>
        <input
          type="number"
          className="w-full mb-2 bg-[#3c3c3c] text-white p-1 rounded border border-[#555] text-sm"
          defaultValue={25}
          min={1}
          max={1000000}
          onChange={(e) => distributePoints(
            Number(e.target.value),
            0.04,
            0
          )}
        />
        
        <label className="block mb-1 text-sm text-[#b0b0b0]">Point Size</label>
        <input
          type="number"
          className="w-full mb-2 bg-[#3c3c3c] text-white p-1 rounded border border-[#555] text-sm"
          defaultValue={0.04}
          step={0.01}
          min={0.01}
          max={10}
          onChange={(e) => distributePoints(
            25,
            Number(e.target.value),
            0
          )}
        />
        
        <label className="block mb-1 text-sm text-[#b0b0b0]">Random Seed</label>
        <input
          type="number"
          className="w-full mb-2 bg-[#3c3c3c] text-white p-1 rounded border border-[#555] text-sm"
          defaultValue={0}
          min={0}
          max={100}
          onChange={(e) => distributePoints(
            25,
            0.04,
            Number(e.target.value)
          )}
        />
        
        <button
          className="w-full mb-1 bg-[#4d4d4d] text-white border-none rounded p-1 text-sm hover:bg-[#606060]"
          onClick={() => distributePoints(25, 0.04, 0)}
        >
          Distribute Points
        </button>
        
        <button
          className="w-full mb-1 bg-[#4d4d4d] text-white border-none rounded p-1 text-sm hover:bg-[#606060]"
          onClick={() => {
            if (sceneRef.current && pointsRef.current) {
              sceneRef.current.remove(pointsRef.current);
              pointsRef.current.geometry.dispose();
              (pointsRef.current.material as THREE.Material).dispose();
            }
          }}
        >
          Reset
        </button>
      </div>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default ThreeScene;
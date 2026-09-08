"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { buildRenderBuffers, type RenderWorld } from "./world-geometry";

type DemoWorld = RenderWorld & {
  digest: string;
  seed: string;
  hqCandidates: string[];
  metadata: { dimensions: { tileCount: number }; topology: { exceptions: { description: string } } };
};

export function WorldGlobe() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading deterministic world artifact…");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const controller = new AbortController();
    let cleanupScene: (() => void) | undefined;

    fetch("/worlds/demo-world.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`World artifact returned HTTP ${response.status}`);
        return response.json() as Promise<DemoWorld>;
      })
      .then((world) => {
        if (!hostRef.current) return;
        const { triangles, colors, boundaries } = buildRenderBuffers(world);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(0, 0, 3.35);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.className = "globe-canvas";
        renderer.domElement.tabIndex = 0;
        renderer.domElement.setAttribute("aria-label", "Interactive spherical Smash Droids world. Drag to orbit, use the wheel or plus and minus keys to zoom, and arrow keys to rotate.");
        host.appendChild(renderer.domElement);

        const group = new THREE.Group();
        group.rotation.set(-0.18, -0.55, 0.05);
        scene.add(group);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(triangles, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        const worldMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.06 }));
        group.add(worldMesh);

        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(boundaries, 3));
        group.add(new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0x91fff4, transparent: true, opacity: 0.25 })));

        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(1.035, 48, 32),
          new THREE.MeshBasicMaterial({ color: 0x18cfc2, transparent: true, opacity: 0.045, side: THREE.BackSide }),
        );
        group.add(atmosphere);
        scene.add(new THREE.HemisphereLight(0xd9fffb, 0x071015, 1.75));
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
        keyLight.position.set(3, 2, 4);
        scene.add(keyLight);

        const resize = () => {
          const width = Math.max(host.clientWidth, 1);
          const height = Math.max(host.clientHeight, 1);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        resize();

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let dragging = false;
        let previousX = 0;
        let previousY = 0;
        const pointerDown = (event: PointerEvent) => {
          dragging = true;
          previousX = event.clientX;
          previousY = event.clientY;
          renderer.domElement.setPointerCapture(event.pointerId);
        };
        const pointerMove = (event: PointerEvent) => {
          if (!dragging) return;
          group.rotation.y += (event.clientX - previousX) * 0.006;
          group.rotation.x = THREE.MathUtils.clamp(group.rotation.x + (event.clientY - previousY) * 0.006, -1.25, 1.25);
          previousX = event.clientX;
          previousY = event.clientY;
        };
        const pointerUp = () => { dragging = false; };
        const zoom = (delta: number) => { camera.position.z = THREE.MathUtils.clamp(camera.position.z + delta, 2.25, 5.2); };
        const wheel = (event: WheelEvent) => { event.preventDefault(); zoom(event.deltaY * 0.002); };
        const keyDown = (event: KeyboardEvent) => {
          const step = 0.1;
          if (event.key === "ArrowLeft") group.rotation.y -= step;
          else if (event.key === "ArrowRight") group.rotation.y += step;
          else if (event.key === "ArrowUp") group.rotation.x -= step;
          else if (event.key === "ArrowDown") group.rotation.x += step;
          else if (event.key === "+" || event.key === "=") zoom(-0.2);
          else if (event.key === "-") zoom(0.2);
          else return;
          event.preventDefault();
        };
        const canvas = renderer.domElement;
        canvas.addEventListener("pointerdown", pointerDown);
        canvas.addEventListener("pointermove", pointerMove);
        canvas.addEventListener("pointerup", pointerUp);
        canvas.addEventListener("pointercancel", pointerUp);
        canvas.addEventListener("wheel", wheel, { passive: false });
        canvas.addEventListener("keydown", keyDown);

        let frame = 0;
        const animate = () => {
          if (!reducedMotion.matches && !dragging) group.rotation.y += 0.00055;
          renderer.render(scene, camera);
          frame = requestAnimationFrame(animate);
        };
        animate();
        setStatus(`${world.metadata.dimensions.tileCount.toLocaleString()} tiles · ${world.hqCandidates.length} HQ regions · SHA-256 ${world.digest.slice(0, 12)}…`);

        cleanupScene = () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
          canvas.removeEventListener("pointerdown", pointerDown);
          canvas.removeEventListener("pointermove", pointerMove);
          canvas.removeEventListener("pointerup", pointerUp);
          canvas.removeEventListener("pointercancel", pointerUp);
          canvas.removeEventListener("wheel", wheel);
          canvas.removeEventListener("keydown", keyDown);
          geometry.dispose();
          lineGeometry.dispose();
          renderer.dispose();
          canvas.remove();
        };
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") setStatus("Interactive globe unavailable. The deterministic 1,536-tile world summary remains available below.");
      });

    return () => {
      controller.abort();
      cleanupScene?.();
    };
  }, []);

  return (
    <div className="globe-shell">
      <div ref={hostRef} className="globe-host" />
      <p className="globe-status" role="status">{status}</p>
      <noscript><p className="globe-fallback">Enable JavaScript to orbit the globe. World metadata and biome legend remain readable.</p></noscript>
    </div>
  );
}

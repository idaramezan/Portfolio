import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Html,
  OrbitControls,
  RoundedBox,
  useTexture,
} from "@react-three/drei";
import { EffectComposer, N8AO, SMAA } from "@react-three/postprocessing";
import * as THREE from "three";
import type {
  GalleryCameraView,
  GalleryElement,
  GalleryScene,
} from "@/lib/visual-gallery";

type Props = {
  scene: GalleryScene;
  cameraView?: GalleryCameraView;
  selectedId?: string;
  editing?: boolean;
  quality?: "high" | "mobile";
  wallMood?: "scene" | "cream" | "blush" | "sage";
  onArtworkClick?: (element: GalleryElement, button?: HTMLElement) => void;
  onElementSelect?: (element: GalleryElement) => void;
};

const frameColors: Record<string, string> = {
  "natural-oak": "#a9784e",
  "warm-walnut": "#65412f",
  "slim-dark-brown": "#382921",
  "dark-wood": "#382921",
  "soft-white": "#f8f2e8",
  "thin-white": "#f8f2e8",
  "thin-black": "#201c1c",
  none: "#b9a58f",
};
function CameraRig({
  view,
  editing,
}: {
  view?: GalleryCameraView;
  editing: boolean;
}) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  useEffect(() => {
    if (!view || editing) return;
    target.current.set(...view.target);
    camera.userData.destination = new THREE.Vector3(...view.position);
    (camera as THREE.PerspectiveCamera).fov = view.fieldOfView;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [view, camera, editing]);
  useFrame((_, delta) => {
    if (editing || !camera.userData.destination) return;
    camera.position.lerp(camera.userData.destination, 1 - Math.exp(-delta * 4));
    camera.lookAt(target.current);
  });
  return editing ? (
    <OrbitControls
      makeDefault
      target={[0, 1.55, -1.4]}
      minDistance={3}
      maxDistance={16}
      maxPolarAngle={Math.PI / 2.05}
    />
  ) : null;
}
function Artwork({
  element,
  selected,
  onClick,
}: {
  element: GalleryElement;
  selected: boolean;
  onClick: () => void;
}) {
  const texture = useTexture(element.imageUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const dims = useMemo(() => {
    const width = Math.max(
      0.14,
      (element.realWidthCm || element.width * 2.4) / 100,
    );
    const image = texture.image as { width?: number; height?: number };
    const ratio = (image?.height || 1) / (image?.width || 1);
    return [
      width,
      Math.max(0.14, (element.realHeightCm || width * 100 * ratio) / 100),
    ] as const;
  }, [element, texture]);
  const wall = element.wallId || "main";
  const legacyX = (element.x - 50) / 11,
    legacyY = 0.6 + ((100 - element.y) / 100) * 2.3;
  let position: [number, number, number] = [
    legacyX,
    element.centerHeightM || legacyY,
    -3.72,
  ];
  let rotation: [number, number, number] = [
    0,
    0,
    THREE.MathUtils.degToRad(element.rotation),
  ];
  if (wall === "right") {
    position = [5.65, element.centerHeightM || legacyY, -0.9 + legacyX];
    rotation = [0, -Math.PI / 2, THREE.MathUtils.degToRad(element.rotation)];
  }
  if (wall === "left") {
    position = [-5.65, element.centerHeightM || legacyY, -1.1 - legacyX];
    rotation = [0, Math.PI / 2, THREE.MathUtils.degToRad(element.rotation)];
  }
  const depth = 0.055,
    frame = frameColors[element.frameStyle] || frameColors.none;
  return (
    <group
      position={element.position3d || position}
      rotation={element.rotation3d || rotation}
      visible={element.visible}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <mesh castShadow receiveShadow position={[0, 0, -depth]}>
        <boxGeometry args={[dims[0] + 0.09, dims[1] + 0.09, depth]} />
        <meshStandardMaterial
          color={selected ? "#d7a3b6" : frame}
          roughness={0.58}
        />
      </mesh>
      <mesh castShadow position={[0, 0, 0.005]}>
        <planeGeometry args={[dims[0], dims[1]]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh visible={false}>
        <boxGeometry args={[dims[0] + 0.18, dims[1] + 0.18, 0.14]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}
function Bench() {
  return (
    <group position={[1.25, 0.34, 1.1]} rotation={[0, -0.13, 0]}>
      <RoundedBox args={[2.45, 0.18, 0.72]} radius={0.06} castShadow>
        <meshStandardMaterial color="#b88f68" roughness={0.62} />
      </RoundedBox>
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x, 0.15, 0]} castShadow>
          <boxGeometry args={[0.13, 0.55, 0.56]} />
          <meshStandardMaterial color="#6b4834" roughness={0.72} />
        </mesh>
      ))}
    </group>
  );
}
function Console() {
  return (
    <group position={[-4.75, 0.62, -2]}>
      <RoundedBox args={[1.5, 0.1, 0.45]} radius={0.025} castShadow>
        <meshStandardMaterial color="#c8ad91" roughness={0.76} />
      </RoundedBox>
      {[-0.58, 0.58].map((x) => (
        <mesh key={x} position={[x, -0.42, 0]} castShadow>
          <boxGeometry args={[0.1, 0.85, 0.34]} />
          <meshStandardMaterial color="#8f755d" roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}
function Plant({
  position = [-5.05, 0, -0.1] as [number, number, number],
  scale = 1,
}: {
  position?: [number, number, number];
  scale?: number;
}) {
  const leaves = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        y: 0.5 + i * 0.075,
        a: i * 2.4,
        s: 0.22 + (i % 3) * 0.04,
      })),
    [],
  );
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.28, 0.2, 0.55, 24]} />
        <meshStandardMaterial color="#9b6f56" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.045, 1.55, 8]} />
        <meshStandardMaterial color="#5c5033" roughness={1} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh
          key={i}
          scale={[1, 0.36, 0.16]}
          position={[Math.cos(l.a) * 0.25, l.y, Math.sin(l.a) * 0.25]}
          rotation={[0, l.a, Math.sin(l.a) * 0.45]}
          castShadow
        >
          <sphereGeometry args={[l.s, 12, 6]} />
          <meshStandardMaterial
            color={i % 2 ? "#63725a" : "#788269"}
            roughness={0.92}
          />
        </mesh>
      ))}
    </group>
  );
}
function TrackLights() {
  return (
    <group>
      {[-3, 0, 3].map((x, i) => (
        <group key={x} position={[x, 3.62, 1.2]}>
          <mesh castShadow>
            <boxGeometry args={[0.16, 0.16, 4.8]} />
            <meshStandardMaterial
              color="#403832"
              metalness={0.7}
              roughness={0.35}
            />
          </mesh>
          {[-1.5, 0, 1.5].map((z, j) => (
            <group
              key={z}
              position={[0, -0.14, z]}
              rotation={[0.45 + (j - i) * 0.04, 0, 0]}
            >
              <mesh castShadow>
                <cylinderGeometry args={[0.11, 0.15, 0.28, 18]} />
                <meshStandardMaterial
                  color="#453d38"
                  metalness={0.65}
                  roughness={0.35}
                />
              </mesh>
              <spotLight
                position={[0, -0.15, 0]}
                intensity={i === 1 ? 23 : 16}
                distance={8}
                angle={0.38}
                penumbra={0.9}
                decay={2.1}
                color={i === 2 ? "#ffe4c0" : "#fff0da"}
                castShadow
                shadow-mapSize={[512, 512]}
              />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
function Architecture({
  scene,
  wallMood,
}: {
  scene: GalleryScene;
  wallMood: Props["wallMood"];
}) {
  const main =
    wallMood === "cream"
      ? "#eee6d9"
      : wallMood === "blush"
        ? "#d9b4b4"
        : wallMood === "sage"
          ? "#aab6a0"
          : scene.wallColor || "#e9e2d6";
  return (
    <group>
      <mesh position={[0, 1.85, -3.85]} receiveShadow>
        <boxGeometry args={[11.6, 3.7, 0.22]} />
        <meshStandardMaterial color={main} roughness={0.94} />
      </mesh>
      <mesh position={[-5.8, 1.85, -0.3]} receiveShadow>
        <boxGeometry args={[0.22, 3.7, 7.3]} />
        <meshStandardMaterial color="#d6b0b1" roughness={0.92} />
      </mesh>
      <mesh position={[5.8, 1.85, -0.25]} receiveShadow>
        <boxGeometry args={[0.22, 3.7, 7.2]} />
        <meshStandardMaterial color="#9eaa96" roughness={0.94} />
      </mesh>
      <mesh position={[0, 3.75, -0.25]} receiveShadow>
        <boxGeometry args={[11.8, 0.18, 7.3]} />
        <meshStandardMaterial color="#eee8df" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.06, -0.2]} receiveShadow>
        <boxGeometry args={[11.8, 0.12, 7.4]} />
        <meshStandardMaterial
          color="#b9aa99"
          roughness={0.68}
          metalness={0.02}
        />
      </mesh>
      <mesh position={[-2.8, 1.75, -3.72]}>
        <boxGeometry args={[2.05, 3.25, 0.18]} />
        <meshStandardMaterial color="#5e554d" roughness={0.85} />
      </mesh>
      <mesh position={[-2.8, 1.72, -3.58]}>
        <planeGeometry args={[1.7, 2.85]} />
        <meshBasicMaterial color="#dbe6e8" />
      </mesh>
      <mesh position={[-2.8, 3.25, -2.1]}>
        <boxGeometry args={[2.15, 1, 3.25]} />
        <meshStandardMaterial color="#ede6dc" roughness={0.93} />
      </mesh>
      <mesh position={[-3.86, 1.65, -2.1]}>
        <boxGeometry args={[0.2, 3.2, 3.2]} />
        <meshStandardMaterial color="#e4dbcf" roughness={0.94} />
      </mesh>
    </group>
  );
}
function Scene({ props }: { props: Props }) {
  const {
    scene,
    cameraView,
    editing = false,
    quality = "high",
    wallMood = "scene",
    selectedId,
    onArtworkClick,
    onElementSelect,
  } = props;
  return (
    <>
      <color attach="background" args={["#e9e1d5"]} />
      <fog attach="fog" args={["#e7ded1", 12, 22]} />
      <ambientLight intensity={0.52} />
      <directionalLight
        position={[-5, 7, 6]}
        intensity={2.4}
        color="#fff5df"
        castShadow
        shadow-mapSize={quality === "mobile" ? [512, 512] : [1536, 1536]}
        shadow-camera-far={24}
      />
      <Architecture scene={scene} wallMood={wallMood} />
      <TrackLights />
      <Bench />
      <Console />
      <Plant />
      <Plant position={[5.1, 0, -2.7]} scale={0.72} />
      {scene.elements
        .filter((e) => e.type === "artwork" && e.imageUrl)
        .map((element) => (
          <Suspense key={element.id} fallback={null}>
            <Artwork
              element={element}
              selected={selectedId === element.id}
              onClick={() =>
                editing ? onElementSelect?.(element) : onArtworkClick?.(element)
              }
            />
          </Suspense>
        ))}
      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.38}
        scale={14}
        blur={2.4}
        far={7}
      />
      <CameraRig view={cameraView} editing={editing} />
      {quality === "high" && (
        <EffectComposer multisampling={0}>
          <N8AO aoRadius={1.8} intensity={1.35} distanceFalloff={0.8} />
          <SMAA />
        </EffectComposer>
      )}
    </>
  );
}
export default function SpatialGalleryScene(props: Props) {
  return (
    <Canvas
      shadows
      dpr={props.quality === "mobile" ? [1, 1.25] : [1, 1.75]}
      camera={{
        position: props.cameraView?.position || [7, 2.25, 8.8],
        fov: props.cameraView?.fieldOfView || 36,
        near: 0.1,
        far: 40,
      }}
      gl={{
        antialias: props.quality !== "mobile",
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <Suspense
        fallback={
          <Html center>
            <div className="gallery-3d-loading">Hanging the paintings…</div>
          </Html>
        }
      >
        <Scene props={props} />
      </Suspense>
    </Canvas>
  );
}

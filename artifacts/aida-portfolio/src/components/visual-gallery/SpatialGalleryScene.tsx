import {
  Suspense,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Html,
  OrbitControls,
  RoundedBox,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import { EffectComposer, N8AO, SMAA } from "@react-three/postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type {
  GalleryAsset,
  GalleryCameraView,
  GalleryElement,
  GalleryScene,
} from "@/lib/visual-gallery";

export interface SpatialGalleryHandle {
  focusArtwork: (element: GalleryElement) => void;
  backToRoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

type Props = {
  scene: GalleryScene;
  assets?: GalleryAsset[];
  cameraView?: GalleryCameraView;
  selectedId?: string;
  editing?: boolean;
  quality?: "high" | "mobile";
  wallMood?: "scene" | "cream" | "blush" | "sage";
  onArtworkClick?: (element: GalleryElement) => void;
  onElementSelect?: (element: GalleryElement) => void;
  onFocusChange?: (focused: boolean) => void;
};

const frameColors: Record<string, string> = {
  "natural-oak": "#9a6a42",
  "warm-walnut": "#503326",
  "slim-dark-brown": "#33261f",
  "dark-wood": "#30241e",
  "soft-white": "#eee8dc",
  "thin-white": "#eee8dc",
  "thin-black": "#181615",
  none: "#aa9075",
};

function surfaceTexture(base: string, variation: number, size = 128) {
  const color = new THREE.Color(base);
  const bytes = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const grain =
        (Math.sin(x * 0.73 + y * 0.19) + Math.sin(x * 0.11 - y * 0.57)) *
        variation;
      bytes[i] = THREE.MathUtils.clamp(color.r * 255 + grain, 0, 255);
      bytes[i + 1] = THREE.MathUtils.clamp(color.g * 255 + grain, 0, 255);
      bytes[i + 2] = THREE.MathUtils.clamp(color.b * 255 + grain, 0, 255);
      bytes[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 5);
  texture.needsUpdate = true;
  return texture;
}

function ImageBasedLighting() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const environment = generator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.55;
    return () => {
      if (scene.environment === environment) scene.environment = null;
      environment.dispose();
      generator.dispose();
    };
  }, [gl, scene]);
  return null;
}

function artworkTransform(element: GalleryElement) {
  const x = (element.x - 50) / 18;
  const y = element.centerHeightM || 1.52;
  const wall = element.wallId || "main";
  if (element.position3d)
    return {
      position: element.position3d,
      rotation: element.rotation3d || ([0, 0, 0] as [number, number, number]),
      normal: new THREE.Vector3(0, 0, 1),
    };
  if (wall === "right")
    return {
      position: [4.91, y, -1 + x] as [number, number, number],
      rotation: [0, -Math.PI / 2, 0] as [number, number, number],
      normal: new THREE.Vector3(-1, 0, 0),
    };
  if (wall === "left")
    return {
      position: [-4.91, y, -1 - x] as [number, number, number],
      rotation: [0, Math.PI / 2, 0] as [number, number, number],
      normal: new THREE.Vector3(1, 0, 0),
    };
  return {
    position: [x, y, -3.71] as [number, number, number],
    rotation: [0, 0, THREE.MathUtils.degToRad(element.rotation)] as [
      number,
      number,
      number,
    ],
    normal: new THREE.Vector3(0, 0, 1),
  };
}

type SavedCamera = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
};
const CameraRig = forwardRef<
  SpatialGalleryHandle,
  Pick<Props, "cameraView" | "editing" | "onFocusChange">
>(function CameraRig({ cameraView, editing = false, onFocusChange }, ref) {
  const { camera } = useThree();
  const controls = useRef<any>(null);
  const destination = useRef<SavedCamera | null>(null);
  const roomView = useRef<SavedCamera | null>(null);
  const initial = useRef<SavedCamera | null>(null);

  const animateTo = (next: SavedCamera) => {
    destination.current = next;
  };
  const applyView = (view?: GalleryCameraView) => {
    if (!view) return;
    const next = {
      position: new THREE.Vector3(...view.position),
      target: new THREE.Vector3(...view.target),
      fov: THREE.MathUtils.clamp(view.fieldOfView, 38, 52),
    };
    initial.current = next;
    animateTo(next);
    onFocusChange?.(false);
  };
  useEffect(() => applyView(cameraView), [cameraView]);

  useImperativeHandle(ref, () => ({
    focusArtwork(element) {
      const transform = artworkTransform(element);
      const target = new THREE.Vector3(...transform.position);
      roomView.current = {
        position: camera.position.clone(),
        target:
          controls.current?.target?.clone() || new THREE.Vector3(0, 1.55, -3),
        fov: (camera as THREE.PerspectiveCamera).fov,
      };
      const width = Math.max(
        0.15,
        (element.realWidthCm || element.width * 2.4) / 100,
      );
      const distance = THREE.MathUtils.clamp(width * 3.2, 0.72, 1.75);
      animateTo({
        position: target.clone().add(transform.normal.multiplyScalar(distance)),
        target,
        fov: 42,
      });
      onFocusChange?.(true);
    },
    backToRoom() {
      if (roomView.current) animateTo(roomView.current);
      onFocusChange?.(false);
    },
    zoomIn() {
      controls.current?.dollyIn(1.22);
      controls.current?.update();
    },
    zoomOut() {
      controls.current?.dollyOut(1.22);
      controls.current?.update();
    },
    resetView() {
      if (initial.current) animateTo(initial.current);
      onFocusChange?.(false);
    },
  }));

  useFrame((_, delta) => {
    const next = destination.current;
    if (!next) return;
    const amount = 1 - Math.exp(-delta * 5.2);
    camera.position.lerp(next.position, amount);
    controls.current?.target.lerp(next.target, amount);
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = THREE.MathUtils.lerp(perspective.fov, next.fov, amount);
    perspective.updateProjectionMatrix();
    controls.current?.update();
    if (camera.position.distanceTo(next.position) < 0.008)
      destination.current = null;
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.075}
      enablePan={editing}
      minDistance={0.58}
      maxDistance={8.5}
      minPolarAngle={Math.PI * 0.28}
      maxPolarAngle={Math.PI * 0.62}
      minAzimuthAngle={-Math.PI * 0.48}
      maxAzimuthAngle={Math.PI * 0.48}
      zoomSpeed={0.7}
      rotateSpeed={0.35}
      target={[0, 1.55, -3]}
    />
  );
});

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
  texture.anisotropy = 16;
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
  const transform = artworkTransform(element);
  const frame = frameColors[element.frameStyle] || frameColors.none;
  const frameless = element.frameStyle === "none";
  return (
    <group
      position={transform.position}
      rotation={transform.rotation}
      visible={element.visible}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "zoom-in";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {!frameless && (
        <RoundedBox
          args={[dims[0] + 0.075, dims[1] + 0.075, 0.055]}
          radius={0.012}
          smoothness={4}
          castShadow
          receiveShadow
          position={[0, 0, -0.022]}
        >
          <meshStandardMaterial
            color={frame}
            roughness={0.68}
            metalness={0.01}
          />
        </RoundedBox>
      )}
      <mesh castShadow position={[0, 0, 0.012]}>
        <planeGeometry args={[dims[0], dims[1]]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.88}
          metalness={0}
          emissiveMap={texture}
          emissive="#ffffff"
          emissiveIntensity={0.16}
          toneMapped={false}
        />
      </mesh>
      <mesh visible={false}>
        <boxGeometry
          args={[
            Math.max(dims[0] + 0.22, 0.32),
            Math.max(dims[1] + 0.22, 0.32),
            0.16,
          ]}
        />
        <meshBasicMaterial />
      </mesh>
      {selected && (
        <Html center position={[0, -dims[1] / 2 - 0.13, 0.05]}>
          <span className="gallery-art-hover-label">View artwork</span>
        </Html>
      )}
    </group>
  );
}

function ModelAsset({
  asset,
  element,
}: {
  asset: GalleryAsset;
  element: GalleryElement;
}) {
  const gltf = useGLTF(asset.modelUrl!);
  const instance = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  useEffect(() => {
    instance.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [instance]);
  const scale = element.scale3d || asset.defaultScale || [1, 1, 1];
  const position = element.position3d || [0, asset.groundOffset || 0, 0];
  const rotation = element.rotation3d || asset.rotationOffset || [0, 0, 0];
  return (
    <primitive
      object={instance}
      scale={scale}
      position={position}
      rotation={rotation}
    />
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
  const wall = useMemo(() => surfaceTexture(main, 2.2), [main]);
  const blush = useMemo(() => surfaceTexture("#d5b3b0", 2), []);
  const sage = useMemo(() => surfaceTexture("#a9b09c", 2), []);
  const ceiling = useMemo(() => surfaceTexture("#eeeae2", 1.4), []);
  const floor = useMemo(() => surfaceTexture("#aaa093", 5), []);
  return (
    <group>
      <mesh position={[0, 1.9, -3.82]} receiveShadow>
        <boxGeometry args={[10, 3.8, 0.24]} />
        <meshStandardMaterial
          map={wall}
          roughness={0.96}
          bumpMap={wall}
          bumpScale={0.006}
        />
      </mesh>
      <mesh position={[-5, 1.9, 0]} receiveShadow>
        <boxGeometry args={[0.24, 3.8, 7.6]} />
        <meshStandardMaterial
          map={blush}
          roughness={0.95}
          bumpMap={blush}
          bumpScale={0.005}
        />
      </mesh>
      <mesh position={[5, 1.9, 0]} receiveShadow>
        <boxGeometry args={[0.24, 3.8, 7.6]} />
        <meshStandardMaterial
          map={sage}
          roughness={0.95}
          bumpMap={sage}
          bumpScale={0.005}
        />
      </mesh>
      <mesh position={[0, 3.82, 0]} receiveShadow>
        <boxGeometry args={[10.2, 0.18, 7.8]} />
        <meshStandardMaterial map={ceiling} roughness={0.97} />
      </mesh>
      <mesh position={[0, -0.07, 0]} receiveShadow>
        <boxGeometry args={[10.2, 0.14, 7.8]} />
        <meshStandardMaterial
          map={floor}
          color="#b9afa2"
          roughness={0.72}
          metalness={0.015}
          bumpMap={floor}
          bumpScale={0.012}
        />
      </mesh>
      <mesh position={[0, 0.07, -3.64]} receiveShadow>
        <boxGeometry args={[10, 0.14, 0.08]} />
        <meshStandardMaterial color="#e7dfd3" roughness={0.86} />
      </mesh>
      <mesh position={[-2.65, 1.55, -3.64]}>
        <boxGeometry args={[2.35, 2.85, 0.09]} />
        <meshStandardMaterial
          color="#dfe8e7"
          roughness={0.45}
          transparent
          opacity={0.88}
        />
      </mesh>
      <mesh position={[-3.84, 1.55, -2.25]} receiveShadow>
        <boxGeometry args={[0.18, 3.1, 2.85]} />
        <meshStandardMaterial map={ceiling} roughness={0.96} />
      </mesh>
      <mesh position={[0, 3.68, -0.2]}>
        <boxGeometry args={[7.8, 0.035, 0.045]} />
        <meshStandardMaterial
          color="#2b2927"
          metalness={0.72}
          roughness={0.34}
        />
      </mesh>
    </group>
  );
}

function Scene({
  props,
  controller,
}: {
  props: Props;
  controller: React.Ref<SpatialGalleryHandle>;
}) {
  const {
    scene,
    assets = [],
    cameraView,
    editing = false,
    quality = "high",
    wallMood = "scene",
    selectedId,
    onArtworkClick,
    onElementSelect,
    onFocusChange,
  } = props;
  const models = scene.elements.flatMap((element) => {
    if (element.type === "artwork" || !element.referenceId) return [];
    const asset = assets.find(
      (item) =>
        item.id === element.referenceId && item.enabled && item.modelUrl,
    );
    return asset ? [{ element, asset }] : [];
  });
  return (
    <>
      <color attach="background" args={["#d9d3c9"]} />
      <fog attach="fog" args={["#d9d3c9", 10, 18]} />
      <ImageBasedLighting />
      <hemisphereLight intensity={0.7} color="#fff8ec" groundColor="#857a6e" />
      <directionalLight
        position={[-4, 7, 5]}
        intensity={1.65}
        color="#fff6e8"
        castShadow
        shadow-mapSize={quality === "mobile" ? [512, 512] : [1536, 1536]}
        shadow-radius={7}
        shadow-bias={-0.0002}
      />
      {[
        [-2.4, 3.55, 0.3],
        [0, 3.55, 0.2],
        [2.4, 3.55, 0.4],
      ].map((position, index) => (
        <spotLight
          key={index}
          position={position as [number, number, number]}
          intensity={10}
          distance={7}
          angle={0.48}
          penumbra={1}
          decay={2.2}
          color="#fff4df"
          castShadow={quality !== "mobile"}
          shadow-radius={8}
        />
      ))}
      <Architecture scene={scene} wallMood={wallMood} />
      {models.map(({ element, asset }) => (
        <Suspense key={element.id} fallback={null}>
          <ModelAsset asset={asset} element={element} />
        </Suspense>
      ))}
      {scene.elements
        .filter((element) => element.type === "artwork" && element.imageUrl)
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
        position={[0, 0.01, 0]}
        opacity={0.24}
        scale={10}
        blur={3.4}
        far={5}
      />
      <CameraRig
        ref={controller}
        cameraView={cameraView}
        editing={editing}
        onFocusChange={onFocusChange}
      />
      {quality === "high" && (
        <EffectComposer multisampling={4}>
          <N8AO aoRadius={1.4} intensity={0.75} distanceFalloff={1.2} />
          <SMAA />
        </EffectComposer>
      )}
    </>
  );
}

const SpatialGalleryScene = forwardRef<SpatialGalleryHandle, Props>(
  function SpatialGalleryScene(props, ref) {
    const controller = useRef<SpatialGalleryHandle>(null);
    useImperativeHandle(ref, () => ({
      focusArtwork: (element) => controller.current?.focusArtwork(element),
      backToRoom: () => controller.current?.backToRoom(),
      zoomIn: () => controller.current?.zoomIn(),
      zoomOut: () => controller.current?.zoomOut(),
      resetView: () => controller.current?.resetView(),
    }));
    return (
      <Canvas
        shadows
        dpr={props.quality === "mobile" ? [1, 1.25] : [1, 1.8]}
        camera={{
          position: props.cameraView?.position || [0.8, 1.62, 3.2],
          fov: props.cameraView?.fieldOfView || 44,
          near: 0.08,
          far: 30,
        }}
        gl={{
          antialias: true,
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
          <Scene props={props} controller={controller} />
        </Suspense>
      </Canvas>
    );
  },
);
export default SpatialGalleryScene;

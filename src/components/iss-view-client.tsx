import React, { useEffect, useRef, useState, Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Text, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useLoader } from "@react-three/fiber";

interface IssPosition {
    latitude: number;
    longitude: number;
}

interface UserLocation {
    latitude: number;
    longitude: number;
}

// Earth component with updated textures
function Earth({ children }: { children?: React.ReactNode }) {
    const earthRef = useRef<THREE.Mesh>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const { gl } = useThree();
    const [isUserInteracting, setIsUserInteracting] = useState(false);

    // Track user interaction with OrbitControls
    useEffect(() => {
        const handleInteractionStart = () => setIsUserInteracting(true);
        const handleInteractionEnd = () => setIsUserInteracting(false);

        // Add event listeners to detect orbit control interactions
        gl.domElement.addEventListener('pointerdown', handleInteractionStart);
        gl.domElement.addEventListener('pointerup', handleInteractionEnd);

        return () => {
            gl.domElement.removeEventListener('pointerdown', handleInteractionStart);
            gl.domElement.removeEventListener('pointerup', handleInteractionEnd);
        };
    }, [gl]);

    const textureLoader = new THREE.TextureLoader();
    // Use the correct version of textures from three-globe
    const earthDayMap = useLoader(THREE.TextureLoader, 'https://unpkg.com/three-globe@2.42.2/example/img/earth-blue-marble.jpg');
    const earthNightMap = useLoader(THREE.TextureLoader, 'https://unpkg.com/three-globe@2.42.2/example/img/earth-night.jpg');
    const earthTopologyMap = useLoader(THREE.TextureLoader, 'https://unpkg.com/three-globe@2.42.2/example/img/earth-topology.png');
    const earthWaterMap = useLoader(THREE.TextureLoader, 'https://unpkg.com/three-globe@2.42.2/example/img/earth-water.png');

    useEffect(() => {
        if (earthDayMap && earthNightMap && earthTopologyMap && earthWaterMap) {
            setIsLoaded(true);
        }

        // Additional texture processing
        [earthDayMap, earthNightMap, earthTopologyMap, earthWaterMap].forEach(texture => {
            if (texture) {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.anisotropy = 16;
            }
        });
    }, [earthDayMap, earthNightMap, earthTopologyMap, earthWaterMap]);

    useFrame(({ clock }) => {
        if (earthRef.current && !isUserInteracting) {
            // Slow rotation only when user is not interacting
            earthRef.current.rotation.y = clock.getElapsedTime() * 0.05;
        }
    });

    return (
        <group>
            <mesh ref={earthRef} castShadow receiveShadow>
                <sphereGeometry args={[2, 64, 64]} />
                <meshPhongMaterial
                    map={earthDayMap}
                    bumpMap={earthTopologyMap}
                    bumpScale={0.1}
                    displacementMap={earthWaterMap}
                    displacementScale={0.05}
                    specularMap={earthWaterMap}
                    specular={new THREE.Color(0x222222)}
                    shininess={5}
                />

                {/* Add a slightly larger sphere with the night texture */}
                <mesh>
                    <sphereGeometry args={[2.01, 64, 64]} />
                    <meshBasicMaterial
                        map={earthNightMap}
                        transparent
                        blending={THREE.AdditiveBlending}
                        opacity={0.8}
                        side={THREE.BackSide}
                        depthWrite={false}
                    />
                </mesh>

                {/* Add a subtle atmosphere effect */}
                <mesh>
                    <sphereGeometry args={[2.15, 64, 64]} />
                    <meshBasicMaterial
                        color={new THREE.Color(0x0077ff)}
                        transparent
                        opacity={0.05}
                        side={THREE.BackSide}
                        depthWrite={false}
                    />
                </mesh>

                {/* Render children (ISS and UserMarker) as part of Earth group so they rotate together */}
                {children}
            </mesh>
        </group>
    );
}

// Convert lat/long to 3D position
function latLongToVector3(lat: number, long: number, radius: number): THREE.Vector3 {
    // Convert latitude and longitude to radians
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (long + 180) * (Math.PI / 180);

    // Convert spherical coordinates to cartesian
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi); // Y is up
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

// ISS Model component
function ISS({ position }: { position: THREE.Vector3 }) {
    const issRef = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        // Make the ISS rotate slightly to simulate movement
        if (issRef.current) {
            issRef.current.rotation.y = clock.getElapsedTime() * 0.1;
        }
    });

    return (
        <group ref={issRef} position={position} scale={[0.15, 0.15, 0.15]}>
            <mesh castShadow>
                <boxGeometry args={[2, 0.5, 0.5]} />
                <meshPhongMaterial color="#cccccc" />
            </mesh>
            {/* Solar panels */}
            <mesh position={[0, 0, 1.5]} castShadow>
                <boxGeometry args={[4, 0.1, 2]} />
                <meshPhongMaterial color="#2266cc" />
            </mesh>
            <mesh position={[0, 0, -1.5]} castShadow>
                <boxGeometry args={[4, 0.1, 2]} />
                <meshPhongMaterial color="#2266cc" />
            </mesh>
            {/* Add a small point light to make the ISS visible */}
            <pointLight intensity={0.5} distance={2} color="#ffaa33" />
        </group>
    );
}

// User location marker
function UserMarker({ position }: { position: THREE.Vector3 }) {
    const markerRef = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        if (markerRef.current) {
            // Subtle animation to make the marker more visible
            markerRef.current.position.y = position.y + Math.sin(clock.getElapsedTime() * 2) * 0.02;
        }
    });

    return (
        <group ref={markerRef} position={position}>
            {/* Pin marker */}
            <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0, 0.04, 0.1, 8]} />
                <meshPhongMaterial color="#ff0000" />
            </mesh>
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshPhongMaterial color="#ff0000" />
            </mesh>
            {/* Label for the user location */}
            <Text
                position={[0, 0.2, 0]}
                scale={[0.2, 0.2, 0.2]}
                color="white"
                anchorX="center"
                anchorY="middle"
                fontSize={0.5}
                outlineWidth={0.02}
                outlineColor="#000000"
            >
                YOU
            </Text>
        </group>
    );
}

// Scene component
function Scene() {
    const issOrbitPoints = [
        { latitude: 40, longitude: -75 },
        { latitude: 42, longitude: -45 },
        { latitude: 30, longitude: -15 },
        { latitude: 10, longitude: 15 },
        { latitude: -10, longitude: 45 },
        { latitude: -30, longitude: 75 },
        { latitude: -40, longitude: 105 },
        { latitude: -35, longitude: 135 },
        { latitude: -15, longitude: 165 },
        { latitude: 10, longitude: -165 },
        { latitude: 30, longitude: -135 },
        { latitude: 45, longitude: -105 },
    ];

    const [issPos, setIssPos] = useState<IssPosition>({ latitude: 40, longitude: -75 });
    const userLocation: UserLocation = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco

    // Calculate world positions from lat/long coordinates
    const EARTH_RADIUS = 2; // Must match Earth component's sphere radius
    const issWorldPosition = useMemo(() =>
        latLongToVector3(issPos.latitude, issPos.longitude, EARTH_RADIUS * 1.05),
        [issPos]
    );

    const userWorldPosition = useMemo(() =>
        latLongToVector3(userLocation.latitude, userLocation.longitude, EARTH_RADIUS * 1.02),
        [userLocation]
    );

    // Update ISS position along the orbital path
    useFrame(({ clock }) => {
        const elapsedTime = clock.getElapsedTime();
        const index = Math.floor((elapsedTime * 0.2) % issOrbitPoints.length);
        setIssPos(issOrbitPoints[index]);
    });

    return (
        <>
            <ambientLight intensity={0.1} />
            <directionalLight
                position={[10, 10, 5]}
                intensity={1}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            <PerspectiveCamera makeDefault position={[0, 0, 10]} />
            <OrbitControls
                enablePan={false}
                minDistance={5}
                maxDistance={20}
                enableDamping
                dampingFactor={0.1}
            />

            <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />

            <Suspense fallback={null}>
                <Earth>
                    {/* Add ISS and UserMarker as children of Earth so they rotate with it */}
                    <ISS position={issWorldPosition} />
                    <UserMarker position={userWorldPosition} />
                </Earth>
            </Suspense>
        </>
    );
}

// The main client component
export default function IssViewClient() {
    const [currentIssPos, setCurrentIssPos] = useState<IssPosition>({ latitude: 40, longitude: -75 });
    const userLocation: UserLocation = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco
    const [isCanvasSupported, setIsCanvasSupported] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isTextureLoading, setIsTextureLoading] = useState(true);

    // Common orbit points shared across components
    const issOrbitPoints = [
        { latitude: 40, longitude: -75 },
        { latitude: 42, longitude: -45 },
        { latitude: 30, longitude: -15 },
        { latitude: 10, longitude: 15 },
        { latitude: -10, longitude: 45 },
        { latitude: -30, longitude: 75 },
        { latitude: -40, longitude: 105 },
        { latitude: -35, longitude: 135 },
        { latitude: -15, longitude: 165 },
        { latitude: 10, longitude: -165 },
        { latitude: 30, longitude: -135 },
        { latitude: 45, longitude: -105 },
    ];

    // Check if WebGL is supported and handle mobile detection
    useEffect(() => {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            setIsCanvasSupported(!!gl);

            // Check screen width for mobile detection
            setIsMobile(document.documentElement.clientWidth < 600);

            // Listen for resize events
            const handleResize = () => {
                setIsMobile(document.documentElement.clientWidth < 600);
            };

            window.addEventListener('resize', handleResize);

            // Textures can take time to load, simulate a minimum loading time
            const timer = setTimeout(() => {
                setIsTextureLoading(false);
            }, 3000);

            return () => {
                window.removeEventListener('resize', handleResize);
                clearTimeout(timer);
            };
        } catch (e) {
            setIsCanvasSupported(false);
        }
    }, []);

    // Update displayed ISS position every second using simulated positions
    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            setCurrentIssPos(issOrbitPoints[index]);
            index = (index + 1) % issOrbitPoints.length;
        }, 2000); // Update every 2 seconds

        return () => {
            clearInterval(interval);
        };
    }, []);

    // Format coordinates for display
    const formatCoordinate = (value: number, isLatitude: boolean) => {
        const direction = isLatitude
            ? (value >= 0 ? "N" : "S")
            : (value >= 0 ? "E" : "W");
        return `${Math.abs(value).toFixed(2)}° ${direction}`;
    };

    return (
        <div className="iss-container">
            <h2>International Space Station Tracker</h2>
            <div className="iss-coordinates">
                <div className="coordinate-box">
                    <div className="coordinate-label">ISS Location:</div>
                    <div className="coordinate-value">
                        Lat: {formatCoordinate(currentIssPos.latitude, true)},
                        Long: {formatCoordinate(currentIssPos.longitude, false)}
                    </div>
                </div>
                <div className="coordinate-box">
                    <div className="coordinate-label">Your Location:</div>
                    <div className="coordinate-value">
                        Lat: {formatCoordinate(userLocation.latitude, true)},
                        Long: {formatCoordinate(userLocation.longitude, false)}
                    </div>
                </div>
            </div>

            {isCanvasSupported ? (
                <div className="iss-canvas-container" style={{
                    width: '100%',
                    height: '500px',
                    backgroundColor: '#000',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    position: 'relative'
                }}>
                    {isTextureLoading && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            zIndex: 10
                        }}>
                            <div>
                                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                                    Loading Earth textures...
                                </div>
                                <div style={{
                                    width: '200px',
                                    height: '4px',
                                    backgroundColor: '#333',
                                    borderRadius: '2px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: '50%',
                                        height: '100%',
                                        backgroundColor: '#0077ff',
                                        animation: 'loading 1.5s infinite ease-in-out',
                                        transformOrigin: 'left center',
                                        borderRadius: '2px',
                                    }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <Canvas
                        dpr={[1, 1.5]} // Lower for better performance
                        camera={{ position: [0, 5, 15], fov: 45 }}
                        shadows
                        performance={{ min: 0.5 }}
                        gl={{
                            antialias: true,
                            alpha: true,
                            preserveDrawingBuffer: true,
                            powerPreference: 'high-performance'
                        }}
                        style={{ background: 'radial-gradient(circle at center, #000428 0%, #000 100%)' }}
                    >
                        <Scene />
                        <Suspense fallback={null}>
                            <EffectComposer>
                                <Bloom intensity={0.5} luminanceThreshold={0.2} />
                                <Vignette darkness={0.5} />
                            </EffectComposer>
                        </Suspense>
                    </Canvas>
                    <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '12px'
                    }}>
                        Rotate: Drag | Zoom: Scroll
                    </div>
                </div>
            ) : (
                <div className="iss-canvas-fallback" style={{
                    width: '100%',
                    height: '200px',
                    backgroundColor: '#112244',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: 'white'
                }}>
                    <p>3D visualization not available in your browser. ISS position data is still shown above.</p>
                </div>
            )}

            {/* Global styles for component */}
            <style>
                {`
                .iss-container {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
                    color: #333;
                    max-width: 100%;
                }
                
                .iss-coordinates {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 20px;
                    margin-bottom: 20px;
                }
                
                .coordinate-box {
                    background: #f0f4f8;
                    border-radius: 8px;
                    padding: 12px 16px;
                    min-width: 200px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .coordinate-label {
                    font-weight: 600;
                    margin-bottom: 5px;
                    color: #0055aa;
                }
                
                .coordinate-value {
                    font-family: monospace;
                    font-size: 14px;
                }
                
                @keyframes loading {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(200%);
                    }
                }
                `}
            </style>
        </div>
    );
} 
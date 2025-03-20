import React, { useRef, useState, Suspense, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls, Stars, PerspectiveCamera, Html } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { ISS, UserMarker, latLongToVector3 } from "./markers";

interface IssPosition {
    latitude: number;
    longitude: number;
    timestamp?: number;
}

interface UserLocation {
    latitude: number;
    longitude: number;
    country?: string;
    city?: string;
    isLoading: boolean;
}

// Earth component with updated textures
export function Earth({ children }: { children?: React.ReactNode }) {
    const earthRef = useRef<THREE.Mesh>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const { gl } = useThree();

    // Use textures from our public directory
    const earthDayMap = useLoader(THREE.TextureLoader, '/assets/earth-textures/earth-blue-marble.jpg');
    const earthNightMap = useLoader(THREE.TextureLoader, '/assets/earth-textures/earth-night.jpg');
    const earthTopologyMap = useLoader(THREE.TextureLoader, '/assets/earth-textures/earth-topology.png');
    const earthWaterMap = useLoader(THREE.TextureLoader, '/assets/earth-textures/earth-water.png');

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

        // Enhance the night map brightness slightly to make landmasses more visible
        if (earthNightMap) {
            earthNightMap.colorSpace = THREE.SRGBColorSpace;
        }
    }, [earthDayMap, earthNightMap, earthTopologyMap, earthWaterMap]);

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
                    specular={new THREE.Color(0x333333)}
                    shininess={10}
                    emissive={new THREE.Color(0x111111)}
                    emissiveIntensity={0.1}
                />

                {/* Night texture with improved visibility */}
                <mesh>
                    <sphereGeometry args={[2.01, 64, 64]} />
                    <meshBasicMaterial
                        map={earthNightMap}
                        transparent
                        blending={THREE.CustomBlending}
                        blendSrc={THREE.SrcAlphaFactor}
                        blendDst={THREE.OneMinusSrcAlphaFactor}
                        opacity={0.7}
                        side={THREE.BackSide}
                        depthWrite={false}
                    />
                </mesh>

                {/* Enhance night side with a subtle emissive overlay */}
                <mesh>
                    <sphereGeometry args={[2.005, 64, 64]} />
                    <meshBasicMaterial
                        color={new THREE.Color(0x223344)}
                        transparent
                        opacity={0.15}
                        side={THREE.FrontSide}
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>

                {/* Enhanced atmosphere effect */}
                <mesh>
                    <sphereGeometry args={[2.15, 64, 64]} />
                    <meshBasicMaterial
                        color={new THREE.Color(0x0088ff)}
                        transparent
                        opacity={0.07}
                        side={THREE.BackSide}
                        depthWrite={false}
                    />
                </mesh>

                {children}
            </mesh>
        </group>
    );
}

// Scene component
export function Scene({ issPositionHistory, userLocation }: {
    issPositionHistory: IssPosition[],
    userLocation: UserLocation
}) {
    const earthRef = useRef<THREE.Group>(null);
    const orbitControlsRef = useRef<any>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const [followingIss, setFollowingIss] = useState<boolean>(false);

    // Calculate world positions from lat/long coordinates
    const EARTH_RADIUS = 2; // Must match Earth component's sphere radius
    const ISS_ORBIT_HEIGHT = 0.3; // ISS orbits at ~400km (scaled to our model - adjusted for better visibility)

    // Determine if ISS data is loading
    const isIssLoading = useMemo(() => {
        return issPositionHistory.length === 0;
    }, [issPositionHistory]);

    // Use the latest ISS position from the history array instead of fetching it again
    const issPos = useMemo(() => {
        if (issPositionHistory.length > 0) {
            return issPositionHistory[issPositionHistory.length - 1];
        }
        // Fallback to default position if history is empty
        return { latitude: 40, longitude: -75 };
    }, [issPositionHistory]);

    // Calculate the ISS position with correct orbit height to prevent clipping
    const issWorldPosition = useMemo(() =>
        latLongToVector3(issPos.latitude, issPos.longitude, EARTH_RADIUS + ISS_ORBIT_HEIGHT),
        [issPos]
    );

    // Only create user marker if location is loaded
    const userWorldPosition = useMemo(() =>
        userLocation.isLoading
            ? null
            : latLongToVector3(userLocation.latitude, userLocation.longitude, EARTH_RADIUS * 1.02),
        [userLocation]
    );

    // Convert position history to 3D vectors for the trail
    const trailPositions = useMemo(() => {
        // Ensure we have valid positions before mapping
        if (!issPositionHistory || issPositionHistory.length === 0) {
            return [];
        }

        return issPositionHistory.map(pos =>
            latLongToVector3(pos.latitude, pos.longitude, EARTH_RADIUS + ISS_ORBIT_HEIGHT)
        );
    }, [issPositionHistory]);

    // Toggle ISS following mode
    const toggleIssFollow = () => {
        setFollowingIss(!followingIss);
    };

    // Camera control for ISS following
    useFrame(({ camera }) => {
        if (followingIss && issWorldPosition && !isIssLoading) {
            // Disable orbit controls when following the ISS
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enabled = false;
            }

            // Calculate camera target position - slightly offset from ISS for better viewing angle
            const offset = issWorldPosition.clone().normalize().multiplyScalar(2);
            const targetPosition = issWorldPosition.clone().add(offset);

            // Smoothly interpolate camera position
            camera.position.lerp(targetPosition, 0.05);

            // Look at the ISS
            camera.lookAt(issWorldPosition);
        } else if (orbitControlsRef.current) {
            // Re-enable orbit controls when not following
            orbitControlsRef.current.enabled = true;
        }
    });

    return (
        <>
            {/* Increased ambient light for overall brightness */}
            <ambientLight intensity={0.3} />

            {/* Main directional light (sun) */}
            <directionalLight
                position={[10, 10, 5]}
                intensity={1.2}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />

            {/* Hemisphere light to better illuminate the dark side */}
            <hemisphereLight
                args={[0x3366ff, 0x112244, 0.35]}
                position={[-5, -1, -5]}
            />

            <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 10]} />
            <OrbitControls
                ref={orbitControlsRef}
                enablePan={false}
                minDistance={3}
                maxDistance={25}
                enableDamping
                dampingFactor={0.1}
            />

            <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />

            <Suspense fallback={null}>
                {/* Earth, ISS and UserMarker no longer rotate */}
                <group ref={earthRef}>
                    <Earth />
                    {/* Only render ISS if data is loaded */}
                    {!isIssLoading && <ISS position={issWorldPosition} trailPositions={trailPositions} />}
                    {userWorldPosition && <UserMarker position={userWorldPosition} />}
                </group>
            </Suspense>

            {/* Loading Indicator - centered in canvas */}
            <Html fullscreen>
                {isIssLoading && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 100,
                        padding: '1rem',
                        background: 'rgba(30, 30, 30, 0.7)',
                        borderRadius: '8px',
                        color: 'white',
                        textAlign: 'center',
                        backdropFilter: 'blur(4px)',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}>
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-2"></div>
                            <div className="text-lg font-medium">Loading ISS location...</div>
                        </div>
                    </div>
                )}
            </Html>

            {/* Follow ISS Button - positioned in top right corner of canvas, only show when ISS is loaded */}
            <Html fullscreen>
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    zIndex: 100
                }}>
                    {!isIssLoading && (
                        <button
                            onClick={toggleIssFollow}
                            className={`px-4 py-2 rounded-full shadow-lg transition-all duration-300 ${followingIss
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-white text-indigo-600 hover:bg-gray-100'
                                }`}
                            style={{
                                fontFamily: 'sans-serif',
                                fontSize: '14px',
                                border: 'none',
                                outline: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {followingIss ? 'Exit ISS View' : 'Focus on ISS'}
                        </button>
                    )}
                </div>
            </Html>
        </>
    );
} 
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Text } from "@react-three/drei";

interface IssPosition {
    latitude: number;
    longitude: number;
}

interface UserLocation {
    latitude: number;
    longitude: number;
}

// Earth component with simple colors instead of potentially problematic textures
function Earth() {
    const earthRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (earthRef.current) {
            // Rotate Earth slowly
            earthRef.current.rotation.y += 0.001;
        }
    });

    return (
        <mesh ref={earthRef}>
            <sphereGeometry args={[5, 64, 64]} />
            <meshPhongMaterial
                color={new THREE.Color(0x2233aa)}
                shininess={15}
                emissive={new THREE.Color(0x112244)}
                emissiveIntensity={0.2}
            />
        </mesh>
    );
}

// Simple orbit path visualization
function OrbitPath() {
    const points = [];
    const radius = 5.15; // Slightly larger than Earth

    for (let i = 0; i < 100; i++) {
        const angle = (i / 100) * Math.PI * 2;
        const x = radius * Math.sin(angle);
        const z = radius * Math.cos(angle);
        points.push(new THREE.Vector3(x, 0, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    curve.closed = true;

    return (
        <group>
            <mesh>
                <tubeGeometry args={[curve, 100, 0.02, 8, true]} />
                <meshBasicMaterial color={0xffffff} opacity={0.3} transparent />
            </mesh>
        </group>
    );
}

// ISS component with label
function ISS({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            <mesh>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color={0xff0000} />
            </mesh>
            <Text
                position={[0, 0.3, 0]}
                fontSize={0.5}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.05}
                outlineColor="black"
            >
                ISS
            </Text>
        </group>
    );
}

// User location marker
function UserMarker({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            <mesh>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshBasicMaterial color={0x00ff00} />
            </mesh>
            <Text
                position={[0, 0.3, 0]}
                fontSize={0.3}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.05}
                outlineColor="black"
            >
                You
            </Text>
        </group>
    );
}

// Scene component
function Scene() {
    const { camera } = useThree();
    const [issPos, setIssPos] = useState<IssPosition>({ latitude: 40, longitude: -75 });

    // Simulated ISS orbit path - simplified for performance
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

    // Fixed user location
    const userLocation: UserLocation = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco

    useEffect(() => {
        // Set up camera position and a slight tilt for better perspective
        camera.position.z = 15;
        camera.position.y = 3;
        camera.lookAt(0, 0, 0);
    }, [camera]);

    // Animate ISS position along orbit path
    useFrame(({ clock }) => {
        const elapsedTime = clock.getElapsedTime();
        const index = Math.floor((elapsedTime * 0.2) % issOrbitPoints.length);
        setIssPos(issOrbitPoints[index]);
    });

    // Calculate ISS position based on latitude and longitude
    const issWorldPosition = React.useMemo(() => {
        const radius = 5.1; // Slightly larger than Earth radius
        const phi = (90 - issPos.latitude) * (Math.PI / 180);
        const theta = (issPos.longitude + 180) * (Math.PI / 180);

        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        return [x, y, z] as [number, number, number];
    }, [issPos]);

    // Calculate user position based on latitude and longitude
    const userWorldPosition = React.useMemo(() => {
        const radius = 5.05; // Slightly above Earth surface
        const phi = (90 - userLocation.latitude) * (Math.PI / 180);
        const theta = (userLocation.longitude + 180) * (Math.PI / 180);

        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        return [x, y, z] as [number, number, number];
    }, [userLocation]);

    return (
        <>
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 3, 5]} intensity={1} />
            <Earth />
            <OrbitPath />
            <UserMarker position={userWorldPosition} />
            <ISS position={issWorldPosition} />
            <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
            <OrbitControls enableDamping dampingFactor={0.05} rotateSpeed={0.7} minDistance={7} maxDistance={50} />
        </>
    );
}

// The main component
function IssViewContent() {
    const [currentIssPos, setCurrentIssPos] = useState<IssPosition>({ latitude: 40, longitude: -75 });
    const userLocation: UserLocation = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco
    const [isCanvasSupported, setIsCanvasSupported] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Check if WebGL is supported
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
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        } catch (e) {
            setIsCanvasSupported(false);
        }
    }, []);

    // Update displayed ISS position every second using simulated positions
    useEffect(() => {
        // Simulated ISS orbit path
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

        let index = 0;
        const interval = setInterval(() => {
            setCurrentIssPos(issOrbitPoints[index]);
            index = (index + 1) % issOrbitPoints.length;
        }, 2000); // Update every 2 seconds

        return () => {
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="iss-container">
            <h2>ISS Tracker (Simulation)</h2>

            {isCanvasSupported ? (
                <div className="iss-canvas-container" style={{
                    width: '100%',
                    height: '500px',
                    backgroundColor: '#000',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    <Canvas
                        dpr={[1, 2]} // Limit pixel ratio for better performance
                        performance={{ min: 0.1 }}
                        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
                    >
                        <Scene />
                    </Canvas>
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
                    <p>3D visualization not available in your browser. ISS position data is still shown below.</p>
                </div>
            )}

            <div className="iss-info" style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                marginTop: '20px',
                gap: '20px'
            }}>
                <div className="iss-position" style={{
                    flex: 1,
                    padding: '15px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px'
                }}>
                    <h3>ISS Current Position (Simulated)</h3>
                    <p>Latitude: {currentIssPos.latitude.toFixed(4)}°</p>
                    <p>Longitude: {currentIssPos.longitude.toFixed(4)}°</p>
                    <p>Last updated: {new Date().toLocaleTimeString()}</p>
                    <p><em>Note: This is a simulation and not the actual ISS position</em></p>
                </div>
                <div className="user-position" style={{
                    flex: 1,
                    padding: '15px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px'
                }}>
                    <h3>Your Location (Fixed Demo)</h3>
                    <p>Latitude: {userLocation.latitude.toFixed(4)}°</p>
                    <p>Longitude: {userLocation.longitude.toFixed(4)}°</p>
                    <p><em>Location shown: San Francisco, CA</em></p>
                </div>
            </div>
        </div>
    );
}

// This component is a placeholder that will be replaced by IssViewClient on the client side
export default function IssView() {
    return (
        <div className="iss-container" style={{ minHeight: "600px" }}>
            <h2>ISS Tracker (Simulation)</h2>
            <div style={{
                backgroundColor: "#f5f5f5",
                padding: "2rem",
                borderRadius: "8px",
                textAlign: "center",
                marginTop: "1rem"
            }}>
                <p>Loading ISS tracker...</p>
                <p><em>This component requires JavaScript to be enabled.</em></p>
            </div>
        </div>
    );
}

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";

// Convert lat/long to 3D position
export function latLongToVector3(lat: number, long: number, radius: number): THREE.Vector3 {
    // Convert latitude and longitude to radians
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (long + 180) * (Math.PI / 180);

    // Convert spherical coordinates to cartesian
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi); // Y is up
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

// Line that shows the ISS orbit trail
export function OrbitalTrail({ positions }: { positions: THREE.Vector3[] }) {
    const lineRef = useRef<THREE.Line>(null);
    const MAX_POINTS = 100; // Maximum number of points to keep in the trail

    // Create a gradient material for the trail to make it more visually appealing
    const lineMaterial = useMemo(() => {
        return new THREE.LineBasicMaterial({
            color: '#4a9bff',
            transparent: true,
            opacity: 0.8,
            linewidth: 2,
            depthTest: true
        });
    }, []);

    // Create point material for the trail vertices
    const pointsMaterial = useMemo(() => {
        return new THREE.PointsMaterial({
            color: '#6fc0ff',
            size: 0.05,
            transparent: true,
            opacity: 0.7,
            depthTest: true
        });
    }, []);

    // Safely handle positions and limit the number of points to MAX_POINTS
    const limitedPositions = useMemo(() => {
        // Verify positions is a valid array
        if (!positions || !Array.isArray(positions) || positions.length < 2) {
            return [];
        }

        // Ensure all items in the array are valid Vector3 objects
        const validPositions = positions.filter(
            pos => pos instanceof THREE.Vector3 &&
                !isNaN(pos.x) && !isNaN(pos.y) && !isNaN(pos.z)
        );

        // Limit to MAX_POINTS
        if (validPositions.length > MAX_POINTS) {
            return validPositions.slice(validPositions.length - MAX_POINTS);
        }

        return validPositions;
    }, [positions]);

    // No trail if we don't have at least 2 valid points
    if (limitedPositions.length < 2) return null;

    return (
        <group>
            {/* Main trail line */}
            <primitive
                object={new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints(limitedPositions),
                    lineMaterial
                )}
                ref={lineRef}
            />

            {/* Points along the trail to make it more visible */}
            <points>
                <bufferGeometry attach="geometry" setFromPoints={limitedPositions} />
                <primitive object={pointsMaterial} attach="material" />
            </points>
        </group>
    );
}

// ISS Model component
export function ISS({ position, trailPositions = [] }: { position: THREE.Vector3, trailPositions?: THREE.Vector3[] }) {
    const issRef = useRef<THREE.Group>(null);

    // Make sure position is a valid THREE.Vector3
    const safePosition = useMemo(() => {
        if (position instanceof THREE.Vector3 &&
            !isNaN(position.x) && !isNaN(position.y) && !isNaN(position.z)) {
            return position;
        }
        // Default position if the provided one is invalid
        return new THREE.Vector3(0, 2.3, 0);
    }, [position]);

    // Make sure trailPositions is a valid array
    const safeTrailPositions = useMemo(() => {
        if (!trailPositions || !Array.isArray(trailPositions)) {
            return [];
        }
        return trailPositions;
    }, [trailPositions]);

    useFrame(() => {
        if (issRef.current) {
            // Get the normalized direction from Earth's center to ISS position
            // This is the "up" direction relative to Earth's surface at the ISS location
            const normalizedDirection = safePosition.clone().normalize();

            // Set the ISS to look in the direction of its orbit
            // Assuming the ISS orbits roughly west to east (left to right)
            const orbitDirection = new THREE.Vector3();
            orbitDirection.crossVectors(normalizedDirection, new THREE.Vector3(0, 1, 0)).normalize();

            // Another perpendicular vector for the solar panel alignment
            const perpVector = new THREE.Vector3();
            perpVector.crossVectors(normalizedDirection, orbitDirection).normalize();

            // Create rotation matrix to properly orient the ISS
            const lookMatrix = new THREE.Matrix4();
            lookMatrix.makeBasis(
                orbitDirection,             // ISS forward direction (along its velocity vector)
                normalizedDirection,        // Up direction (pointing away from Earth)
                perpVector.negate()         // Right direction (perpendicular to orbit and up)
            );

            // Apply the rotation matrix to orient the ISS correctly relative to Earth's surface
            issRef.current.quaternion.setFromRotationMatrix(lookMatrix);
        }
    });

    return (
        <>
            {/* Add the orbital trail using the history of positions */}
            <OrbitalTrail positions={safeTrailPositions} />

            <group ref={issRef} position={safePosition} scale={[0.15, 0.15, 0.15]}>
                {/* Main Habitation Module */}
                <mesh castShadow position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.4, 0.4, 2.5, 16]} />
                    <meshPhongMaterial color="#e0e0e0" />
                </mesh>

                {/* Module connectors */}
                <mesh castShadow position={[0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.25, 0.25, 1.2, 16]} />
                    <meshPhongMaterial color="#c0c0c0" />
                </mesh>

                <mesh castShadow position={[-0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.25, 0.25, 1.2, 16]} />
                    <meshPhongMaterial color="#c0c0c0" />
                </mesh>

                {/* Side modules */}
                <mesh castShadow position={[1.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.3, 0.3, 1.2, 16]} />
                    <meshPhongMaterial color="#d0d0d0" />
                </mesh>

                <mesh castShadow position={[-1.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.3, 0.3, 1.2, 16]} />
                    <meshPhongMaterial color="#d0d0d0" />
                </mesh>

                {/* Solar Panel Arrays - now properly aligned to be parallel to Earth's surface */}
                {/* Left solar array */}
                <group position={[0, 0, 1.8]}>
                    <mesh castShadow position={[0, 0, 0.05]}>
                        <boxGeometry args={[5, 0.05, 1.6]} />
                        <meshPhongMaterial color="#2266cc" />
                    </mesh>
                    <mesh castShadow position={[0, 0, 0]}>
                        <boxGeometry args={[5.2, 0.1, 0.2]} />
                        <meshPhongMaterial color="#888888" />
                    </mesh>
                </group>

                {/* Right solar array */}
                <group position={[0, 0, -1.8]}>
                    <mesh castShadow position={[0, 0, -0.05]}>
                        <boxGeometry args={[5, 0.05, 1.6]} />
                        <meshPhongMaterial color="#2266cc" />
                    </mesh>
                    <mesh castShadow position={[0, 0, 0]}>
                        <boxGeometry args={[5.2, 0.1, 0.2]} />
                        <meshPhongMaterial color="#888888" />
                    </mesh>
                </group>

                {/* Add a small point light to make the ISS visible */}
                <pointLight intensity={0.7} distance={3} color="#ffaa33" />
            </group>
        </>
    );
}

// User location marker
export function UserMarker({ position }: { position: THREE.Vector3 }) {
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
                <meshPhongMaterial color="#4f46e5" />
            </mesh>
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshPhongMaterial color="#4f46e5" />
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
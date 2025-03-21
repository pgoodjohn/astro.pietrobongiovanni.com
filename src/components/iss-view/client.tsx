import React, { useEffect, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Scene } from "./scene";
import { IssLocationCard, UserLocationCard, DevelopmentTrackingCard } from "./cards";

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

// The main client component
export default function IssViewClient() {
    const [currentIssPos, setCurrentIssPos] = useState<IssPosition>({ latitude: 40, longitude: -75 });
    const [userLocation, setUserLocation] = useState<UserLocation>({
        latitude: 37.7749,
        longitude: -122.4194,
        isLoading: true
    }); // Default to San Francisco, but marked as loading
    const [isCanvasSupported, setIsCanvasSupported] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isTextureLoading, setIsTextureLoading] = useState(true);
    const [lastFetchedTime, setLastFetchedTime] = useState<string>("");
    const [issPositionHistory, setIssPositionHistory] = useState<IssPosition[]>([]);
    const [userIp, setUserIp] = useState<string>("");
    const [isDevelopment, setIsDevelopment] = useState<boolean>(false);

    // Fetch user's location based on IP
    useEffect(() => {
        const fetchUserLocation = async () => {
            try {
                // Using IP-API.com for geolocation based on IP
                const response = await fetch('https://api.ipify.org?format=json');
                const ipData = await response.json();

                // Get location data from IP
                const geoResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`);
                const data = await geoResponse.json();

                if (data.error === undefined) {
                    setUserLocation({
                        latitude: data.latitude,
                        longitude: data.longitude,
                        country: data.country_name,
                        city: data.city,
                        isLoading: false
                    });
                    // Store the user IP
                    setUserIp(ipData.ip);
                    console.log(`User location detected: ${data.city}, ${data.country_name}`);
                } else {
                    // If the API fails, mark as not loading but keep default coords
                    setUserLocation(prev => ({
                        ...prev,
                        isLoading: false
                    }));
                }
            } catch (error) {
                console.error("Error fetching user location:", error);
                // If there's an error, mark as not loading but keep default coords
                setUserLocation(prev => ({
                    ...prev,
                    isLoading: false
                }));
            }
        };

        fetchUserLocation();
    }, []);

    // Fetch the live ISS position
    useEffect(() => {
        const fetchIssPosition = async () => {
            try {
                const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
                const data = await response.json();

                if (data.latitude && data.longitude) {
                    const newPosition = {
                        latitude: data.latitude,
                        longitude: data.longitude,
                        timestamp: Date.now()
                    };

                    setCurrentIssPos(newPosition);

                    // Add to position history
                    setIssPositionHistory(prev => {
                        // Only add if position has changed significantly (avoid duplicate points when API hasn't updated)
                        const lastPos = prev[prev.length - 1];
                        if (!lastPos ||
                            Math.abs(lastPos.latitude - newPosition.latitude) > 0.01 ||
                            Math.abs(lastPos.longitude - newPosition.longitude) > 0.01) {
                            return [...prev, newPosition];
                        }
                        return prev;
                    });

                    // Update last fetched time
                    const now = new Date();
                    setLastFetchedTime(now.toLocaleTimeString());
                }
            } catch (error) {
                console.error("Error fetching ISS position:", error);
                // Keep current position if API fails
            }
        };

        // Initial fetch
        fetchIssPosition();

        // Update position every 5 seconds
        const interval = setInterval(fetchIssPosition, 5000);

        return () => {
            clearInterval(interval);
        };
    }, []);

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

    // Check if running in development environment
    useEffect(() => {
        // Check if we're running in a development environment
        // This is a simple check that looks at the hostname
        setIsDevelopment(
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('.local')
        );
    }, []);

    // Clear any previously saved history and start fresh on each page load
    useEffect(() => {
        // Clear any saved history from localStorage
        localStorage.removeItem('issPositionHistory');
        console.log('Starting fresh ISS tracking session');
    }, []);

    // Format time since first position was recorded
    const getTrackingDuration = () => {
        if (issPositionHistory.length === 0) return "Just started";

        const firstTimestamp = issPositionHistory[0]?.timestamp || Date.now();
        const durationMs = Date.now() - firstTimestamp;

        // Convert to hours, minutes, seconds
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    };

    return (
        <div className="w-full pb-8">
            <div className="container mx-auto px-4 py-4">
                <h1 className="text-2xl font-mono text-indigo-500 mb-6">
                    ISS Tracker
                </h1>
            </div>

            {isCanvasSupported ? (
                <div className="container mx-auto h-[calc(65vh-50px)] min-h-[600px] bg-black overflow-hidden relative my-6">
                    {isTextureLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white z-10">
                            <div>
                                <div className="text-center mb-3">
                                    Loading Earth textures...
                                </div>
                                <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="w-1/2 h-full bg-indigo-500 rounded-full animate-loading"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <Canvas
                        dpr={[1, 1.5]}
                        camera={{ position: [0, 5, 15], fov: 55 }}
                        shadows
                        performance={{ min: 0.5 }}
                        gl={{
                            antialias: true,
                            alpha: true,
                            preserveDrawingBuffer: true,
                            powerPreference: 'high-performance'
                        }}
                        style={{ background: 'radial-gradient(circle at center, #1e1354 0%, #000 100%)' }}
                    >
                        <Scene issPositionHistory={issPositionHistory} userLocation={userLocation} />
                        <Suspense fallback={null}>
                            <EffectComposer>
                                <Bloom intensity={0.5} luminanceThreshold={0.2} />
                                <Vignette darkness={0.5} />
                            </EffectComposer>
                        </Suspense>
                    </Canvas>

                    <div className="absolute bottom-3 right-3 bg-black/50 text-white px-3 py-1.5 rounded text-xs">
                        Rotate: Drag | Zoom: {isMobile ? "Pinch" : "Scroll"}
                    </div>
                </div>
            ) : (
                <div className="w-full h-48 bg-indigo-900 rounded-lg flex items-center justify-center text-white">
                    <p>3D visualization not available in your browser. ISS position data is still shown below.</p>
                </div>
            )}

            {/* Centered card container */}
            <div className="max-w-6xl mx-auto px-4">
                {/* Updated card layout - ISS and User location on single row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                    {/* ISS Location Card */}
                    <IssLocationCard
                        issPosition={currentIssPos}
                        lastFetchedTime={lastFetchedTime}
                    />

                    {/* User Location Card */}
                    <UserLocationCard
                        userLocation={userLocation}
                        userIp={userIp}
                    />
                </div>

                {/* Tracking Data Card - Only shown in development environment */}
                {isDevelopment && (
                    <div className="mt-5">
                        <DevelopmentTrackingCard
                            issPositionHistory={issPositionHistory}
                            getTrackingDuration={getTrackingDuration}
                        />
                    </div>
                )}
            </div>

            {/* Only keep necessary styles not covered by Tailwind */}
            <style>
                {`
                @keyframes loading {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(200%);
                    }
                }
                
                .animate-loading {
                    animation: loading 1.5s infinite ease-in-out;
                }
                
                @media (max-width: 768px) {
                    h1.text-5xl {
                        font-size: 1.875rem;
                    }
                }
                `}
            </style>
        </div>
    );
} 
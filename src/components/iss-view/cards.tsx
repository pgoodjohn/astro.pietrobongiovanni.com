import React from "react";

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

// Helper function to format coordinates for display
const formatCoordinate = (value: number, isLatitude: boolean) => {
    const direction = isLatitude
        ? (value >= 0 ? "N" : "S")
        : (value >= 0 ? "E" : "W");
    return `${Math.abs(value).toFixed(2)}° ${direction}`;
};

// ISS Location Card Component
export function IssLocationCard({
    issPosition,
    lastFetchedTime
}: {
    issPosition: IssPosition;
    lastFetchedTime: string;
}) {
    return (
        <div className="bg-white/5 border border-gray-200/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="font-mono text-base font-medium text-gray-800 mb-2">ISS Location</div>
            <div className="font-mono text-base text-gray-700">
                Lat: {formatCoordinate(issPosition.latitude, true)},
                Long: {formatCoordinate(issPosition.longitude, false)}
            </div>
            <div className="font-mono text-xs text-gray-500 mt-2 italic">
                Last updated: {lastFetchedTime}
            </div>
            <div className="font-mono text-xs text-gray-500 mt-2">
                Data provided by: <a href="http://api.open-notify.org/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Open Notify API</a>
            </div>
        </div>
    );
}

// User Location Card Component
export function UserLocationCard({ userLocation, userIp }: { userLocation: UserLocation; userIp: string }) {
    return (
        <div className="bg-white/5 border border-gray-200/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="font-mono text-base font-medium text-gray-800 mb-2">Your Location</div>
            {userLocation.isLoading ? (
                <div className="font-mono text-base text-gray-700">Detecting your location...</div>
            ) : (
                <div className="font-mono text-base text-gray-700">
                    {userLocation.city && userLocation.country && (
                        <div className="mb-1">{userLocation.city}, {userLocation.country}</div>
                    )}
                    <div>
                        Lat: {formatCoordinate(userLocation.latitude, true)},
                        Long: {formatCoordinate(userLocation.longitude, false)}
                    </div>
                    {userIp && (
                        <div className="mt-1 text-sm">IP Address: {userIp}</div>
                    )}
                </div>
            )}
            <div className="font-mono text-xs text-gray-500 mt-2">
                Location data provided by: <a href="https://ip-api.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">IP-API.com</a>
            </div>
        </div>
    );
}

// Development Tracking Card Component
export function DevelopmentTrackingCard({
    issPositionHistory,
    getTrackingDuration
}: {
    issPositionHistory: IssPosition[];
    getTrackingDuration: () => string;
}) {
    return (
        <div className="bg-white/5 border border-gray-200/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="font-mono text-base font-medium text-gray-800 mb-2">Tracking Data (Development Only)</div>
            <div className="font-mono text-base text-gray-700">
                <div>Trail Points: {issPositionHistory.length}</div>
                <div>Tracking Time: {getTrackingDuration()}</div>
                <div>Environment: Development Server</div>
            </div>
        </div>
    );
} 
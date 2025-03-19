import React from 'react';
import IssViewClient from './client';

// Export interfaces and components for potential reuse elsewhere
export { Earth, Scene } from './scene';
export { IssLocationCard, UserLocationCard, DevelopmentTrackingCard } from './cards';

// Export the main component
export default function IssView() {
    return <IssViewClient />;
} 
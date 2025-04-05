import React, { Suspense } from 'react';
import { KeyboardControls } from '@react-three/drei';
import { keyboardMap } from '../constants/controls';

/**
 * Main game scene component
 *
 * This component is responsible for setting up the 3D environment
 * including physics, lighting, and scene elements.
 */
export const R3F: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <KeyboardControls map={keyboardMap}>{children}</KeyboardControls>;
};

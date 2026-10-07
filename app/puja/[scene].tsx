import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Stage } from '../../components/puja/Stage';

/** One puja, full screen. */
export default function PujaScene() {
  const { scene } = useLocalSearchParams<{ scene: string }>();
  return <Stage sceneId={scene ?? 'shiva'} />;
}

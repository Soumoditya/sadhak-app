/** On the web Skia runs on CanvasKit, which loads first (served from /canvaskit.wasm). */
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { View } from 'react-native';

export function Stage({ sceneId }: { sceneId: string }) {
  return (
    <WithSkiaWeb
      opts={{ locateFile: (file: string) => `/${file}` }}
      getComponent={() => import('./PujaStage')}
      componentProps={{ sceneId }}
      fallback={<View style={{ flex: 1, backgroundColor: '#120c08' }} />}
    />
  );
}

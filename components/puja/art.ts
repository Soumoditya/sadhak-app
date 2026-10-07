/**
 * The puja pictures, bundled: four painted places (720 px wide) and twenty offerings cut out of
 * their white ground (384 px, transparent). About 870 KB in all.
 */
import type { Scene, SpriteName } from './scenes';

export const BG: Readonly<Record<Scene['bg'], number>> = {
  'bg-shiva': require('../../assets/puja/bg-shiva.webp'),
  'bg-havan': require('../../assets/puja/bg-havan.webp'),
  'bg-ghar-mandir': require('../../assets/puja/bg-ghar-mandir.webp'),
  'bg-tulsi': require('../../assets/puja/bg-tulsi.webp'),
};

/** The painted pictures are 720 × 1290. */
export const BG_ASPECT = 720 / 1290;

export const SPRITE: Readonly<Record<SpriteName, number>> = {
  'aarti-thali': require('../../assets/puja/aarti-thali.webp'),
  akshat: require('../../assets/puja/akshat.webp'),
  'bel-patra': require('../../assets/puja/bel-patra.webp'),
  bell: require('../../assets/puja/bell.webp'),
  'bowl-curd': require('../../assets/puja/bowl-curd.webp'),
  'bowl-ghee': require('../../assets/puja/bowl-ghee.webp'),
  'bowl-honey': require('../../assets/puja/bowl-honey.webp'),
  'bowl-milk': require('../../assets/puja/bowl-milk.webp'),
  'bowl-sandal': require('../../assets/puja/bowl-sandal.webp'),
  'bowl-water': require('../../assets/puja/bowl-water.webp'),
  coconut: require('../../assets/puja/coconut.webp'),
  conch: require('../../assets/puja/conch.webp'),
  diya: require('../../assets/puja/diya.webp'),
  firewood: require('../../assets/puja/firewood.webp'),
  guggal: require('../../assets/puja/guggal.webp'),
  incense: require('../../assets/puja/incense.webp'),
  kalash: require('../../assets/puja/kalash.webp'),
  lotus: require('../../assets/puja/lotus.webp'),
  marigold: require('../../assets/puja/marigold.webp'),
  paddy: require('../../assets/puja/paddy.webp'),
};

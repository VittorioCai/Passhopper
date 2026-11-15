import {
  BicycleIcon,
  BridgeIcon,
  CastleTurretIcon,
  CompassIcon,
  MountainsIcon,
  PizzaIcon,
  SnowflakeIcon,
  StarIcon,
  SunIcon,
  TrainIcon,
  TreeEvergreenIcon,
  WavesIcon,
  type Icon,
} from '@phosphor-icons/react';
import s from './IdeaEmblem.module.css';

const EMBLEMS: Record<string, Icon> = {
  'classic-central': StarIcon,
  italy: PizzaIcon,
  alps: MountainsIcon,
  'france-spain': WavesIcon,
  spain: SunIcon,
  scandinavia: TreeEvergreenIcon,
  norway: SnowflakeIcon,
  balkans: BridgeIcon,
  benelux: BicycleIcon,
  poland: CastleTurretIcon,
  'grand-tour': TrainIcon,
};

const SUN = { bg: '#ffd43b', ink: '#2a2100' };
const CORAL = { bg: '#ff8566', ink: '#3b0d02' };
const SKY = { bg: '#2456d6', ink: '#ffffff' };
const PINK = { bg: '#ffa3c7', ink: '#4a0d2a' };
const MINT = { bg: '#2bd4a4', ink: '#04261c' };
const VIOLET = { bg: '#6a48f0', ink: '#ffffff' };
const INK = { bg: '#0f1524', ink: '#ffffff' };
const LOOKS: Record<string, { bg: string; ink: string }> = {
  'classic-central': SUN,
  italy: CORAL,
  alps: SKY,
  'france-spain': PINK,
  spain: MINT,
  scandinavia: VIOLET,
  norway: INK,
  balkans: CORAL,
  benelux: SUN,
  poland: SKY,
  'grand-tour': MINT,
};

/** Poster colours and icon for a route idea. */
export const ideaLook = (id: string) => ({
  icon: EMBLEMS[id] ?? CompassIcon,
  ...(LOOKS[id] ?? MINT),
});

/** A route idea's picture: its icon on a tile in its poster colour. */
export function IdeaEmblem({ id, size = 48 }: { id: string; size?: number }) {
  const { icon: I, bg, ink } = ideaLook(id);
  return (
    <span
      className={s.tile}
      style={{ width: size, height: size, background: bg, color: ink }}
      aria-hidden="true"
    >
      <I size={Math.round(size * 0.56)} weight="duotone" />
    </span>
  );
}

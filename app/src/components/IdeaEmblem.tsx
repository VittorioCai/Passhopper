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
import { lineStyle } from '../lib';
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

/** A route idea's picture: an icon on a tile tinted with the colour of the route's first country. */
export function IdeaEmblem({
  id,
  country,
  size = 48,
}: {
  id: string;
  country: string;
  size?: number;
}) {
  const I = EMBLEMS[id] ?? CompassIcon;
  return (
    <span
      className={s.tile}
      data-line
      style={{ ...lineStyle(country), width: size, height: size }}
      aria-hidden="true"
    >
      <I size={Math.round(size * 0.54)} weight="duotone" />
    </span>
  );
}

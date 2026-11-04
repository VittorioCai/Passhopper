import {
  ArmchairIcon,
  CalendarDotsIcon,
  CaretLeftIcon,
  HouseIcon,
  PathIcon,
  PiggyBankIcon,
  SlidersHorizontalIcon,
  type Icon,
} from '@phosphor-icons/react';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router';
import { saveTrip, useTrip } from '../db/trips';
import { analyze, currentPlan } from '../engine/optimizer';
import { setLanguage } from '../i18n';
import type { Trip } from '../model/schema';
import type { TripContext } from './TripContext';
import ui from './ui.module.css';
import s from './AppShell.module.css';
import { Logo } from './Logo';

export const TRIP_TABS: { path: string; label: string; long: string; icon: Icon }[] = [
  { path: 'route', label: 'nav.route', long: 'nav.route', icon: PathIcon },
  { path: 'days', label: 'nav.days', long: 'nav.daysLong', icon: CalendarDotsIcon },
  { path: 'reservations', label: 'nav.seats', long: 'nav.seatsLong', icon: ArmchairIcon },
  { path: 'savings', label: 'nav.savings', long: 'nav.savings', icon: PiggyBankIcon },
];

function LanguageButton() {
  const { t, i18n } = useTranslation();
  return (
    <button
      type="button"
      className={s.langBtn}
      aria-label={t('lang.switchLabel')}
      onClick={() => void setLanguage(i18n.language === 'zh-CN' ? 'en' : 'zh-CN')}
    >
      {t('lang.switchTo')}
    </button>
  );
}

function TopBar({ title, back, right }: { title?: ReactNode; back?: string; right?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <header className={`${s.topbar} ${back ? s.withBack : ''}`}>
      {back && (
        <Link className={`${s.iconBtn} ${s.back}`} to={back} aria-label={t('common.back')}>
          <CaretLeftIcon size={20} weight="bold" />
        </Link>
      )}
      <div className={s.title}>{title}</div>
      <LanguageButton />
      {right}
    </header>
  );
}

function SideNav({ tripId, tripName }: { tripId?: string; tripName?: string }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <aside className={s.sidenav} aria-label={t('nav.myTrips')}>
      <Link to="/" className={s.logo}>
        <Logo />
        Passhopper
      </Link>
      <NavLink to="/" end className={s.navLink}>
        {({ isActive }) => (
          <>
            <HouseIcon size={20} weight={isActive ? 'fill' : 'bold'} />
            {t('nav.myTrips')}
          </>
        )}
      </NavLink>
      {tripId && (
        <>
          <div className={s.navLabel}>{tripName ?? t('nav.currentTrip')}</div>
          {TRIP_TABS.map(({ path, long, icon: I }) => {
            const to = `/trip/${tripId}/${path}`;
            const active = pathname === to;
            return (
              <NavLink key={path} to={to} className={s.navLink}>
                <I size={20} weight={active ? 'fill' : 'bold'} />
                {t(long)}
              </NavLink>
            );
          })}
        </>
      )}
      <div className={s.spacer} />
      <NavLink to="/settings" className={s.navLink}>
        <SlidersHorizontalIcon size={20} weight="bold" />
        {t('nav.settings')}
      </NavLink>
    </aside>
  );
}

function TabBar({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <nav className={s.tabbar} aria-label={t('nav.tabs')}>
      {TRIP_TABS.map(({ path, label, icon: I }) => {
        const to = `/trip/${tripId}/${path}`;
        const active = pathname === to;
        return (
          <NavLink key={path} to={to} className={s.tab}>
            <I size={22} weight={active ? 'fill' : 'bold'} />
            <span>{t(label)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function Shell({
  children,
  tripId,
  tripName,
}: {
  children: ReactNode;
  tripId?: string;
  tripName?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={s.app}>
      <div className={s.blobs} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <SideNav tripId={tripId} tripName={tripName} />
      <div className={s.main}>
        {children}
        {tripId && <TabBar tripId={tripId} />}
        <p className={s.footNote} style={{ paddingBottom: tripId ? 108 : 24 }}>
          {t('app.disclaimer')}
        </p>
      </div>
    </div>
  );
}

/** Layout for the home page. */
export function HomeLayout() {
  const { t } = useTranslation();
  return (
    <Shell>
      <TopBar
        title={
          <Link to="/" className={s.logo}>
            <Logo />
            Passhopper
          </Link>
        }
        right={
          <Link className={s.iconBtn} to="/settings" aria-label={t('nav.settings')}>
            <SlidersHorizontalIcon size={20} weight="bold" />
          </Link>
        }
      />
      <main className={s.view}>
        <Outlet />
      </main>
    </Shell>
  );
}

/** Layout for pages reached from home, such as Settings and New trip. */
export function SubpageLayout({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <Shell>
      <TopBar back="/" title={t(titleKey)} />
      <main className={s.view}>
        <Outlet />
      </main>
    </Shell>
  );
}

/** Layout for a trip's four pages, with the floating tab bar on phones. */
export function TripLayout() {
  const { tripId = '' } = useParams();
  const { t } = useTranslation();
  const trip = useTrip(tripId);
  const computed = useMemo(() => {
    if (!trip) return null;
    const analysis = analyze(trip);
    return { analysis, plan: currentPlan(trip, analysis) };
  }, [trip]);
  if (trip === undefined) return null;
  if (trip === null) {
    return (
      <Shell>
        <TopBar back="/" title={t('trip.notFound')} />
        <main className={s.view}>
          <div className={ui.card}>
            <p className={ui.muted}>{t('trip.notFoundBody')}</p>
          </div>
          <Link to="/" className={ui.btnPrimary}>
            {t('nav.myTrips')}
          </Link>
        </main>
      </Shell>
    );
  }
  const ctx: TripContext = {
    trip,
    update: (fn: (x: Trip) => Trip) => void saveTrip(fn(trip)),
    analysis: computed!.analysis,
    plan: computed!.plan,
  };
  return (
    <Shell tripId={tripId} tripName={trip.name}>
      <TopBar back="/" title={trip.name} />
      <main className={`${s.view} ${s.withTabs}`}>
        <Outlet context={ctx} />
      </main>
    </Shell>
  );
}

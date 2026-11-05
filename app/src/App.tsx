import { Navigate, Route, Routes } from 'react-router';
import { HomeLayout, SubpageLayout, TripLayout } from './components/AppShell';
import { Home } from './pages/Home';
import { NewTrip } from './pages/NewTrip';
import { Settings } from './pages/Settings';
import { RoutePage } from './pages/RoutePage';
import { DaysPage } from './pages/DaysPage';
import { SeatsPage } from './pages/SeatsPage';
import { SavingsPage } from './pages/SavingsPage';
import { SharePage } from './pages/SharePage';
import { RouteIdeas } from './pages/RouteIdeas';
import { RouteIdea } from './pages/RouteIdea';
import { PrintPage } from './pages/PrintPage';

export function App() {
  return (
    <Routes>
      <Route element={<HomeLayout />}>
        <Route index element={<Home />} />
      </Route>
      <Route element={<SubpageLayout titleKey="newTrip.title" />}>
        <Route path="new" element={<NewTrip />} />
      </Route>
      <Route element={<SubpageLayout titleKey="ideas.title" />}>
        <Route path="ideas" element={<RouteIdeas />} />
      </Route>
      <Route element={<SubpageLayout titleKey="ideas.title" back="/ideas" />}>
        <Route path="ideas/:id" element={<RouteIdea />} />
      </Route>
      <Route element={<SubpageLayout titleKey="share.title" />}>
        <Route path="share" element={<SharePage />} />
      </Route>
      <Route element={<SubpageLayout titleKey="settings.title" />}>
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="trip/:tripId/print" element={<PrintPage />} />
      <Route path="trip/:tripId" element={<TripLayout />}>
        <Route index element={<Navigate to="route" replace />} />
        <Route path="route" element={<RoutePage />} />
        <Route path="days" element={<DaysPage />} />
        <Route path="reservations" element={<SeatsPage />} />
        <Route path="savings" element={<SavingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

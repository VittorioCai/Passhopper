import { Navigate, Route, Routes } from 'react-router';
import { HomeLayout, SubpageLayout, TripLayout } from './components/AppShell';
import { Home } from './pages/Home';
import { NewTrip } from './pages/NewTrip';
import { Settings } from './pages/Settings';
import { DaysPage, RoutePage, SavingsPage, SeatsPage } from './pages/TripPages';

export function App() {
  return (
    <Routes>
      <Route element={<HomeLayout />}>
        <Route index element={<Home />} />
      </Route>
      <Route element={<SubpageLayout titleKey="newTrip.title" />}>
        <Route path="new" element={<NewTrip />} />
      </Route>
      <Route element={<SubpageLayout titleKey="settings.title" />}>
        <Route path="settings" element={<Settings />} />
      </Route>
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

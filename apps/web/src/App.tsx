import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import RightPanel from './components/RightPanel';
import MapView from './components/Map';
import { useThemeStore } from './state/themeStore';
import { hydrateAppStateFromHash, installUrlSync } from './state/urlSync';
import { loadBoundaries } from './data/loadBoundaries';
import { loadPopulation } from './data/loadPopulation';
import { loadMastr } from './data/loadMastr';
import { loadTimeseriesPv, loadTimeseriesWindOnshore } from './data/loadTimeseries';
import { loadWeather } from './data/loadWeather';
import './i18n';

function App() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    hydrateAppStateFromHash();
    return installUrlSync();
  }, []);

  useEffect(() => {
    void loadBoundaries();
    void loadPopulation();
    void loadMastr();
    void loadTimeseriesPv();
    void loadTimeseriesWindOnshore();
    void loadWeather();
  }, []);

  return (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative flex-1">
          <MapView />
          <Outlet />
        </main>
        <RightPanel />
      </div>
    </div>
  );
}

export default App;

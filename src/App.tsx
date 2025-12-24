import './styles/index.css';
import { Sidebar } from './components/common/Sidebar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { CacheCleanup } from './components/CacheCleanup/CacheCleanup';
import { DeveloperTools } from './components/DeveloperTools/DeveloperTools';
import { LeftoverFiles } from './components/LeftoverFiles/LeftoverFiles';
import { LargeFiles } from './components/LargeFiles/LargeFiles';
import { Duplicates } from './components/Duplicates/Duplicates';
import { ToastContainer } from './components/common/Toast';
import { useAppStore } from './stores/appStore';

function App() {
  const { currentSection, toasts, dismissToast } = useAppStore();

  const renderContent = () => {
    switch (currentSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'cache':
        return <CacheCleanup />;
      case 'developer':
        return <DeveloperTools />;
      case 'leftovers':
        return <LeftoverFiles />;
      case 'large-files':
        return <LargeFiles />;
      case 'duplicates':
        return <Duplicates />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Sidebar />
      {renderContent()}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;

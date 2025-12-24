import { useAppStore } from '../../stores/appStore';
import type { NavSection } from '../../types';
import {
  LayoutDashboard,
  Database,
  Code2,
  FolderX,
  FileVideo,
  Copy,
} from 'lucide-react';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'cache', label: 'Cache Cleanup', icon: <Database size={20} /> },
  { id: 'developer', label: 'Developer Tools', icon: <Code2 size={20} /> },
  { id: 'leftovers', label: 'Leftover Files', icon: <FolderX size={20} /> },
  { id: 'large-files', label: 'Large Files', icon: <FileVideo size={20} /> },
  { id: 'duplicates', label: 'Duplicates', icon: <Copy size={20} /> },
];

export function Sidebar() {
  const { currentSection, setSection } = useAppStore();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/sidebar_icon.png" alt="Logo" />
        </div>
        <div>
          <h1 className="sidebar-title">Quick Cleaner</h1>
          <p className="sidebar-subtitle">macOS Disk Optimizer</p>
        </div>
      </div>

      <nav>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li
              key={item.id}
              className={`nav-item ${currentSection === item.id ? 'active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

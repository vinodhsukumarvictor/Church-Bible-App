import React, { useContext, useState } from 'react';
import { Home, BookOpen, CheckCircle2, PenTool, MessageCircle, Settings, Menu, X } from 'lucide-react';

// Navigation Context for global state
export const NavigationContext = React.createContext();

export function NavigationProvider({ children }) {
  const [activeView, setActiveView] = useState('home');
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <NavigationContext.Provider value={{ activeView, setActiveView, drawerOpen, setDrawerOpen }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}

export default function Navigation() {
  const { activeView, setActiveView, drawerOpen, setDrawerOpen } = useNavigation();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'books', label: 'Bible', icon: BookOpen },
    { id: 'plans', label: 'Plans', icon: CheckCircle2 },
    { id: 'kids', label: 'Kids', icon: PenTool },
    { id: 'posts', label: 'Posts', icon: MessageCircle },
    { id: 'admin', label: 'Admin', icon: Settings },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-full overflow-x-auto">
          <div className="flex items-center justify-between min-w-full px-2 py-2">
            <div className="flex gap-1 flex-1 overflow-x-auto">
              {navItems.slice(0, 5).map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setDrawerOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label={item.label}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Menu Toggle (for additional items like Admin) */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all ml-2"
              aria-label="More options"
            >
              <Menu size={20} />
              <span className="text-xs font-medium">More</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Drawer for additional menu items */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-30"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer Panel */}
          <div className="fixed bottom-16 right-2 bg-white rounded-lg shadow-lg border border-gray-200 z-40 p-2 space-y-1">
            {navItems.slice(5).map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

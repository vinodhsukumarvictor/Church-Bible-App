import React from 'react';
import { useAuth } from '../contexts/AuthProvider';
import Auth from './Auth';
import { Menu } from 'lucide-react';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-white/60 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 text-white rounded flex items-center justify-center font-bold">BR</div>
          <div>
            <div className="text-sm font-medium">Bible Reader</div>
            <div className="text-xs text-muted-foreground">Track your reading progress</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded hover:bg-gray-100" aria-label="Menu">
            <Menu size={18} />
          </button>
          <Auth />
        </div>
      </div>
    </header>
  );
}

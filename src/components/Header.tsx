import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Disc,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Layers,
  Menu,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenImport: () => void;
  documentCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenImport,
  documentCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'charts', label: 'Charts', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'destaques', label: 'Destaques', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'lancamentos', label: 'Lançamentos trabalhados', icon: <Disc className="w-4 h-4" /> },
    { id: 'comparativo', label: 'Comparativo semanal', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'acoes', label: 'Ações', icon: <Layers className="w-4 h-4" /> },
    { id: 'capas', label: 'Capas', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'relatorio', label: 'Relatório PDF', icon: <FileText className="w-4 h-4" /> },
    { id: 'analitica', label: 'Base analítica', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'excluir', label: 'Excluir dados', icon: <Trash2 className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: ONErpm Brand & Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onTabChange('charts')}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden"
            >
              {/* ONErpm Geometric Icon Badge */}
              <div className="w-9 h-9 rounded-lg bg-[#FF5500] flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-sm group-hover:bg-[#E04B00] transition-colors">
                1R
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-slate-900 block leading-tight">
                  DSP Highlights
                </span>
                <span className="text-[11px] font-semibold text-[#FF5500] uppercase tracking-wider block">
                  ONErpm Intelligence
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-slate-100 text-[#FF5500]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Mobile Menu Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-bar for medium screens (lg/md) */}
      <div className="hidden lg:flex xl:hidden border-t border-slate-100 bg-slate-50/70 px-4 sm:px-6 py-2 overflow-x-auto gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
                isActive
                  ? 'bg-white text-[#FF5500] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-left ${
                  isActive
                    ? 'bg-orange-50 text-[#FF5500]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

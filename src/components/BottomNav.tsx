import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const navItems = [
    { path: '/', icon: 'bedtime', label: '睡眠' },
    { path: '/timeline', icon: 'analytics', label: '记录' },
    { path: '/map', icon: 'explore', label: '发现' },
    { path: '/social', icon: 'group', label: '睡友' },
    { path: '/profile', icon: 'person', label: '我的' },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-6xl px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="paper-panel glass-panel mx-auto flex w-full max-w-lg items-center justify-between rounded-[30px] px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'relative flex min-w-0 flex-1 items-center justify-center rounded-[24px] px-2 py-3 text-center transition-all duration-300',
                isActive
                  ? 'bg-white/80 text-primary shadow-[0_10px_24px_rgba(83,58,34,0.08)]'
                  : 'text-on-surface-variant hover:bg-white/50',
              )
            }
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-1">
                <span
                  className="material-symbols-outlined text-[21px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span className="font-body text-[11px] font-medium">{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

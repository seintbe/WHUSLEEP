import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';

export function Layout() {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/':
        return '睡眠';
      case '/timeline':
        return '记录';
      case '/map':
        return '发现';
      case '/social':
        return '睡友';
      case '/messageboard':
        return '留言';
      case '/profile':
        return '我的';
      default:
        return '睡了么';
    }
  };

  return (
    <div className="app-shell min-h-screen bg-background text-on-background font-body">
      <TopNav title={getPageTitle()} />
      <main className="relative mx-auto w-full max-w-6xl px-4 pb-32 pt-24 sm:px-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

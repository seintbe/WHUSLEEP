import { Menu, MoonStar, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function TopNav({ title = '睡了么' }: { title?: string }) {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const handleNavigate = (path: string) => {
    setShowMenu(false);
    navigate(path);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <div className="glass-panel paper-panel flex h-[4.5rem] items-center justify-between rounded-[28px] px-4 sm:px-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label={showMenu ? '关闭菜单' : '打开菜单'}
              onClick={() => setShowMenu(!showMenu)}
              data-ai-context="这个按钮会展开顶部快捷入口，方便切换到课表、个人中心和帮助相关页面。"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant bg-white/70 text-primary transition hover:bg-white cursor-pointer"
            >
              {showMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <p className="editorial-kicker">Sleep Atelier</p>
              <h1 className="font-headline text-2xl font-semibold tracking-tight text-on-surface">{title}</h1>
            </div>
          </div>
          <button
            type="button"
            aria-label="打开个人页"
            onClick={() => navigate('/profile')}
            data-ai-label="打开我的空间"
            data-ai-context="用户准备进入个人页查看或修改偏好设置。"
            className="flex h-11 items-center gap-3 rounded-full border border-outline-variant bg-white/72 px-3.5 text-on-surface transition hover:bg-white cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-primary">
              <MoonStar size={16} />
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant">Profile</p>
              <p className="text-sm font-medium">我的空间</p>
            </div>
          </button>
        </div>
      </header>

      {showMenu && (
        <div className="fixed inset-x-0 top-24 z-40 mx-auto max-w-6xl px-4 sm:px-6">
          <div className="paper-panel animate-slide-in max-w-sm overflow-hidden rounded-[30px]">
            <div className="relative p-6">
              <div className="absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-outline-variant to-transparent" />
              <div className="relative flex items-center gap-4 pt-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Sparkles size={22} />
                </div>
                <div>
                  <p className="editorial-kicker">Tonight's Setup</p>
                  <h3 className="font-headline text-2xl font-semibold text-on-surface">静下来，慢一点</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">把记录、路线和补觉建议整理在一起。</p>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={() => handleNavigate('/onboarding')}
                  data-ai-label="从顶部菜单进入课表识别与校准"
                  data-ai-context="用户希望通过快捷入口回到 OCR 与课表校准流程。"
                  className="flex w-full items-center gap-3 rounded-2xl border border-outline-variant bg-white/56 px-4 py-3 text-left transition hover:bg-white/88 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-primary">scan</span>
                  <span className="text-sm font-medium">课表识别与校准</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('/profile')}
                  data-ai-label="从顶部菜单进入个人中心"
                  data-ai-context="用户希望通过快捷入口查看个人资料和偏好设置。"
                  className="flex w-full items-center gap-3 rounded-2xl border border-outline-variant bg-white/56 px-4 py-3 text-left transition hover:bg-white/88 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-primary">person</span>
                  <span className="text-sm font-medium">个人中心</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('/social')}
                  data-ai-label="从顶部菜单进入睡友页"
                  data-ai-context="用户希望查看附近睡友、好友申请和聊天入口。"
                  className="flex w-full items-center gap-3 rounded-2xl border border-outline-variant bg-white/56 px-4 py-3 text-left transition hover:bg-white/88 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-primary">group</span>
                  <span className="text-sm font-medium">睡友社区</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('/messageboard')}
                  data-ai-label="从顶部菜单进入留言板"
                  data-ai-context="用户希望进入留言板查看社区动态、发布留言和互动。"
                  className="flex w-full items-center gap-3 rounded-2xl border border-outline-variant bg-white/56 px-4 py-3 text-left transition hover:bg-white/88 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-primary">forum</span>
                  <span className="text-sm font-medium">社区留言板</span>
                </button>
                <button
                  type="button"
                  data-ai-label="打开顶部菜单里的设置"
                  data-ai-context="这是顶部菜单中的设置预留入口。"
                  className="flex w-full items-center gap-3 rounded-2xl border border-outline-variant bg-white/56 px-4 py-3 text-left transition hover:bg-white/88 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-primary">settings</span>
                  <span className="text-sm font-medium">设置</span>
                </button>
              </div>

              <div className="mt-8 border-t border-outline-variant pt-6">
                <button
                  type="button"
                  data-ai-label="从顶部菜单退出登录"
                  data-ai-context="用户准备从顶部菜单退出当前账号状态。"
                  className="flex w-full items-center gap-3 rounded-2xl bg-error-container px-4 py-3 text-error transition hover:bg-error-container/80 cursor-pointer"
                >
                  <span className="material-symbols-outlined">logout</span>
                  <span className="text-sm font-medium">退出登录</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMenu && (
        <div
          className="fixed inset-0 z-30 bg-[rgba(36,29,25,0.16)] backdrop-blur-[2px]"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}

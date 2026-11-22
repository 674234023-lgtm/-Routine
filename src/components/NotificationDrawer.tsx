import React from 'react';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  onClose,
  onOpenSettings,
}) => {
  const { state, markAllNotificationsRead, clearNotifications } = useAppStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/30 backdrop-blur-[1px]">
      <div className="w-full max-w-md bg-white dark:bg-[#1F1926] border-l border-rose-200/70 dark:border-rose-900/40 h-full flex flex-col shadow-xl">
        <div className="px-6 py-4 border-b border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-rose-500" />
            <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
              กล่องแจ้งเตือน
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดกล่องแจ้งเตือน"
            className="p-1.5 rounded-xl text-stone-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-rose-100 dark:border-rose-900/30 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold hover:underline"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>อ่านทั้งหมดแล้ว</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="text-stone-600 dark:text-stone-300 hover:underline"
            >
              ตั้งค่าเวลาเตือน
            </button>
            <button
              type="button"
              onClick={clearNotifications}
              className="inline-flex items-center gap-1 text-stone-400 hover:text-rose-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้าง</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {state.notifications.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                ยังไม่มีการแจ้งเตือนใหม่ในขณะนี้
              </p>
              <p className="text-xs text-stone-400 mt-1">
                เมื่อถึงเวลาเตือนที่ตั้งไว้ ระบบจะส่งเสียงและแจ้งเตือนที่นี่
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {state.notifications.map((n) => (
                <li
                  key={n.id}
                  className={`p-3.5 rounded-xl border ${
                    n.read
                      ? 'bg-[#FFFDFD] dark:bg-[#141018] border-rose-100 dark:border-rose-900/30'
                      : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
                    {n.title}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 tabular-nums">
                    {new Date(n.triggeredAt).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

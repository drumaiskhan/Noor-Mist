import React from 'react';
import { Link } from 'react-router-dom';
import { HiMenuAlt2, HiBell, HiUser, HiSearch } from 'react-icons/hi';
import useAuthStore from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export default function TopBar({ onMenuClick }) {
  const { user } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 60000,
    retry: false,
  });

  const unread = data?.unreadCount || 0;

  return (
    <header className="h-16 bg-noir-card border-b border-gray-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg"
        >
          <HiMenuAlt2 className="w-5 h-5" />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all">
          <HiBell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-gold text-black text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
            <HiUser className="w-4 h-4 text-gold" />
          </div>
          <span className="hidden sm:block text-sm font-montserrat text-gray-300">
            {user?.first_name || 'Admin'}
          </span>
        </div>
      </div>
    </header>
  );
}

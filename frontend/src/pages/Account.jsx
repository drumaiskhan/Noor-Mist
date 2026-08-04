import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HiUser, HiClipboardList, HiHeart, HiCog, HiLogout,
  HiChevronRight, HiArchive, HiCheck,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useWishlistStore from '../store/wishlistStore';
import { orderAPI, authAPI } from '../services/api';
import { formatDate, formatPrice } from '../utils/helpers';

const tabs = [
  { key: 'profile', label: 'Profile', icon: HiUser },
  { key: 'orders', label: 'Orders', icon: HiClipboardList },
  { key: 'wishlist', label: 'Wishlist', icon: HiHeart },
  { key: 'settings', label: 'Settings', icon: HiCog },
];

const ORDER_STATUS_COLORS = {
  pending: 'text-warning bg-warning/10',
  confirmed: 'text-blue-400 bg-blue-400/10',
  processing: 'text-blue-400 bg-blue-400/10',
  packed: 'text-purple-400 bg-purple-400/10',
  shipped: 'text-indigo-400 bg-indigo-400/10',
  delivered: 'text-success bg-success/10',
  cancelled: 'text-danger bg-danger/10',
  refunded: 'text-theme-muted bg-theme-muted/10',
};

export default function Account() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore();
  const { items: wishlistItems } = useWishlistStore();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['myOrders'],
    queryFn: () => orderAPI.getAll({ my_orders: true }),
    enabled: isAuthenticated && activeTab === 'orders',
  });
  const orders = ordersData?.data?.orders || [];

  const updateProfileMutation = useMutation({
    mutationFn: (data) => authAPI.updateProfile(data),
    onSuccess: ({ data }) => {
      localStorage.setItem('noor_mist_user', JSON.stringify(data.user));
      checkAuth();
      setIsEditing(false);
      toast.success('Profile updated successfully');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data) => authAPI.changePassword(data),
    onSuccess: () => {
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      toast.success('Password changed successfully');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to change password'),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="text-center">
          <HiUser className="w-16 h-16 text-theme-muted mx-auto mb-4" />
          <h1 className="text-2xl font-playfair font-bold mb-4">Please Sign In</h1>
          <p className="text-theme-muted mb-6">You need to be logged in to access your account.</p>
          <Link to="/login" className="btn-gold">Sign In</Link>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    changePasswordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  };

  return (
    <>
      <Helmet>
        <title>My Account - Noor Mist</title>
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 md:pb-16">
        <h1 className="text-3xl font-playfair font-bold mb-8">My Account</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="luxury-card p-4 space-y-1">
              {/* Avatar */}
              <div className="flex flex-col items-center py-4 border-b border-gold/10 mb-2">
                <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center mb-2">
                  <span className="text-gold text-xl font-bold">
                    {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                  </span>
                </div>
                <p className="text-theme-text text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                <p className="text-theme-muted opacity-70 text-xs truncate max-w-full px-2">{user?.email}</p>
              </div>

              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all text-sm ${
                      activeTab === tab.key
                        ? 'bg-gold/10 text-gold'
                        : 'text-theme-muted hover:text-theme-primary hover:bg-gold/5'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-montserrat">{tab.label}</span>
                  </button>
                );
              })}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-danger hover:bg-danger/10 transition-all text-sm mt-4"
              >
                <HiLogout className="w-5 h-5" />
                <span className="font-montserrat">Logout</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="luxury-card p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-playfair font-bold">Profile Information</h2>
                  {!isEditing && (
                    <button
                      onClick={() => {
                        setProfileForm({
                          first_name: user?.first_name || '',
                          last_name: user?.last_name || '',
                          phone: user?.phone || '',
                        });
                        setIsEditing(true);
                      }}
                      className="text-sm text-gold hover:underline font-montserrat"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        label="First Name"
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                        required
                      />
                      <FormField
                        label="Last Name"
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      />
                      <div className="sm:col-span-2">
                        <FormField
                          label="Phone Number"
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="btn-gold text-sm"
                      >
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="btn-outline-gold text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoRow label="First Name" value={user?.first_name} />
                      <InfoRow label="Last Name" value={user?.last_name} />
                      <InfoRow label="Email" value={user?.email} />
                      <InfoRow label="Phone" value={user?.phone || 'Not provided'} />
                      <InfoRow label="Member Since" value={formatDate(user?.created_at)} />
                      <InfoRow label="Account Type" value={user?.role === 'admin' ? 'Administrator' : 'Customer'} />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="luxury-card p-6">
                  <h2 className="text-xl font-playfair font-bold mb-6">My Orders</h2>

                  {ordersLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="skeleton h-20 rounded-xl" />
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-10">
                      <HiArchive className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                      <p className="text-theme-muted mb-4">No orders yet.</p>
                      <Link to="/shop" className="btn-gold text-sm">Start Shopping</Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="border border-theme-border/60 rounded-xl p-4 hover:border-gold/30 transition-colors">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <p className="text-theme-text font-montserrat font-medium text-sm">{order.order_number}</p>
                              <p className="text-theme-muted opacity-70 text-xs mt-0.5">{formatDate(order.created_at)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs font-montserrat px-2.5 py-1 rounded-full capitalize ${ORDER_STATUS_COLORS[order.status] || 'text-theme-muted bg-theme-muted/10'}`}>
                                {order.status}
                              </span>
                              <span className="text-gold font-bold text-sm">{formatPrice(order.total_amount)}</span>
                            </div>
                          </div>
                          {order.items && order.items.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {order.items.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="text-xs text-theme-muted">
                                  {item.product_name} ({item.variant_size}) × {item.quantity}
                                  {idx < Math.min(order.items.length, 3) - 1 && ','}
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <span className="text-xs text-theme-muted opacity-70">+{order.items.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Wishlist Tab */}
            {activeTab === 'wishlist' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="luxury-card p-6">
                <h2 className="text-xl font-playfair font-bold mb-6">My Wishlist</h2>
                {wishlistItems.length === 0 ? (
                  <div className="text-center py-10">
                    <HiHeart className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                    <p className="text-theme-muted mb-4">Your wishlist is empty.</p>
                    <Link to="/shop" className="btn-gold text-sm">Explore Perfumes</Link>
                  </div>
                ) : (
                  <div>
                    <p className="text-theme-muted mb-4">{wishlistItems.length} items saved</p>
                    <Link to="/wishlist" className="btn-outline-gold text-sm inline-flex items-center gap-2">
                      View Wishlist
                      <HiChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Change Password */}
                <div className="luxury-card p-6">
                  <h2 className="text-xl font-playfair font-bold mb-6">Change Password</h2>
                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <FormField
                      label="Current Password"
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      required
                    />
                    <FormField
                      label="New Password"
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      required
                    />
                    <FormField
                      label="Confirm New Password"
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      required
                    />
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="btn-gold text-sm"
                    >
                      {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>

                {/* Danger Zone */}
                <div className="luxury-card p-6 border border-danger/20">
                  <h3 className="text-lg font-playfair font-bold text-danger mb-2">Account Actions</h3>
                  <p className="text-theme-muted text-sm mb-4">Sign out of your Noor Mist account on this device.</p>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-danger border border-danger/30 px-4 py-2 rounded-lg hover:bg-danger/10 transition-colors font-montserrat"
                  >
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="py-3 border-b border-theme-border/60 last:border-0">
      <p className="text-theme-muted opacity-70 text-xs font-montserrat uppercase tracking-wider mb-1">{label}</p>
      <p className="text-theme-text text-sm">{value}</p>
    </div>
  );
}

function FormField({ label, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label className="block text-sm text-theme-muted mb-2 font-montserrat">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-noir border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none text-sm transition-colors"
      />
    </div>
  );
}

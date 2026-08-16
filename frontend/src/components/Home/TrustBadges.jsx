import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { HiTruck, HiShieldCheck, HiRefresh, HiPhone } from 'react-icons/hi';
import { settingsAPI } from '../../services/api';
import { formatPrice } from '../../utils/helpers';

export default function TrustBadges({ data = {} }) {
  const { data: settings = {} } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data } = await settingsAPI.get();
      return data.settings || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const freeShippingThreshold = settings.shipping_free_threshold !== undefined
    ? Number(settings.shipping_free_threshold) : (settings.free_shipping_threshold !== undefined ? Number(settings.free_shipping_threshold) : 5000);

  const badges = [
    {
      icon: HiTruck,
      title: data.freeShippingTitle || 'Free Shipping',
      subtitle: (data.freeShippingText || 'On orders over {{free_shipping_threshold}}').replace('{{free_shipping_threshold}}', formatPrice(freeShippingThreshold)),
    },
    {
      icon: HiShieldCheck,
      title: data.authenticTitle || '100% Authentic',
      subtitle: data.authenticText || 'Guaranteed original fragrances',
    },
    {
      icon: HiRefresh,
      title: data.returnsTitle || 'Easy Returns',
      subtitle: data.returnsText || '7-day hassle-free returns',
    },
    {
      icon: HiPhone,
      title: data.supportTitle || '24/7 Support',
      subtitle: data.supportText || 'Dedicated customer service',
    },
  ];

  return (
    <section className="py-12 bg-noir-card border-y border-gold/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <motion.div
                key={badge.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="flex flex-col items-center text-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-theme-text text-sm font-montserrat font-semibold">{badge.title}</p>
                  <p className="text-theme-muted opacity-70 text-xs mt-0.5">{badge.subtitle}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

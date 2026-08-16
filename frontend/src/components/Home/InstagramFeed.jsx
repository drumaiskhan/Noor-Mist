import React from 'react';
import { motion } from 'framer-motion';
import { FaInstagram } from 'react-icons/fa';

export default function InstagramFeed({ data = {} }) {
  // The old fallback pointed at demo Cloudinary URLs that don't actually
  // exist, so with no real posts configured the grid just showed six
  // broken-image icons. Better to show nothing until the admin adds real
  // posts (Admin → Homepage Builder → Instagram section) than to fake it.
  const posts = data.posts?.length > 0 ? data.posts : [];
  const handle = data.handle || '@noormist';
  const instagramUrl = `https://instagram.com/${handle.replace(/^@/, '')}`;

  if (posts.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-noir">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gold hover:underline mb-4"
          >
            <FaInstagram className="w-5 h-5" />
            <span className="font-montserrat text-sm uppercase tracking-wider">{handle}</span>
          </a>
          <h2 className="section-title">
            {data.title || 'Follow Us on Instagram'}
          </h2>
          <p className="section-subtitle">
            {data.subtitle || 'Join our community of fragrance lovers'}
          </p>
        </motion.div>

        {/* Instagram Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
          {posts.map((post, index) => (
            <motion.a
              key={post.id}
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="group relative aspect-square rounded-xl overflow-hidden bg-noir-card"
            >
              <img
                src={post.image}
                alt={`Instagram post ${post.id}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                onError={(e) => { e.currentTarget.closest('a').style.display = 'none'; }}
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-theme-bg/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="text-center text-theme-text">
                  <FaInstagram className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-xs font-montserrat">{post.likes} likes</p>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

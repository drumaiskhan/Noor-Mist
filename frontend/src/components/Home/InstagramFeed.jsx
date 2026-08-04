import React from 'react';
import { motion } from 'framer-motion';
import { FaInstagram } from 'react-icons/fa';

const defaultPosts = [
  { id: 1, image: 'https://res.cloudinary.com/demo/image/upload/v1/noor-mist/instagram/1.jpg', likes: '2.4K', comments: '128' },
  { id: 2, image: 'https://res.cloudinary.com/demo/image/upload/v1/noor-mist/instagram/2.jpg', likes: '1.8K', comments: '95' },
  { id: 3, image: 'https://res.cloudinary.com/demo/image/upload/v1/noor-mist/instagram/3.jpg', likes: '3.2K', comments: '210' },
  { id: 4, image: 'https://res.cloudinary.com/demo/image/upload/v1/noor-mist/instagram/4.jpg', likes: '2.1K', comments: '156' },
  { id: 5, image: 'https://res.cloudinary.com/demo/image/upload/v1/noor-mist/instagram/5.jpg', likes: '4.5K', comments: '320' },
  { id: 6, image: 'https://res.cloudinary.com/demo/image/upload/v1/noor-mist/instagram/6.jpg', likes: '1.5K', comments: '87' },
];

export default function InstagramFeed({ data = {} }) {
  const posts = data.posts || defaultPosts;

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
            href={data.instagramUrl || 'https://instagram.com/noormist'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gold hover:underline mb-4"
          >
            <FaInstagram className="w-5 h-5" />
            <span className="font-montserrat text-sm uppercase tracking-wider">@noormist</span>
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
              href={data.instagramUrl || 'https://instagram.com/noormist'}
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

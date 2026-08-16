import React from 'react';
import { motion } from 'framer-motion';

const NoteTag = ({ note, delay }) => (
  <motion.span
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.4 }}
    className="px-3 py-1 text-sm rounded-full bg-gold/10 border border-gold/20 text-champagne font-inter"
  >
    {note}
  </motion.span>
);

export default function FragrancePyramid({ topNotes = [], middleNotes = [], baseNotes = [] }) {
  if (!topNotes.length && !middleNotes.length && !baseNotes.length) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-playfair font-bold gold-text">Fragrance Pyramid</h3>
      <div className="relative">
        {/* Pyramid Visual */}
        <div className="space-y-1">
          {/* Top */}
          {topNotes.length > 0 && (
            <div className="group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-gold/60 animate-pulse" />
                <p className="text-xs font-montserrat uppercase tracking-widest text-theme-muted">
                  Top Notes <span className="text-gold/50 ml-1">• First impression</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {topNotes.map((note, i) => <NoteTag key={note} note={note} delay={i * 0.05} />)}
              </div>
            </div>
          )}

          {/* Divider */}
          {topNotes.length > 0 && middleNotes.length > 0 && (
            <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent my-3" />
          )}

          {/* Heart */}
          {middleNotes.length > 0 && (
            <div className="group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-gold animate-pulse delay-200" />
                <p className="text-xs font-montserrat uppercase tracking-widest text-theme-muted">
                  Heart Notes <span className="text-gold/50 ml-1">• Character</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {middleNotes.map((note, i) => <NoteTag key={note} note={note} delay={0.2 + i * 0.05} />)}
              </div>
            </div>
          )}

          {/* Divider */}
          {middleNotes.length > 0 && baseNotes.length > 0 && (
            <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent my-3" />
          )}

          {/* Base */}
          {baseNotes.length > 0 && (
            <div className="group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-gold-dark animate-pulse delay-400" />
                <p className="text-xs font-montserrat uppercase tracking-widest text-theme-muted">
                  Base Notes <span className="text-gold/50 ml-1">• Lasting memory</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {baseNotes.map((note, i) => <NoteTag key={note} note={note} delay={0.4 + i * 0.05} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';

const noteColors = {
  top: { bg: 'from-green-500/10 to-green-500/5', border: 'border-green-500/30', label: 'text-green-400', dot: 'bg-green-400' },
  middle: { bg: 'from-purple-500/10 to-purple-500/5', border: 'border-purple-500/30', label: 'text-purple-400', dot: 'bg-purple-400' },
  base: { bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/30', label: 'text-amber-400', dot: 'bg-amber-400' },
};

export default function ProductNotes({ topNotes = [], middleNotes = [], baseNotes = [] }) {
  if (!topNotes.length && !middleNotes.length && !baseNotes.length) {
    return (
      <p className="text-theme-muted">No fragrance notes available.</p>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-theme-muted text-lg leading-relaxed">
        Discover the intricate layers of this exquisite fragrance, from the initial impression
        to the lasting memory it leaves behind.
      </p>

      {/* Notes Pyramid */}
      <div className="space-y-6">
        {/* Top Notes */}
        {topNotes.length > 0 && (
          <NoteSection
            title="Top Notes"
            description="The first impression, lasting 15-30 minutes"
            notes={topNotes}
            colors={noteColors.top}
            delay={0}
          />
        )}

        {/* Middle Notes */}
        {middleNotes.length > 0 && (
          <NoteSection
            title="Heart Notes"
            description="The soul of the fragrance, emerging after 30 minutes"
            notes={middleNotes}
            colors={noteColors.middle}
            delay={0.2}
          />
        )}

        {/* Base Notes */}
        {baseNotes.length > 0 && (
          <NoteSection
            title="Base Notes"
            description="The lasting impression, developing after 2 hours"
            notes={baseNotes}
            colors={noteColors.base}
            delay={0.4}
          />
        )}
      </div>
    </div>
  );
}

function NoteSection({ title, description, notes, colors, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl p-6`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
        <h4 className={`font-playfair font-bold text-lg ${colors.label}`}>{title}</h4>
      </div>
      <p className="text-theme-muted text-sm mb-4">{description}</p>
      <div className="flex flex-wrap gap-2">
        {notes.map((note) => (
          <span
            key={note}
            className="px-4 py-2 bg-black/30 border border-theme-border rounded-full text-sm text-theme-text font-cormorant"
          >
            {note}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

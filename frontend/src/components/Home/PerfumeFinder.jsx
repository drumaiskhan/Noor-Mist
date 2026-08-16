import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HiSparkles, HiHeart, HiSun, HiMoon, HiBriefcase, HiStar } from 'react-icons/hi';

const occasions = [
  { value: 'daily', label: 'Daily', icon: HiSun },
  { value: 'office', label: 'Office', icon: HiBriefcase },
  { value: 'date', label: 'Date Night', icon: HiHeart },
  { value: 'wedding', label: 'Wedding', icon: HiSparkles },
  { value: 'luxury_event', label: 'Luxury Event', icon: HiStar },
];

const moods = [
  { value: 'fresh', label: 'Fresh', description: 'Clean & invigorating' },
  { value: 'sweet', label: 'Sweet', description: 'Warm & comforting' },
  { value: 'woody', label: 'Woody', description: 'Earthy & grounded' },
  { value: 'oud', label: 'Oud', description: 'Rich & intense' },
  { value: 'floral', label: 'Floral', description: 'Romantic & elegant' },
  { value: 'oriental', label: 'Oriental', description: 'Exotic & sensual' },
];

const genders = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
];

export default function PerfumeFinder({ data = {} }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedOccasion, setSelectedOccasion] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);

  const handleFind = () => {
    const params = new URLSearchParams();
    if (selectedGender) params.append('gender', selectedGender);
    if (selectedMood) params.append('fragrance_family', selectedMood);
    if (selectedOccasion) params.append('occasion', selectedOccasion);
    navigate(`/shop?${params.toString()}`);
  };

  const resetFinder = () => {
    setStep(1);
    setSelectedOccasion(null);
    setSelectedMood(null);
    setSelectedGender(null);
  };

  return (
    <section className="py-16 md:py-24 bg-noir">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="section-title">
            {data.title || 'Find Your Perfect Scent'}
          </h2>
          <p className="section-subtitle">
            {data.subtitle || 'Let us guide you to your signature fragrance'}
          </p>
        </motion.div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <motion.div
              key={s}
              animate={{
                scale: step === s ? 1 : 0.8,
                opacity: step >= s ? 1 : 0.3,
              }}
              className={`w-3 h-3 rounded-full ${
                step >= s ? 'bg-gold' : 'bg-theme-border'
              }`}
            />
          ))}
        </div>

        {/* Finder Content */}
        <div className="luxury-card p-6 md:p-10">
          <AnimatePresence mode="wait">
            {/* Step 1: Occasion */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-xl font-playfair font-bold text-center mb-2">
                  What's the occasion?
                </h3>
                <p className="text-theme-muted text-center mb-8 text-sm">
                  Select where you'll wear this fragrance
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {occasions.map((occasion) => {
                    const Icon = occasion.icon;
                    const isSelected = selectedOccasion === occasion.value;
                    return (
                      <motion.button
                        key={occasion.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedOccasion(occasion.value);
                          setTimeout(() => setStep(2), 300);
                        }}
                        className={`finder-option flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-gold bg-gold/10'
                            : 'border-theme-border hover:border-theme-muted'
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-gold' : 'text-theme-muted'}`} />
                        <span className={`text-sm font-montserrat ${isSelected ? 'text-gold' : 'text-theme-muted'}`}>
                          {occasion.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="text-center mt-6">
                  <button
                    onClick={() => setStep(2)}
                    className="text-sm text-theme-muted hover:text-theme-primary transition-colors"
                  >
                    Skip this step →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Mood */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-xl font-playfair font-bold text-center mb-2">
                  What's your mood?
                </h3>
                <p className="text-theme-muted text-center mb-8 text-sm">
                  Choose the fragrance family that matches your style
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {moods.map((mood) => {
                    const isSelected = selectedMood === mood.value;
                    return (
                      <motion.button
                        key={mood.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedMood(mood.value);
                          setTimeout(() => setStep(3), 300);
                        }}
                        className={`finder-option text-left p-5 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-gold bg-gold/10'
                            : 'border-theme-border hover:border-theme-muted'
                        }`}
                      >
                        <span className={`block font-montserrat font-semibold mb-1 ${isSelected ? 'text-gold' : 'text-theme-text'}`}>
                          {mood.label}
                        </span>
                        <span className="block text-xs text-theme-muted">{mood.description}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-theme-muted hover:text-theme-primary transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="text-sm text-theme-muted hover:text-theme-primary transition-colors"
                  >
                    Skip this step →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Gender */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-xl font-playfair font-bold text-center mb-2">
                  Who is it for?
                </h3>
                <p className="text-theme-muted text-center mb-8 text-sm">
                  Select the gender preference
                </p>
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                  {genders.map((gender) => {
                    const isSelected = selectedGender === gender.value;
                    return (
                      <motion.button
                        key={gender.value}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedGender(gender.value)}
                        className={`finder-option p-6 rounded-xl border transition-all text-center ${
                          isSelected
                            ? 'border-gold bg-gold/10'
                            : 'border-theme-border hover:border-theme-muted'
                        }`}
                      >
                        <span className={`block text-lg font-playfair font-bold mb-1 ${isSelected ? 'gold-text' : 'text-theme-text'}`}>
                          {gender.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => setStep(2)}
                    className="text-sm text-theme-muted hover:text-theme-primary transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleFind}
                    className="btn-gold text-sm"
                  >
                    Find My Perfume ✨
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reset */}
        {step > 1 && (
          <div className="text-center mt-4">
            <button
              onClick={resetFinder}
              className="text-xs text-theme-muted opacity-70 hover:text-theme-primary transition-colors"
            >
              Start Over
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

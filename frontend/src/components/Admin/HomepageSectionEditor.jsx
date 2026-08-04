import React, { useState } from 'react';
import { HiPencil, HiCheck, HiX, HiEye, HiEyeOff } from 'react-icons/hi';
import Input from '../UI/Input';

export default function HomepageSectionEditor({ section, onSave }) {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState(section.content_data || {});
  const [enabled, setEnabled] = useState(section.is_enabled);

  const handleSave = () => {
    onSave(section.id, { content_data: data, is_enabled: enabled });
    setEditing(false);
  };

  const handleChange = (key, value) => {
    setData({ ...data, [key]: value });
  };

  return (
    <div className="luxury-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-playfair font-bold text-white">{section.title}</h4>
          <p className="text-xs text-gray-500 capitalize">{section.section_type.replace('_', ' ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEnabled(!enabled); onSave(section.id, { is_enabled: !enabled }); }}
            className={`p-2 rounded-lg transition-all ${enabled ? 'text-green-400 bg-green-400/10' : 'text-gray-500 hover:text-gray-300'}`}
            title={enabled ? 'Disable section' : 'Enable section'}
          >
            {enabled ? <HiEye className="w-4 h-4" /> : <HiEyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="p-2 text-gold/60 hover:text-gold rounded-lg hover:bg-gold/5 transition-all"
          >
            <HiPencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="space-y-3 border-t border-gray-800 pt-4">
          {Object.entries(data).map(([key, value]) => (
            typeof value === 'string' && (
              <Input
                key={key}
                label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                value={value}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            )
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 bg-gold text-black rounded-lg text-sm font-semibold hover:bg-gold-light transition-colors">
              <HiCheck className="w-4 h-4" /> Save
            </button>
            <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-4 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm hover:text-white transition-colors">
              <HiX className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  HiPlus,
  HiTrash,
  HiX,
  HiUpload,
  HiPencil,
} from "react-icons/hi";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import toast from "react-hot-toast";

import {
  announcementsAPI,
  collectionsAPI,
  uploadAPI,
} from "../../services/api";

const emptyForm = {
  title: "",
  description: "",
  image_url: "",
  button_text: "Shop Now",
  button_link: "/shop",
  is_active: true,
  start_date: "",
  end_date: "",
};

// The "Shop Now" button's destination. "all" and "collection" both compute
// button_link automatically (/shop or /shop?collection=<slug>) so the admin
// never has to hand-type a URL; "custom" leaves button_link free-text for
// anything else (a specific product, an external page, etc).
const linkTypeFromLink = (link, collections) => {
  if (!link || link === "/shop") return "all";
  const match = link.match(/^\/shop\?collection=([^&]+)$/);
  if (match && collections.some((c) => c.slug === match[1])) {
    return "collection";
  }
  return "custom";
};

const collectionSlugFromLink = (link) => {
  const match = (link || "").match(/^\/shop\?collection=([^&]+)$/);
  return match ? match[1] : "";
};

// Converts a value from the DB (ISO timestamp string or null) into the
// "YYYY-MM-DDTHH:mm" shape a <input type="datetime-local"> needs.
const toDatetimeLocal = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

// Where an announcement currently stands relative to its schedule, so the
// admin isn't left guessing why a "Disabled" one still says nothing about
// dates, or why an "Active" one isn't showing up on the storefront yet.
const getStatus = (item) => {
  if (!item.is_active) return { label: "Disabled", className: "text-gray-500" };

  const now = new Date();
  if (item.start_date && new Date(item.start_date) > now) {
    return { label: "Scheduled", className: "text-blue-400" };
  }
  if (item.end_date && new Date(item.end_date) < now) {
    return { label: "Expired", className: "text-red-400" };
  }
  return { label: "Active ✓", className: "text-gold" };
};

export default function Announcements() {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  // "all" | "collection" | "custom" - see linkTypeFromLink above
  const [linkType, setLinkType] = useState("all");
  const [linkCollection, setLinkCollection] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await announcementsAPI.getAll();
      return res.data;
    },
  });

  const { data: collectionsData } = useQuery({
    queryKey: ["adminCollectionsForAnnouncements"],
    queryFn: async () => {
      const res = await collectionsAPI.getAll();
      return res.data.collections ?? [];
    },
  });

  const announcements = data || [];
  const collections = collectionsData || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    // The storefront popup query - keep it in sync so a newly saved
    // announcement (or an edited schedule) shows up without a hard refresh.
    queryClient.invalidateQueries({ queryKey: ["announcements", "active"] });
  };

  const closeForm = () => {
    setForm(emptyForm);
    setLinkType("all");
    setLinkCollection("");
    setShowForm(false);
    setEditingId(null);
  };

  // Recompute button_link whenever the destination type or chosen
  // collection changes, so the field always matches what's picked.
  const applyLinkType = (type, collectionSlug = linkCollection) => {
    setLinkType(type);
    if (type === "all") {
      setForm((prev) => ({ ...prev, button_link: "/shop" }));
    } else if (type === "collection" && collectionSlug) {
      setForm((prev) => ({ ...prev, button_link: `/shop?collection=${collectionSlug}` }));
    }
    // "custom" leaves form.button_link as whatever is already typed in.
  };

  const handleLinkCollectionChange = (e) => {
    const slug = e.target.value;
    setLinkCollection(slug);
    if (slug) {
      setForm((prev) => ({ ...prev, button_link: `/shop?collection=${slug}` }));
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => announcementsAPI.create(data),
    onSuccess: () => {
      invalidate();
      toast.success("Announcement created");
      closeForm();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed creating announcement");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => announcementsAPI.update(id, data),
    onSuccess: () => {
      invalidate();
      toast.success("Announcement updated");
      closeForm();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed updating announcement");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => announcementsAPI.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success("Announcement deleted");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }) =>
      announcementsAPI.update(id, { is_active: status }),
    onSuccess: () => {
      invalidate();
    },
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await uploadAPI.image(file);
      const imageUrl = res.data.url;

      if (!imageUrl) {
        toast.error("No image URL returned");
        return;
      }

      setForm((prev) => ({ ...prev, image_url: imageUrl }));
      toast.success("Image uploaded");
    } catch (error) {
      console.error(error.response?.data || error);
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      image_url: item.image_url || "",
      button_text: item.button_text || "Shop Now",
      button_link: item.button_link || "/shop",
      is_active: !!item.is_active,
      start_date: toDatetimeLocal(item.start_date),
      end_date: toDatetimeLocal(item.end_date),
    });
    setLinkType(linkTypeFromLink(item.button_link, collections));
    setLinkCollection(collectionSlugFromLink(item.button_link));
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error("Title required");
      return;
    }

    if (linkType === "collection" && !linkCollection) {
      toast.error("Select a collection for the Shop Now button");
      return;
    }

    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      toast.error("Start date must be before end date");
      return;
    }

    const payload = {
      ...form,
      // Empty strings mean "no schedule" / "clear the schedule" - send them
      // through as-is so the backend can tell "clear" apart from "unset".
      start_date: form.start_date || "",
      end_date: form.end_date || "",
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-white">Loading announcements...</div>;
  }

  const saving = createMutation.isLoading || updateMutation.isLoading;

  return (
    <div className="p-6 text-white">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-playfair font-bold">Announcements</h1>
          <p className="text-gray-400 mt-2">
            Manage popup offers and promotions
          </p>
        </div>

        <button
          onClick={() => {
            setForm(emptyForm);
            setLinkType("all");
            setLinkCollection("");
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-gold text-black px-5 py-3 rounded-xl font-semibold"
        >
          <HiPlus />
          Add Announcement
        </button>
      </div>

      {/* FORM (create or edit) */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-noir-card border border-gray-800 rounded-2xl p-6 mb-8"
        >
          <div className="flex justify-between mb-5">
            <h2 className="text-xl font-bold">
              {editingId ? "Edit Announcement" : "New Announcement"}
            </h2>

            <button onClick={closeForm} className="text-gray-400">
              <HiX />
            </button>
          </div>

          <input
            name="title"
            placeholder="Offer title"
            value={form.title}
            onChange={handleChange}
            className="w-full bg-black border border-gray-700 rounded-xl p-3 mb-3"
          />

          <textarea
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            className="w-full bg-black border border-gray-700 rounded-xl p-3 mb-3"
          />

          {/* IMAGE UPLOAD */}
          <label className="flex items-center gap-3 bg-black border border-gray-700 rounded-xl p-3 cursor-pointer mb-4">
            <HiUpload />
            {uploading ? "Uploading..." : "Upload Offer Image"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageUpload}
            />
          </label>

          {/* IMAGE PREVIEW */}
          {form.image_url && (
            <img
              src={form.image_url}
              alt="preview"
              className="w-48 h-48 object-cover rounded-xl mb-4"
            />
          )}

          <input
            name="button_text"
            placeholder="Button text"
            value={form.button_text}
            onChange={handleChange}
            className="w-full bg-black border border-gray-700 rounded-xl p-3 mb-4"
          />

          <label className="block text-sm text-gray-400 mb-1">
            "Shop Now" goes to
          </label>
          <select
            value={linkType}
            onChange={(e) => applyLinkType(e.target.value)}
            className="w-full bg-black border border-gray-700 rounded-xl p-3 mb-3"
          >
            <option value="all">All Products (/shop)</option>
            <option value="collection">A specific collection</option>
            <option value="custom">Custom link</option>
          </select>

          {linkType === "collection" && (
            <select
              value={linkCollection}
              onChange={handleLinkCollectionChange}
              className="w-full bg-black border border-gray-700 rounded-xl p-3 mb-4"
            >
              <option value="">Select a collection…</option>
              {collections.map((col) => (
                <option key={col.id} value={col.slug}>{col.name}</option>
              ))}
            </select>
          )}

          {linkType === "custom" && (
            <input
              name="button_link"
              placeholder="e.g. /product/royal-oud or https://..."
              value={form.button_link}
              onChange={handleChange}
              className="w-full bg-black border border-gray-700 rounded-xl p-3 mb-4"
            />
          )}

          {/* SCHEDULE: start / end date so the popup auto-enables and
              auto-expires without an admin needing to remember to toggle
              it off */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Starts (optional)
              </label>
              <input
                type="datetime-local"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Expires (optional)
              </label>
              <input
                type="datetime-local"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-gold outline-none"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Leave either date blank for no limit. Outside this window the
            popup automatically stops showing on the storefront - no need to
            manually disable it.
          </p>

          <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="w-4 h-4 accent-gold"
            />
            <span className="text-sm text-gray-300">Active</span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-gold text-black px-6 py-3 rounded-xl font-bold disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingId
              ? "Save Changes"
              : "Save Announcement"}
          </button>
        </motion.div>
      )}

      {/* ANNOUNCEMENT LIST */}
      <div className="space-y-5">
        {announcements.map((item) => {
          const status = getStatus(item);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-noir-card border border-gray-800 rounded-2xl p-5 flex justify-between items-center gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                  />
                )}

                <div className="min-w-0">
                  <h3 className="text-lg font-bold truncate">{item.title}</h3>

                  <p className="text-gray-400 truncate">{item.description}</p>

                  {(item.start_date || item.end_date) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {item.start_date
                        ? new Date(item.start_date).toLocaleString()
                        : "No start"}
                      {" → "}
                      {item.end_date
                        ? new Date(item.end_date).toLocaleString()
                        : "No end"}
                    </p>
                  )}

                  <button
                    onClick={() =>
                      toggleMutation.mutate({
                        id: item.id,
                        status: !item.is_active,
                      })
                    }
                    className={`mt-2 text-sm font-medium ${status.className}`}
                  >
                    {status.label}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => startEdit(item)}
                  className="text-gray-300 hover:text-gold"
                  aria-label="Edit announcement"
                >
                  <HiPencil size={22} />
                </button>

                <button
                  onClick={() => deleteMutation.mutate(item.id)}
                  className="text-red-400 hover:text-red-300"
                  aria-label="Delete announcement"
                >
                  <HiTrash size={22} />
                </button>
              </div>
            </motion.div>
          );
        })}

        {announcements.length === 0 && (
          <div className="text-gray-400 text-center py-10">
            No announcements yet
          </div>
        )}
      </div>
    </div>
  );
}

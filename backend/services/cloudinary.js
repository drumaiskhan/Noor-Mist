const cloudinary = require('../config/cloudinary');
const fs = require('fs');

const uploadImage = async (filePath, folder = 'noor-mist/products') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 1200, height: 1200, crop: 'limit' },
      ],
    });
    // Clean up local file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw error;
  }
};

const uploadImages = async (files, folder = 'noor-mist/products') => {
  const results = await Promise.all(files.map((f) => uploadImage(f.path, folder)));
  return results;
};

const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};

module.exports = { uploadImage, uploadImages, deleteImage };

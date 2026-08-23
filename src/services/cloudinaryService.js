/**
 * Cloudinary Photo Upload Service
 * Manages image uploads to Cloudinary with automatic 30-day expiration tagging.
 */

const STORAGE_KEY = "bec_cloudinary_config";

// Read from Environment Variables or Local Storage Override
export const getCloudinaryConfig = () => {
  const localSaved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  return {
    cloudName: localSaved.cloudName || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dyh2ne8ho",
    uploadPreset: localSaved.uploadPreset || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "attendance system BEC"
  };
};

export const saveCloudinaryConfig = (config) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const isCloudinaryConfigured = () => {
  const config = getCloudinaryConfig();
  return Boolean(config.cloudName && config.uploadPreset);
};

/**
 * Uploads Base64 image to Cloudinary CDN
 * @param {string} base64Image - Base64 Data URL from camera canvas
 * @param {string} folder - Destination folder (e.g., 'faculty_photos' or 'student_photos')
 * @param {Array<string>} tags - Cloudinary tags for auto-deletion (e.g. ['temp_30days'])
 * @returns {Promise<{ url: string, publicId?: string, isCloudinary: boolean }>}
 */
export const uploadPhotoToCloudinary = async (base64Image, folder = "bec_attendance", tags = ["temp_30days"]) => {
  const config = getCloudinaryConfig();

  if (!config.cloudName || !config.uploadPreset) {
    throw new Error("Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to enable photo uploads.");
  }

  try {
    const formData = new FormData();
    formData.append("file", base64Image);
    formData.append("upload_preset", config.uploadPreset);
    if (folder) formData.append("folder", folder);
    if (tags && tags.length > 0) formData.append("tags", tags.join(","));

    const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (data.secure_url) {
      return {
        url: data.secure_url,
        publicId: data.public_id,
        isCloudinary: true
      };
    }

    throw new Error(data?.error?.message || "Cloudinary image upload failed.");
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    throw new Error(error?.message || "Cloudinary image upload failed.");
  }
};

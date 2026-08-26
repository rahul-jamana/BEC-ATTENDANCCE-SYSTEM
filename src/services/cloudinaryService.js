/**
 * Cloudinary Photo Upload Service
 * Manages image uploads to Cloudinary with automatic 30-day expiration tagging.
 */

const STORAGE_KEY = "bec_cloudinary_config";

const normalizeUploadPreset = (value) => {
  if (!value) return "attendance_system_BEC";
  return String(value).trim().replace(/\s+/g, "_");
};

// Read from Environment Variables or Local Storage Override
export const getCloudinaryConfig = () => {
  const localSaved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const normalizedPreset = normalizeUploadPreset(
    localSaved.uploadPreset || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "attendance_system_BEC"
  );

  return {
    cloudName: localSaved.cloudName || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dyh2ne8ho",
    uploadPreset: normalizedPreset
  };
};

export const saveCloudinaryConfig = (config) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...config,
    uploadPreset: normalizeUploadPreset(config?.uploadPreset || "attendance_system_BEC")
  }));
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

  if (!config.cloudName) {
    throw new Error("Cloudinary is not configured.");
  }

  // Presets to try in order (underscores first, then spaces)
  const presetsToTry = [
    config.uploadPreset || "attendance_system_BEC",
    "attendance system BEC",
    "attendance_system_BEC"
  ];

  const uniquePresets = [...new Set(presetsToTry)];

  let lastError = null;

  for (const preset of uniquePresets) {
    try {
      const formData = new FormData();
      formData.append("file", base64Image);
      formData.append("upload_preset", preset);
      if (folder) formData.append("folder", folder);
      if (tags && tags.length > 0) formData.append("tags", tags.join(","));

      const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData
      });

      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        data = {};
      }

      if (response.ok && data.secure_url) {
        return {
          url: data.secure_url,
          publicId: data.public_id,
          isCloudinary: true
        };
      }

      const cloudError = data?.error?.message || "Upload failed";
      lastError = new Error(cloudError);
      console.warn(`Cloudinary upload with preset "${preset}" returned:`, cloudError);
    } catch (err) {
      lastError = err;
      console.warn(`Cloudinary upload attempt with preset "${preset}" failed:`, err.message);
    }
  }

  throw lastError || new Error("Cloudinary image upload failed.");
};

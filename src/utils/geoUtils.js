/**
 * Geolocation & Distance Utilities for 80m Classroom Radius Verification
 */

// Haversine formula to calculate distance between two GPS coordinates in meters
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c); // Distance in meters
};

// Check if student is within specified radius (default 80 meters) of teacher
export const isWithinClassroomRadius = (teacherLoc, studentLoc, maxRadiusMeters = 80) => {
  if (!teacherLoc || !studentLoc) return false;
  const distance = calculateDistanceMeters(
    teacherLoc.latitude,
    teacherLoc.longitude,
    studentLoc.latitude,
    studentLoc.longitude
  );
  return distance <= maxRadiusMeters;
};

// Get current device GPS coordinates via browser Geolocation API
export const getDeviceLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      // Fallback default coordinates if GPS unavailable (Bhubaneswar Engineering College Campus)
      resolve({
        latitude: 20.2485,
        longitude: 85.8012,
        accuracy: 10,
        isMock: true
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          isMock: false
        });
      },
      (error) => {
        console.warn("Geolocation warning/error, using default campus GPS for testing:", error.message);
        // Default to simulated campus GPS location if user denies or browser blocks GPS
        resolve({
          latitude: 20.2485,
          longitude: 85.8012,
          accuracy: 15,
          isMock: true
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  });
};

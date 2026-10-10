/**
 * Browser Geolocation Service
 *
 * Utilizes the standard HTML5 Navigator Geolocation API to detect live GPS coordinates,
 * with reverse-geocoding via OpenStreetMap Nominatim for automatic regional autofill.
 */

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  state?: string;
  district?: string;
  village?: string;
  pincode?: string;
  formattedAddress?: string;
}

export async function detectBrowserLocation(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return reject(
        new Error("Browser Geolocation API is not supported by your current browser.")
      );
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy);

        let reverseInfo: Partial<GeolocationResult> = {};
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
              signal: controller.signal,
              headers: {
                "Accept-Language": "en",
              },
            }
          );
          clearTimeout(timeout);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            reverseInfo = {
              state: addr.state,
              district:
                addr.state_district ||
                addr.county ||
                addr.district ||
                addr.city ||
                addr.town,
              village: addr.village || addr.suburb || addr.hamlet || addr.neighbourhood,
              pincode: addr.postcode ? addr.postcode.replace(/\D/g, "").slice(0, 6) : undefined,
              formattedAddress: data.display_name,
            };
          }
        } catch {
          // Graceful degradation: GPS coordinates remain valid even if reverse lookup fails
        }

        resolve({
          latitude,
          longitude,
          accuracy,
          ...reverseInfo,
        });
      },
      (err) => {
        let msg = "Could not retrieve your live location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied. Please allow location access in your browser settings.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Location information is unavailable on this device.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out. Please try again.";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}

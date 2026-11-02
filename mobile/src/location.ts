import * as Location from "expo-location";
import type { LocationEvidence } from "../../shared/contracts";

export async function currentLocation(): Promise<LocationEvidence> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Izin lokasi diperlukan. Aktifkan dari pengaturan lalu coba lagi.",
    );
  return new Promise((resolve, reject) => {
    let subscription: Location.LocationSubscription | undefined;
    let ended = false;
    const finish = (error?: Error, fix?: Location.LocationObject) => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      subscription?.remove();
      if (error) reject(error);
      else if (fix)
        resolve({
          latitude: fix.coords.latitude,
          longitude: fix.coords.longitude,
          location_source: "device_upload_confirmed",
          location_recorded_at: new Date(fix.timestamp).toISOString(),
          location_accuracy_m: fix.coords.accuracy,
          confirmed: true,
        });
    };
    const timer = setTimeout(
      () =>
        finish(
          new Error("GPS belum akurat dalam 20 detik. Coba tempat terbuka."),
        ),
      20000,
    );
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (fix) => {
        if (
          fix.coords.accuracy !== null &&
          fix.coords.accuracy <= 50 &&
          Math.abs(Date.now() - fix.timestamp) <= 30000
        )
          finish(undefined, fix);
      },
    )
      .then((watch) => {
        subscription = watch;
        if (ended) watch.remove();
      })
      .catch((error) => finish(error));
  });
}

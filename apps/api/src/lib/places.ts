/**
 * Offline "reverse geocoding": the nearest known city to a point. Used when a client can't
 * name its own city (web browsers only give coordinates). Covers the Philippines, where the
 * app launches; elsewhere, or farther than MAX_KM from any city, it returns null.
 */
const CITIES: [name: string, lat: number, lng: number][] = [
  // Mindanao
  ["Davao City", 7.0731, 125.6128], ["Tagum", 7.4478, 125.8078], ["Digos", 6.7497, 125.3572], ["Panabo", 7.308, 125.6843],
  ["Island Garden City of Samal", 7.0735, 125.7081], ["Mati", 6.9551, 126.2166], ["Cagayan de Oro", 8.4542, 124.6319],
  ["General Santos", 6.1164, 125.1716], ["Butuan", 8.9475, 125.5406], ["Zamboanga City", 6.9214, 122.079],
  ["Koronadal", 6.5031, 124.8469], ["Iligan", 8.228, 124.2452], ["Cotabato City", 7.2236, 124.2464],
  ["Kidapawan", 7.0083, 125.0894], ["Valencia", 7.9064, 125.0942], ["Malaybalay", 8.1575, 125.1278],
  ["Surigao City", 9.7843, 125.4888], ["Pagadian", 7.8257, 123.437], ["Dipolog", 8.5883, 123.3409], ["Ozamiz", 8.1462, 123.8444],
  // Visayas
  ["Cebu City", 10.3157, 123.8854], ["Mandaue", 10.3236, 123.9223], ["Lapu-Lapu", 10.3103, 123.9494],
  ["Iloilo City", 10.7202, 122.5621], ["Bacolod", 10.6765, 122.9509], ["Dumaguete", 9.3068, 123.3054],
  ["Tacloban", 11.2444, 125.0039], ["Ormoc", 11.0064, 124.6075], ["Tagbilaran", 9.6496, 123.8547], ["Roxas City", 11.5853, 122.7511],
  // Luzon
  ["Manila", 14.5995, 120.9842], ["Quezon City", 14.676, 121.0437], ["Makati", 14.5547, 121.0244], ["Pasig", 14.5764, 121.0851],
  ["Taguig", 14.5176, 121.0509], ["Caloocan", 14.6507, 120.9676], ["Parañaque", 14.4793, 121.0198], ["Las Piñas", 14.4445, 120.9939],
  ["Muntinlupa", 14.4081, 121.0415], ["Marikina", 14.6507, 121.1029], ["Antipolo", 14.5862, 121.1761], ["Bacoor", 14.4624, 120.9645],
  ["Dasmariñas", 14.3294, 120.9367], ["Calamba", 14.2117, 121.1653], ["Santa Rosa", 14.3122, 121.1114], ["Batangas City", 13.7565, 121.0583],
  ["Lipa", 13.9411, 121.1631], ["Lucena", 13.9414, 121.6234], ["Naga", 13.6218, 123.1948], ["Legazpi", 13.1391, 123.7438],
  ["Angeles", 15.145, 120.5887], ["San Fernando", 15.0286, 120.6898], ["Olongapo", 14.8292, 120.2828], ["Dagupan", 16.0433, 120.3333],
  ["Baguio", 16.4023, 120.596], ["Laoag", 18.1978, 120.5936], ["Tuguegarao", 17.6132, 121.727], ["Cabanatuan", 15.4865, 120.9667],
  // Palawan
  ["Puerto Princesa", 9.7392, 118.7353],
];

const MAX_KM = 40;

function km(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

export function nearestPlace(lat: number, lng: number): { city: string; country: string } | null {
  let best: { city: string; d: number } | null = null;
  for (const [city, cLat, cLng] of CITIES) {
    const d = km(lat, lng, cLat, cLng);
    if (!best || d < best.d) best = { city, d };
  }
  return best && best.d <= MAX_KM ? { city: best.city, country: "Philippines" } : null;
}

import { afterEach, describe, expect, it } from "vitest";
import { setProviderForTests } from "../src/ai/provider";
import { fallbackCompatibility } from "../src/ai/service";
import { nearestPlace } from "../src/lib/places";
import { api, createUser, fakeAi } from "./helpers";

describe("nearest city", () => {
  it("names the nearest known city within 40 km, and nothing farther", () => {
    expect(nearestPlace(7.0795, 125.6155)).toEqual({ city: "Davao City", country: "Philippines" });
    expect(nearestPlace(10.32, 123.89)?.city).toBe("Cebu City");
    expect(nearestPlace(40.71, -74.0)).toBeNull(); // New York
  });

  it("fills city and country when the client only sends coordinates", async () => {
    const u = await createUser(); // starts in Davao City
    const r = await api.put("/me/location").set(u.auth).send({ lat: 10.3157, lng: 123.8854 }).expect(200);
    expect(r.body.city).toBe("Cebu City");
    expect(r.body.country).toBe("Philippines");
  });

  it("keeps the city the client names", async () => {
    const u = await createUser();
    const r = await api.put("/me/location").set(u.auth).send({ lat: 10.3157, lng: 123.8854, city: "Talisay" }).expect(200);
    expect(r.body.city).toBe("Talisay");
  });
});

describe("compatibility line length", () => {
  afterEach(() => setProviderForTests(fakeAi));

  it("builds a short line from shared interests when the model runs long", () => {
    expect(fallbackCompatibility(["Diving", "Coffee", "Hiking"])).toBe("You both like diving, coffee and hiking.");
    expect(fallbackCompatibility(["Coffee"])).toBe("You both like coffee.");
    expect(fallbackCompatibility([])).toBeNull();
  });

  it("never returns more than 90 characters", async () => {
    setProviderForTests({
      name: "long-winded",
      async generateJson() {
        return { summary: "You both love hiking, coffee and diving, which means your weekends could be one long adventure together!" };
      },
    });
    const a = await createUser();
    const b = await createUser();
    const r = await api.post("/ai/compatibility").set(a.auth).send({ targetId: b.id }).expect(200);
    expect(r.body.summary).toMatch(/^You both like /);
    expect(r.body.summary.length).toBeLessThanOrEqual(90);
  });
});

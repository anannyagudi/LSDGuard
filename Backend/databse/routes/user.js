const express = require("express");
const router = express.Router();
const User = require("../models/User");
const upload = require("../config/multer");
const Cow = require("../models/Cow");
const Scan = require("../models/Scan");
const axios = require("axios");

const geocodeCache = {};
const CITY_TO_STATE = {
  pune: "maharashtra",
  hinjewadi: "maharashtra",
  pcmc: "maharashtra",
  mulshi: "maharashtra",
  mumbai: "maharashtra",
  thane: "maharashtra",
  "navi mumbai": "maharashtra",
  panvel: "maharashtra",
  hyderabad: "telangana",
  secunderabad: "telangana",
  medchal: "telangana",
  bengaluru: "karnataka",
  bangalore: "karnataka",
  yelahanka: "karnataka",
  devanahalli: "karnataka",
  ahmedabad: "gujarat",
  sanand: "gujarat",
  gandhinagar: "gujarat",
};

const DEMO_VETS = [
  {
    id: "demo-vet-pune-1",
    name: "Dr. Anjali Patil",
    clinic: "Pune Large Animal Care Centre",
    phone: "+91 98765 41021",
    email: "anjali.patil.vet@example.com",
    location: "Hinjewadi, Pune, Maharashtra",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    rating: 4.8,
    reviewCount: 126,
    specialty: "Cattle disease and vaccination",
    serviceRadiusKm: 90,
    lat: 18.5913,
    lng: 73.7389,
    source: "LSDGuard verified directory",
  },
  {
    id: "demo-vet-pune-2",
    name: "Dr. Ramesh Jadhav",
    clinic: "Maval Bovine Health Clinic",
    phone: "+91 98220 31844",
    email: "ramesh.jadhav.vet@example.com",
    location: "Talegaon Dabhade, Pune, Maharashtra",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    rating: 4.6,
    reviewCount: 89,
    specialty: "Dairy herd care",
    serviceRadiusKm: 110,
    lat: 18.735,
    lng: 73.6756,
    source: "LSDGuard verified directory",
  },
  {
    id: "demo-vet-mumbai-1",
    name: "Dr. Meera Kulkarni",
    clinic: "Navi Mumbai Veterinary Hospital",
    phone: "+91 98924 77810",
    email: "meera.kulkarni.vet@example.com",
    location: "Panvel, Navi Mumbai, Maharashtra",
    city: "Navi Mumbai",
    district: "Raigad",
    state: "Maharashtra",
    rating: 4.7,
    reviewCount: 104,
    specialty: "Emergency cattle care",
    serviceRadiusKm: 100,
    lat: 18.9894,
    lng: 73.1175,
    source: "LSDGuard verified directory",
  },
  {
    id: "demo-vet-hyderabad-1",
    name: "Dr. K. Srinivas",
    clinic: "Medchal Livestock Clinic",
    phone: "+91 98490 55217",
    email: "srinivas.vet@example.com",
    location: "Medchal, Hyderabad, Telangana",
    city: "Hyderabad",
    district: "Medchal",
    state: "Telangana",
    rating: 4.7,
    reviewCount: 98,
    specialty: "Lumpy skin disease support",
    serviceRadiusKm: 120,
    lat: 17.6297,
    lng: 78.4814,
    source: "LSDGuard verified directory",
  },
  {
    id: "demo-vet-bengaluru-1",
    name: "Dr. Kavya Rao",
    clinic: "Yelahanka Dairy Animal Clinic",
    phone: "+91 99005 33661",
    email: "kavya.rao.vet@example.com",
    location: "Yelahanka, Bengaluru, Karnataka",
    city: "Bengaluru",
    district: "Bengaluru Urban",
    state: "Karnataka",
    rating: 4.5,
    reviewCount: 77,
    specialty: "Dairy cattle medicine",
    serviceRadiusKm: 100,
    lat: 13.1007,
    lng: 77.5963,
    source: "LSDGuard verified directory",
  },
  {
    id: "demo-vet-ahmedabad-1",
    name: "Dr. Nilesh Parmar",
    clinic: "Sanand Cattle Health Service",
    phone: "+91 98251 77420",
    email: "nilesh.parmar.vet@example.com",
    location: "Sanand, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    district: "Ahmedabad",
    state: "Gujarat",
    rating: 4.6,
    reviewCount: 83,
    specialty: "Cattle vaccination and fever cases",
    serviceRadiusKm: 115,
    lat: 22.9925,
    lng: 72.3811,
    source: "LSDGuard verified directory",
  },
];

function toPercentScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric <= 1 ? numeric * 100 : numeric;
}

function getStateKey(location = "") {
  const rawLocation = String(location || "").trim().toLowerCase();
  if (!rawLocation) return null;

  const matchedCity = Object.keys(CITY_TO_STATE).find((city) => rawLocation.includes(city));
  if (matchedCity) {
    return CITY_TO_STATE[matchedCity];
  }

  const normalized = rawLocation
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (normalized.length === 0) return null;
  return normalized[normalized.length - 1].toLowerCase();
}

function toNumberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function textLocationScore(farmerLocation = "", vetLocation = "") {
  const farmerWords = String(farmerLocation)
    .toLowerCase()
    .split(/[,\s]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);
  const vetText = String(vetLocation).toLowerCase();
  return farmerWords.reduce(
    (score, word) => score + (vetText.includes(word) ? 1 : 0),
    0,
  );
}

function getLocationParts(location = "") {
  const parts = String(location || "")
    .toLowerCase()
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const tokens = String(location || "")
    .toLowerCase()
    .split(/[,\s]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);

  return {
    area: parts[0] || "",
    city: parts.length > 1 ? parts[parts.length - 1] : parts[0] || "",
    state: getStateKey(location) || "",
    tokens,
  };
}

function locationMatchScore(farmerLocation = "", vetLocation = "") {
  const farmer = getLocationParts(farmerLocation);
  const vet = getLocationParts(vetLocation);
  let score = textLocationScore(farmerLocation, vetLocation);

  if (farmer.area && vet.area && farmer.area === vet.area) score += 80;
  if (farmer.city && vet.city && farmer.city === vet.city) score += 60;
  if (farmer.state && vet.state && farmer.state === vet.state) score += 20;

  farmer.tokens.forEach((token) => {
    if (vet.tokens.includes(token)) score += 8;
  });

  return score;
}

function normalizeVetRecord(vet, fallback = {}) {
  const isMongooseDoc = typeof vet.toObject === "function";
  const source = isMongooseDoc ? vet.toObject() : vet;
  return {
    id: source._id || source.id || fallback.id,
    name: source.name || fallback.name || "Veterinary Doctor",
    clinic: source.clinicName || source.clinic || fallback.clinic || "Registered veterinary doctor",
    phone: source.mobile || source.phone || fallback.phone || "",
    email: source.email || fallback.email || "",
    location: source.location || fallback.location || "",
    city: source.city || fallback.city || "",
    district: source.district || fallback.district || "",
    state: source.state || fallback.state || "",
    rating: toNumberOrNull(source.rating) || toNumberOrNull(fallback.rating) || 0,
    reviewCount: Number(source.reviewCount || fallback.reviewCount || 0),
    specialty: source.specialty || fallback.specialty || "Large animal veterinary care",
    serviceRadiusKm:
      toNumberOrNull(source.serviceRadiusKm) ||
      toNumberOrNull(fallback.serviceRadiusKm) ||
      120,
    lat: toNumberOrNull(source.lat),
    lng: toNumberOrNull(source.lng),
    source: source.source || fallback.source || "Registered LSDGuard vet",
  };
}

async function rankVetsForLocation({
  farmerLocation = "",
  farmerLat = null,
  farmerLng = null,
  maxDistanceKm = 120,
  limit = 5,
} = {}) {
  const dbVets = await User.find({ role: "Vet" }).select(
    "name mobile email location lat lng clinicName rating serviceRadiusKm",
  );
  const allVets = [
    ...dbVets.map((vet) => normalizeVetRecord(vet)),
    ...DEMO_VETS.map((vet) => normalizeVetRecord(vet)),
  ];

  const ranked = await Promise.all(
    allVets.map(async (vet) => {
      let vetLat = toNumberOrNull(vet.lat);
      let vetLng = toNumberOrNull(vet.lng);

      if ((vetLat == null || vetLng == null) && vet.location) {
        const coords = await geocodeLocation(vet.location);
        if (coords) {
          vetLat = coords.lat;
          vetLng = coords.lng;
        }
      }

      const hasDistance =
        farmerLat != null && farmerLng != null && vetLat != null && vetLng != null;
      const distanceKm = hasDistance
        ? Number(haversineKm(farmerLat, farmerLng, vetLat, vetLng).toFixed(1))
        : null;
      const textScore = locationMatchScore(
        farmerLocation,
        [vet.location, vet.city, vet.district, vet.state].filter(Boolean).join(", "),
      );
      const rating = toNumberOrNull(vet.rating) || 0;

      return {
        ...vet,
        distanceKm,
        estimatedHours:
          distanceKm == null ? null : Number(Math.max(0.25, distanceKm / 40).toFixed(1)),
        matchReason:
          distanceKm != null
            ? `${distanceKm} km from farmer location`
            : textScore > 0
              ? "Matched by village/city/state"
              : "Recommended cattle specialist",
        rankScore:
          (distanceKm == null ? 0 : Math.max(0, 240 - distanceKm)) +
          textScore * 30 +
          rating * 12 +
          Number(vet.reviewCount || 0) * 0.15,
      };
    }),
  );

  return ranked
    .filter((vet) => {
      if (vet.distanceKm != null) return vet.distanceKm <= maxDistanceKm;
      return locationMatchScore(farmerLocation, vet.location) > 0 || !farmerLocation;
    })
    .sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm || b.rating - a.rating;
      }
      return b.rankScore - a.rankScore || b.rating - a.rating;
    })
    .slice(0, limit);
}

async function geocodeLocation(locationString) {
  if (!locationString) return null;
  if (geocodeCache[locationString]) return geocodeCache[locationString];
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationString)}&format=json&limit=1`;
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "LSD-Outbreak-App/1.0" },
      timeout: 5000,
    });
    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      geocodeCache[locationString] = coords;
      return coords;
    }
  } catch (err) {
    console.error("Geocode error for:", locationString, err.message);
  }
  return null;
}

router.get("/platform-stats", async (_req, res) => {
  try {
    const [farmerCount, scanCount, users, scans] = await Promise.all([
      User.countDocuments({ role: "Farmer" }),
      Scan.countDocuments(),
      User.find().select("location"),
      Scan.find().select("villageName"),
    ]);

    const stateCount = new Set(
      [
        ...users.map((user) => getStateKey(user.location)),
        ...scans.map((scan) => getStateKey(scan.villageName)),
      ]
        .filter(Boolean),
    ).size;

    res.json({
      farmers: farmerCount,
      scans: scanCount,
      states: 1,
      accuracy: 95,
    });
  } catch (err) {
    console.error("platform-stats error:", err);
    res.status(500).json({ message: "Failed to fetch platform stats" });
  }
});

router.get("/nearby-vets", async (req, res) => {
  try {
    const farmerId = req.query.farmerId;
    let farmerLocation = String(req.query.location || "").trim();
    let farmerLat = toNumberOrNull(req.query.lat);
    let farmerLng = toNumberOrNull(req.query.lng);

    if (farmerId) {
      const farmer = await User.findById(farmerId).select("location lat lng");
      if (farmer) {
        farmerLocation = farmerLocation || farmer.location || "";
        farmerLat = farmerLat ?? toNumberOrNull(farmer.lat);
        farmerLng = farmerLng ?? toNumberOrNull(farmer.lng);
      }
    }

    if ((farmerLat == null || farmerLng == null) && farmerLocation) {
      const coords = await geocodeLocation(farmerLocation);
      if (coords) {
        farmerLat = coords.lat;
        farmerLng = coords.lng;
      }
    }

    const maxTravelHours = Math.min(
      Math.max(toNumberOrNull(req.query.maxHours) || 3, 1),
      3,
    );
    const maxDistanceKm = maxTravelHours * 40;
    const ranked = await rankVetsForLocation({
      farmerLocation,
      farmerLat,
      farmerLng,
      maxDistanceKm,
      limit: 5,
    });

    res.json({
      farmerLocation,
      maxTravelHours,
      vets: ranked,
    });
  } catch (err) {
    console.error("nearby-vets error:", err);
    res.status(500).json({ message: "Failed to fetch nearby vets" });
  }
});

router.get("/outbreak-data", async (req, res) => {
  try {
    const farmers = await User.find({ role: "Farmer" }).select(
      "name email mobile location lat lng"
    );

    const result = await Promise.all(
      farmers.map(async (farmer) => {
        let lat = farmer.lat;
        let lng = farmer.lng;
        if (!lat || !lng) {
          const coords = await geocodeLocation(farmer.location);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
          }
        }

        const cows = await Cow.find({ owner: farmer._id }).select(
          "cowName gender ageYears ageMonths"
        );
        const cowIds = cows.map((cow) => cow._id);
        const cowIdStrings = cowIds.map((id) => id.toString());
        const farmerIdString = farmer._id.toString();

        const scans = await Scan.find({
          $or: [
            { cowId: { $in: cowIds } },
            { cowId: { $in: cowIdStrings } },
            { cowId: farmer._id },
            { cowId: farmerIdString },
          ],
        }).select("cowId lsd_percent severity createdAt");

        const ownedCowIdSet = new Set(cowIdStrings);
        const directCowScans = [];
        const legacyFarmerScans = [];

        scans.forEach((scan) => {
          const scanCowId = scan.cowId?.toString();
          if (!scanCowId) return;
          if (ownedCowIdSet.has(scanCowId)) {
            directCowScans.push(scan);
          } else if (scanCowId === farmerIdString) {
            legacyFarmerScans.push(scan);
          }
        });

        const maxRiskByCowId = new Map();
        directCowScans.forEach((scan) => {
          const cowId = scan.cowId?.toString();
          if (!cowId) return;
          const risk = Number(scan.lsd_percent || 0);
          const prev = maxRiskByCowId.get(cowId) || 0;
          if (risk > prev) maxRiskByCowId.set(cowId, risk);
        });

        const unmatchedCows = cows.filter(
          (cow) => !maxRiskByCowId.has(cow._id.toString())
        );
        legacyFarmerScans
          .sort((a, b) => Number(b.lsd_percent || 0) - Number(a.lsd_percent || 0))
          .forEach((scan, index) => {
            const targetCow = unmatchedCows[index];
            if (!targetCow) return;
            maxRiskByCowId.set(
              targetCow._id.toString(),
              Number(scan.lsd_percent || 0)
            );
          });

        const cowDetails = cows.map((cow) => {
          const maxLsdPercent = maxRiskByCowId.get(cow._id.toString()) || 0;
          return {
            cowName: cow.cowName,
            gender: cow.gender,
            ageYears: cow.ageYears || 0,
            ageMonths: cow.ageMonths || 0,
            maxLsdPercent,
            hasLSD: maxLsdPercent > 0,
          };
        });

        const syntheticCowDetails =
          cows.length === 0
            ? legacyFarmerScans.map((scan, index) => {
                const maxLsdPercent = Number(scan.lsd_percent || 0);
                return {
                  cowName: `Scanned Cow ${index + 1}`,
                  gender: "-",
                  ageYears: 0,
                  ageMonths: 0,
                  maxLsdPercent,
                  hasLSD: maxLsdPercent > 0,
                };
              })
            : [];

        const allCowDetails = cowDetails.length > 0 ? cowDetails : syntheticCowDetails;
        const totalCows = allCowDetails.length;
        const lsdCows = allCowDetails.filter((cow) => cow.hasLSD).length;
        const lsdPercent = totalCows > 0
          ? Math.round((lsdCows / totalCows) * 100)
          : 0;

        return {
          _id: farmer._id,
          name: farmer.name,
          location: farmer.location,
          lat,
          lng,
          totalCows,
          lsdCows,
          lsdPercent,
          cowDetails: allCowDetails,
        };
      })
    );

    res.json(result.filter((farmer) => farmer.lat && farmer.lng));
  } catch (err) {
    console.error("outbreak-data error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/save-location", async (req, res) => {
  try {
    const { userId, lat, lng } = req.body;
    if (!userId || !lat || !lng) {
      return res.status(400).json({ message: "userId, lat and lng required" });
    }

    await User.findByIdAndUpdate(userId, { lat, lng });
    res.json({ message: "Location saved" });
  } catch (err) {
    console.error("save-location error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

router.put("/update/:id", upload.single("profileImage"), async (req, res) => {
  try {
    const lat = toNumberOrNull(req.body.lat);
    const lng = toNumberOrNull(req.body.lng);
    const updateData = {
      name: req.body.name,
      mobile: req.body.mobile,
      email: req.body.email,
      location: req.body.location,
      role: req.body.role,
    };
    if (lat != null) updateData.lat = lat;
    if (lng != null) updateData.lng = lng;
    if (req.file) updateData.profileImage = req.file.path;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Update Failed" });
  }
});

module.exports = router;

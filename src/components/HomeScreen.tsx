import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import api from "../api";
import { translations } from "../constants/translations";
import type {
  AlertGroup,
  AlertHistory,
  EscalationLevelConfig,
  GameType,
  Guard,
  Shift,
  Site,
  Zone,
} from "../types";
import {
  MathGame,
  PongGame,
  SnakeGame,
  TapTargetGame,
  YesNoGame,
  getRandomGame,
} from "./Games";
import { styles } from "./Styles";
import { KPICard, LanguageToggle, TableHeader, ReportRow, StatPill } from "./SubComponents";
import { useTheme } from "./ThemeContext";

export default function HomeScreen() {
  const { colors } = useTheme();
  const appFontFamily = Platform.select({
    ios: "Inter_400Regular",
    android: "Inter_400Regular",
    default: "Inter_400Regular",
  });

  const safePlay = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/alarm.wav"),
      );
      await sound.playAsync();
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  };

  const safePause = () => {};

  const [language, setLanguage] = useState<"en" | "hi">("hi");
  const t = (key: string): string => translations[language][key] ?? key;

  // ── Auth ──
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [loggedInRole, setLoggedInRole] = useState<"guard" | "admin" | null>(
    null,
  );
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // ── Data (start empty) ──
  const [guards, setGuards] = useState<Guard[]>([]);
  const [activeGuard, setActiveGuard] = useState<Guard | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [alertGroups, setAlertGroups] = useState<AlertGroup[]>([]);
  const [escalationLevels, setEscalationLevels] = useState<
    EscalationLevelConfig[]
  >([]);

  // ── Timer state ──
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [responseSeconds, setResponseSeconds] = useState(300);

  // ── Alert state ──
  const [showAlert, setShowAlert] = useState(false);
  const [currentGameType, setCurrentGameType] = useState<GameType>("PONG");
  const [gameDisabled, setGameDisabled] = useState(false);

  // ── Resolution modal ──
  const [showResolution, setShowResolution] = useState(false);
  const [resolutionPhotoUri, setResolutionPhotoUri] = useState<string | null>(
    null,
  );
  const [winResponseSeconds, setWinResponseSeconds] = useState(0);
  const [photoSeconds, setPhotoSeconds] = useState(180);

  // ── Admin UI ──
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-240)).current;
  const [sidebarDateTime, setSidebarDateTime] = useState(new Date());
  const [adminPage, setAdminPage] = useState<
    | "dashboard"
    | "users"
    | "sites"
    | "zones"
    | "groups"
    | "escalation"
    | "reports"
    | "settings"
  >("dashboard");

  // ── Edit guard modal ──
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editSite, setEditSite] = useState("");
  const [editZone, setEditZone] = useState("");
  const [editShift, setEditShift] = useState("");
  const [editGroup, setEditGroup] = useState("");

  // ── New guard form ──
  const [newGuardId, setNewGuardId] = useState("");
  const [newGuardName, setNewGuardName] = useState("");
  const [newGuardLocation, setNewGuardLocation] = useState("");
  const [newGuardMobile, setNewGuardMobile] = useState("");
  const [newGuardPassword] = useState("1234");
  const [newGuardSite, setNewGuardSite] = useState("");
  const [newGuardZone, setNewGuardZone] = useState("");
  const [newGuardShift, setNewGuardShift] = useState("");
  const [newGuardGroup, setNewGuardGroup] = useState("");

  const [selectedSite, setSelectedSite] = useState("");
  const [selectedZone, setSelectedZone] = useState("");

  // ── Alert group form ──
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupType, setNewGroupType] = useState<"FIXED" | "RANDOM">("FIXED");
  const [newGroupInterval, setNewGroupInterval] = useState("1800");

  // ── Shift form ──
  const [newShiftName, setNewShiftName] = useState("");
  const [newShiftStart, setNewShiftStart] = useState("");
  const [newShiftEnd, setNewShiftEnd] = useState("");

  // ── Site management ──
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [createSiteName, setCreateSiteName] = useState("");
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editSiteName, setEditSiteName] = useState("");

  // ── Zone management ──
  const [showCreateZone, setShowCreateZone] = useState(false);
  const [createZoneName, setCreateZoneName] = useState("");
  const [createZoneSiteId, setCreateZoneSiteId] = useState("");
  const [editingZone, setEditingZone] = useState<{
    siteId: string;
    zone: Zone;
  } | null>(null);
  const [editZoneName, setEditZoneName] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [reportSiteFilter, setReportSiteFilter] = useState("all");
  const [reportZoneFilter, setReportZoneFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState<
    "all" | "Responded" | "Missed" | "Escalated"
  >("all");
  const [reportTimeframe, setReportTimeframe] = useState<"24h" | "7d" | "30d">
    ("7d");
  const [selectedReportAlert, setSelectedReportAlert] = useState<
    AlertHistory | null
  >(null);

  // ── Refs for timers ──
  const activeGuardRef = useRef<Guard | null>(null);
  useEffect(() => {
    activeGuardRef.current = activeGuard;
  }, [activeGuard]);
  const currentGameTypeRef = useRef<GameType>("PONG");
  useEffect(() => {
    currentGameTypeRef.current = currentGameType;
  }, [currentGameType]);

  const chartData = useMemo(() => {
    const now = Date.now();
    const DAY = 86400000;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const daily = alertHistory.filter(
      (a) => a.timestamp >= todayStart.getTime(),
    );
    const weekly = alertHistory.filter((a) => a.timestamp >= now - 7 * DAY);
    const monthly = alertHistory.filter((a) => a.timestamp >= now - 30 * DAY);

    const compute = (arr: typeof alertHistory) => ({
      total: arr.length,
      responded: arr.filter((a) => a.status === "Responded").length,
      missed: arr.filter((a) => a.status === "Missed").length,
    });

    return {
      daily: compute(daily),
      weekly: compute(weekly),
      monthly: compute(monthly),
    };
  }, [alertHistory]);

  // ═══════════════════ FETCH DATA FROM API ═══════════════════
  useEffect(() => {
    if (!loggedInUser) return;
    api
      .get("/config")
      .then((res) => {
        const rawSites = res?.data?.sites;
        if (Array.isArray(rawSites)) {
          setSites(
            rawSites.map((s: any) => ({
              ...s,
              id: s._id ?? s.id ?? "",
              zones: Array.isArray(s.zones)
                ? s.zones.map((z: any) => ({
                    ...z,
                    id: z._id ?? z.id ?? "",
                  }))
                : [],
            })),
          );
        }
        const rawShifts = res?.data?.shifts;
        if (Array.isArray(rawShifts)) {
          setShifts(
            rawShifts.map((s: any) => ({ ...s, id: s._id ?? s.id ?? "" })),
          );
        }
        const rawGroups = res?.data?.alertGroups;
        if (Array.isArray(rawGroups)) {
          setAlertGroups(
            rawGroups.map((g: any) => ({ ...g, id: g._id ?? g.id ?? "" })),
          );
        }
      })
      .catch((err) => console.log("CONFIG ERROR", err.response?.data));
  }, [loggedInUser]);
  useEffect(() => {
    if (!loggedInUser) return;

    const loadSitesAndZones = async () => {
      try {
        const [sitesRes, zonesRes] = await Promise.all([
          api.get("/sites"),
          api.get("/zones"),
        ]);

        const sitesData = sitesRes.data;
        const zonesData = zonesRes.data;

        const mappedSites = sitesData.map((site: any) => ({
          id: site._id,
          name: site.name,

          zones: zonesData
            .filter((zone: any) => zone.siteId === site._id)
            .map((zone: any) => ({
              id: zone._id,
              name: zone.name,
              siteId: zone.siteId,
            })),
        }));

        setSites(mappedSites);
      } catch (err) {
        console.log("LOAD SITES/ZONES ERROR", err);
      }
    };

    loadSitesAndZones();
    const loadEscalation = async () => {
      try {
        const res = await api.get("/escalation");

        setEscalationLevels(res.data);
      } catch (err) {
        console.log("ESCALATION ERROR", err);
      }
    };

    loadEscalation();
  }, [loggedInUser]);

  useEffect(() => {
    if (loggedInRole === "admin") {
      api
        .get("/guards")
        .then((res) => {
          if (Array.isArray(res.data)) setGuards(res.data);
        })
        .catch(console.error);
      api;
      loadAlerts();
    }
  }, [loggedInRole]);
  useEffect(() => {
    if (loggedInRole !== "admin") return;

    // Load immediately
    loadGuards();
    loadAlerts();

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      loadGuards();
      loadAlerts();
    }, 5000);

    return () => clearInterval(interval);
  }, [loggedInRole]);
  useEffect(() => {
    if (loggedInRole !== "guard" || !activeGuard) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/guards/${activeGuard.id}`);
        setActiveGuard(res.data);
      } catch (e) {
        console.log("LOAD GUARD ERROR", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loggedInRole, activeGuard?.id]);

  const configRef = useRef({ sites, shifts, alertGroups, escalationLevels });
  useEffect(() => {
    configRef.current = { sites, shifts, alertGroups, escalationLevels };
  }, [sites, shifts, alertGroups, escalationLevels]);
  const syncConfig = async () => {
    try {
      await api.put("/config", configRef.current);
    } catch (e) {
      console.error(e);
    }
  };
  const loadGuards = async () => {
    try {
      const res = await api.get("/guards");

      if (Array.isArray(res.data)) {
        setGuards(res.data);
      }
    } catch (err) {
      console.log("LOAD GUARDS ERROR", err);
    }
  };
  const loadAlerts = async () => {
    try {
      const res = await api.get("/alerts");

      if (Array.isArray(res.data)) {
        setAlertHistory(
          res.data.map((a: any) => ({
            ...a,
            id: a._id ?? a.id ?? "",
            timestamp: new Date(a.timestamp ?? Date.now()).getTime(),
          })),
        );
      }
    } catch (err) {
      console.error("LOAD ALERTS ERROR", err);
    }
  };
  // ── Alert countdowns ──
  useEffect(() => {
    if (!activeGuard?.shiftStarted || showAlert) return;
    if (timerSeconds <= 0) {
      generateDemoAlert();
      setTimerSeconds(activeGuardRef.current?.alertInterval ?? 30);
      return;
    }
    const timer = setTimeout(() => setTimerSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [timerSeconds, activeGuard?.shiftStarted, activeGuard?.id, showAlert]);

  useEffect(() => {
    if (!showAlert) return;
    if (responseSeconds <= 0) {
      handleMissedAlert();
      return;
    }
    const timer = setTimeout(() => setResponseSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [responseSeconds, showAlert]);
  useEffect(() => {
    if (!showResolution) return;
    if (photoSeconds <= 0) {
      handlePhotoTimeout();
      return;
    }
    const timer = setTimeout(() => setPhotoSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [photoSeconds, showResolution]);

  useEffect(() => {
    const timer = setInterval(() => setSidebarDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      safePause();
    };
  }, []);

  // ── Auth ──
  const handleLogin = async () => {
    if (!loginId.trim() || !loginPassword.trim()) {
      setLoginError("Please enter ID and password.");
      return;
    }

    try {
      setLoginError(null);
      const res = await api.post("/auth/login", {
        id: loginId.trim(),
        password: loginPassword.trim(),
      });

      console.log("LOGIN SUCCESS:", res.data);

      if (res.data.token) {
        await AsyncStorage.setItem("token", res.data.token);
        console.log("TOKEN SAVED:", res.data.token);
      } else {
        console.log("NO TOKEN RETURNED");
      }

      setLoggedInUser(res.data.user?.id || res.data.guard?.id);

      setLoggedInRole(res.data.role);

      if (res.data.role === "admin") {
        setAdminPage("dashboard");
        setSidebarVisible(false);
        sidebarAnim.setValue(-240);
      }

      if (res.data.role === "guard") {
        let guard = res.data.guard;

        if (!guard.shiftStarted) {
          const shiftRes = await api.post(`/guards/${guard.id}/shift/start`);

          guard = shiftRes.data;
        }

        setActiveGuard(guard);

        setTimerSeconds(
          guard.alertGroupType === "RANDOM"
            ? getGuardAlertInterval(guard)
            : (guard.alertInterval ?? 1800),
        );
      }
    } catch (err: any) {
      console.log("LOGIN ERROR:", err);

      const isNetworkError =
        !err?.response ||
        err?.code === "ERR_NETWORK" ||
        err?.code === "ECONNABORTED" ||
        err?.message?.toLowerCase().includes("network");

      setLoginError(
        isNetworkError
          ? "Please connect to the internet and try again."
          : err?.response?.data?.message || "Unable to login",
      );
    }
  };

  const handleLogout = async () => {
    setLoggedInUser(null);
    setLoggedInRole(null);
    setLoginError(null);
    setActiveGuard(null);
    setShowAlert(false);
    setTimerSeconds(30);
    setResponseSeconds(30);
    setAdminPage("dashboard");
    setSidebarVisible(false);
    sidebarAnim.setValue(-240);
  };

  // ── Shift ──
  const startShift = async () => {
    if (!activeGuard) return;

    const res = await api.post(`/guards/${activeGuard.id}/shift/start`);
    const updated = res.data;

    setActiveGuard(updated);

    setGuards((prev) =>
      prev.map((g) => (g.id === activeGuard.id ? updated : g)),
    );

    if (updated.alertGroupType === "RANDOM") {
      setTimerSeconds(getGuardAlertInterval(updated));
    } else {
      setTimerSeconds(updated.alertInterval ?? 1800);
    }

    Alert.alert(
      "Shift Started",
      `Your shift will end at ${updated.shiftEndTime}`,
    );
  };

  // ── Alert handling ──
  const generateDemoAlert = () => {
    setCurrentGameType(getRandomGame());
    setResponseSeconds(30);
    setGameDisabled(false);
    setShowAlert(true);
    if (Platform.OS !== "web") Vibration.vibrate([1000, 500, 1000]);
    safePlay();
  };

  const recordMissedAlert = async () => {
    const guard = activeGuardRef.current;
    if (!guard) return;
    const gameType = currentGameTypeRef.current;
    try {
      const res = await api.post(`/guards/${guard.id}/alerts`, {
        status: "Missed",
        alertType: gameType,
        responseTime: 0,
        remarks: "",
        photoUri: null,
      });
      if (res.data?.guard) {
        setActiveGuard(res.data.guard);
        setGuards((prev) =>
          prev.map((g) => (g.id === guard.id ? res.data.guard : g)),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMissedAlert = async () => {
    await recordMissedAlert();
    setShowAlert(false);
    setGameDisabled(true);
    safePause();
  };

  const handlePhotoTimeout = async () => {
    await recordMissedAlert();
    setShowResolution(false);
    setResolutionPhotoUri(null);
    setGameDisabled(true);
    safePause();
    if (activeGuard?.alertGroupType === "RANDOM") {
      setTimerSeconds(getGuardAlertInterval(activeGuard));
    } else {
      setTimerSeconds(activeGuard?.alertInterval ?? 1800);
    }
  };

  const handleGameWin = () => {
    setWinResponseSeconds(responseSeconds);
    setGameDisabled(true);
    setShowAlert(false);
    safePause();
    setPhotoSeconds(180);
    setShowResolution(true);
  };

  const submitResolution = async () => {
    if (!resolutionPhotoUri) {
      Alert.alert(t("evidenceRequired"));
      return;
    }
    const guard = activeGuardRef.current;
    if (!guard) return;
    const gameType = currentGameTypeRef.current;
    try {
      const res = await api.post(`/guards/${guard.id}/alerts`, {
        status: "Responded",
        alertType: gameType,
        responseTime: 30 - winResponseSeconds,
        remarks: "",
        photoUri: resolutionPhotoUri,
      });
      setActiveGuard(res.data.guard);
      setGuards((prev) =>
        prev.map((g) => (g.id === guard.id ? res.data.guard : g)),
      );
    } catch (e) {
      console.error(e);
    }
    setShowResolution(false);
    setResolutionPhotoUri(null);
    if (activeGuard?.alertGroupType === "RANDOM") {
      setTimerSeconds(getGuardAlertInterval(activeGuard));
    } else {
      setTimerSeconds(activeGuard?.alertInterval ?? 1800);
    }
    Alert.alert(t("successAlert"), t("alertRecorded"));
  };

  // ── CRUD operations ──

  const addGuard = async () => {
    console.log("ADD GUARD BUTTON CLICKED");
    if (
      !newGuardId.trim() ||
      !newGuardName.trim() ||
      !newGuardLocation.trim()
    ) {
      Alert.alert("Error", "Please fill all required fields.");
      return;
    }
    try {
      const res = await api.post("/guards", {
        id: newGuardId.trim(),
        name: newGuardName.trim(),
        location: newGuardLocation.trim(),
        mobile: newGuardMobile.trim(),
        siteId: newGuardSite,
        zoneId: newGuardZone,
        shiftId: newGuardShift,
        alertGroupId: newGuardGroup,
        password: newGuardPassword,
      });
      setGuards((prev) => [...prev, res.data]);
      setNewGuardId("");
      setNewGuardName("");
      setNewGuardLocation("");
      setNewGuardMobile("");
      setNewGuardSite("");
      setNewGuardZone("");
      setNewGuardShift("");
      setNewGuardGroup("");
      Alert.alert("✅ Added", "Guard added successfully.");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Could not add guard",
      );
    }
  };
  const deleteGuard = async (guardId: string, guardName: string) => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm(`Delete ${guardName}? This cannot be undone.`)
        : await new Promise((resolve) => {
            Alert.alert(
              "Delete Guard",
              `Are you sure you want to delete ${guardName}? This cannot be undone.`,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ],
            );
          });

    if (!confirmed) return;

    try {
      await api.delete(`/guards/${guardId}`);
      setGuards((prev) => prev.filter((g) => g.id !== guardId));
      if (Platform.OS === "web") {
        window.alert("Guard deleted");
      } else {
        Alert.alert("Success", "Guard deleted");
      }
    } catch (err: any) {
      console.log("DELETE GUARD ERROR:", err.response?.data || err);
      if (Platform.OS === "web") {
        window.alert("Failed to delete guard");
      } else {
        Alert.alert("Error", "Failed to delete guard");
      }
    }
  };
  const openEditModal = (guard: Guard) => {
    setEditingGuard(guard);
    setEditName(guard.name);
    setEditLocation(guard.location);
    setEditMobile(guard.mobile ?? "");
    setEditSite(guard.siteId ?? "");
    setEditZone(guard.zoneId ?? "");
    setEditShift(guard.shiftId ?? "");
    setEditGroup(guard.alertGroupId ?? "");
  };

  const saveGuardEdit = async () => {
    if (!editingGuard) return;
    try {
      const res = await api.put(`/guards/${editingGuard.id}`, {
        name: editName.trim(),
        location: editLocation.trim(),
        mobile: editMobile.trim(),
        siteId: editSite,
        zoneId: editZone,
        shiftId: editShift,
        alertGroupId: editGroup,
      });
      setGuards((prev) =>
        prev.map((g) => (g.id === editingGuard.id ? res.data : g)),
      );
      setEditingGuard(null);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Update failed");
    }
  };

  // Site CRUD
  const doCreateSite = async () => {
    if (!createSiteName.trim()) return;

    try {
      const res = await api.post("/sites", {
        name: createSiteName.trim(),
      });

      const newSite = { id: res.data._id, name: res.data.name, zones: [] };
      setSites((prev) => [...prev, newSite]);

      setCreateSiteName("");
      setShowCreateSite(false);

      Alert.alert("Success", "Site created");
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to create site");
    }
  };

  const openEditSite = (site: Site) => {
    console.log("openEditSite called", site);
    setEditingSite(site);
    setEditSiteName(site.name);
  };
  const saveEditSite = () => {
    if (!editingSite || !editSiteName.trim()) return;
    setSites((prev) => {
      const updated = prev.map((s) =>
        s.id === editingSite.id ? { ...s, name: editSiteName.trim() } : s,
      );
      setTimeout(() => syncConfig(), 0);
      return updated;
    });
    setEditingSite(null);
  };
  const deleteSite = async (siteId: string, siteName: string) => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm(
            `Delete ${siteName}? This will also delete all its zones.`,
          )
        : await new Promise((resolve) => {
            Alert.alert(
              "Delete Site",
              `Delete ${siteName}? This will also delete all its zones.`,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ],
            );
          });

    if (!confirmed) return;

    try {
      await api.delete(`/sites/${siteId}`);

      setSites((prev) => prev.filter((s) => s.id !== siteId));

      if (Platform.OS === "web") {
        window.alert("Site deleted");
      } else {
        Alert.alert("Success", "Site deleted");
      }
    } catch (err: any) {
      console.log(err);

      if (Platform.OS === "web") {
        window.alert("Failed to delete site");
      } else {
        Alert.alert("Error", "Failed to delete site");
      }
    }
  };

  // Zone CRUD
  const doCreateZone = async () => {
    if (!createZoneName.trim() || !createZoneSiteId) {
      Alert.alert("Error", "Enter a zone name and select a site.");
      return;
    }

    try {
      await api.post("/zones", {
        name: createZoneName.trim(),
        siteId: createZoneSiteId,
      });

      const [sitesRes, zonesRes] = await Promise.all([
        api.get("/sites"),
        api.get("/zones"),
      ]);

      const mappedSites = sitesRes.data.map((site: any) => ({
        id: site._id,
        name: site.name,
        zones: zonesRes.data
          .filter((z: any) => z.siteId === site._id)
          .map((z: any) => ({
            id: z._id,
            name: z.name,
            siteId: z.siteId,
          })),
      }));

      setSites(mappedSites);

      setCreateZoneName("");
      setCreateZoneSiteId("");
      setShowCreateZone(false);

      Alert.alert("Success", "Zone created successfully");
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to create zone");
    }
  };
  const openEditZone = (siteId: string, zone: Zone) => {
    setEditingZone({
      siteId,
      zone,
    });

    setEditZoneName(zone.name);
  };
  const saveEditZone = async () => {
    if (!editingZone) return;

    try {
      await api.put(`/zones/${editingZone.zone.id}`, {
        name: editZoneName,
        siteId: editingZone.siteId,
      });

      const [sitesRes, zonesRes] = await Promise.all([
        api.get("/sites"),
        api.get("/zones"),
      ]);

      const mappedSites = sitesRes.data.map((site: any) => ({
        id: site._id,
        name: site.name,
        zones: zonesRes.data
          .filter((z: any) => z.siteId === site._id)
          .map((z: any) => ({
            id: z._id,
            name: z.name,
            siteId: z.siteId,
          })),
      }));

      setSites(mappedSites);

      setEditingZone(null);
      setEditZoneName("");

      Alert.alert("Success", "Zone updated");
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to update zone");
    }
  };
  const deleteZone = async (
    siteId: string,
    zoneId: string,
    zoneName: string,
  ) => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm(`Delete zone "${zoneName}"?`)
        : await new Promise((resolve) => {
            Alert.alert("Delete Zone", `Delete "${zoneName}"?`, [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => resolve(true),
              },
            ]);
          });

    if (!confirmed) return;

    try {
      await api.delete(`/zones/${zoneId}`);

      const [sitesRes, zonesRes] = await Promise.all([
        api.get("/sites"),
        api.get("/zones"),
      ]);

      const mappedSites = sitesRes.data.map((site: any) => ({
        id: site._id,
        name: site.name,
        zones: zonesRes.data
          .filter((z: any) => z.siteId === site._id)
          .map((z: any) => ({
            id: z._id,
            name: z.name,
            siteId: z.siteId,
          })),
      }));

      setSites(mappedSites);

      if (Platform.OS === "web") {
        window.alert("Zone deleted");
      } else {
        Alert.alert("Success", "Zone deleted");
      }
    } catch (err: any) {
      console.log("DELETE ZONE ERROR:", err.response?.data || err);

      const message = JSON.stringify(err.response?.data || err.message || err);

      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    }
  };
  // Alert group CRUD
  const addAlertGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: AlertGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      type: newGroupType,
      fixedInterval:
        newGroupType === "FIXED" ? parseInt(newGroupInterval) : undefined,
      randomMin: newGroupType === "RANDOM" ? 1800 : undefined,
      randomMax: newGroupType === "RANDOM" ? 2700 : undefined,
    };
    setAlertGroups((prev) => {
      const updated = [...prev, newGroup];
      setTimeout(() => syncConfig(), 0);
      return updated;
    });
    setNewGroupName("");
    Alert.alert("✅ Added", "Alert group created.");
  };

  // Shift CRUD
  const addShift = () => {
    if (!newShiftName.trim() || !newShiftStart.trim() || !newShiftEnd.trim())
      return;
    const newShift: Shift = {
      id: Date.now().toString(),
      name: newShiftName.trim(),
      startTime: newShiftStart.trim(),
      endTime: newShiftEnd.trim(),
    };
    setShifts((prev) => {
      const updated = [...prev, newShift];
      setTimeout(() => syncConfig(), 0);
      return updated;
    });
    setNewShiftName("");
    setNewShiftStart("");
    setNewShiftEnd("");
  };
  const deleteShift = (id: string) => {
    setShifts((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      setTimeout(() => syncConfig(), 0);
      return updated;
    });
  };

  const updateEscalation = async (
    levelId: string,
    field: string,
    value: any,
  ) => {
    try {
      const level = escalationLevels.find((e: any) => e._id === levelId);

      if (!level) return;

      const updated = {
        ...level,
        [field]: value,
      };

      await api.put(`/escalation/${levelId}`, updated);

      setEscalationLevels((prev) =>
        prev.map((e: any) => (e._id === levelId ? updated : e)),
      );
    } catch (err) {
      console.log(err);
    }
  };

  const toggleSidebar = () => {
    if (sidebarVisible) {
      Animated.timing(sidebarAnim, {
        toValue: -240,
        duration: 300,
        useNativeDriver: Platform.OS !== "web", // ✅
      }).start(() => setSidebarVisible(false));
    } else {
      setSidebarVisible(true);
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== "web", // ✅
      }).start();
    }
  };
  const getRandomInterval = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  const getGuardAlertInterval = (guard: Guard) => {
    if (guard.alertGroupType !== "RANDOM") {
      return guard.alertInterval ?? 1800;
    }

    const group = alertGroups.find((g) => g.id === guard.alertGroupId);

    if (!group) return 1800;

    return getRandomInterval(group.randomMin ?? 1800, group.randomMax ?? 2700);
  };
  const formatTime = (sec: number) =>
    `${Math.floor(sec / 60)
      .toString()
      .padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;
  const getComplianceRate = (g: Guard) =>
    g.totalAlerts === 0
      ? 100
      : Math.round((g.respondedAlerts / g.totalAlerts) * 100);
  console.log("SITES DATA", JSON.stringify(sites, null, 2));
  const escalationReport = useMemo(() => {
    return guards
      .filter((g) => g.missedAlerts > 0)
      .map((g) => {
        const triggeredLevels = escalationLevels
          .filter((lvl: any) => g.missedAlerts >= lvl.missedThreshold)
          .sort((a: any, b: any) => b.level - a.level);
        return { guard: g, level: triggeredLevels[0] };
      })
      .filter((entry) => entry.level)
      .sort((a, b) => b.guard.missedAlerts - a.guard.missedAlerts);
  }, [guards, escalationLevels]);

  const allZones = useMemo(
    () =>
      sites.flatMap((site) =>
        (site.zones || []).map((z) => ({
          ...z,
          siteId: site.id,
          siteName: site.name,
        })),
      ),
    [sites],
  );
  const filteredZones = useMemo(
    () =>
      zoneFilter === "all"
        ? allZones
        : allZones.filter((z) => z.siteId === zoneFilter),
    [allZones, zoneFilter],
  );

  const availableReportZones = useMemo(
    () =>
      reportSiteFilter === "all"
        ? allZones
        : allZones.filter((z) => z.siteId === reportSiteFilter),
    [allZones, reportSiteFilter],
  );

  const getTimeframeStart = (frame: "24h" | "7d" | "30d") => {
    const now = Date.now();
    if (frame === "24h") return now - 24 * 60 * 60 * 1000;
    if (frame === "7d") return now - 7 * 24 * 60 * 60 * 1000;
    return now - 30 * 24 * 60 * 60 * 1000;
  };

  const reportFilteredAlerts = useMemo(() => {
    const start = getTimeframeStart(reportTimeframe);
    return alertHistory.filter((item) => {
      const statusMatch =
        reportStatusFilter === "all" || item.status === reportStatusFilter;
      const siteMatch =
        reportSiteFilter === "all" || item.site === reportSiteFilter;
      const zoneMatch =
        reportZoneFilter === "all" || item.zone === reportZoneFilter;
      const timeMatch = item.timestamp >= start;
      return statusMatch && siteMatch && zoneMatch && timeMatch;
    });
  }, [alertHistory, reportSiteFilter, reportZoneFilter, reportStatusFilter, reportTimeframe]);

  const reportMetrics = useMemo(() => {
    const total = reportFilteredAlerts.length;
    const responded = reportFilteredAlerts.filter(
      (item) => item.status === "Responded",
    ).length;
    const missed = reportFilteredAlerts.filter((item) => item.status === "Missed").length;
    const escalated = reportFilteredAlerts.filter(
      (item) => item.status === "Escalated",
    ).length;
    const avgResponse =
      reportFilteredAlerts.reduce((sum, item) => sum + (item.responseTime ?? 0), 0) /
      Math.max(reportFilteredAlerts.length, 1);
    const criticalEvents = missed + escalated;
    const riskScore = total === 0 ? 0 : Math.round((criticalEvents / total) * 100);
    const uptime = 99.5 + (responded / Math.max(total, 1)) * 0.5;

    const countBy = (
      items: AlertHistory[],
      field: keyof AlertHistory,
    ): Record<string, number> =>
      items.reduce((acc, item) => {
        const value = String(item[field] ?? "Unassigned");
        acc[value] = (acc[value] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const statusCounts = countBy(reportFilteredAlerts, "status");
    const siteCounts = countBy(reportFilteredAlerts, "site");
    const zoneCounts = countBy(reportFilteredAlerts, "zone");

    return {
      total,
      responded,
      missed,
      escalated,
      avgResponse,
      criticalEvents,
      riskScore,
      uptime: Math.min(100, Number(uptime.toFixed(1))),
      statusCounts,
      siteCounts,
      zoneCounts,
    };
  }, [reportFilteredAlerts]);

  const topSites = useMemo(
    () =>
      Object.entries(reportMetrics.siteCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3),
    [reportMetrics.siteCounts],
  );

  const topZones = useMemo(
    () =>
      Object.entries(reportMetrics.zoneCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3),
    [reportMetrics.zoneCounts],
  );

  const latestAlerts = useMemo(
    () =>
      [...reportFilteredAlerts]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 8),
    [reportFilteredAlerts],
  );

  const handleExportReport = () => {
    if (Platform.OS === "web") {
      const csvRows = [
        ["Date", "Time", "Guard", "Status", "Site", "Zone", "Response Time"],
        ...reportFilteredAlerts.map((item) => [
          item.date,
          item.time,
          item.guardName,
          item.status,
          item.site ?? "-",
          item.zone ?? "-",
          item.responseTime ? `${item.responseTime}s` : "-",
        ]),
      ];
      const csvContent = csvRows.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "alert_report.csv";
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    Alert.alert(
      "Export",
      "CSV export is available on web. Use the backend export endpoint for native apps.",
    );
  };

  const renderReportDetailModal = () => (
    <Modal visible={!!selectedReportAlert} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}> 
          <Text style={[styles.modalTitle, { color: colors.text }]}> {t("viewDetails")} </Text>
          <Text style={{ color: colors.subText, marginBottom: 18 }}>Detailed alert record for incident review</Text>
          {selectedReportAlert ? (
            <View style={{ gap: 12 }}>
              {[
                ["Guard", selectedReportAlert.guardName],
                ["Site", selectedReportAlert.site ?? "—"],
                ["Zone", selectedReportAlert.zone ?? "—"],
                ["Status", selectedReportAlert.status],
                ["Alert Type", selectedReportAlert.alertType],
                ["Date / Time", `${selectedReportAlert.date} ${selectedReportAlert.time}`],
                ["Response Time", selectedReportAlert.responseTime ? `${selectedReportAlert.responseTime}s` : "—"],
                ["Remarks", selectedReportAlert.remarks ?? "—"],
              ].map(([label, value]) => (
                <View key={String(label)} style={{ marginBottom: 8 }}>
                  <Text style={{ color: colors.subText, fontSize: 11, marginBottom: 4 }}>{label}</Text>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>{value}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.modalBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
            onPress={() => setSelectedReportAlert(null)}
          >
            <Text style={[styles.buttonText, { color: "#fff" }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Resolution Modal ──
  const renderResolutionModal = () => (
    <Modal visible={showResolution} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Alert Resolution
          </Text>
          <Text
            style={{
              color: colors.warning,
              textAlign: "center",
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 8,
            }}
          >
            {formatTime(photoSeconds)}
          </Text>

          {!!resolutionPhotoUri && (
            <Image
              source={{ uri: resolutionPhotoUri }}
              style={{
                width: 200,
                height: 160,
                marginBottom: 12,
                borderRadius: 10,
                alignSelf: "center",
              }}
            />
          )}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={async () => {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) {
                Alert.alert("Permission required");
                return;
              }
              const res = await ImagePicker.launchCameraAsync({
                quality: 0.4,
              });
              if (!res.canceled && res.assets?.[0])
                setResolutionPhotoUri(res.assets[0].uri);
            }}
          >
            <Text style={styles.buttonText}>{t("attachPhoto")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: resolutionPhotoUri
                  ? colors.success
                  : colors.muted,
              },
            ]}
            disabled={!resolutionPhotoUri}
            onPress={submitResolution}
          >
            <Text style={styles.buttonText}>{t("submit")}</Text>
          </TouchableOpacity>
          {!resolutionPhotoUri && (
            <Text
              style={{
                color: colors.warning,
                marginTop: 8,
                textAlign: "center",
                fontSize: 12,
              }}
            >
              {t("evidenceRequired")}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );

  // ── Sidebar ──
  const renderSidebar = () => (
    <Animated.View
      style={[
        styles.sidebar,
        {
          transform: [{ translateX: sidebarAnim }],
          backgroundColor: colors.sidebarBg,
        },
      ]}
    >
      <View style={styles.sidebarHeader}>
        <Text
          style={{
            color: colors.sidebarText,
            fontSize: 19,
            fontWeight: "700",
            fontFamily: appFontFamily,
            letterSpacing: 0.2,
            lineHeight: 24,
          }}
          numberOfLines={1}
        >
          🌙 Night Guard
        </Text>
        <Text
          style={[styles.sidebarSectionLabel, { color: colors.sidebarText }]}
        >
          Operations
        </Text>
        <Text
          style={{
            color: colors.sidebarText,
            fontSize: 12,
            marginTop: 3,
            opacity: 0.65,
            fontFamily: appFontFamily,
            fontWeight: "500",
            letterSpacing: 0.2,
          }}
        >
          Security Operations Console
        </Text>
        <View
          style={{
            marginTop: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: "rgba(59,130,246,0.18)",
            borderWidth: 1,
            borderColor: "rgba(147,197,253,0.25)",
          }}
        >
          <Text
            style={{
              color: colors.sidebarText,
              fontSize: 20,
              fontWeight: "700",
              letterSpacing: 1.2,
              fontFamily: appFontFamily,
              lineHeight: 24,
            }}
          >
            {sidebarDateTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </Text>
          <Text
            style={{
              color: colors.sidebarText,
              fontSize: 12,
              marginTop: 4,
              opacity: 0.75,
              fontFamily: appFontFamily,
              fontWeight: "500",
              letterSpacing: 0.2,
            }}
          >
            {sidebarDateTime.toLocaleDateString([], {
              weekday: "short",
              day: "2-digit",
              month: "short",
            })}
          </Text>
        </View>
      </View>
      {(
        [
          "dashboard",
          "users",
          "sites",
          "zones",
          "groups",
          "escalation",
          "reports",
          "settings",
        ] as const
      ).map((item) => {
        const isActive = adminPage === item;
        return (
          <TouchableOpacity
            key={item}
            style={[
              styles.sidebarItem,
              {
                backgroundColor: isActive
                  ? colors.sidebarActive
                  : "transparent",
                borderWidth: isActive ? 1 : 0,
                borderColor: isActive
                  ? "rgba(255,255,255,0.12)"
                  : "transparent",
              },
            ]}
            onPress={() => {
              setAdminPage(item);
              toggleSidebar();
            }}
          >
            <Text
              style={[
                styles.sidebarItemText,
                { color: colors.sidebarText, fontFamily: appFontFamily },
              ]}
            >
              {
                (
                  {
                    dashboard: "📊",
                    users: "👥",
                    sites: "🏢",
                    zones: "📍",
                    groups: "⏱️",
                    escalation: "📢",
                    reports: "📈",
                    settings: "⚙️",
                  } as any
                )[item]
              }{" "}
              {t(item)}
            </Text>
          </TouchableOpacity>
        );
      })}
      <View style={{ flex: 1 }} />
      <TouchableOpacity style={styles.sidebarItem} onPress={handleLogout}>
        <Text
          style={[
            styles.sidebarItemText,
            { color: colors.danger, fontFamily: appFontFamily },
          ]}
        >
          🚪 {t("logout")}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // ══════════════════════ RENDER ══════════════════════
  if (!loggedInUser) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <LanguageToggle
          language={language}
          setLanguage={setLanguage}
          colors={colors}
        />
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 120, height: 120, marginBottom: 10 }}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.subtitle,
              { color: colors.subText, fontFamily: appFontFamily },
            ]}
          >
            {t("subtitle")}
          </Text>
        </View>
        <View
          style={[
            styles.loginCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.primary,
              shadowOpacity: 0.12,
            },
          ]}
        >
          <View
            style={[
              styles.loginBadge,
              { backgroundColor: `${colors.primary}18` },
            ]}
          >
            <Text style={{ fontSize: 24 }}>🔐</Text>
          </View>
          <Text
            style={[
              styles.loginTitle,
              { color: colors.text, fontFamily: appFontFamily },
            ]}
          >
            {t("loginTitle")}
          </Text>
          <Text
            style={[
              styles.loginSubtitle,
              { color: colors.subText, fontFamily: appFontFamily },
            ]}
          >
            {t("loginSubtitle")}
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <View
              style={[
                styles.headerBadge,
                {
                  borderColor: `${colors.primary}30`,
                  backgroundColor: `${colors.primary}12`,
                },
              ]}
            >
              <Text style={[styles.headerBadgeText, { color: colors.primary }]}>
                SECURE
              </Text>
            </View>
            <View
              style={[
                styles.headerBadge,
                {
                  borderColor: `${colors.success}30`,
                  backgroundColor: `${colors.success}12`,
                },
              ]}
            >
              <Text style={[styles.headerBadgeText, { color: colors.success }]}>
                24/7 MONITOR
              </Text>
            </View>
          </View>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, color: colors.text },
            ]}
            placeholder={t("userId")}
            placeholderTextColor={colors.subText}
            value={loginId}
            onChangeText={setLoginId}
            autoCapitalize="characters"
          />
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, color: colors.text },
            ]}
            placeholder={t("password")}
            placeholderTextColor={colors.subText}
            secureTextEntry
            value={loginPassword}
            onChangeText={setLoginPassword}
          />
          <TouchableOpacity
            style={[
              styles.mainButton,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOpacity: 0.24,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
              },
            ]}
            onPress={handleLogin}
          >
            <Text style={[styles.buttonText, { fontFamily: appFontFamily }]}>
              {t("loginBtn")}
            </Text>
          </TouchableOpacity>
          {loginError ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: `${colors.danger}20` },
              ]}
            >
              <Text
                style={[
                  styles.errorText,
                  { color: colors.danger, fontFamily: appFontFamily },
                ]}
              >
                {loginError}
              </Text>
            </View>
          ) : null}
          <View style={[styles.loginHint, { borderTopColor: colors.border }]}>
            <Text style={[styles.loginHintText, { color: colors.subText }]}>
              {t("loginHint")}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (loggedInRole === "guard") {
    if (!activeGuard) return null;
    if (showAlert) {
      return (
        <View style={[styles.centered, { backgroundColor: colors.bg }]}>
          <View
            style={[styles.alertBanner, { backgroundColor: colors.danger }]}
          >
            <Text style={styles.alertBannerText}>{t("alertBanner")}</Text>
          </View>
          <Text style={[styles.countdown, { color: colors.warning }]}>
            {formatTime(responseSeconds)}
          </Text>
          <Text style={[styles.countdownSub, { color: colors.subText }]}>
            {t("secondsToRespond")}
          </Text>
          {currentGameType === "PONG" && (
            <PongGame
              onWin={handleGameWin}
              disabled={gameDisabled}
              colors={colors}
            />
          )}
          {currentGameType === "MATH" && (
            <MathGame
              onWin={handleGameWin}
              disabled={gameDisabled}
              colors={colors}
            />
          )}
          {currentGameType === "YESNO" && (
            <YesNoGame
              onWin={handleGameWin}
              disabled={gameDisabled}
              colors={colors}
            />
          )}
          {currentGameType === "SNAKE" && (
            <SnakeGame
              onWin={handleGameWin}
              disabled={gameDisabled}
              colors={colors}
            />
          )}
          {currentGameType === "TAPTARGET" && (
            <TapTargetGame
              onWin={handleGameWin}
              disabled={gameDisabled}
              colors={colors}
            />
          )}
        </View>
      );
    }
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.padded, { alignItems: "center" }]}>
          <Text style={[styles.guardNameLarge, { color: colors.text }]}>
            {activeGuard.name}
          </Text>
          <Text style={[styles.guardDetail, { color: colors.subText }]}>
            {activeGuard.id} • {activeGuard.location}
          </Text>
          {activeGuard.shiftStarted ? (
            <>
              <View style={styles.onDutyBadge}>
                <Text style={styles.onDutyText}>✓ {t("onDuty")}</Text>
              </View>
              <View
                style={[styles.timerCard, { backgroundColor: colors.card }]}
              >
                <Text style={[styles.timerLabel, { color: colors.subText }]}>
                  {t("nextAlert")}
                </Text>
                <Text
                  style={[styles.countdownTimer, { color: colors.warning }]}
                >
                  {formatTime(timerSeconds)}
                </Text>
                <Text style={[styles.shiftInfoText, { color: colors.subText }]}>
                  {activeGuard.shiftStartTime} – {activeGuard.shiftEndTime}
                </Text>
              </View>
              <View style={styles.statsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAdminPage("reports")}
                >
                  <KPICard
                    label={t("totalAlerts")}
                    value={activeGuard.totalAlerts}
                    color={colors.text}
                    icon="📊"
                    colors={colors}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAdminPage("reports")}
                >
                  <KPICard
                    label={t("responded")}
                    value={activeGuard.respondedAlerts}
                    color={colors.success}
                    icon="✅"
                    colors={colors}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAdminPage("reports")}
                >
                  <KPICard
                    label={t("missed")}
                    value={
                      activeGuard.totalAlerts - activeGuard.respondedAlerts
                    }
                    color={colors.danger}
                    icon="❌"
                    colors={colors}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAdminPage("reports")}
                >
                  <KPICard
                    label={t("compliance")}
                    value={`${getComplianceRate(activeGuard)}%`}
                    color={colors.info}
                    icon="📈"
                    colors={colors}
                  />
                </TouchableOpacity>
              </View>
            </>
          ) : null}
          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: colors.muted }]}
            onPress={handleLogout}
          >
            <Text style={styles.buttonText}>{t("logout")}</Text>
          </TouchableOpacity>
        </View>
        {renderResolutionModal()}
      </ScrollView>
    );
  }

  if (loggedInRole === "admin") {
    const totalAlerts = alertHistory.length;
    const responded = alertHistory.filter(
      (h) => h.status === "Responded",
    ).length;
    const missed = alertHistory.filter((h) => h.status === "Missed").length;
    const activeCount = guards.filter((g) => g.shiftStarted).length;
    const pageTitles: Record<string, string> = {
      dashboard: t("dashboard"),
      users: t("users"),
      sites: t("sites"),
      zones: t("zones"),
      groups: t("alertGroups"),
      escalation: t("escalation"),
      reports: t("reports"),
      settings: t("settings"),
    };

    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View
          style={[
            styles.adminHeader,
            {
              backgroundColor: colors.headerBg,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <TouchableOpacity
              onPress={toggleSidebar}
              style={styles.hamburgerBtn}
            >
              <Text style={[styles.hamburgerText, { color: colors.text }]}>
                ☰
              </Text>
            </TouchableOpacity>
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={[styles.adminHeaderTitle, { color: colors.text }]}>
                {pageTitles[adminPage]}
              </Text>
              <Text
                style={{ color: colors.subText, fontSize: 12, marginTop: 2 }}
              >
                Live security operations
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.headerBadge,
              {
                borderColor: `${colors.primary}30`,
                backgroundColor: `${colors.primary}12`,
              },
            ]}
          >
            <Text style={[styles.headerBadgeText, { color: colors.primary }]}>
              LIVE
            </Text>
          </View>
        </View>
        {sidebarVisible && (
          <TouchableOpacity
            style={styles.sidebarOverlay}
            activeOpacity={1}
            onPress={toggleSidebar}
          />
        )}
        {renderSidebar()}

        <ScrollView style={styles.adminContent}>
          <View style={styles.padded}>
            {/* ══ DASHBOARD ══ */}
            {adminPage === "dashboard" && (
              <>
                <View style={styles.kpiGrid}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setAdminPage("reports")}
                  >
                    <KPICard
                      label={t("totalAlerts")}
                      value={totalAlerts}
                      color={colors.text}
                      icon="📊"
                      colors={colors}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setAdminPage("reports")}
                  >
                    <KPICard
                      label={t("responded")}
                      value={responded}
                      color={colors.success}
                      icon="✅"
                      colors={colors}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setAdminPage("reports")}
                  >
                    <KPICard
                      label={t("missed")}
                      value={missed}
                      color={colors.danger}
                      icon="❌"
                      colors={colors}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setAdminPage("users")}
                  >
                    <KPICard
                      label={t("onDutyCount")}
                      value={activeCount}
                      color={colors.primary}
                      icon="👥"
                      colors={colors}
                    />
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.card, marginTop: 20 },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Alert Trends
                  </Text>
                  {/* Legend */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 16,
                      marginBottom: 12,
                      marginLeft: 4,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          backgroundColor: colors.success,
                        }}
                      />
                      <Text style={{ color: colors.subText, fontSize: 11 }}>
                        Responded
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          backgroundColor: colors.danger,
                        }}
                      />
                      <Text style={{ color: colors.subText, fontSize: 11 }}>
                        Missed
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-around",
                      alignItems: "flex-end",
                      marginBottom: 8,
                      height: 110,
                    }}
                  >
                    {(["daily", "weekly", "monthly"] as const).map((period) => {
                      const d = chartData[period];
                      const maxVal = Math.max(d.total, 1);
                      const BAR_MAX = 90;
                      const respondedH = Math.max(
                        4,
                        Math.round((d.responded / maxVal) * BAR_MAX),
                      );
                      const missedH = Math.max(
                        d.missed > 0 ? 4 : 0,
                        Math.round((d.missed / maxVal) * BAR_MAX),
                      );
                      const label =
                        period === "daily"
                          ? "Today"
                          : period === "weekly"
                            ? "7 Days"
                            : "30 Days";
                      return (
                        <View
                          key={period}
                          style={{ alignItems: "center", gap: 4 }}
                        >
                          <Text
                            style={{
                              color: colors.subText,
                              fontSize: 11,
                              fontWeight: "600",
                            }}
                          >
                            {d.total}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "flex-end",
                              gap: 3,
                            }}
                          >
                            <View style={{ alignItems: "center" }}>
                              <View
                                style={{
                                  width: 22,
                                  height: respondedH,
                                  backgroundColor: colors.success,
                                  borderRadius: 4,
                                }}
                              />
                            </View>
                            <View style={{ alignItems: "center" }}>
                              <View
                                style={{
                                  width: 22,
                                  height: missedH,
                                  backgroundColor: colors.danger,
                                  borderRadius: 4,
                                }}
                              />
                            </View>
                          </View>
                          <Text
                            style={{
                              color: colors.subText,
                              fontSize: 10,
                              marginTop: 2,
                            }}
                          >
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  {/* Compliance rate row */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-around",
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      paddingTop: 10,
                      marginTop: 4,
                    }}
                  >
                    {(["daily", "weekly", "monthly"] as const).map((period) => {
                      const d = chartData[period];
                      const rate =
                        d.total === 0
                          ? 100
                          : Math.round((d.responded / d.total) * 100);
                      const label =
                        period === "daily"
                          ? "Today"
                          : period === "weekly"
                            ? "7 Days"
                            : "30 Days";
                      return (
                        <View key={period} style={{ alignItems: "center" }}>
                          <Text
                            style={{
                              color:
                                rate >= 80
                                  ? colors.success
                                  : rate >= 50
                                    ? colors.warning
                                    : colors.danger,
                              fontSize: 13,
                              fontWeight: "700",
                            }}
                          >
                            {rate}%
                          </Text>
                          <Text style={{ color: colors.subText, fontSize: 10 }}>
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Recent Activity
                  </Text>
                  <View>
                    {alertHistory.slice(0, 5).map((item) => (
                      <ReportRow
                        key={`${item.id}-${item.timestamp}`}
                        item={item}
                        onPress={(it) => setSelectedReportAlert(it)}
                        colors={colors}
                      />
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* ══ USERS ══ */}
            {adminPage === "users" && (
              <>
                {guards.map((guard) => (
                  <View
                    key={`${guard.id}-${guard.name}`}
                    style={[styles.userCard, { backgroundColor: colors.card }]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.rowSpace}>
                        <Text
                          style={[styles.guardName, { color: colors.text }]}
                        >
                          {guard.name}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: guard.shiftStarted
                                ? colors.badgeSuccess
                                : colors.inputBg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              {
                                color: guard.shiftStarted
                                  ? colors.badgeSuccessText
                                  : colors.subText,
                              },
                            ]}
                          >
                            {guard.shiftStarted ? "ACTIVE" : "INACTIVE"}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[styles.guardDetail, { color: colors.subText }]}
                      >
                        {guard.id} • {guard.location}
                      </Text>
                      {!!guard.mobile && (
                        <Text
                          style={[
                            styles.guardDetail,
                            { color: colors.subText },
                          ]}
                        >
                          📱 {guard.mobile}
                        </Text>
                      )}
                      <Text
                        style={[styles.guardDetail, { color: colors.subText }]}
                      >
                        {t("compliance")}: {getComplianceRate(guard)}%
                      </Text>
                    </View>
                    <View style={styles.actionColumn}>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: colors.primary },
                        ]}
                        onPress={() => openEditModal(guard)}
                      >
                        <Text style={styles.actionBtnText}>{t("edit")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: colors.danger },
                        ]}
                        onPress={() => deleteGuard(guard.id, guard.name)}
                      >
                        <Text style={styles.actionBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* ─── ADD GUARD FORM ─── */}
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.card, marginTop: 20 },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("addNewGuard")}
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.inputBg, color: colors.text },
                    ]}
                    placeholder={t("guardIdPlaceholder")}
                    placeholderTextColor={colors.subText}
                    value={newGuardId}
                    onChangeText={setNewGuardId}
                  />

                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.inputBg, color: colors.text },
                    ]}
                    placeholder={t("fullNamePlaceholder")}
                    placeholderTextColor={colors.subText}
                    value={newGuardName}
                    onChangeText={setNewGuardName}
                  />

                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.inputBg, color: colors.text },
                    ]}
                    placeholder={t("locationPlaceholder")}
                    placeholderTextColor={colors.subText}
                    value={newGuardLocation}
                    onChangeText={setNewGuardLocation}
                  />

                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.inputBg, color: colors.text },
                    ]}
                    placeholder={t("mobilePlaceholder")}
                    placeholderTextColor={colors.subText}
                    value={newGuardMobile}
                    onChangeText={setNewGuardMobile}
                    keyboardType="phone-pad"
                  />

                  {/* -- Site picker -- */}
                  <View
                    style={[
                      styles.pickerField,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.inputBg,
                      },
                    ]}
                  >
                    <Picker
                      selectedValue={newGuardSite}
                      onValueChange={(value) => {
                        setNewGuardSite(value);
                        setNewGuardZone("");
                      }}
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        height: 48,
                        backgroundColor: "transparent",
                      }}
                    >
                      <Picker.Item
                        label={t("Select Site") || "Select Site"}
                        value=""
                      />
                      {sites.map((site, index) => (
                        <Picker.Item
                          key={`site-${site.id || "noid"}-${index}`}
                          label={site.name}
                          value={site.id}
                        />
                      ))}
                    </Picker>
                  </View>

                  {/* -- Zone picker (filtered) -- */}
                  {newGuardSite ? (
                    <View
                      style={[
                        styles.pickerField,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.inputBg,
                        },
                      ]}
                    >
                      <Picker
                        selectedValue={newGuardZone}
                        onValueChange={(value) => setNewGuardZone(value)}
                        style={{
                          color: colors.text,
                          fontSize: 14,
                          height: 48,
                          backgroundColor: "transparent",
                        }}
                      >
                        <Picker.Item
                          label={t("selectZone") || "Select Zone"}
                          value=""
                        />
                        {(
                          sites.find((st) => st.id === newGuardSite)?.zones ??
                          []
                        ).map((zone) => (
                          <Picker.Item
                            key={zone.id}
                            label={zone.name}
                            value={zone.id}
                          />
                        ))}
                      </Picker>
                    </View>
                  ) : null}

                  {/* -- Shift picker -- */}
                  <View
                    style={[
                      styles.pickerField,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.inputBg,
                      },
                    ]}
                  >
                    <Picker
                      selectedValue={newGuardShift}
                      onValueChange={(value) => setNewGuardShift(value)}
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        height: 48,
                        backgroundColor: "transparent",
                      }}
                    >
                      <Picker.Item
                        label={t("Select Shift") || "Select Shift"}
                        value=""
                      />
                      {shifts.map((shift) => (
                        <Picker.Item
                          key={shift.id}
                          label={shift.name}
                          value={shift.id}
                        />
                      ))}
                    </Picker>
                  </View>

                  {/* -- Alert Group picker -- */}
                  <View
                    style={[
                      styles.pickerField,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.inputBg,
                      },
                    ]}
                  >
                    <Picker
                      selectedValue={newGuardGroup}
                      onValueChange={(value) => setNewGuardGroup(value)}
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        height: 48,
                        backgroundColor: "transparent",
                      }}
                    >
                      <Picker.Item
                        label={t("Select AlertGroup") || "Select Alert Group"}
                        value=""
                      />
                      {alertGroups.map((group) => (
                        <Picker.Item
                          key={group.id}
                          label={group.name}
                          value={group.id}
                        />
                      ))}
                    </Picker>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={addGuard}
                  >
                    <Text style={styles.buttonText}>{t("addGuardBtn")}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ══ SITES ══ */}
            {adminPage === "sites" && (
              <>
                <View
                  style={[
                    styles.pageHeaderRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View>
                    <Text
                      style={[styles.pageHeaderTitle, { color: colors.text }]}
                    >
                      🏢 {t("siteList")}
                    </Text>
                    <Text
                      style={[styles.pageHeaderSub, { color: colors.subText }]}
                    >
                      {sites.length} {sites.length === 1 ? "site" : "sites"}{" "}
                      configured
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.createBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setShowCreateSite(true)}
                  >
                    <Text style={styles.createBtnText}>
                      + {t("createSite")}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    styles.tableCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TableHeader
                    columns={[
                      { label: "SITE NAME", flex: 3 },
                      { label: t("zonesCount").toUpperCase(), flex: 1 },
                      { label: "GUARDS", flex: 1 },
                      { label: "ACTIONS", flex: 2 },
                    ]}
                    colors={colors}
                  />
                  {sites.length === 0 ? (
                    <View style={styles.emptyRow}>
                      <Text
                        style={{ color: colors.subText, textAlign: "center" }}
                      >
                        {t("noSites")}
                      </Text>
                    </View>
                  ) : (
                    sites.map((site, i) => {
                      const guardCount = guards.filter(
                        (g) => g.siteId === site.id,
                      ).length;
                      return (
                        <View
                          key={`${site.id}-${i}`}
                          style={[
                            styles.tableRow,
                            {
                              backgroundColor:
                                i % 2 === 0 ? colors.card : colors.rowAlt,
                              borderTopColor: colors.border,
                            },
                          ]}
                        >
                          <View
                            style={{
                              flex: 3,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <View
                              style={[
                                styles.siteIconBadge,
                                { backgroundColor: colors.badgePrimary },
                              ]}
                            >
                              <Text style={{ fontSize: 16 }}>🏢</Text>
                            </View>
                            <View>
                              <Text
                                style={[
                                  styles.tableRowPrimary,
                                  { color: colors.text },
                                ]}
                              >
                                {site.name}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flex: 1, alignItems: "flex-start" }}>
                            <View
                              style={[
                                styles.countBadge,
                                { backgroundColor: colors.badgePrimary },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.countBadgeText,
                                  { color: colors.badgePrimaryText },
                                ]}
                              >
                                {(site.zones || []).length}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flex: 1, alignItems: "flex-start" }}>
                            <View
                              style={[
                                styles.countBadge,
                                { backgroundColor: colors.badgeSuccess },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.countBadgeText,
                                  { color: colors.badgeSuccessText },
                                ]}
                              >
                                {guardCount}
                              </Text>
                            </View>
                          </View>
                          <View
                            style={{ flex: 2, flexDirection: "row", gap: 6 }}
                          >
                            <TouchableOpacity
                              style={[
                                styles.tblEditBtn,
                                { borderColor: colors.border },
                              ]}
                              onPress={() => openEditSite(site)}
                            >
                              <Text
                                style={[
                                  styles.tblEditBtnText,
                                  { color: colors.text },
                                ]}
                              >
                                ✏️ Edit
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.tblDeleteBtn,
                                { backgroundColor: colors.danger + "18" },
                              ]}
                              onPress={() => deleteSite(site.id, site.name)}
                            >
                              <Text
                                style={[
                                  styles.tblDeleteBtnText,
                                  { color: colors.danger },
                                ]}
                              >
                                🗑️
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Create Site Modal */}
                <Modal
                  visible={showCreateSite}
                  transparent
                  animationType="slide"
                >
                  <View style={styles.modalOverlay}>
                    <View
                      style={[
                        styles.modalContainer,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <Text style={[styles.modalTitle, { color: colors.text }]}>
                        🏢 {t("createSite")}
                      </Text>
                      <Text
                        style={[styles.modalLabel, { color: colors.subText }]}
                      >
                        {t("siteName")}
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.inputBg,
                            color: colors.text,
                          },
                        ]}
                        placeholder={t("newSitePlaceholder")}
                        placeholderTextColor={colors.subText}
                        value={createSiteName}
                        onChangeText={setCreateSiteName}
                        autoFocus
                      />
                      <View style={styles.rowSpace}>
                        <TouchableOpacity
                          style={[
                            styles.modalBtn,
                            { backgroundColor: colors.inputBg },
                          ]}
                          onPress={() => {
                            setShowCreateSite(false);
                            setCreateSiteName("");
                          }}
                        >
                          <Text
                            style={[styles.buttonText, { color: colors.text }]}
                          >
                            {t("cancel")}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.modalBtn,
                            { backgroundColor: colors.primary },
                          ]}
                          onPress={doCreateSite}
                        >
                          <Text style={styles.buttonText}>{t("addSite")}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>

                {/* Edit Site Modal */}
                <Modal
                  visible={!!editingSite}
                  transparent
                  animationType="slide"
                >
                  <View style={styles.modalOverlay}>
                    <View
                      style={[
                        styles.modalContainer,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <Text style={[styles.modalTitle, { color: colors.text }]}>
                        ✏️ {t("editSite")}
                      </Text>
                      <Text
                        style={[styles.modalLabel, { color: colors.subText }]}
                      >
                        {t("siteName")}
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.inputBg,
                            color: colors.text,
                          },
                        ]}
                        value={editSiteName}
                        onChangeText={setEditSiteName}
                        autoFocus
                        placeholderTextColor={colors.subText}
                      />
                      <View style={styles.rowSpace}>
                        <TouchableOpacity
                          style={[
                            styles.modalBtn,
                            { backgroundColor: colors.inputBg },
                          ]}
                          onPress={() => setEditingSite(null)}
                        >
                          <Text
                            style={[styles.buttonText, { color: colors.text }]}
                          >
                            {t("cancel")}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.modalBtn,
                            { backgroundColor: colors.primary },
                          ]}
                          onPress={saveEditSite}
                        >
                          <Text style={styles.buttonText}>{t("save")}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>
              </>
            )}

            {/* ══ ZONES ══ */}
            {adminPage === "zones" && (
              <>
                <View
                  style={[
                    styles.pageHeaderRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View>
                    <Text
                      style={[styles.pageHeaderTitle, { color: colors.text }]}
                    >
                      📍 {t("zoneList")}
                    </Text>
                    <Text
                      style={[styles.pageHeaderSub, { color: colors.subText }]}
                    >
                      {allZones.length} zones across {sites.length} sites
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.createBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setShowCreateZone(true)}
                  >
                    <Text style={styles.createBtnText}>
                      + {t("createZone")}
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 16 }}
                >
                  <View
                    style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}
                  >
                    {[{ id: "all", name: t("allSites") }, ...sites].map(
                      (site) => (
                        <TouchableOpacity
                          key={`${site.id}-${site.name}`}
                          style={[
                            styles.filterPill,
                            {
                              backgroundColor:
                                zoneFilter === site.id
                                  ? colors.primary
                                  : colors.card,
                              borderColor:
                                zoneFilter === site.id
                                  ? colors.primary
                                  : colors.border,
                            },
                          ]}
                          onPress={() => setZoneFilter(site.id)}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              {
                                color:
                                  zoneFilter === site.id ? "#fff" : colors.text,
                              },
                            ]}
                          >
                            {site.name}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </ScrollView>
                <View
                  style={[
                    styles.tableCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TableHeader
                    columns={[
                      { label: "ZONE NAME", flex: 3 },
                      { label: "SITE", flex: 3 },
                      { label: "ACTIONS", flex: 2 },
                    ]}
                    colors={colors}
                  />
                  {filteredZones.length === 0 ? (
                    <View style={styles.emptyRow}>
                      <Text
                        style={{ color: colors.subText, textAlign: "center" }}
                      >
                        {t("noZones")}
                      </Text>
                    </View>
                  ) : (
                    filteredZones.map((zone, i) => (
                      <View
                        key={`${zone.siteId}-${zone.id}-${i}`}
                        style={[
                          styles.tableRow,
                          {
                            backgroundColor:
                              i % 2 === 0 ? colors.card : colors.rowAlt,
                            borderTopColor: colors.border,
                          },
                        ]}
                      >
                        <View
                          style={{
                            flex: 3,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <View
                            style={[
                              styles.siteIconBadge,
                              { backgroundColor: colors.badgeSuccess },
                            ]}
                          >
                            <Text style={{ fontSize: 14 }}>📍</Text>
                          </View>
                          <Text
                            style={[
                              styles.tableRowPrimary,
                              { color: colors.text },
                            ]}
                          >
                            {zone.name}
                          </Text>
                        </View>
                        <View
                          style={{
                            flex: 3,
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <View
                            style={[
                              styles.sitePill,
                              { backgroundColor: colors.badgePrimary },
                            ]}
                          >
                            <Text
                              style={[
                                styles.sitePillText,
                                { color: colors.badgePrimaryText },
                              ]}
                              numberOfLines={1}
                            >
                              {zone.siteName}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flex: 2, flexDirection: "row", gap: 6 }}>
                          <TouchableOpacity
                            style={[
                              styles.tblEditBtn,
                              { borderColor: colors.border },
                            ]}
                            onPress={() => openEditZone(zone.siteId, zone)}
                          >
                            <Text
                              style={[
                                styles.tblEditBtnText,
                                { color: colors.text },
                              ]}
                            >
                              ✏️ Edit
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.tblDeleteBtn,
                              { backgroundColor: colors.danger + "18" },
                            ]}
                            onPress={() =>
                              deleteZone(zone.siteId, zone.id, zone.name)
                            }
                          >
                            <Text
                              style={[
                                styles.tblDeleteBtnText,
                                { color: colors.danger },
                              ]}
                            >
                              🗑️
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Create Zone Modal */}
                <Modal
                  visible={showCreateZone}
                  transparent
                  animationType="slide"
                >
                  <View style={styles.modalOverlay}>
                    <View
                      style={[
                        styles.modalContainer,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <Text style={[styles.modalTitle, { color: colors.text }]}>
                        📍 {t("createZone")}
                      </Text>
                      <Text
                        style={[styles.modalLabel, { color: colors.subText }]}
                      >
                        {t("zoneName")}
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.inputBg,
                            color: colors.text,
                          },
                        ]}
                        placeholder={t("newZonePlaceholder")}
                        placeholderTextColor={colors.subText}
                        value={createZoneName}
                        onChangeText={setCreateZoneName}
                      />
                      <Text
                        style={[styles.modalLabel, { color: colors.subText }]}
                      >
                        {t("site")}
                      </Text>
                      <View
                        style={[
                          styles.pickerField,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.inputBg,
                          },
                        ]}
                      >
                        <Picker
                          selectedValue={createZoneSiteId}
                          onValueChange={(value) => setCreateZoneSiteId(value)}
                          style={{
                            color: colors.text,
                            height: 48,
                          }}
                        >
                          <Picker.Item label="Select Site" value="" />

                          {sites.map((site, index) => (
                            <Picker.Item
                              key={`edit-site-${site.id || "noid"}-${index}`}
                              label={site.name}
                              value={site.id}
                            />
                          ))}
                        </Picker>
                      </View>
                      <View style={styles.rowSpace}>
                        <TouchableOpacity
                          style={[
                            styles.modalBtn,
                            { backgroundColor: colors.inputBg },
                          ]}
                          onPress={() => {
                            setShowCreateZone(false);
                            setCreateZoneName("");
                            setCreateZoneSiteId("");
                          }}
                        >
                          <Text
                            style={[styles.buttonText, { color: colors.text }]}
                          >
                            {t("cancel")}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.modalBtn,
                            { backgroundColor: colors.primary },
                          ]}
                          onPress={doCreateZone}
                        >
                          <Text style={styles.buttonText}>{t("addZone")}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>

                {/* Edit Zone Modal */}
                <Modal
                  visible={!!editingZone}
                  transparent
                  animationType="slide"
                >
                  <View style={styles.modalOverlay}>
                    <View
                      style={[
                        styles.modalContainer,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <Text style={[styles.modalTitle, { color: colors.text }]}>
                        ✏️ {t("editZone")}
                      </Text>
                      <Text
                        style={[styles.modalLabel, { color: colors.subText }]}
                      >
                        {t("zoneName")}
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.inputBg,
                            color: colors.text,
                          },
                        ]}
                        value={editZoneName}
                        onChangeText={setEditZoneName}
                        autoFocus
                        placeholderTextColor={colors.subText}
                      />
                      <View style={styles.rowSpace}>
                        <TouchableOpacity
                          style={[
                            styles.modalBtn,
                            { backgroundColor: colors.inputBg },
                          ]}
                          onPress={() => setEditingZone(null)}
                        >
                          <Text
                            style={[styles.buttonText, { color: colors.text }]}
                          >
                            {t("cancel")}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.modalBtn,
                            { backgroundColor: colors.primary },
                          ]}
                          onPress={saveEditZone}
                        >
                          <Text style={styles.buttonText}>{t("save")}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>
              </>
            )}

            {/* ══ ALERT GROUPS ══ */}
            {adminPage === "groups" && (
              <>
                {alertGroups.map((group) => (
                  <View
                    key={group.id}
                    style={[
                      styles.card,
                      { backgroundColor: colors.card, marginBottom: 12 },
                    ]}
                  >
                    <Text style={[styles.guardName, { color: colors.text }]}>
                      {group.name}
                    </Text>
                    <Text
                      style={[styles.guardDetail, { color: colors.subText }]}
                    >
                      Type: {group.type} |{" "}
                      {group.type === "FIXED"
                        ? `${group.fixedInterval}s`
                        : `${group.randomMin}–${group.randomMax}s`}
                    </Text>
                  </View>
                ))}
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("createGroup")}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.inputBg, color: colors.text },
                    ]}
                    placeholder={t("groupName")}
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                    placeholderTextColor={colors.subText}
                  />
                  <View
                    style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}
                  >
                    {(["FIXED", "RANDOM"] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.roleBtn,
                          {
                            backgroundColor:
                              newGroupType === type
                                ? colors.primary
                                : colors.muted,
                          },
                        ]}
                        onPress={() => setNewGroupType(type)}
                      >
                        <Text style={styles.buttonText}>
                          {type === "FIXED" ? t("fixed") : t("random")}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {newGroupType === "FIXED" && (
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.inputBg, color: colors.text },
                      ]}
                      placeholder={t("interval")}
                      value={newGroupInterval}
                      onChangeText={setNewGroupInterval}
                      keyboardType="numeric"
                      placeholderTextColor={colors.subText}
                    />
                  )}
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={addAlertGroup}
                  >
                    <Text style={styles.buttonText}>{t("createGroup")}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ══ ESCALATION ══ */}
            {adminPage === "escalation" && (
              <>
                {/* ── LIVE ESCALATION ALERTS ── */}
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.card, marginBottom: 16 },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: colors.text, fontFamily: appFontFamily },
                      ]}
                    >
                      🚨 Active Escalations
                    </Text>
                    <View
                      style={{
                        backgroundColor:
                          escalationReport.length > 0
                            ? colors.danger
                            : colors.success,
                        borderRadius: 12,
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {escalationReport.length} Active
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.guardDetail,
                      { color: colors.subText, marginBottom: 12 },
                    ]}
                  >
                    Push notifications triggered when guards breach a
                    missed-alert threshold
                  </Text>
                  {escalationReport.length === 0 ? (
                    <View style={{ alignItems: "center", paddingVertical: 20 }}>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
                      <Text
                        style={{ color: colors.success, fontWeight: "600" }}
                      >
                        All clear — no escalations
                      </Text>
                    </View>
                  ) : (
                    escalationReport.map(({ guard, level }) => {
                      const compliance =
                        guard.totalAlerts === 0
                          ? 100
                          : Math.round(
                              (guard.respondedAlerts / guard.totalAlerts) * 100,
                            );
                      return (
                        <View
                          key={guard.id}
                          style={{
                            backgroundColor: colors.bg,
                            borderRadius: 10,
                            padding: 14,
                            marginBottom: 10,
                            borderLeftWidth: 4,
                            borderLeftColor:
                              level.level === 1
                                ? colors.warning
                                : level.level === 2
                                  ? "#FF8C00"
                                  : colors.danger,
                          }}
                        >
                          {/* Header row */}
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 6,
                            }}
                          >
                            <Text
                              style={[
                                styles.alertGuardName,
                                { color: colors.text },
                              ]}
                            >
                              {guard.name}
                            </Text>
                            <View
                              style={{
                                backgroundColor:
                                  level.level === 1
                                    ? colors.warning
                                    : level.level === 2
                                      ? "#FF8C00"
                                      : colors.danger,
                                borderRadius: 8,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                              }}
                            >
                              <Text
                                style={{
                                  color: "#fff",
                                  fontSize: 11,
                                  fontWeight: "700",
                                }}
                              >
                                LEVEL {level.level}
                              </Text>
                            </View>
                          </View>
                          {/* Guard info */}
                          <Text
                            style={{
                              color: colors.subText,
                              fontSize: 12,
                              marginBottom: 4,
                            }}
                          >
                            🪪 {guard.id} • 📍 {guard.location || "—"}
                          </Text>
                          {/* Stats row */}
                          <View
                            style={{
                              flexDirection: "row",
                              gap: 12,
                              marginBottom: 8,
                            }}
                          >
                            <View style={{ alignItems: "center" }}>
                              <Text
                                style={{
                                  color: colors.danger,
                                  fontWeight: "700",
                                  fontSize: 16,
                                }}
                              >
                                {guard.missedAlerts}
                              </Text>
                              <Text
                                style={{ color: colors.subText, fontSize: 10 }}
                              >
                                Missed
                              </Text>
                            </View>
                            <View style={{ alignItems: "center" }}>
                              <Text
                                style={{
                                  color: colors.success,
                                  fontWeight: "700",
                                  fontSize: 16,
                                }}
                              >
                                {guard.respondedAlerts}
                              </Text>
                              <Text
                                style={{ color: colors.subText, fontSize: 10 }}
                              >
                                Responded
                              </Text>
                            </View>
                            <View style={{ alignItems: "center" }}>
                              <Text
                                style={{
                                  color:
                                    compliance >= 80
                                      ? colors.success
                                      : compliance >= 50
                                        ? colors.warning
                                        : colors.danger,
                                  fontWeight: "700",
                                  fontSize: 16,
                                }}
                              >
                                {compliance}%
                              </Text>
                              <Text
                                style={{ color: colors.subText, fontSize: 10 }}
                              >
                                Compliance
                              </Text>
                            </View>
                          </View>
                          {/* Escalation contact */}
                          <View
                            style={{
                              backgroundColor: colors.card,
                              borderRadius: 8,
                              padding: 10,
                            }}
                          >
                            <Text
                              style={{
                                color: colors.text,
                                fontWeight: "600",
                                fontSize: 13,
                                marginBottom: 4,
                              }}
                            >
                              {level.name}{" "}
                              {level.designation
                                ? `— ${level.designation}`
                                : ""}
                            </Text>
                            {!!level.phone && (
                              <Text
                                style={{ color: colors.primary, fontSize: 13 }}
                              >
                                📞 {level.phone}
                              </Text>
                            )}
                            {!!level.email && (
                              <Text
                                style={{
                                  color: colors.primary,
                                  fontSize: 12,
                                  marginTop: 2,
                                }}
                              >
                                ✉️ {level.email}
                              </Text>
                            )}
                            <View
                              style={{
                                flexDirection: "row",
                                gap: 8,
                                marginTop: 6,
                              }}
                            >
                              {level.notifyBySMS && (
                                <View
                                  style={{
                                    backgroundColor: colors.badgePrimary,
                                    borderRadius: 6,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: colors.badgePrimaryText,
                                      fontSize: 11,
                                    }}
                                  >
                                    SMS
                                  </Text>
                                </View>
                              )}
                              {level.notifyByCall && (
                                <View
                                  style={{
                                    backgroundColor: colors.badgeSuccess,
                                    borderRadius: 6,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: colors.badgeSuccessText,
                                      fontSize: 11,
                                    }}
                                  >
                                    CALL
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* ── ESCALATION LEVEL SETTINGS ── */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    ⚙️ Push System Levels
                  </Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                    }}
                    onPress={async () => {
                      const nextLevel = escalationLevels.length + 1;
                      try {
                        const res = await api.post("/escalation", {
                          level: nextLevel,
                          name: `Level ${nextLevel} Contact`,
                          designation: "",
                          phone: "",
                          email: "",
                          missedThreshold: nextLevel * 2,
                          notifyBySMS: true,
                          notifyByCall: false,
                        });
                        setEscalationLevels((prev) => [...prev, res.data]);
                      } catch (err) {
                        Alert.alert("Error", "Could not add level");
                      }
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}
                    >
                      + Add Level
                    </Text>
                  </TouchableOpacity>
                </View>

                {escalationLevels.length === 0 && (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        alignItems: "center",
                        paddingVertical: 24,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.subText }}>
                      No push system levels configured yet.
                    </Text>
                    <Text
                      style={{
                        color: colors.subText,
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      Tap "+ Add Level" to create one.
                    </Text>
                  </View>
                )}

                {escalationLevels.map((level) => (
                  <View
                    key={`${level._id}-${level.level}`}
                    style={[
                      styles.card,
                      { backgroundColor: colors.card, marginBottom: 14 },
                    ]}
                  >
                    {/* Level header */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor:
                              level.level === 1
                                ? colors.warning
                                : level.level === 2
                                  ? "#FF8C00"
                                  : colors.danger,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: "#fff",
                              fontWeight: "700",
                              fontSize: 14,
                            }}
                          >
                            {level.level}
                          </Text>
                        </View>
                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: "700",
                            fontSize: 15,
                          }}
                        >
                          Level {level.level}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={async () => {
                          const confirmed =
                            Platform.OS === "web"
                              ? window.confirm(`Delete Level ${level.level}?`)
                              : await new Promise((resolve) => {
                                  Alert.alert(
                                    "Delete Level",
                                    `Delete Level ${level.level}?`,
                                    [
                                      {
                                        text: "Cancel",
                                        style: "cancel",
                                        onPress: () => resolve(false),
                                      },
                                      {
                                        text: "Delete",
                                        style: "destructive",
                                        onPress: () => resolve(true),
                                      },
                                    ],
                                  );
                                });
                          if (!confirmed) return;
                          try {
                            await api.delete(`/escalation/${level._id}`);
                            setEscalationLevels((prev) =>
                              prev.filter((l) => l._id !== level._id),
                            );
                          } catch (err) {
                            Alert.alert("Error", "Could not delete level");
                          }
                        }}
                        style={{ padding: 4 }}
                      >
                        <Text
                          style={{
                            color: colors.danger,
                            fontSize: 18,
                            fontFamily: appFontFamily,
                          }}
                        >
                          🗑️
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Contact Name */}
                    <Text
                      style={{
                        color: colors.subText,
                        fontSize: 11,
                        marginBottom: 3,
                      }}
                    >
                      CONTACT NAME
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          color: colors.text,
                          fontWeight: "600",
                        },
                      ]}
                      value={level.name}
                      placeholder="e.g. Supervisor"
                      onChangeText={(txt) =>
                        updateEscalation(level._id, "name", txt)
                      }
                      placeholderTextColor={colors.subText}
                    />

                    {/* Designation */}
                    <Text
                      style={{
                        color: colors.subText,
                        fontSize: 11,
                        marginBottom: 3,
                      }}
                    >
                      DESIGNATION
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.inputBg, color: colors.text },
                      ]}
                      value={level.designation || ""}
                      placeholder="e.g. Site Manager"
                      onChangeText={(txt) =>
                        updateEscalation(level._id, "designation", txt)
                      }
                      placeholderTextColor={colors.subText}
                    />

                    {/* Phone */}
                    <Text
                      style={{
                        color: colors.subText,
                        fontSize: 11,
                        marginBottom: 3,
                      }}
                    >
                      PHONE NUMBER
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.inputBg, color: colors.text },
                      ]}
                      value={level.phone}
                      placeholder="+91 99999 00000"
                      onChangeText={(txt) =>
                        updateEscalation(level._id, "phone", txt)
                      }
                      keyboardType="phone-pad"
                      placeholderTextColor={colors.subText}
                    />

                    {/* Email */}
                    <Text
                      style={{
                        color: colors.subText,
                        fontSize: 11,
                        marginBottom: 3,
                      }}
                    >
                      EMAIL
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.inputBg, color: colors.text },
                      ]}
                      value={level.email || ""}
                      placeholder="supervisor@company.com"
                      onChangeText={(txt) =>
                        updateEscalation(level._id, "email", txt)
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor={colors.subText}
                    />

                    {/* Missed Threshold */}
                    <Text
                      style={{
                        color: colors.subText,
                        fontSize: 11,
                        marginBottom: 3,
                      }}
                    >
                      TRIGGER AFTER (MISSED ALERTS)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.inputBg, color: colors.text },
                      ]}
                      value={String(level.missedThreshold)}
                      onChangeText={(txt) =>
                        updateEscalation(
                          level._id,
                          "missedThreshold",
                          parseInt(txt) || 0,
                        )
                      }
                      keyboardType="numeric"
                      placeholderTextColor={colors.subText}
                      placeholder="e.g. 3"
                    />

                    {/* Notify toggles */}
                    <Text
                      style={{
                        color: colors.subText,
                        fontSize: 11,
                        marginBottom: 8,
                      }}
                    >
                      NOTIFY VIA
                    </Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: level.notifyBySMS
                            ? colors.primary
                            : colors.inputBg,
                          borderRadius: 8,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                        }}
                        onPress={() =>
                          updateEscalation(
                            level._id,
                            "notifyBySMS",
                            !level.notifyBySMS,
                          )
                        }
                      >
                        <Text style={{ fontSize: 16 }}>📱</Text>
                        <Text
                          style={{
                            color: level.notifyBySMS ? "#fff" : colors.text,
                            fontWeight: "600",
                          }}
                        >
                          SMS
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: level.notifyByCall
                            ? colors.primary
                            : colors.inputBg,
                          borderRadius: 8,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                        }}
                        onPress={() =>
                          updateEscalation(
                            level._id,
                            "notifyByCall",
                            !level.notifyByCall,
                          )
                        }
                      >
                        <Text style={{ fontSize: 16 }}>📞</Text>
                        <Text
                          style={{
                            color: level.notifyByCall ? "#fff" : colors.text,
                            fontWeight: "600",
                          }}
                        >
                          Call
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* ══ REPORTS ══ */}
            {adminPage === "reports" && (
              <>
                <View style={[styles.card, { backgroundColor: colors.card }]}> 
                  <View style={styles.rowSpace}>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}> 
                        {t("reportTitle")} 
                      </Text>
                      <Text style={[styles.subtitle, { color: colors.subText }]}> 
                        {t("reportFilters")} 
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.createBtn, { backgroundColor: colors.primary }]}
                      onPress={handleExportReport}
                    >
                      <Text style={styles.createBtnText}>{t("exportCSV")}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.kpiGrid}>
                    <KPICard
                      label={t("totalAlerts")}
                      value={reportMetrics.total}
                      color={colors.text}
                      icon="📊"
                      colors={colors}
                    />
                    <KPICard
                      label={t("responded")}
                      value={reportMetrics.responded}
                      color={colors.success}
                      icon="✅"
                      colors={colors}
                    />
                    <KPICard
                      label={t("missed")}
                      value={reportMetrics.missed}
                      color={colors.danger}
                      icon="❌"
                      colors={colors}
                    />
                    <KPICard
                      label={t("avgResponse")}
                      value={`${reportMetrics.avgResponse.toFixed(1)}s`}
                      color={colors.info}
                      icon="⏱️"
                      colors={colors}
                    />
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        minWidth: 150,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 18,
                        backgroundColor: colors.bg,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.subText,
                          fontSize: 11,
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        {t("uptime")}
                      </Text>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 28,
                          fontWeight: "700",
                        }}
                      >
                        {reportMetrics.uptime}%
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        minWidth: 150,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 18,
                        backgroundColor: colors.bg,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.subText,
                          fontSize: 11,
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        {t("criticalEvents")}
                      </Text>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 28,
                          fontWeight: "700",
                        }}
                      >
                        {reportMetrics.criticalEvents}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        minWidth: 150,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 18,
                        backgroundColor: colors.bg,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.subText,
                          fontSize: 11,
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        {t("riskScore")}
                      </Text>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 28,
                          fontWeight: "700",
                        }}
                      >
                        {reportMetrics.riskScore}%
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        color: colors.subText,
                        fontSize: 12,
                        marginBottom: 10,
                        textTransform: "uppercase",
                      }}
                    >
                      {t("byStatus")}
                    </Text>
                    <View>
                      {Object.entries(reportMetrics.statusCounts).map(
                        ([label, value]) => {
                          const width =
                            reportMetrics.total === 0
                              ? "0%"
                              : `${Math.round((value / reportMetrics.total) * 100)}%`;
                          const labelColor =
                            label === "Responded"
                              ? colors.success
                              : label === "Missed"
                              ? colors.danger
                              : colors.warning;
                          return (
                            <View
                              key={label}
                              style={{ marginBottom: 8, gap: 6 }}
                            >
                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                }}
                              >
                                <Text style={{ color: colors.text }}>{label}</Text>
                                <Text style={{ color: colors.subText }}>{value}</Text>
                              </View>
                              <View
                                style={{
                                  height: 8,
                                  backgroundColor: colors.inputBg,
                                  borderRadius: 999,
                                  overflow: "hidden",
                                }}
                              >
                                <View
                                  style={{
                                    width: width as unknown as number,
                                    height: 8,
                                    backgroundColor: labelColor,
                                  }}
                                />
                              </View>
                            </View>
                          );
                        },
                      )}
                    </View>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        color: colors.subText,
                        fontSize: 12,
                        marginBottom: 10,
                        textTransform: "uppercase",
                      }}
                    >
                      {t("responseTrend")}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: 14 }}>
                      {reportMetrics.total === 0
                        ? t("noRecords")
                        : `Average response time over ${reportTimeframe}`}
                    </Text>
                  </View>

                  <View style={{ marginBottom: 24 }}>
                    <Text
                      style={{
                        color: colors.subText,
                        fontSize: 12,
                        marginBottom: 10,
                        textTransform: "uppercase",
                      }}
                    >
                      {t("latestActivity")}
                    </Text>
                    <View
                      style={[
                        styles.tableCard,
                        {
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TableHeader
                        columns={[
                          { label: "Guard", flex: 2 },
                          { label: "Status", flex: 1 },
                          { label: "Site", flex: 1 },
                          { label: "Time", flex: 1 },
                        ]}
                        colors={colors}
                      />
                      {latestAlerts.length === 0 ? (
                        <View style={styles.emptyRow}>
                          <Text style={{ color: colors.subText }}>
                            {t("noRecords")}
                          </Text>
                        </View>
                      ) : (
                        latestAlerts.map((item) => (
                          <TouchableOpacity
                            key={`${item.id}-${item.timestamp}`}
                            activeOpacity={0.85}
                            onPress={() => setSelectedReportAlert(item)}
                            style={[
                              styles.tableRow,
                              {
                                borderTopColor: colors.border,
                                backgroundColor: colors.card,
                              },
                            ]}
                          >
                            <View style={{ flex: 2 }}>
                              <Text
                                style={[styles.tableRowPrimary, { color: colors.text }]}
                              >
                                {item.guardName}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  color:
                                    item.status === "Responded"
                                      ? colors.success
                                      : item.status === "Missed"
                                      ? colors.danger
                                      : colors.warning,
                                  fontWeight: "700",
                                }}
                              >
                                {item.status}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.tableRowSecondary, { color: colors.subText }]}> 
                                {item.site || "—"}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.tableRowSecondary, { color: colors.subText }]}> 
                                {item.time}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </View>

                  <View style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: 12,
                  }}>
                    <View style={{
                      flex: 1,
                      minWidth: 160,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 18,
                      backgroundColor: colors.bg,
                    }}>
                      <Text style={{ color: colors.subText, fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1, }}>
                        {t("bySite")}
                      </Text>
                      {topSites.map(([site, value]) => (
                        <View key={site} style={{ marginBottom: 10 }}>
                          <Text style={{ color: colors.text, fontWeight: "600" }}>{site}</Text>
                          <Text style={{ color: colors.subText, fontSize: 12 }}>{value} alerts</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{
                      flex: 1,
                      minWidth: 160,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 18,
                      backgroundColor: colors.bg,
                    }}>
                      <Text style={{ color: colors.subText, fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1, }}>
                        {t("byZone")}
                      </Text>
                      {topZones.map(([zone, value]) => (
                        <View key={zone} style={{ marginBottom: 10 }}>
                          <Text style={{ color: colors.text, fontWeight: "600" }}>{zone}</Text>
                          <Text style={{ color: colors.subText, fontSize: 12 }}>{value} alerts</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}> 
                    {t("reportFilters")} 
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 14 }}>
                    {(["24h", "7d", "30d"] as const).map((frame) => (
                      <TouchableOpacity
                        key={frame}
                        onPress={() => setReportTimeframe(frame)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor:
                            reportTimeframe === frame ? colors.primary : colors.border,
                          backgroundColor:
                            reportTimeframe === frame ? colors.primary : colors.inputBg,
                          marginRight: 10,
                          marginBottom: 10,
                        }}
                      >
                        <Text style={{
                          color: reportTimeframe === frame ? "#fff" : colors.text,
                          fontWeight: "600",
                        }}>
                          {frame}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
                    <View style={{ flex: 1, minWidth: 160, marginRight: 10, marginBottom: 10 }}>
                      <Text style={{ color: colors.subText, fontSize: 11, marginBottom: 6 }}>{t("filterBySite")}</Text>
                      <View style={[styles.pickerField, { backgroundColor: colors.inputBg, borderColor: colors.border }]}> 
                        <Picker
                          selectedValue={reportSiteFilter}
                          onValueChange={(value) => {
                            setReportSiteFilter(String(value));
                            setReportZoneFilter("all");
                          }}
                          dropdownIconColor={colors.text}
                          itemStyle={{ color: colors.text }}
                          style={{ color: colors.text, width: "100%" }}
                        >
                          <Picker.Item label="All Sites" value="all" />
                          {sites.map((site) => (
                            <Picker.Item key={site.id} label={site.name} value={site.id} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                    <View style={{ flex: 1, minWidth: 160, marginBottom: 10 }}>
                      <Text style={{ color: colors.subText, fontSize: 11, marginBottom: 6 }}>{t("byZone")}</Text>
                      <View style={[styles.pickerField, { backgroundColor: colors.inputBg, borderColor: colors.border }]}> 
                        <Picker
                          selectedValue={reportZoneFilter}
                          onValueChange={(value) => setReportZoneFilter(String(value))}
                          dropdownIconColor={colors.text}
                          itemStyle={{ color: colors.text }}
                          style={{ color: colors.text, width: "100%" }}
                        >
                          <Picker.Item label="All Zones" value="all" />
                          {availableReportZones.map((zone) => (
                            <Picker.Item key={zone.id} label={zone.name} value={zone.id} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {(["all", "Responded", "Missed", "Escalated"] as const).map((status) => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => setReportStatusFilter(status)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor:
                            reportStatusFilter === status ? colors.primary : colors.border,
                          backgroundColor:
                            reportStatusFilter === status ? colors.primary : colors.inputBg,
                          marginRight: 10,
                          marginBottom: 10,
                        }}
                      >
                        <Text style={{
                          color: reportStatusFilter === status ? "#fff" : colors.text,
                          fontWeight: "600",
                        }}>
                          {status === "all" ? "All Statuses" : status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {renderReportDetailModal()}
              </>
            )}

            {/* ══ SETTINGS ══ */}
            {adminPage === "settings" && (
              <>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("shiftManagement")}
                  </Text>
                  <View
                    style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}
                  >
                    <TextInput
                      style={[
                        styles.input,
                        {
                          flex: 1,
                          backgroundColor: colors.inputBg,
                          color: colors.text,
                        },
                      ]}
                      placeholder={t("shiftName")}
                      value={newShiftName}
                      onChangeText={setNewShiftName}
                      placeholderTextColor={colors.subText}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        {
                          flex: 1,
                          backgroundColor: colors.inputBg,
                          color: colors.text,
                        },
                      ]}
                      placeholder={t("startTime")}
                      value={newShiftStart}
                      onChangeText={setNewShiftStart}
                      placeholderTextColor={colors.subText}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        {
                          flex: 1,
                          backgroundColor: colors.inputBg,
                          color: colors.text,
                        },
                      ]}
                      placeholder={t("endTime")}
                      value={newShiftEnd}
                      onChangeText={setNewShiftEnd}
                      placeholderTextColor={colors.subText}
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={addShift}
                  >
                    <Text style={styles.buttonText}>{t("addShift")}</Text>
                  </TouchableOpacity>
                  {shifts.map((shift) => (
                    <View
                      key={`${shift.id}-${shift.name}`}
                      style={[
                        styles.rowSpace,
                        {
                          paddingVertical: 8,
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.text }}>
                        {shift.name} ({shift.startTime}–{shift.endTime})
                      </Text>
                      <TouchableOpacity onPress={() => deleteShift(shift.id)}>
                        <Text style={{ color: colors.danger }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.card, marginTop: 20 },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Appearance
                  </Text>
                  <Text style={[styles.guardDetail, { color: colors.text }]}>
                    🌓 Theme auto-adjusts (6 AM–6 PM light, then dark)
                  </Text>
                  <View style={[styles.rowSpace, { marginTop: 16 }]}>
                    <Text style={[styles.guardDetail, { color: colors.text }]}>
                      {t("language")}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["en", "hi"] as const).map((lang) => (
                        <TouchableOpacity
                          key={lang}
                          style={[
                            styles.langBtn,
                            {
                              backgroundColor:
                                language === lang
                                  ? colors.primary
                                  : colors.muted,
                            },
                          ]}
                          onPress={() => setLanguage(lang)}
                        >
                          <Text
                            style={[
                              styles.langText,
                              {
                                color: language === lang ? "#fff" : colors.text,
                              },
                            ]}
                          >
                            {lang.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </ScrollView>

        {/* ─── EDIT GUARD MODAL ─── */}
        <Modal visible={!!editingGuard} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContainer, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit Guard
              </Text>

              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBg, color: colors.text },
                ]}
                placeholder="Name"
                placeholderTextColor={colors.subText}
                value={editName}
                onChangeText={setEditName}
              />

              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBg, color: colors.text },
                ]}
                placeholder="Location"
                placeholderTextColor={colors.subText}
                value={editLocation}
                onChangeText={setEditLocation}
              />

              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBg, color: colors.text },
                ]}
                placeholder="Mobile"
                placeholderTextColor={colors.subText}
                value={editMobile}
                onChangeText={setEditMobile}
                keyboardType="phone-pad"
              />

              {/* -- Site picker -- */}
              <View
                style={[
                  styles.pickerField,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBg,
                  },
                ]}
              >
                <Picker
                  selectedValue={editSite}
                  onValueChange={(value) => {
                    setEditSite(value);
                    setEditZone("");
                  }}
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    height: 48,
                    backgroundColor: "transparent",
                  }}
                >
                  <Picker.Item
                    label={t("Select Site") || "Select Site"}
                    value=""
                  />
                  {sites.map((site, index) => (
                    <Picker.Item
                      key={`create-zone-site-${site.id || "noid"}-${index}`}
                      label={site.name}
                      value={site.id}
                    />
                  ))}
                </Picker>
              </View>

              {/* -- Zone picker (filtered) -- */}
              {editSite ? (
                <View
                  style={[
                    styles.pickerField,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.inputBg,
                    },
                  ]}
                >
                  <Picker
                    selectedValue={editZone}
                    onValueChange={(value) => setEditZone(value)}
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      height: 48,
                      backgroundColor: "transparent",
                    }}
                  >
                    <Picker.Item
                      label={t("selectZone") || "Select Zone"}
                      value=""
                    />
                    {(sites.find((st) => st.id === editSite)?.zones ?? []).map(
                      (zone, index) => (
                        <Picker.Item
                          key={`zone-${zone.id || "noid"}-${index}`}
                          label={zone.name}
                          value={zone.id}
                        />
                      ),
                    )}
                  </Picker>
                </View>
              ) : null}

              {/* -- Shift picker -- */}
              <View
                style={[
                  styles.pickerField,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBg,
                  },
                ]}
              >
                <Picker
                  selectedValue={editShift}
                  onValueChange={(value) => setEditShift(value)}
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    height: 48,
                    backgroundColor: "transparent",
                  }}
                >
                  <Picker.Item
                    label={t("Select Shift") || "Select Shift"}
                    value=""
                  />
                  {shifts.map((shift, index) => (
                    <Picker.Item
                      key={`edit-shift-${shift.id || "noid"}-${index}`}
                      label={shift.name}
                      value={shift.id}
                    />
                  ))}
                </Picker>
              </View>

              {/* -- Alert Group picker -- */}
              <View
                style={[
                  styles.pickerField,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBg,
                  },
                ]}
              >
                <Picker
                  selectedValue={editGroup}
                  onValueChange={(value) => setEditGroup(value)}
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    height: 48,
                    backgroundColor: "transparent",
                  }}
                >
                  <Picker.Item
                    label={t("Select AlertGroup") || "Select Alert Group"}
                    value=""
                  />
                  {alertGroups.map((group) => (
                    <Picker.Item
                      key={`${group.id}-${group.name}`}
                      label={group.name}
                      value={group.id}
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.rowSpace}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.inputBg }]}
                  onPress={() => setEditingGuard(null)}
                >
                  <Text style={[styles.buttonText, { color: colors.text }]}>
                    {t("cancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={saveGuardEdit}
                >
                  <Text style={styles.buttonText}>{t("save")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return null;
}

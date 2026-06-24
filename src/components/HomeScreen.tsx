import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
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
import { KPICard, LanguageToggle, TableHeader } from "./SubComponents";
import { useTheme } from "./ThemeContext";

export default function HomeScreen() {
  const { colors } = useTheme();

  // ── Audio player ──
  let alarmPlayer: any;
  try {
    alarmPlayer = useAudioPlayer(require("../../assets/alarm.wav"));
  } catch (e) {
    console.warn("Audio player init failed", e);
  }
  const safePlay = () => {
    try {
      alarmPlayer?.play();
    } catch (_) {}
  };
  const safePause = () => {
    try {
      alarmPlayer?.pause();
    } catch (_) {}
  };

  const [language, setLanguage] = useState<"en" | "hi">("hi");
  const t = (key: string): string => translations[language][key] ?? key;

  // ── Auth ──
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [loggedInRole, setLoggedInRole] = useState<"guard" | "admin" | null>(
    null,
  );
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

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

  // ── Admin UI ──
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-280)).current;
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

  // ── Refs for timers ──
  const activeGuardRef = useRef<Guard | null>(null);
  useEffect(() => {
    activeGuardRef.current = activeGuard;
  }, [activeGuard]);
  const currentGameTypeRef = useRef<GameType>("PONG");
  useEffect(() => {
    currentGameTypeRef.current = currentGameType;
  }, [currentGameType]);

  const chartHeights = useMemo(
    () => ({
      daily: Math.floor(Math.random() * 60) + 20,
      weekly: Math.floor(Math.random() * 60) + 20,
      monthly: Math.floor(Math.random() * 60) + 20,
    }),
    [],
  );

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
              zones: (s.zones ?? []).map((z: any) => ({
                ...z,
                id: z._id ?? z.id ?? "",
              })),
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

    const interval = setInterval(() => {
      loadAlerts();
    }, 10000);

    return () => clearInterval(interval);
  }, [loggedInRole]);

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
    return () => {
      safePause();
    };
  }, []);

  // ── Auth ──
  const handleLogin = async () => {
    if (!loginId.trim() || !loginPassword.trim()) {
      Alert.alert("Error", "Please enter ID and password.");
      return;
    }
    try {
      const res = await api.post("/auth/login", {
        id: loginId.trim(),
        password: loginPassword,
      });
      await AsyncStorage.setItem("token", res.data.token);
      if (res.data.role === "admin") {
        setLoggedInUser("admin");
        setLoggedInRole("admin");
      } else {
        setLoggedInUser(res.data.guard.id);
        setLoggedInRole("guard");
        setActiveGuard(res.data.guard);
      }
      setLoginId("");
      setLoginPassword("");
    } catch (err: any) {
      Alert.alert(
        "Login Failed",
        err.response?.data?.message || "Network error",
      );
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setLoggedInRole(null);
    setActiveGuard(null);
    setShowAlert(false);
    setTimerSeconds(30);
    setResponseSeconds(30);
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

  const endShift = () => {
    Alert.alert("End Shift", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Shift",
        style: "destructive",
        onPress: async () => {
          if (activeGuard) {
            await api.post(`/guards/${activeGuard.id}/shift/end`);
            setGuards((prev) =>
              prev.map((g) =>
                g.id === activeGuard.id
                  ? {
                      ...g,
                      shiftStarted: false,
                      isActive: false,
                      shiftStartTime: "",
                      shiftEndTime: "",
                    }
                  : g,
              ),
            );
          }
          handleLogout();
        },
      },
    ]);
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

  const handleMissedAlert = async () => {
    const guard = activeGuardRef.current;
    if (!guard) return;
    const gameType = currentGameTypeRef.current;
    await api.post(`/guards/${guard.id}/alerts`, {
      status: "Missed",
      alertType: gameType,
      responseTime: 0,
      remarks: "",
      photoUri: null,
    });
    setShowAlert(false);
    setGameDisabled(true);
    safePause();
  };

  const handleGameWin = () => {
    setWinResponseSeconds(responseSeconds);
    setGameDisabled(true);
    setShowAlert(false);
    safePause();
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
  const blockGuard = async (guardId: string) => {
    try {
      const res = await api.put(`/guards/${guardId}/block`);

      setGuards((prev) => prev.map((g) => (g.id === guardId ? res.data : g)));

      Alert.alert("Success", "Guard blocked");
    } catch (err) {
      console.log(err);
    }
  };

  const unblockGuard = async (guardId: string) => {
    try {
      const res = await api.put(`/guards/${guardId}/unblock`);

      setGuards((prev) => prev.map((g) => (g.id === guardId ? res.data : g)));

      Alert.alert("Success", "Guard unblocked");
    } catch (err) {
      console.log(err);
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

      setSites((prev) => [...prev, res.data]);

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
  const deleteSite = (siteId: string) => {
    Alert.alert(
      "Delete Site",
      "This will also remove all zones in this site.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/sites/${siteId}`);

              setSites((prev) => prev.filter((s) => s.id !== siteId));

              Alert.alert("Success", "Site deleted successfully");
            } catch (err) {
              console.log("DELETE SITE ERROR", err);

              Alert.alert("Error", "Failed to delete site");
            }
          },
        },
      ],
    );
  };

  // Zone CRUD
  const doCreateZone = () => {
    if (!createZoneName.trim() || !createZoneSiteId) {
      Alert.alert("Error", "Enter a zone name and select a site.");
      return;
    }
    const newZone: Zone = {
      id: Date.now().toString(),
      name: createZoneName.trim(),
      siteId: createZoneSiteId,
    };
    setSites((prev) => {
      const updated = prev.map((s) =>
        s.id === createZoneSiteId ? { ...s, zones: [...s.zones, newZone] } : s,
      );
      setTimeout(() => syncConfig(), 0);
      return updated;
    });
    setCreateZoneName("");
    setCreateZoneSiteId("");
    setShowCreateZone(false);
    Alert.alert("✅ Created", "Zone created successfully.");
  };

  const openEditZone = (siteId: string, zone: Zone) => {
    setEditingZone({ siteId, zone });
    setEditZoneName(zone.name);
  };
  const saveEditZone = () => {
    if (!editingZone || !editZoneName.trim()) return;
    setSites((prev) => {
      const updated = prev.map((s) =>
        s.id === editingZone.siteId
          ? {
              ...s,
              zones: s.zones.map((z) =>
                z.id === editingZone.zone.id
                  ? { ...z, name: editZoneName.trim() }
                  : z,
              ),
            }
          : s,
      );
      setTimeout(() => syncConfig(), 0);
      return updated;
    });
    setEditingZone(null);
  };
  const deleteZone = (siteId: string, zoneId: string) => {
    Alert.alert("Delete Zone", "Are you sure?", [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => {
          setSites((prev) => {
            const updated = prev.map((s) =>
              s.id === siteId
                ? { ...s, zones: s.zones.filter((z) => z.id !== zoneId) }
                : s,
            );
            setTimeout(() => syncConfig(), 0);
            return updated;
          });
        },
      },
    ]);
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
        toValue: -280,
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

  const allZones = useMemo(
    () =>
      sites.flatMap((site) =>
        site.zones.map((z) => ({
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

  // ── Resolution Modal ──
  const renderResolutionModal = () => (
    <Modal visible={showResolution} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Alert Resolution
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
            fontSize: 20,
            fontWeight: "bold",
          }}
        >
          Night Guard
        </Text>
        <Text
          style={{
            color: colors.sidebarText,
            fontSize: 11,
            marginTop: 2,
            opacity: 0.6,
          }}
        >
          Admin Panel
        </Text>
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
      ).map((item) => (
        <TouchableOpacity
          key={item}
          style={[
            styles.sidebarItem,
            adminPage === item && { backgroundColor: colors.sidebarActive },
          ]}
          onPress={() => {
            setAdminPage(item);
            toggleSidebar();
          }}
        >
          <Text style={[styles.sidebarItemText, { color: colors.sidebarText }]}>
            {
              (
                {
                  dashboard: "📊",
                  users: "👥",
                  sites: "🏢",
                  zones: "📍",
                  groups: "⏱️",
                  escalation: "🚨",
                  reports: "📈",
                  settings: "⚙️",
                } as any
              )[item]
            }{" "}
            {t(item)}
          </Text>
        </TouchableOpacity>
      ))}
      <View style={{ flex: 1 }} />
      <TouchableOpacity style={styles.sidebarItem} onPress={handleLogout}>
        <Text style={[styles.sidebarItemText, { color: colors.danger }]}>
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
            source={require("../../assets/logo.png")}
            style={{ width: 120, height: 120, marginBottom: 10 }}
            resizeMode="contain"
          />
          <Text style={[styles.subtitle, { color: colors.subText }]}>
            {t("subtitle")}
          </Text>
        </View>
        <View style={[styles.loginCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.loginTitle, { color: colors.text }]}>
            {t("loginTitle")}
          </Text>
          <Text style={[styles.loginSubtitle, { color: colors.subText }]}>
            {t("loginSubtitle")}
          </Text>
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
            style={[styles.mainButton, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
          >
            <Text style={styles.buttonText}>{t("loginBtn")}</Text>
          </TouchableOpacity>
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
        <LanguageToggle
          language={language}
          setLanguage={setLanguage}
          colors={colors}
        />
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
                <KPICard
                  label={t("totalAlerts")}
                  value={activeGuard.totalAlerts}
                  color={colors.text}
                  icon="📊"
                  colors={colors}
                />
                <KPICard
                  label={t("responded")}
                  value={activeGuard.respondedAlerts}
                  color={colors.success}
                  icon="✅"
                  colors={colors}
                />
                <KPICard
                  label={t("missed")}
                  value={activeGuard.missedAlerts}
                  color={colors.danger}
                  icon="❌"
                  colors={colors}
                />
                <KPICard
                  label={t("compliance")}
                  value={`${getComplianceRate(activeGuard)}%`}
                  color={colors.info}
                  icon="📈"
                  colors={colors}
                />
              </View>

              <TouchableOpacity
                style={[styles.mainButton, { backgroundColor: colors.danger }]}
                onPress={endShift}
              >
                <Text style={styles.buttonText}>{t("endShift")}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.mainButton,
                { backgroundColor: colors.success, marginTop: 30 },
              ]}
              onPress={startShift}
            >
              <Text style={styles.buttonText}>{t("startShift")}</Text>
            </TouchableOpacity>
          )}
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
          <TouchableOpacity onPress={toggleSidebar} style={styles.hamburgerBtn}>
            <Text style={[styles.hamburgerText, { color: colors.text }]}>
              ☰
            </Text>
          </TouchableOpacity>
          <Text style={[styles.adminHeaderTitle, { color: colors.text }]}>
            {pageTitles[adminPage]}
          </Text>
          <LanguageToggle
            language={language}
            setLanguage={setLanguage}
            colors={colors}
          />
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
                  <KPICard
                    label={t("totalAlerts")}
                    value={totalAlerts}
                    color={colors.text}
                    icon="📊"
                    colors={colors}
                  />
                  <KPICard
                    label={t("responded")}
                    value={responded}
                    color={colors.success}
                    icon="✅"
                    colors={colors}
                  />
                  <KPICard
                    label={t("missed")}
                    value={missed}
                    color={colors.danger}
                    icon="❌"
                    colors={colors}
                  />
                  <KPICard
                    label={t("onDutyCount")}
                    value={activeCount}
                    color={colors.primary}
                    icon="👥"
                    colors={colors}
                  />
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
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-around",
                      marginBottom: 20,
                    }}
                  >
                    {(["Daily", "Weekly", "Monthly"] as const).map(
                      (period, i) => {
                        const h = [
                          chartHeights.daily,
                          chartHeights.weekly,
                          chartHeights.monthly,
                        ][i];
                        return (
                          <View key={period} style={{ alignItems: "center" }}>
                            <View
                              style={{
                                height: 80,
                                width: 40,
                                backgroundColor: colors.inputBg,
                                borderRadius: 8,
                                justifyContent: "flex-end",
                                overflow: "hidden",
                              }}
                            >
                              <View
                                style={{
                                  height: h,
                                  backgroundColor: colors.primary,
                                  borderRadius: 8,
                                }}
                              />
                            </View>
                            <Text
                              style={{
                                color: colors.subText,
                                fontSize: 10,
                                marginTop: 4,
                              }}
                            >
                              {period}
                            </Text>
                          </View>
                        );
                      },
                    )}
                  </View>
                </View>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Recent Activity
                  </Text>
                  {alertHistory.slice(0, 5).map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.alertItem,
                        {
                          backgroundColor: colors.bg,
                          borderLeftColor:
                            item.status === "Responded"
                              ? colors.success
                              : colors.danger,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.alertGuardName, { color: colors.text }]}
                      >
                        {item.guardName}
                      </Text>
                      <Text
                        style={[styles.alertTime, { color: colors.subText }]}
                      >
                        {item.date} at {item.time} – {item.alertType}
                      </Text>
                      <Text
                        style={{
                          color:
                            item.status === "Responded"
                              ? colors.success
                              : colors.danger,
                          fontWeight: "600",
                          fontSize: 12,
                        }}
                      >
                        {item.status}
                        {item.responseTime ? ` in ${item.responseTime}s` : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ══ USERS ══ */}
            {adminPage === "users" && (
              <>
                {guards.map((guard) => (
                  <View
                    key={guard.id}
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
                              backgroundColor: guard.isBlocked
                                ? colors.danger
                                : guard.shiftStarted
                                  ? colors.badgeSuccess
                                  : colors.inputBg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              {
                                color: guard.isBlocked
                                  ? "#fff"
                                  : guard.shiftStarted
                                    ? colors.badgeSuccessText
                                    : colors.subText,
                              },
                            ]}
                          >
                            {guard.isBlocked
                              ? "BLOCKED"
                              : guard.shiftStarted
                                ? "ACTIVE"
                                : "INACTIVE"}
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
                      {!guard.isBlocked ? (
                        <TouchableOpacity
                          style={[
                            styles.actionBtn,
                            { backgroundColor: colors.danger },
                          ]}
                          onPress={() => blockGuard(guard.id)}
                        >
                          <Text style={styles.actionBtnText}>Block</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.actionBtn,
                            { backgroundColor: colors.success },
                          ]}
                          onPress={() => unblockGuard(guard.id)}
                        >
                          <Text style={styles.actionBtnText}>Unblock</Text>
                        </TouchableOpacity>
                      )}
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
                        label={t("selectSite") || "Select Site"}
                        value=""
                      />
                      {sites.map((site) => (
                        <Picker.Item
                          key={site.id}
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
                          sites.find((st) => st.id === newGuardSite)?.zones ||
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
                        label={t("selectShift") || "Select Shift"}
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
                        label={t("selectAlertGroup") || "Select Alert Group"}
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
                          key={site.id}
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
                              <Text
                                style={[
                                  styles.tableRowSecondary,
                                  { color: colors.subText },
                                ]}
                              >
                                ID: {site.id}
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
                                {site.zones.length}
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
                              onPress={() => deleteSite(site.id)}
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
                          key={site.id}
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
                        key={zone.id}
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
                            onPress={() => deleteZone(zone.siteId, zone.id)}
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

                          {sites.map((site) => (
                            <Picker.Item
                              key={site.id}
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
                {escalationLevels.map((level) => (
                  <View
                    key={level._id}
                    style={[
                      styles.card,
                      { backgroundColor: colors.card, marginBottom: 12 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.guardDetail,
                        { color: colors.subText, marginBottom: 6 },
                      ]}
                    >
                      Level {level.level}
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
                      onChangeText={(txt) =>
                        updateEscalation(level._id, "name", txt)
                      }
                      placeholderTextColor={colors.subText}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.inputBg, color: colors.text },
                      ]}
                      value={level.phone}
                      onChangeText={(txt) =>
                        updateEscalation(level._id, "phone", txt)
                      }
                      keyboardType="phone-pad"
                      placeholderTextColor={colors.subText}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.inputBg, color: colors.text },
                      ]}
                      value={String(level.missedThreshold)}
                      onChangeText={(txt) =>
                        updateEscalation(level._id, "name", txt)
                      }
                      keyboardType="numeric"
                      placeholderTextColor={colors.subText}
                      placeholder={t("threshold")}
                    />
                  </View>
                ))}
              </>
            )}

            {/* ══ REPORTS ══ */}
            {adminPage === "reports" && (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("reportTitle")}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-around",
                    marginBottom: 20,
                  }}
                >
                  <KPICard
                    label={t("totalAlerts")}
                    value={totalAlerts}
                    color={colors.text}
                    icon="📊"
                    colors={colors}
                  />
                  <KPICard
                    label={t("responded")}
                    value={responded}
                    color={colors.success}
                    icon="✅"
                    colors={colors}
                  />
                  <KPICard
                    label={t("missed")}
                    value={missed}
                    color={colors.danger}
                    icon="❌"
                    colors={colors}
                  />
                </View>
                {alertHistory.slice(0, 15).map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.alertItem,
                      {
                        backgroundColor: colors.bg,
                        borderLeftColor:
                          item.status === "Responded"
                            ? colors.success
                            : colors.danger,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.alertGuardName, { color: colors.text }]}
                    >
                      {item.guardName}
                    </Text>
                    <Text style={[styles.alertTime, { color: colors.subText }]}>
                      {item.date} at {item.time}
                    </Text>
                    <Text
                      style={{
                        color:
                          item.status === "Responded"
                            ? colors.success
                            : colors.danger,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {item.status}
                      {item.responseTime ? ` in ${item.responseTime}s` : ""}
                      {item.remarks ? ` — ${item.remarks}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
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
                      key={shift.id}
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
                            styles.roleBtn,
                            {
                              backgroundColor:
                                language === lang
                                  ? colors.primary
                                  : colors.muted,
                            },
                          ]}
                          onPress={() => setLanguage(lang)}
                        >
                          <Text style={styles.buttonText}>
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
                    label={t("selectSite") || "Select Site"}
                    value=""
                  />
                  {sites.map((site) => (
                    <Picker.Item
                      key={site.id}
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
                    {(sites.find((st) => st.id === editSite)?.zones || []).map(
                      (zone) => (
                        <Picker.Item
                          key={zone.id}
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
                    label={t("selectShift") || "Select Shift"}
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
                    label={t("selectAlertGroup") || "Select Alert Group"}
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

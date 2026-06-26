export type Guard = {
  id: string;
  name: string;
  location: string;
  mobile?: string;
  isBlocked?: boolean;
  siteId?: string;
  zoneId?: string;
  shiftId?: string;
  alertGroupId?: string;
  alertGroupType?: "FIXED" | "RANDOM";
  alertInterval?: number;
  totalAlerts: number;
  respondedAlerts: number;
  missedAlerts: number;
  shiftStarted: boolean;
  shiftStartTime: string;
  shiftEndTime: string;
  isActive: boolean;
  password: string;
  activityPhotos: { uri: string; timestamp: number }[];
};

export type AlertHistory = {
  id: string;
  guardId: string;
  guardName: string;
  status: "Responded" | "Missed" | "Escalated";
  time: string;
  date: string;
  alertType: string;
  responseTime?: number;
  timestamp: number;
  remarks?: string;
  photoUri?: string;
};

export type Zone = { id: string; name: string; siteId: string };
export type Site = { id: string; name: string; zones: Zone[] };
export type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};
export type AlertGroup = {
  id: string;
  name: string;
  type: "FIXED" | "RANDOM";
  fixedInterval?: number;
  randomMin?: number;
  randomMax?: number;
};
export type EscalationLevelConfig = {
  _id: string;
  level: number;
  name: string;
  designation: string;
  phone: string;
  email: string;
  missedThreshold: number;
  notifyBySMS: boolean;
  notifyByCall: boolean;
};
export type GameType = "PONG" | "MATH" | "YESNO" | "SNAKE" | "TAPTARGET";

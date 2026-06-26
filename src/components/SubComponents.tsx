import React from "react";
import {
  Text,
  TouchableOpacity,
  View
} from "react-native";
import type { AlertHistory } from "../types";
import { styles } from "./Styles";

export const LanguageToggle: React.FC<{
  language: "en" | "hi";
  setLanguage: (lang: "en" | "hi") => void;
  colors: Record<string, string>;
}> = ({ language, setLanguage, colors }) => (
  <View style={[styles.languageToggle, { backgroundColor: colors.inputBg }]}>
    <TouchableOpacity
      style={[styles.langBtn, language === "en" && styles.langBtnActive]}
      onPress={() => setLanguage("en")}
    >
      <Text
        style={[
          styles.langText,
          { color: language === "en" ? "#fff" : colors.subText },
        ]}
      >
        EN
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.langBtn, language === "hi" && styles.langBtnActive]}
      onPress={() => setLanguage("hi")}
    >
      <Text
        style={[
          styles.langText,
          { color: language === "hi" ? "#fff" : colors.subText },
        ]}
      >
        HI
      </Text>
    </TouchableOpacity>
  </View>
);

export const KPICard: React.FC<{
  label: string;
  value: string | number;
  color: string;
  icon: string;
  colors: Record<string, string>;
}> = ({ label, value, color, icon, colors }) => (
  <View
    style={[
      styles.kpiCard,
      {
        backgroundColor: colors.card,
        minWidth: 130,
        maxWidth: 170,
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 130,
        minHeight: 180,
        paddingVertical: 28,
        paddingHorizontal: 20,
      },
    ]}
  >
    <Text style={{ fontSize: 41 }}>{icon}</Text>
    <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    <Text style={[styles.kpiLabel, { color: colors.subText }]}>{label}</Text>
  </View>
);

export const TableHeader: React.FC<{
  columns: { label: string; flex: number }[];
  colors: Record<string, string>;
}> = ({ columns, colors }) => (
  <View
    style={[
      styles.tableHeaderRow,
      {
        backgroundColor: colors.tableHeaderBg,
        borderBottomColor: colors.border,
      },
    ]}
  >
    {columns.map((col) => (
      <Text
        key={col.label}
        style={[
          styles.tableHeaderCell,
          { flex: col.flex, color: colors.subText },
        ]}
      >
        {col.label}
      </Text>
    ))}
  </View>
);

export const StatPill: React.FC<{
  label: string;
  value: string | number;
  color?: string;
  small?: boolean;
}> = ({ label, value, color = "#3B82F6", small = false }) => (
  <View
    style={{
      paddingHorizontal: small ? 8 : 12,
      paddingVertical: small ? 6 : 10,
      borderRadius: 16,
      backgroundColor: `${color}20`,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Text style={{ color, fontWeight: "700", fontSize: small ? 12 : 14 }}>
      {value}
    </Text>
    <Text style={{ color: "#666", fontSize: small ? 10 : 11 }}>{label}</Text>
  </View>
);

export const MiniBar: React.FC<{ percent: number; color?: string }> = ({
  percent,
  color = "#3B82F6",
}) => (
  <View
    style={{
      height: 8,
      backgroundColor: "#EEE",
      borderRadius: 999,
      overflow: "hidden",
    }}
  >
    <View
      style={{
        width: `${Math.max(0, Math.min(100, percent))}%`,
        height: 8,
        backgroundColor: color,
      }}
    />
  </View>
);

export const ReportRow: React.FC<{
  item: AlertHistory;
  onPress?: (item: AlertHistory) => void;
  colors: Record<string, string>;
}> = ({ item, onPress, colors }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={() => onPress && onPress(item)}
    style={[
      styles.tableRow,
      { borderTopColor: colors.border, backgroundColor: colors.card },
    ]}
  >
    <View style={{ flex: 2 }}>
      <Text style={[styles.tableRowPrimary, { color: colors.text }]}>
        {item.guardName}
      </Text>
      <Text style={[styles.tableRowSecondary, { color: colors.subText }]}>
        {" "}
        {item.alertType}{" "}
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
        {" "}
        {item.site || "—"}{" "}
      </Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.tableRowSecondary, { color: colors.subText }]}>
        {" "}
        {item.time}{" "}
      </Text>
    </View>
  </TouchableOpacity>
);

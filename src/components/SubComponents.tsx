import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
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
        width: 150,
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

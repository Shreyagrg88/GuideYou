import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../../constants/api";

const PRIMARY = "#007BFF";
type DateStatus = "available" | "unavailable" | "booked" | "reserved";

interface PricingItem {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  unit: string;
  icon: any;
}

// Helper functions
const formatDateKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const convertISOToDateKey = (isoDate: string): string => formatDateKey(new Date(isoDate + 'T00:00:00'));
const handleAPIError = (response: Response, responseText: string): string | null => {
  if (!response.ok || responseText.trim().startsWith('<')) {
    if (response.status === 404) return "Availability API endpoint not found. Please check the server.";
    if (response.status === 401) return "Authentication failed. Please login again.";
    if (response.status === 500) return "Server error. Please try again later.";
    return `Server error (${response.status})`;
  }
  return null;
};

export default function ScheduleRatesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateStatuses, setDateStatuses] = useState<Map<string, DateStatus>>(new Map());
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([
    { id: "1", title: "Standard Daily Rate", subtitle: "Base fee for guiding", price: "45", unit: "Per Day", icon: "walk" },
    { id: "2", title: "Group Surcharge", subtitle: "Extra fee for larger groups", price: "15", unit: "Per Pax", icon: "people" },
  ]);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => { fetchAvailability(); }, []);
  useEffect(() => { initializeMonthDates(); }, [currentMonth, currentYear]);

  const fetchAvailability = async () => {
    try {
      setFetching(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/guide/availability`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      const responseText = await response.text();
      const error = handleAPIError(response, responseText);
      if (error) { console.error("Fetch availability error:", error); return; }

      const data = JSON.parse(responseText);
      const newStatuses = new Map<string, DateStatus>();

      // Set statuses in priority order: booked > reserved > unavailable > available
      const statusMaps = [
        { key: "availableDates", status: "available" as DateStatus },
        { key: "unavailableDates", status: "unavailable" as DateStatus },
        { key: "bookedDates", status: "booked" as DateStatus },
        { key: "reservedDates", status: "reserved" as DateStatus },
      ];

      statusMaps.forEach(({ key, status }) => {
        if (data[key]?.forEach) {
          data[key].forEach((isoDate: string) => {
            const dateKey = convertISOToDateKey(isoDate);
            if (status === "booked" || newStatuses.get(dateKey) !== "booked") {
              newStatuses.set(dateKey, status);
            }
          });
        }
      });

      setDateStatuses(newStatuses);
      if (data.pricing?.length > 0) {
        setPricingItems(data.pricing.map((item: any, index: number) => ({
          id: (index + 1).toString(),
          title: item.title || "Custom Rate",
          subtitle: item.subtitle || "",
          price: item.price?.toString() || "0",
          unit: item.unit || "Per Item",
          icon: index === 0 ? "walk" : index === 1 ? "people" : "add-circle-outline",
        })));
      }
    } catch (error) {
      console.error("Fetch availability error:", error);
    } finally {
      setFetching(false);
    }
  };

  const initializeMonthDates = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const newStatuses = new Map<string, DateStatus>();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateKey = formatDateKey(date);
      if (!dateStatuses.has(dateKey)) {
        newStatuses.set(dateKey, "unavailable");
      }
    }
    setDateStatuses((prev) => {
      const merged = new Map(prev);
      newStatuses.forEach((value, key) => merged.set(key, value));
      return merged;
    });
  };

  const changeMonth = (dir: "prev" | "next") => {
    if (dir === "prev") {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
      else setCurrentMonth(currentMonth - 1);
    } else {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
      else setCurrentMonth(currentMonth + 1);
    }
  };

  const getDateStatus = (day: number): DateStatus => {
    const date = new Date(currentYear, currentMonth, day);
    return dateStatuses.get(formatDateKey(date)) || "unavailable";
  };

  const handleDateSelect = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const status = getDateStatus(day);
    if (status === "booked" || status === "reserved") {
      Alert.alert("Date Unavailable", "This date is already booked or reserved.");
      return;
    }
    setSelectedDate(date);
  };

  const updateDateStatus = (status: DateStatus, allMonth = false) => {
    if (!selectedDate) {
      Alert.alert("No Date Selected", "Please select a date first.");
      return;
    }

    const dateKey = formatDateKey(selectedDate);
    const currentStatus = dateStatuses.get(dateKey);
    if (currentStatus === "booked" || currentStatus === "reserved") {
      Alert.alert("Cannot Change", "This date is booked or reserved and cannot be modified.");
      return;
    }

    const newMap = new Map(dateStatuses);
    if (allMonth) {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const key = formatDateKey(date);
        if (newMap.get(key) !== "booked") newMap.set(key, status);
      }
    } else {
      newMap.set(dateKey, status);
    }

    setDateStatuses(newMap);
    Alert.alert("Success", `Date${allMonth ? "s" : ""} set as ${status === "available" ? "available" : "unavailable"}`);
  };

  const handlePriceEdit = (item: PricingItem, action: "start" | "save" | "cancel") => {
    if (action === "start") { setEditingPriceId(item.id); setTempPrice(item.price); }
    else if (action === "save") {
      if (!tempPrice || isNaN(Number(tempPrice)) || Number(tempPrice) < 0) {
        Alert.alert("Invalid Price", "Please enter a valid positive number.");
        return;
      }
      setPricingItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, price: tempPrice } : i)));
      setEditingPriceId(null);
      setTempPrice("");
    } else { setEditingPriceId(null); setTempPrice(""); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { Alert.alert("Error", "Please login again."); router.replace("/login"); return; }

      const availableDates: string[] = [];
      const unavailableDates: string[] = [];
      dateStatuses.forEach((status, dateKey) => {
        if (status === "available") availableDates.push(dateKey);
        else if (status === "unavailable") unavailableDates.push(dateKey);
      });

      const response = await fetch(`${API_URL}/api/guide/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          availableDates,
          unavailableDates,
          pricing: pricingItems.map((item) => ({
            title: item.title,
            subtitle: item.subtitle,
            price: parseFloat(item.price),
            unit: item.unit,
          })),
        }),
      });

      const responseText = await response.text();
      const error = handleAPIError(response, responseText);
      if (error) { Alert.alert("Error", error); return; }

      Alert.alert("Success", "Availability and pricing saved successfully!");
      await fetchAvailability();
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getDayColor = (day: number): string => {
    const status = getDateStatus(day);
    const colors: Record<DateStatus, string> = { booked: "#FF4D4F", reserved: "#FFA500", available: "#22C55E", unavailable: "#9CA3AF" };
    return colors[status] || "#9CA3AF";
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/guide/home_guide")}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule & Rates</Text>
          <View style={{ width: 24 }} />
        </View>

        {fetching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={PRIMARY} />
            <Text style={styles.loadingText}>Loading availability...</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => changeMonth("prev")}>
              <Ionicons name="chevron-back" size={20} color="#555" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" })} {currentYear}
            </Text>
            <TouchableOpacity onPress={() => changeMonth("next")}>
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Text key={d} style={styles.weekText}>{d}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({ length: firstDay }).map((_, i) => <View key={`empty-${i}`} style={styles.dayCell} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentYear, currentMonth, day);
              const status = getDateStatus(day);
              const selected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear;
              const past = date < today;
              const color = getDayColor(day);
              const isBooked = status === "booked";
              const isReserved = status === "reserved";

              return (
                <TouchableOpacity
                  key={day}
                  style={styles.dayCell}
                  onPress={() => !past && !isBooked && !isReserved && handleDateSelect(day)}
                  disabled={past || isBooked || isReserved}
                >
                  <View style={[styles.dayCircle, selected && styles.selectedCircle, past && styles.pastDayCircle, isBooked && styles.bookedCircle]}>
                    <Text style={[styles.dayText, { color: selected ? "#fff" : past ? "#D1D5DB" : color }]}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            {[
              { color: "#FFA500", label: "Reserved" },
              { color: "#22C55E", label: "Available" },
              { color: "#9CA3AF", label: "Unavailable" },
              { color: "#FF4D4F", label: "Booked" },
            ].map(({ color, label }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Set Availability</Text>
        <View style={styles.availabilityRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnFilled]} onPress={() => updateDateStatus("available")}>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={[styles.actionText, { color: "#fff" }]}>Set Available</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => updateDateStatus("unavailable")}>
            <Ionicons name="close-circle" size={18} color={PRIMARY} />
            <Text style={styles.actionText}>Set Unavailable</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.availabilityRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnFilled, { flex: 1 }]} onPress={() => updateDateStatus("available", true)}>
            <Ionicons name="calendar" size={18} color="#fff" />
            <Text style={[styles.actionText, { color: "#fff" }]}>Set All Available</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pricingHeader}>
          <Text style={styles.sectionTitle}>Service Pricing</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setPricingItems([...pricingItems, { id: Date.now().toString(), title: "Custom Rate", subtitle: "Additional service fee", price: "0", unit: "Per Item", icon: "add-circle-outline" }])}>
            <Ionicons name="add" size={18} color={PRIMARY} />
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        </View>

        {pricingItems.map((item) => (
          <View key={item.id} style={styles.priceCard}>
            <Ionicons name={item.icon} size={22} color={PRIMARY} />
            <View style={styles.priceCardContent}>
              <Text style={styles.priceTitle}>{item.title}</Text>
              <Text style={styles.priceSubtitle}>{item.subtitle}</Text>
            </View>
            <View style={styles.priceRight}>
              {editingPriceId === item.id ? (
                <View style={styles.priceEditContainer}>
                  <TextInput style={styles.priceInput} value={tempPrice} onChangeText={setTempPrice} keyboardType="numeric" autoFocus />
                  <View style={styles.priceEditActions}>
                    <TouchableOpacity onPress={() => handlePriceEdit(item, "save")} style={styles.priceEditBtn}>
                      <Ionicons name="checkmark" size={16} color="#22C55E" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handlePriceEdit(item, "cancel")} style={styles.priceEditBtn}>
                      <Ionicons name="close" size={16} color="#FF4D4F" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.priceDisplay}>
                    <Text style={styles.price}>${item.price}</Text>
                    <Text style={styles.unit}>{item.unit}</Text>
                  </View>
                  <View style={styles.priceActions}>
                    <TouchableOpacity onPress={() => handlePriceEdit(item, "start")} style={styles.priceActionBtn}>
                      <Ionicons name="pencil" size={16} color={PRIMARY} />
                    </TouchableOpacity>
                    {pricingItems.length > 1 && (
                      <TouchableOpacity onPress={() => Alert.alert("Delete Pricing", "Are you sure?", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: () => setPricingItems((prev) => prev.filter((i) => i.id !== item.id)) }])} style={styles.priceActionBtn}>
                        <Ionicons name="trash" size={16} color="#FF4D4F" />
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={[styles.saveBtn, loading && styles.saveBtnDisabled]} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="lock-closed" size={16} color="#fff" />
              <Text style={styles.saveText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F2F8FF" },
  content: { padding: 20, paddingBottom: 140 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, marginTop: 10 },
  headerTitle: { fontFamily: "Nunito_700Bold", fontSize: 18 },
  loadingContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 10, marginBottom: 10 },
  loadingText: { marginLeft: 8, fontFamily: "Nunito_400Regular", color: "#666", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  monthText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: "#111" },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  weekText: { width: "14.28%", textAlign: "center", fontFamily: "Nunito_400Regular", color: "#777", fontSize: 12 },
  daysGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  dayCell: { width: "14.28%", alignItems: "center", marginVertical: 6 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", backgroundColor: "transparent" },
  selectedCircle: { backgroundColor: PRIMARY },
  pastDayCircle: { opacity: 0.5 },
  bookedCircle: { backgroundColor: "#FF4D4F", opacity: 0.8 },
  dayText: { fontFamily: "Nunito_400Regular", fontSize: 14 },
  legendRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: "#666" },
  sectionTitle: { fontFamily: "Nunito_700Bold", fontSize: 16, marginBottom: 12, color: "#111" },
  availabilityRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  actionBtn: { flex: 1, borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 12, padding: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, backgroundColor: "#fff" },
  actionBtnFilled: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  actionText: { fontFamily: "Nunito_700Bold", color: PRIMARY, fontSize: 14 },
  pricingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  addText: { fontFamily: "Nunito_700Bold", color: PRIMARY, fontSize: 14 },
  priceCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  priceCardContent: { flex: 1, marginLeft: 12 },
  priceTitle: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#111" },
  priceSubtitle: { fontFamily: "Nunito_400Regular", color: "#777", fontSize: 12, marginTop: 2 },
  priceRight: { alignItems: "flex-end", gap: 4 },
  priceDisplay: { alignItems: "flex-end" },
  price: { fontFamily: "Nunito_700Bold", fontSize: 16, color: "#111" },
  unit: { fontFamily: "Nunito_400Regular", fontSize: 11, color: "#777" },
  priceActions: { flexDirection: "row", gap: 8 },
  priceActionBtn: { padding: 4 },
  priceEditContainer: { alignItems: "flex-end", gap: 6 },
  priceInput: { borderWidth: 1, borderColor: PRIMARY, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontFamily: "Nunito_700Bold", fontSize: 14, minWidth: 60, textAlign: "right" },
  priceEditActions: { flexDirection: "row", gap: 8 },
  priceEditBtn: { padding: 4 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  saveBtn: { backgroundColor: PRIMARY, padding: 16, borderRadius: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { fontFamily: "Nunito_700Bold", color: "#fff", fontSize: 16 },
});

import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Animated
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const C = {
  bg: "#04060a", p1: "#080c12", p2: "#0c1218",
  border: "#132030", gold: "#d4a853", gold2: "#f0c878",
  buy: "#00d97e", sell: "#ff3355", warn: "#ff9f0a",
  blue: "#3d9cff", text: "#8aa8c0", bright: "#ddeeff", dim: "#1e3448"
};

export default function HomeScreen({ navigation }) {
  const [neuroData, setNeuroData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const pulse = new Animated.Value(1);

  useEffect(() => {
    loadData();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function loadData() {
    try {
      const nd = await AsyncStorage.getItem("apexTradeAllowance");
      if (nd) {
        const d = JSON.parse(nd);
        if (d.date === new Date().toDateString()) setNeuroData(d);
      }
      const sd = await AsyncStorage.getItem("apexSessionTrades");
      if (sd) {
        const d = JSON.parse(sd);
        if (d.date === new Date().toDateString()) setSessionData(d);
      }
    } catch (e) {}
  }

  const verdictColor = neuroData?.verdict === "CLEARED" ? C.buy
    : neuroData?.verdict === "CAUTION" ? C.warn : C.sell;

  const trades = sessionData?.trades || [];
  const wins = trades.filter(t => t.outcome === "win").length;
  const losses = trades.filter(t => t.outcome === "loss").length;
  const pnl = trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
  const allowed = neuroData?.allowed || 0;
  const used = neuroData?.used || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SMALLCHANGE</Text>
          <Text style={styles.title}>Trader <Text style={{ color: C.gold }}>Guardian</Text></Text>
          <Text style={styles.subtitle}>Psychology · Discipline · Growth</Text>
        </View>

        {/* Neuro Status */}
        <TouchableOpacity
          style={[styles.neuroCard, { borderColor: neuroData ? verdictColor : C.border }]}
          onPress={() => navigation.navigate("Neuro")}
        >
          <View style={styles.neuroTop}>
            <Text style={styles.neuroLabel}>TODAY'S CLEARANCE</Text>
            <Text style={[styles.neuroVerdict, { color: neuroData ? verdictColor : C.dim }]}>
              {neuroData ? neuroData.verdict : "NOT CHECKED"}
            </Text>
          </View>
          {neuroData ? (
            <View style={styles.neuroBottom}>
              <Text style={[styles.neuroScore, { color: verdictColor }]}>
                Score: {neuroData.score}/100
              </Text>
              <Text style={styles.neuroAllowed}>
                {allowed - used} trade{allowed - used !== 1 ? "s" : ""} remaining
              </Text>
            </View>
          ) : (
            <Text style={styles.neuroPrompt}>
              Tap to complete your morning psychological clearance
            </Text>
          )}
          <View style={[styles.neuroBtn, { backgroundColor: neuroData ? "transparent" : C.gold }]}>
            <Text style={[styles.neuroBtnText, { color: neuroData ? C.dim : "#000" }]}>
              {neuroData ? "RETAKE CHECK" : "START NEURO CHECK →"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Session Stats */}
        {trades.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{trades.length}</Text>
              <Text style={styles.statLbl}>TRADES</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statVal, { color: C.buy }]}>{wins}</Text>
              <Text style={styles.statLbl}>WINS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statVal, { color: C.sell }]}>{losses}</Text>
              <Text style={styles.statLbl}>LOSSES</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statVal, { color: pnl >= 0 ? C.buy : C.sell }]}>
                {pnl >= 0 ? "+" : ""}{pnl.toFixed(0)}
              </Text>
              <Text style={styles.statLbl}>P&L</Text>
            </View>
          </View>
        )}

        {/* Menu Cards */}
        <Text style={styles.sectionTitle}>TOOLS</Text>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate("Neuro")}>
          <View style={[styles.menuIcon, { backgroundColor: "rgba(61,156,255,.1)" }]}>
            <Text style={styles.menuEmoji}>🧠</Text>
          </View>
          <View style={styles.menuBody}>
            <Text style={styles.menuTitle}>NeuroTrader</Text>
            <Text style={styles.menuDesc}>Psychological clearance before every session. Pattern memory included.</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate("Journal")}>
          <View style={[styles.menuIcon, { backgroundColor: "rgba(0,217,126,.1)" }]}>
            <Text style={styles.menuEmoji}>📓</Text>
          </View>
          <View style={styles.menuBody}>
            <Text style={styles.menuTitle}>Trade Journal</Text>
            <Text style={styles.menuDesc}>Log every trade in 30 seconds. Win or loss. No excuses.</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate("Insights")}>
          <View style={[styles.menuIcon, { backgroundColor: "rgba(170,68,255,.1)" }]}>
            <Text style={styles.menuEmoji}>📊</Text>
          </View>
          <View style={styles.menuBody}>
            <Text style={styles.menuTitle}>Weekly Insights</Text>
            <Text style={styles.menuDesc}>7 patterns detected from your journal. Book-based analysis.</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        {/* Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "The market doesn't beat traders. Traders beat themselves."
          </Text>
          <Text style={styles.quoteAuthor}>— Jesse Livermore</Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, padding: 16 },
  header: { alignItems: "center", paddingVertical: 28 },
  eyebrow: { fontFamily: "monospace", fontSize: 10, letterSpacing: 6, color: C.gold, opacity: 0.7, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: "900", color: C.bright, letterSpacing: 2 },
  subtitle: { fontSize: 13, color: C.dim, marginTop: 6, letterSpacing: 1 },
  neuroCard: { backgroundColor: C.p1, borderWidth: 1, borderRadius: 6, padding: 18, marginBottom: 16 },
  neuroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  neuroLabel: { fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: C.dim },
  neuroVerdict: { fontFamily: "monospace", fontSize: 14, fontWeight: "700", letterSpacing: 2 },
  neuroBottom: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  neuroScore: { fontSize: 13, fontFamily: "monospace" },
  neuroAllowed: { fontSize: 13, color: C.text },
  neuroPrompt: { fontSize: 13, color: C.dim, lineHeight: 20, marginBottom: 12 },
  neuroBtn: { padding: 10, borderRadius: 4, alignItems: "center", borderWidth: 1, borderColor: C.border },
  neuroBtnText: { fontFamily: "monospace", fontSize: 11, letterSpacing: 2, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 12, alignItems: "center" },
  statVal: { fontFamily: "monospace", fontSize: 20, fontWeight: "700", color: C.bright },
  statLbl: { fontFamily: "monospace", fontSize: 8, letterSpacing: 2, color: C.dim, marginTop: 3 },
  sectionTitle: { fontFamily: "monospace", fontSize: 9, letterSpacing: 4, color: C.gold, opacity: 0.7, marginBottom: 12 },
  menuCard: { backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 14 },
  menuIcon: { width: 48, height: 48, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  menuEmoji: { fontSize: 24 },
  menuBody: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: "700", color: C.bright, marginBottom: 4 },
  menuDesc: { fontSize: 12, color: C.dim, lineHeight: 18 },
  menuArrow: { fontSize: 22, color: C.dim },
  quoteCard: { backgroundColor: C.p1, borderWidth: 1, borderColor: "rgba(212,168,83,.2)", borderRadius: 6, padding: 18, marginTop: 8 },
  quoteText: { fontSize: 15, color: C.text, fontStyle: "italic", lineHeight: 24, marginBottom: 8 },
  quoteAuthor: { fontFamily: "monospace", fontSize: 10, color: C.gold, letterSpacing: 1 },
});

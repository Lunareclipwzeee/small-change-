import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const C = {
  bg: "#04060a", p1: "#080c12", p2: "#0c1218",
  border: "#132030", gold: "#d4a853",
  buy: "#00d97e", sell: "#ff3355", warn: "#ff9f0a",
  blue: "#3d9cff", purple: "#aa44ff",
  text: "#8aa8c0", bright: "#ddeeff", dim: "#1e3448"
};

const RAILWAY = "https://small-change-production.up.railway.app";

const PATTERNS = [
  {
    key: "revenge", name: "Revenge Trading", icon: "😤", type: "danger",
    book: "Trading in the Zone — Mark Douglas",
    quote: "A loss is feedback, not a signal to recover.",
    detect: (trades) => {
      const flagged = [];
      for (let i = 1; i < trades.length; i++) {
        if (trades[i-1].outcome === "loss") {
          flagged.push({ detail: "Trade #" + trades[i].id + " placed after a loss" });
        }
      }
      return flagged;
    }
  },
  {
    key: "tilt", name: "Tilt State", icon: "🌀", type: "danger",
    book: "Market Wizards — Paul Tudor Jones",
    quote: "Cut your size in half. Then cut it in half again.",
    detect: (trades) => {
      const flagged = [];
      for (let i = 2; i < trades.length; i++) {
        if (trades[i-2].outcome === "loss" && trades[i-1].outcome === "loss" && trades[i].outcome === "loss") {
          flagged.push({ detail: "3 consecutive losses detected — Tilt State" });
        }
      }
      return flagged;
    }
  },
  {
    key: "fomo", name: "FOMO Trading", icon: "📱", type: "danger",
    book: "Trading in the Zone — Mark Douglas",
    quote: "The market will always have another move.",
    detect: (trades) => trades.filter(t => (t.emotions?.greed || 0) >= 8).map(t => ({ detail: "Trade #" + t.id + " — Greed at " + t.emotions.greed + "/10" }))
  },
  {
    key: "overtrade", name: "Overtrading", icon: "📊", type: "warning",
    book: "Thinking Fast and Slow — Daniel Kahneman",
    quote: "Decision quality degrades with every additional decision.",
    detect: (trades) => {
      const byDate = {};
      trades.forEach(t => { if (!byDate[t.date]) byDate[t.date] = []; byDate[t.date].push(t); });
      const flagged = [];
      Object.entries(byDate).forEach(([date, dt]) => {
        if (dt.length > 3) flagged.push({ detail: dt.length + " trades on " + date });
      });
      return flagged;
    }
  },
  {
    key: "overconf", name: "Overconfidence", icon: "🏆", type: "warning",
    book: "Trading for a Living — Alexander Elder",
    quote: "Your best enemy after a winning streak is yourself.",
    detect: (trades) => {
      const flagged = [];
      for (let i = 2; i < trades.length; i++) {
        if (trades[i-2].outcome === "win" && trades[i-1].outcome === "win") {
          const conf = trades[i].emotions?.conf || 0;
          if (conf >= 8) flagged.push({ detail: "Trade #" + trades[i].id + " — Confidence " + conf + "/10 after 2 wins" });
        }
      }
      return flagged;
    }
  },
];

export default function InsightsScreen({ navigation }) {
  const [trades, setTrades] = useState([]);
  const [neuroHist, setNeuroHist] = useState([]);
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const sd = await AsyncStorage.getItem("apexSessionTrades");
      if (sd) {
        const d = JSON.parse(sd);
        setTrades(d.trades || []);
      }
      const nh = await AsyncStorage.getItem("sc_neuro_history");
      if (nh) setNeuroHist(JSON.parse(nh));
    } catch (e) {}
    setLoading(false);
  }

  async function generateAI(patterns, stats) {
    if (aiText) return;
    try {
      const summary = patterns.filter(p => p.instances.length > 0 && p.type !== "good")
        .map(p => p.name + ": " + p.instances.length + "x").join(", ");
      const prompt = "You are SmallChange AI. Write a brief personal trading insight. Stats: " + stats.total + " trades, " + stats.wr + "% win rate, discipline " + stats.discipline + "%. Patterns: " + (summary || "none detected") + ". Write 3-4 sentences, personal, honest, second person. End with one sentence about next week. Under 80 words.";
      const res = await fetch(RAILWAY + "/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 150, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      setAiText(data.content?.map(b => b.text || "").join("") || "");
    } catch (e) {}
  }

  const wins = trades.filter(t => t.outcome === "win").length;
  const losses = trades.filter(t => t.outcome === "loss").length;
  const wr = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;
  const pnl = trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
  const discipline = trades.length > 0 ? Math.round(trades.reduce((s, t) => {
    const f = (t.rules_followed || []).length;
    const v = (t.rules_violated || []).length;
    return s + (f + v > 0 ? (f / (f + v)) * 100 : 50);
  }, 0) / trades.length) : 0;

  const detectedPatterns = PATTERNS.map(p => ({ ...p, instances: p.detect(trades) }));
  const avgNeuro = neuroHist.length > 0 ? Math.round(neuroHist.slice(0, 7).reduce((s, h) => s + h.score, 0) / Math.min(neuroHist.length, 7)) : 0;

  if (!aiText && trades.length >= 2) {
    generateAI(detectedPatterns, { total: trades.length, wr, discipline });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.loadingIcon}>📊</Text>
          <Text style={styles.loadingTxt}>ANALYZING PATTERNS...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (trades.length < 2) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📓</Text>
          <Text style={styles.emptyTitle}>No Journal Data Yet</Text>
          <Text style={styles.emptyMsg}>Complete at least 2 trades in your journal to see pattern analysis.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate("Journal")}>
            <Text style={styles.emptyBtnTxt}>OPEN JOURNAL</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.headerDate}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }).toUpperCase()}</Text>
          <Text style={styles.headerTitle}>Weekly <Text style={{ color: C.gold }}>Insights</Text></Text>
          <Text style={styles.headerSub}>Your psychological patterns from journal data</Text>
        </View>

        {/* Score hero */}
        <View style={styles.scoreGrid}>
          {[
            { val: trades.length, lbl: "TRADES", color: C.bright },
            { val: wr + "%", lbl: "WIN RATE", color: wr >= 60 ? C.buy : C.sell },
            { val: (pnl >= 0 ? "+" : "") + "$" + Math.abs(pnl).toFixed(0), lbl: "P&L", color: pnl >= 0 ? C.buy : C.sell },
            { val: discipline + "%", lbl: "DISCIPLINE", color: C.blue },
          ].map((item, i) => (
            <View key={i} style={styles.scoreCard}>
              <Text style={[styles.scoreVal, { color: item.color }]}>{item.val}</Text>
              <Text style={styles.scoreLbl}>{item.lbl}</Text>
            </View>
          ))}
        </View>

        {/* Neuro trend */}
        {neuroHist.length > 0 && (
          <>
            <Text style={styles.sh}>NEURO SCORE TREND</Text>
            <View style={styles.trendCard}>
              <View style={styles.trendRow}>
                {neuroHist.slice(0, 7).reverse().map((h, i) => (
                  <View key={i} style={styles.trendBarWrap}>
                    <View style={[styles.trendBar, {
                      height: Math.max(4, h.score * 0.6),
                      backgroundColor: h.score >= 72 ? C.buy : h.score >= 50 ? C.warn : C.sell
                    }]} />
                    <Text style={styles.trendScore}>{h.score}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.trendAvg}>7-session average: {avgNeuro}/100</Text>
            </View>
          </>
        )}

        {/* AI Insight */}
        {aiText ? (
          <>
            <Text style={styles.sh}>AI PERSONAL DEBRIEF</Text>
            <View style={styles.aiCard}>
              <Text style={styles.aiTitle}>SMALLCHANGE AI WEEKLY ANALYSIS</Text>
              <Text style={styles.aiBody}>{aiText}</Text>
            </View>
          </>
        ) : null}

        {/* Patterns */}
        <Text style={styles.sh}>PATTERN ANALYSIS</Text>
        {detectedPatterns.map(p => (
          p.instances.length > 0 && (
            <View key={p.key} style={[styles.patternCard, p.type === "danger" ? styles.patternDanger : styles.patternWarn]}>
              <View style={styles.patternHeader}>
                <Text style={styles.patternName}>{p.icon} {p.name}</Text>
                <View style={[styles.patternBadge, { backgroundColor: p.type === "danger" ? "rgba(255,51,85,.1)" : "rgba(255,159,10,.1)" }]}>
                  <Text style={[styles.patternBadgeTxt, { color: p.type === "danger" ? C.sell : C.warn }]}>
                    {p.instances.length}x
                  </Text>
                </View>
              </View>
              <Text style={styles.patternQuote}>"{p.quote}"</Text>
              <Text style={styles.patternBook}>{p.book}</Text>
              {p.instances.slice(0, 2).map((inst, i) => (
                <Text key={i} style={styles.patternDetail}>▸ {inst.detail}</Text>
              ))}
            </View>
          )
        ))}

        {detectedPatterns.every(p => p.instances.length === 0) && (
          <View style={styles.cleanCard}>
            <Text style={styles.cleanIcon}>✅</Text>
            <Text style={styles.cleanTitle}>No Negative Patterns Detected</Text>
            <Text style={styles.cleanMsg}>Excellent discipline this period. Keep executing your edge consistently.</Text>
            <Text style={styles.cleanQuote}>"Consistent execution is the hallmark of a professional trader." — Mark Douglas</Text>
          </View>
        )}

        {/* Discipline bar */}
        <Text style={styles.sh}>DISCIPLINE SCORE</Text>
        <View style={styles.discCard}>
          <View style={styles.discTrack}>
            <View style={[styles.discFill, {
              width: discipline + "%",
              backgroundColor: discipline >= 70 ? C.buy : discipline >= 50 ? C.warn : C.sell
            }]} />
          </View>
          <View style={styles.discStats}>
            <Text style={styles.discPct}>{discipline}%</Text>
            <Text style={[styles.discLabel, { color: discipline >= 70 ? C.buy : discipline >= 50 ? C.warn : C.sell }]}>
              {discipline >= 70 ? "DISCIPLINED" : discipline >= 50 ? "MODERATE" : "NEEDS WORK"}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.journalBtn} onPress={() => navigation.navigate("Journal")}>
          <Text style={styles.journalBtnTxt}>📓 OPEN JOURNAL</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  loadingIcon: { fontSize: 48, marginBottom: 16 },
  loadingTxt: { fontFamily: "monospace", fontSize: 12, letterSpacing: 3, color: C.gold },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: C.bright, marginBottom: 10 },
  emptyMsg: { fontSize: 14, color: C.dim, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  emptyBtn: { backgroundColor: C.gold, padding: 14, borderRadius: 6, paddingHorizontal: 28 },
  emptyBtnTxt: { fontFamily: "monospace", fontSize: 12, fontWeight: "700", color: "#000", letterSpacing: 2 },
  header: { paddingVertical: 20 },
  headerDate: { fontFamily: "monospace", fontSize: 9, letterSpacing: 4, color: C.gold, opacity: 0.7, marginBottom: 6 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: C.bright, letterSpacing: 1 },
  headerSub: { fontSize: 13, color: C.dim, marginTop: 4, fontStyle: "italic" },
  scoreGrid: { flexDirection: "row", gap: 8, marginBottom: 20 },
  scoreCard: { flex: 1, backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 12, alignItems: "center" },
  scoreVal: { fontFamily: "monospace", fontSize: 18, fontWeight: "700", marginBottom: 4 },
  scoreLbl: { fontFamily: "monospace", fontSize: 7, letterSpacing: 2, color: C.dim },
  sh: { fontFamily: "monospace", fontSize: 9, letterSpacing: 4, color: C.gold, opacity: 0.8, marginBottom: 10 },
  trendCard: { backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 16, marginBottom: 20 },
  trendRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 70, marginBottom: 8 },
  trendBarWrap: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  trendBar: { width: "100%", borderRadius: 2 },
  trendScore: { fontFamily: "monospace", fontSize: 9, color: C.dim, marginTop: 4 },
  trendAvg: { fontFamily: "monospace", fontSize: 10, color: C.dim, textAlign: "center" },
  aiCard: { backgroundColor: C.p1, borderWidth: 1, borderColor: "rgba(212,168,83,.2)", borderLeftWidth: 3, borderLeftColor: C.gold, borderRadius: 6, padding: 16, marginBottom: 20 },
  aiTitle: { fontFamily: "monospace", fontSize: 8, letterSpacing: 3, color: C.gold, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  aiBody: { fontSize: 14, color: C.text, lineHeight: 22, fontStyle: "italic" },
  patternCard: { borderWidth: 1, borderRadius: 6, padding: 16, marginBottom: 10, borderLeftWidth: 3 },
  patternDanger: { backgroundColor: "rgba(255,51,85,.04)", borderColor: "rgba(255,51,85,.2)", borderLeftColor: C.sell },
  patternWarn: { backgroundColor: "rgba(255,159,10,.04)", borderColor: "rgba(255,159,10,.2)", borderLeftColor: C.warn },
  patternHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  patternName: { fontSize: 15, fontWeight: "700", color: C.bright },
  patternBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 3 },
  patternBadgeTxt: { fontFamily: "monospace", fontSize: 11, fontWeight: "700" },
  patternQuote: { fontSize: 13, color: C.gold, fontStyle: "italic", marginBottom: 6, lineHeight: 20 },
  patternBook: { fontFamily: "monospace", fontSize: 9, color: C.dim, letterSpacing: 1, marginBottom: 8 },
  patternDetail: { fontFamily: "monospace", fontSize: 10, color: C.text, marginBottom: 4, lineHeight: 16 },
  cleanCard: { backgroundColor: "rgba(0,217,126,.04)", borderWidth: 1, borderColor: "rgba(0,217,126,.2)", borderRadius: 6, padding: 20, alignItems: "center", marginBottom: 16 },
  cleanIcon: { fontSize: 40, marginBottom: 12 },
  cleanTitle: { fontSize: 16, fontWeight: "700", color: C.buy, marginBottom: 8 },
  cleanMsg: { fontSize: 13, color: C.text, textAlign: "center", lineHeight: 20, marginBottom: 10 },
  cleanQuote: { fontSize: 12, color: C.gold, fontStyle: "italic", textAlign: "center" },
  discCard: { backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 16, marginBottom: 20 },
  discTrack: { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
  discFill: { height: "100%", borderRadius: 4 },
  discStats: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  discPct: { fontFamily: "monospace", fontSize: 20, fontWeight: "700", color: C.bright },
  discLabel: { fontFamily: "monospace", fontSize: 10, letterSpacing: 2 },
  journalBtn: { backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 14, alignItems: "center" },
  journalBtnTxt: { fontFamily: "monospace", fontSize: 12, color: C.gold, letterSpacing: 2 },
});

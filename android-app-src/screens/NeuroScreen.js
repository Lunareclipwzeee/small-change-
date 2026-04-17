import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput, Animated
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const C = {
  bg: "#04060a", p1: "#080c12", p2: "#0c1218",
  border: "#132030", gold: "#d4a853",
  buy: "#00d97e", sell: "#ff3355", warn: "#ff9f0a",
  blue: "#3d9cff", text: "#8aa8c0", bright: "#ddeeff", dim: "#1e3448"
};

const RAILWAY = "https://small-change-production.up.railway.app";

const QUESTIONS = [
  {
    id: "sleep", phase: 0, num: "NEURO-01", label: "SLEEP QUALITY",
    question: "How many hours did you sleep last night?",
    sub: "Sleep deprivation increases cortisol 37% — directly impairs risk assessment",
    type: "options",
    options: [
      { label: "Less than 4h", value: "low", score: 0 },
      { label: "4-5 hours", value: "medium", score: 3 },
      { label: "6-7 hours", value: "good", score: 7 },
      { label: "8+ hours", value: "great", score: 10 },
    ]
  },
  {
    id: "physical", phase: 0, num: "NEURO-02", label: "PHYSICAL STATE",
    question: "How is your body feeling right now?",
    sub: "Physical discomfort activates threat-response",
    type: "options",
    options: [
      { label: "Energized", value: "great", score: 10 },
      { label: "Good", value: "good", score: 7 },
      { label: "Tired", value: "tired", score: 3, warn: true },
      { label: "Unwell", value: "sick", score: 0, danger: true },
    ]
  },
  {
    id: "recent_loss", phase: 1, num: "NEURO-03", label: "RECENT LOSS",
    question: "Have you lost a trade in the last 4 hours?",
    sub: "Loss activates the same brain region as physical pain",
    type: "options",
    options: [
      { label: "No losses today", value: "no", score: 10 },
      { label: "Small loss", value: "small", score: 6, warn: true },
      { label: "Significant loss", value: "big", score: 2, danger: true },
      { label: "Multiple losses", value: "multiple", score: 0, danger: true },
    ]
  },
  {
    id: "motivation", phase: 1, num: "NEURO-04", label: "MOTIVATION",
    question: "Why are you trading RIGHT NOW?",
    sub: "Your honest answer determines your clearance",
    type: "options",
    options: [
      { label: "Clear setup identified", value: "setup", score: 10 },
      { label: "Trading routine", value: "routine", score: 8 },
      { label: "Bored", value: "bored", score: 2, warn: true },
      { label: "Recovering losses", value: "recover", score: 0, danger: true },
      { label: "FOMO", value: "fomo", score: 1, danger: true },
    ]
  },
  {
    id: "trades_today", phase: 2, num: "NEURO-05", label: "TRADE COUNT",
    question: "How many trades have you taken today?",
    sub: "Decision quality degrades with each trade",
    type: "options",
    options: [
      { label: "0 — Fresh start", value: "zero", score: 10 },
      { label: "1-2 — Controlled", value: "one_two", score: 8 },
      { label: "3-4 — Moderate", value: "three_four", score: 5, warn: true },
      { label: "5+ — Overtrading", value: "five_plus", score: 1, danger: true },
    ]
  },
  {
    id: "plan", phase: 2, num: "NEURO-06", label: "TRADING PLAN",
    question: "Do you have a plan for today?",
    sub: "A plan is the difference between trading and gambling",
    type: "options",
    options: [
      { label: "Written with rules", value: "written", score: 10 },
      { label: "Mental plan only", value: "mental", score: 6, warn: true },
      { label: "No plan", value: "none", score: 2, danger: true },
    ]
  },
  {
    id: "last3", phase: 3, num: "NEURO-07", label: "LAST 3 TRADES",
    question: "How did your last 3 trades go?",
    sub: "3 consecutive losses = Tilt State — most dangerous pattern",
    type: "options",
    options: [
      { label: "All profitable", value: "winning", score: 10 },
      { label: "Mixed results", value: "mixed", score: 7 },
      { label: "2 losses", value: "two_losses", score: 3, warn: true },
      { label: "3 consecutive losses", value: "three_losses", score: 0, danger: true },
      { label: "New session", value: "new", score: 8 },
    ]
  },
  {
    id: "freetext", phase: 3, num: "NEURO-08", label: "FREE EXPRESSION",
    question: "In one sentence — what is on your mind right now?",
    sub: "Background stress leaks into trading. Express it to isolate it.",
    type: "text"
  },
];

export default function NeuroScreen({ navigation }) {
  const [phase, setPhase] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [patternWarnings, setPatternWarnings] = useState([]);

  useEffect(() => { loadPatternWarnings(); }, []);

  async function loadPatternWarnings() {
    try {
      const hist = JSON.parse(await AsyncStorage.getItem("sc_neuro_history") || "[]");
      if (hist.length < 3) return;
      const warnings = [];
      const today = new Date().getDay();
      const sameDayEntries = hist.filter(h => h.dayOfWeek === today);
      if (sameDayEntries.length >= 3) {
        const avg = sameDayEntries.reduce((s, h) => s + h.score, 0) / sameDayEntries.length;
        if (avg < 55) {
          const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
          warnings.push("Your last " + sameDayEntries.length + " " + days[today] + "s averaged score " + Math.round(avg) + ". Historically difficult day for you.");
        }
      }
      const recent = hist.slice(0, 5).filter(h => h.score < 55);
      if (recent.length >= 3) warnings.push(recent.length + " of your last 5 sessions scored below 55. Your psychological state has been compromised recently.");
      setPatternWarnings(warnings);
    } catch (e) {}
  }

  function calcScore() {
    const scores = Object.values(answers).map(a => typeof a === "object" ? a.score : 5);
    if (!scores.length) return 50;
    const stressWords = ["stress","angry","worried","scared","frustrated","anxious","desperate"];
    const freetext = (answers.freetext || "").toLowerCase();
    const stressed = stressWords.some(w => freetext.includes(w));
    let total = scores.reduce((s, n) => s + n, 0) / scores.length * 10;
    if (stressed) total -= 5;
    return Math.max(0, Math.min(100, Math.round(total)));
  }

  function selectAnswer(qId, option) {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  }

  const phaseQuestions = QUESTIONS.filter(q => q.phase === phase);
  const totalPhases = 4;
  const score = calcScore();
  const scoreColor = score >= 72 ? C.buy : score >= 50 ? C.warn : C.sell;

  async function runAnalysis() {
    setLoading(true);
    const score = calcScore();
    const prompt = "You are SmallChange NeuroTrader. Analyze: Sleep=" + (answers.sleep?.value||"unknown") + ", Physical=" + (answers.physical?.value||"unknown") + ", Recent loss=" + (answers.recent_loss?.value||"no") + ", Motivation=" + (answers.motivation?.value||"unknown") + ", Trades today=" + (answers.trades_today?.value||"zero") + ", Plan=" + (answers.plan?.value||"unknown") + ", Last 3=" + (answers.last3?.value||"new") + ", Notes=" + (answers.freetext||"none") + ", Score=" + score + ". Respond ONLY valid JSON: {"verdict":"CLEARED or CAUTION or BLOCKED","neuro_score":" + score + ","ai_analysis":"2-3 sentences citing Trading in the Zone or Market Wizards","prescriptions":[{"icon":"emoji","text":"prescription"},{"icon":"emoji","text":"prescription"},{"icon":"emoji","text":"prescription"}],"trading_rules":["rule1","rule2","rule3"],"no_trade_reason":"if BLOCKED","cooldown_minutes":0}";
    try {
      const res = await fetch(RAILWAY + "/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 800, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      const raw = data.content?.map(b => b.text || "").join("") || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      let d;
      try { d = JSON.parse(clean); }
      catch (e) {
        d = {
          verdict: score >= 72 ? "CLEARED" : score >= 50 ? "CAUTION" : "BLOCKED",
          neuro_score: score,
          ai_analysis: "Assessment complete. Trade with discipline.",
          prescriptions: [{ icon: "🧘", text: "Breathe before every trade" }, { icon: "📝", text: "Follow your plan exactly" }, { icon: "⏱", text: "Wait for confirmation" }],
          trading_rules: ["Respect your stop loss", "Maximum trades per allowance", "Journal every trade"],
          no_trade_reason: "Psychological state not ready",
          cooldown_minutes: 0
        };
      }
      const allowed = d.verdict === "CLEARED" ? (score >= 85 ? 3 : 2) : d.verdict === "CAUTION" ? 1 : 0;
      const saveData = { verdict: d.verdict, score: d.neuro_score, allowed, used: 0, date: new Date().toDateString(), timestamp: Date.now() };
      await AsyncStorage.setItem("apexTradeAllowance", JSON.stringify(saveData));
      const hist = JSON.parse(await AsyncStorage.getItem("sc_neuro_history") || "[]");
      hist.unshift({ date: new Date().toDateString(), time: new Date().toLocaleTimeString(), verdict: d.verdict, score: d.neuro_score, dayOfWeek: new Date().getDay() });
      await AsyncStorage.setItem("sc_neuro_history", JSON.stringify(hist.slice(0, 60)));
      setVerdict({ ...d, allowed });
    } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingCenter}>
          <Text style={styles.loadingIcon}>🧠</Text>
          <Text style={styles.loadingTitle}>ANALYZING NEURAL PROFILE...</Text>
          <Text style={styles.loadingMsg}>Cross-referencing with Trading in the Zone</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (verdict) {
    const vc = verdict.verdict === "CLEARED" ? C.buy : verdict.verdict === "CAUTION" ? C.warn : C.sell;
    const vi = verdict.verdict === "CLEARED" ? "✅" : verdict.verdict === "CAUTION" ? "⚠️" : "🚫";
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.scroll}>
          <View style={[styles.verdictHero, { borderColor: vc }]}>
            <Text style={styles.verdictIcon}>{vi}</Text>
            <Text style={[styles.verdictStatus, { color: vc }]}>{verdict.verdict}</Text>
            <Text style={[styles.verdictScore, { color: vc }]}>{verdict.neuro_score}/100</Text>
            <Text style={styles.verdictMsg}>
              {verdict.verdict === "CLEARED" ? "Your neural state is optimized. Proceed with discipline."
                : verdict.verdict === "CAUTION" ? "Trade with reduced size. Extra discipline required."
                : verdict.no_trade_reason || "Do not trade today. Protect your capital."}
            </Text>
          </View>
          <View style={[styles.taBox, { borderColor: vc }]}>
            <Text style={styles.taLabel}>TRADES ALLOWED TODAY</Text>
            <Text style={[styles.taNum, { color: vc }]}>{verdict.allowed}</Text>
            <View style={styles.taSlots}>
              {[1, 2, 3].map(i => (
                <View key={i} style={[styles.taSlot, { borderColor: i <= verdict.allowed ? vc : C.border }]}>
                  <Text style={{ color: i <= verdict.allowed ? vc : C.dim, fontFamily: "monospace", fontWeight: "700" }}>
                    {i <= verdict.allowed ? i : "—"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>AI ANALYSIS</Text>
            <Text style={styles.panelBody}>{verdict.ai_analysis}</Text>
          </View>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>PRESCRIPTIONS</Text>
            {(verdict.prescriptions || []).map((p, i) => (
              <View key={i} style={styles.rxItem}>
                <Text style={styles.rxIcon}>{p.icon}</Text>
                <Text style={styles.rxText}>{p.text}</Text>
              </View>
            ))}
          </View>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>SESSION RULES</Text>
            {(verdict.trading_rules || []).map((r, i) => (
              <Text key={i} style={styles.ruleItem}>▸ {r}</Text>
            ))}
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate("Journal")}>
              <Text style={styles.btnPrimaryText}>OPEN JOURNAL →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => { setVerdict(null); setAnswers({}); setPhase(0); }}>
              <Text style={styles.btnSecondaryText}>RETAKE</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll}>
        {/* Score ring */}
        <View style={styles.scoreRing}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}</Text>
          <Text style={styles.scoreLbl}>NEURO SCORE</Text>
        </View>

        {/* Pattern warnings */}
        {patternWarnings.length > 0 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>PATTERN HISTORY WARNING</Text>
            {patternWarnings.map((w, i) => (
              <Text key={i} style={styles.warningText}>⚠ {w}</Text>
            ))}
          </View>
        )}

        {/* Phase progress */}
        <View style={styles.phaseRow}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[styles.phaseDot, { backgroundColor: i < phase ? C.buy : i === phase ? C.blue : C.border }]} />
          ))}
        </View>
        <Text style={styles.phaseLabel}>PHASE {phase + 1} OF {totalPhases}</Text>

        {/* Questions */}
        {phaseQuestions.map(q => (
          <View key={q.id} style={[styles.qCard, answers[q.id] && styles.qCardAnswered]}>
            <Text style={styles.qNum}>{q.num} / {q.label}</Text>
            <Text style={styles.qText}>{q.question}</Text>
            <Text style={styles.qSub}>{q.sub}</Text>
            {q.type === "options" && (
              <View style={styles.optionsGrid}>
                {q.options.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optBtn,
                      answers[q.id]?.value === opt.value && styles.optSelected,
                      answers[q.id]?.value === opt.value && opt.danger && styles.optDanger,
                      answers[q.id]?.value === opt.value && opt.warn && styles.optWarn,
                    ]}
                    onPress={() => selectAnswer(q.id, opt)}
                  >
                    <Text style={[
                      styles.optText,
                      answers[q.id]?.value === opt.value && { color: opt.danger ? C.sell : opt.warn ? C.warn : C.buy }
                    ]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {q.type === "text" && (
              <TextInput
                style={styles.textInput}
                placeholder="Type anything..."
                placeholderTextColor={C.dim}
                multiline
                numberOfLines={3}
                onChangeText={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                value={answers[q.id] || ""}
              />
            )}
          </View>
        ))}

        {/* Navigation */}
        <View style={styles.navRow}>
          {phase > 0 && (
            <TouchableOpacity style={styles.btnBack} onPress={() => setPhase(p => p - 1)}>
              <Text style={styles.btnBackText}>← BACK</Text>
            </TouchableOpacity>
          )}
          {phase < totalPhases - 1 ? (
            <TouchableOpacity style={styles.btnNext} onPress={() => setPhase(p => p + 1)}>
              <Text style={styles.btnNextText}>NEXT →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.btnAnalyze} onPress={runAnalysis}>
              <Text style={styles.btnAnalyzeText}>⚡ RUN ANALYSIS</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, padding: 16 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  loadingIcon: { fontSize: 64, marginBottom: 20 },
  loadingTitle: { fontFamily: "monospace", fontSize: 14, letterSpacing: 3, color: C.blue, marginBottom: 10 },
  loadingMsg: { fontSize: 13, color: C.dim, textAlign: "center" },
  scoreRing: { alignItems: "center", paddingVertical: 24, backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, marginBottom: 16 },
  scoreNum: { fontFamily: "monospace", fontSize: 48, fontWeight: "900" },
  scoreLbl: { fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: C.dim, marginTop: 4 },
  warningBox: { backgroundColor: "rgba(255,51,85,.06)", borderWidth: 1, borderColor: "rgba(255,51,85,.25)", borderRadius: 6, padding: 14, marginBottom: 16 },
  warningTitle: { fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: C.sell, marginBottom: 8 },
  warningText: { fontSize: 13, color: C.text, lineHeight: 20, marginBottom: 4 },
  phaseRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 6 },
  phaseDot: { width: 8, height: 8, borderRadius: 4 },
  phaseLabel: { fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: C.dim, textAlign: "center", marginBottom: 20 },
  qCard: { backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 16, marginBottom: 12, borderLeftWidth: 3 },
  qCardAnswered: { borderLeftColor: C.buy },
  qNum: { fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: C.dim, marginBottom: 8 },
  qText: { fontSize: 16, fontWeight: "600", color: C.bright, marginBottom: 8, lineHeight: 22 },
  qSub: { fontSize: 12, color: C.dim, fontFamily: "monospace", marginBottom: 14, lineHeight: 18 },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optBtn: { backgroundColor: C.p2, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 10, paddingHorizontal: 14 },
  optSelected: { borderColor: C.buy, backgroundColor: "rgba(0,217,126,.06)" },
  optDanger: { borderColor: C.sell, backgroundColor: "rgba(255,51,85,.06)" },
  optWarn: { borderColor: C.warn, backgroundColor: "rgba(255,159,10,.06)" },
  optText: { fontSize: 13, color: C.text },
  textInput: { backgroundColor: C.p2, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 12, color: C.bright, fontSize: 14, minHeight: 80, textAlignVertical: "top" },
  navRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  btnBack: { flex: 1, padding: 14, backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, alignItems: "center" },
  btnBackText: { fontFamily: "monospace", fontSize: 12, color: C.dim, letterSpacing: 2 },
  btnNext: { flex: 2, padding: 14, backgroundColor: C.blue, borderRadius: 6, alignItems: "center" },
  btnNextText: { fontFamily: "monospace", fontSize: 12, color: "#000", fontWeight: "700", letterSpacing: 2 },
  btnAnalyze: { flex: 2, padding: 14, backgroundColor: C.gold, borderRadius: 6, alignItems: "center" },
  btnAnalyzeText: { fontFamily: "monospace", fontSize: 12, color: "#000", fontWeight: "700", letterSpacing: 2 },
  verdictHero: { borderWidth: 1, borderRadius: 6, padding: 28, alignItems: "center", marginBottom: 16 },
  verdictIcon: { fontSize: 56, marginBottom: 12 },
  verdictStatus: { fontFamily: "monospace", fontSize: 22, fontWeight: "900", letterSpacing: 3, marginBottom: 6 },
  verdictScore: { fontFamily: "monospace", fontSize: 32, fontWeight: "900", marginBottom: 12 },
  verdictMsg: { fontSize: 14, color: C.text, textAlign: "center", lineHeight: 22 },
  taBox: { borderWidth: 1, borderRadius: 6, padding: 18, marginBottom: 14, backgroundColor: C.p1, alignItems: "center" },
  taLabel: { fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: C.gold, marginBottom: 8 },
  taNum: { fontFamily: "monospace", fontSize: 48, fontWeight: "900", marginBottom: 12 },
  taSlots: { flexDirection: "row", gap: 10 },
  taSlot: { width: 40, height: 40, borderWidth: 1, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  panel: { backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 16, marginBottom: 12 },
  panelTitle: { fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: C.gold, marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  panelBody: { fontSize: 14, color: C.text, lineHeight: 22 },
  rxItem: { flexDirection: "row", gap: 12, marginBottom: 10, alignItems: "flex-start" },
  rxIcon: { fontSize: 20 },
  rxText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 20 },
  ruleItem: { fontSize: 13, color: C.text, marginBottom: 8, lineHeight: 20 },
  btnRow: { gap: 10, marginTop: 8 },
  btnPrimary: { padding: 16, backgroundColor: C.buy, borderRadius: 6, alignItems: "center" },
  btnPrimaryText: { fontFamily: "monospace", fontSize: 13, fontWeight: "700", color: "#000", letterSpacing: 2 },
  btnSecondary: { padding: 14, backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, alignItems: "center" },
  btnSecondaryText: { fontFamily: "monospace", fontSize: 12, color: C.dim, letterSpacing: 2 },
});

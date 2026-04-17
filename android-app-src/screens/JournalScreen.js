import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput, Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const C = {
  bg: "#04060a", p1: "#080c12", p2: "#0c1218",
  border: "#132030", gold: "#d4a853",
  buy: "#00d97e", sell: "#ff3355", warn: "#ff9f0a",
  blue: "#3d9cff", text: "#8aa8c0", bright: "#ddeeff", dim: "#1e3448"
};

const RULES = [
  "I waited for confirmation before entering",
  "I set stop-loss BEFORE entering",
  "I did NOT move my stop-loss",
  "I exited at my planned target or stop",
  "I was not emotionally triggered at entry",
  "Position size matched my risk plan",
];

export default function JournalScreen({ navigation }) {
  const [outcome, setOutcome] = useState(null);
  const [asset, setAsset] = useState("BTC");
  const [signal, setSignal] = useState("LONG");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [pnl, setPnl] = useState("");
  const [lesson, setLesson] = useState("");
  const [rules, setRules] = useState({});
  const [emotions, setEmotions] = useState({ fear: 3, greed: 3, conf: 6, disc: 7 });
  const [trades, setTrades] = useState([]);
  const [neuroData, setNeuroData] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadData(); }, []);

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
        if (d.date === new Date().toDateString()) setTrades(d.trades || []);
      }
    } catch (e) {}
  }

  function toggleRule(rule) {
    setRules(prev => ({ ...prev, [rule]: !prev[rule] }));
  }

  function adjustEmotion(key, delta) {
    setEmotions(prev => ({ ...prev, [key]: Math.max(0, Math.min(10, prev[key] + delta)) }));
  }

  async function saveTrade() {
    if (!outcome) { Alert.alert("Select outcome", "Please select WIN, LOSS or BREAKEVEN"); return; }
    const trade = {
      id: trades.length + 1,
      time: new Date().toLocaleTimeString(),
      date: new Date().toDateString(),
      outcome, asset, signal, entry, exit,
      pnl: parseFloat(pnl) || 0,
      lesson,
      emotions,
      rules_followed: RULES.filter(r => rules[r]),
      rules_violated: RULES.filter(r => rules[r] === false),
    };
    const newTrades = [...trades, trade];
    await AsyncStorage.setItem("apexSessionTrades", JSON.stringify({
      date: new Date().toDateString(),
      trades: newTrades
    }));
    if (neuroData) {
      neuroData.used = newTrades.length;
      await AsyncStorage.setItem("apexTradeAllowance", JSON.stringify(neuroData));
    }
    setTrades(newTrades);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setOutcome(null); setEntry(""); setExit(""); setPnl(""); setLesson(""); setRules({});
    const allowed = neuroData?.allowed || 999;
    if (newTrades.length >= allowed && allowed > 0) {
      Alert.alert("Session Complete", "You have used all your trades for today. Close your charts and go live your life.", [{ text: "OK" }]);
    }
  }

  const allowed = neuroData?.allowed || 0;
  const remaining = allowed - trades.length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerDate}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }).toUpperCase()}</Text>
          <Text style={styles.headerTitle}>Trade <Text style={{ color: C.gold }}>Journal</Text></Text>
        </View>

        {/* Session bar */}
        <View style={styles.sessionBar}>
          <View style={styles.sbItem}>
            <Text style={[styles.sbVal, { color: C.gold }]}>{allowed || "—"}</Text>
            <Text style={styles.sbLbl}>ALLOWED</Text>
          </View>
          <View style={styles.sbDiv} />
          <View style={styles.sbItem}>
            <Text style={styles.sbVal}>{trades.length}</Text>
            <Text style={styles.sbLbl}>TAKEN</Text>
          </View>
          <View style={styles.sbDiv} />
          <View style={styles.sbItem}>
            <Text style={[styles.sbVal, { color: C.buy }]}>{trades.filter(t => t.outcome === "win").length}</Text>
            <Text style={styles.sbLbl}>WINS</Text>
          </View>
          <View style={styles.sbDiv} />
          <View style={styles.sbItem}>
            <Text style={[styles.sbVal, { color: C.sell }]}>{trades.filter(t => t.outcome === "loss").length}</Text>
            <Text style={styles.sbLbl}>LOSSES</Text>
          </View>
        </View>

        {/* Trade slots */}
        <View style={styles.slotsRow}>
          {[1, 2, 3].map(i => {
            const t = trades[i - 1];
            const isNext = i === trades.length + 1 && i <= allowed;
            const isOver = i > allowed;
            return (
              <View key={i} style={[
                styles.slot,
                t && t.outcome === "win" && styles.slotWin,
                t && t.outcome === "loss" && styles.slotLoss,
                isNext && styles.slotNext,
                isOver && styles.slotOver,
              ]}>
                <Text style={styles.slotText}>
                  {t ? (t.outcome === "win" ? "✓" : "✗") : isOver ? "—" : i}
                </Text>
              </View>
            );
          })}
          <Text style={styles.slotLabel}>
            {remaining > 0 ? remaining + " remaining" : "Session complete"}
          </Text>
        </View>

        {saved && (
          <View style={styles.savedBanner}>
            <Text style={styles.savedText}>✓ Trade saved to journal</Text>
          </View>
        )}

        {/* Journal form */}
        <Text style={styles.sh}>LOG THIS TRADE</Text>

        {/* Outcome */}
        <View style={styles.outcomeRow}>
          {["win", "loss", "be"].map(o => (
            <TouchableOpacity
              key={o}
              style={[styles.outcomeBtn, outcome === o && styles["outcome_" + o]]}
              onPress={() => setOutcome(o)}
            >
              <Text style={[styles.outcomeTxt, outcome === o && { color: o === "win" ? C.buy : o === "loss" ? C.sell : C.warn }]}>
                {o === "win" ? "✓ WIN" : o === "loss" ? "✗ LOSS" : "○ BREAKEVEN"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Asset + Signal */}
        <View style={styles.row2}>
          <View style={styles.field}>
            <Text style={styles.fieldLbl}>ASSET</Text>
            <TextInput style={styles.input} value={asset} onChangeText={setAsset} placeholderTextColor={C.dim} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLbl}>SIGNAL</Text>
            <View style={styles.signalRow}>
              {["LONG", "SHORT"].map(s => (
                <TouchableOpacity key={s} style={[styles.signalBtn, signal === s && styles.signalActive]} onPress={() => setSignal(s)}>
                  <Text style={[styles.signalTxt, signal === s && { color: s === "LONG" ? C.buy : C.sell }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Prices */}
        <View style={styles.row2}>
          <View style={styles.field}>
            <Text style={styles.fieldLbl}>ENTRY PRICE</Text>
            <TextInput style={styles.input} value={entry} onChangeText={setEntry} keyboardType="numeric" placeholder="e.g. 84200" placeholderTextColor={C.dim} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLbl}>EXIT PRICE</Text>
            <TextInput style={styles.input} value={exit} onChangeText={setExit} keyboardType="numeric" placeholder="e.g. 84500" placeholderTextColor={C.dim} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLbl}>P&L ($)</Text>
          <TextInput style={styles.input} value={pnl} onChangeText={setPnl} keyboardType="numeric" placeholder="e.g. 45 or -20" placeholderTextColor={C.dim} />
        </View>

        {/* Emotions */}
        <Text style={styles.sh}>EMOTIONS</Text>
        <View style={styles.emoGrid}>
          {[["fear","Fear",C.sell],["greed","Greed",C.warn],["conf","Confidence",C.buy],["disc","Discipline",C.blue]].map(([key,lbl,col]) => (
            <View key={key} style={styles.emoCard}>
              <Text style={styles.emoLbl}>{lbl}</Text>
              <View style={styles.emoRow}>
                <TouchableOpacity onPress={() => adjustEmotion(key, -1)} style={styles.emoBtn}><Text style={styles.emoBtnTxt}>−</Text></TouchableOpacity>
                <Text style={[styles.emoVal, { color: col }]}>{emotions[key]}</Text>
                <TouchableOpacity onPress={() => adjustEmotion(key, 1)} style={styles.emoBtn}><Text style={styles.emoBtnTxt}>+</Text></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Rules */}
        <Text style={styles.sh}>RULE CHECKLIST</Text>
        {RULES.map(rule => (
          <TouchableOpacity key={rule} style={styles.ruleRow} onPress={() => toggleRule(rule)}>
            <View style={[styles.ruleBox, rules[rule] && styles.ruleBoxChecked]}>
              <Text style={{ color: rules[rule] ? "#000" : C.dim, fontSize: 12 }}>{rules[rule] ? "✓" : " "}</Text>
            </View>
            <Text style={[styles.ruleTxt, rules[rule] && { color: C.buy }]}>{rule}</Text>
          </TouchableOpacity>
        ))}

        {/* Lesson */}
        <Text style={styles.sh}>THE ONE LESSON</Text>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: "top", marginBottom: 20 }]}
          placeholder="Win or loss — write one thing you learned..."
          placeholderTextColor={C.dim}
          multiline
          value={lesson}
          onChangeText={setLesson}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={saveTrade}>
          <Text style={styles.saveBtnTxt}>📓 SAVE TRADE</Text>
        </TouchableOpacity>

        {/* Past trades */}
        {trades.length > 0 && (
          <>
            <Text style={[styles.sh, { marginTop: 24 }]}>THIS SESSION</Text>
            {trades.slice().reverse().map(t => (
              <View key={t.id} style={styles.tradeRow}>
                <View style={styles.tradeLeft}>
                  <Text style={styles.tradeNum}>#{t.id}</Text>
                  <Text style={styles.tradeTime}>{t.time}</Text>
                </View>
                <View style={styles.tradeMid}>
                  <Text style={[styles.tradeSignal, { color: t.signal === "LONG" ? C.buy : C.sell }]}>{t.signal} {t.asset}</Text>
                  <Text style={styles.tradeLesson} numberOfLines={1}>{t.lesson || "No lesson"}</Text>
                </View>
                <View style={styles.tradeRight}>
                  <Text style={[styles.tradePnl, { color: t.pnl >= 0 ? C.buy : C.sell }]}>
                    {t.pnl >= 0 ? "+" : ""}${Math.abs(t.pnl).toFixed(0)}
                  </Text>
                  <View style={[styles.tradeOutcome, { backgroundColor: t.outcome === "win" ? "rgba(0,217,126,.1)" : "rgba(255,51,85,.1)" }]}>
                    <Text style={{ color: t.outcome === "win" ? C.buy : C.sell, fontFamily: "monospace", fontSize: 9 }}>
                      {t.outcome.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, padding: 16 },
  header: { paddingVertical: 20 },
  headerDate: { fontFamily: "monospace", fontSize: 9, letterSpacing: 4, color: C.gold, opacity: 0.7, marginBottom: 6 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: C.bright, letterSpacing: 1 },
  sessionBar: { flexDirection: "row", backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 14, marginBottom: 14, alignItems: "center", justifyContent: "space-around" },
  sbItem: { alignItems: "center" },
  sbVal: { fontFamily: "monospace", fontSize: 22, fontWeight: "700", color: C.bright },
  sbLbl: { fontFamily: "monospace", fontSize: 8, letterSpacing: 2, color: C.dim, marginTop: 3 },
  sbDiv: { width: 1, height: 32, backgroundColor: C.border },
  slotsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  slot: { width: 36, height: 36, borderRadius: 4, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  slotWin: { borderColor: C.buy, backgroundColor: "rgba(0,217,126,.08)" },
  slotLoss: { borderColor: C.sell, backgroundColor: "rgba(255,51,85,.08)" },
  slotNext: { borderColor: C.gold, backgroundColor: "rgba(212,168,83,.08)" },
  slotOver: { borderColor: C.border },
  slotText: { fontFamily: "monospace", fontSize: 13, fontWeight: "700", color: C.dim },
  slotLabel: { fontFamily: "monospace", fontSize: 10, color: C.dim, flex: 1 },
  savedBanner: { backgroundColor: "rgba(0,217,126,.1)", borderWidth: 1, borderColor: "rgba(0,217,126,.3)", borderRadius: 4, padding: 10, marginBottom: 12, alignItems: "center" },
  savedText: { color: C.buy, fontFamily: "monospace", fontSize: 11, letterSpacing: 1 },
  sh: { fontFamily: "monospace", fontSize: 9, letterSpacing: 4, color: C.gold, opacity: 0.8, marginBottom: 10 },
  outcomeRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  outcomeBtn: { flex: 1, padding: 12, backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 4, alignItems: "center" },
  outcome_win: { borderColor: C.buy, backgroundColor: "rgba(0,217,126,.08)" },
  outcome_loss: { borderColor: C.sell, backgroundColor: "rgba(255,51,85,.08)" },
  outcome_be: { borderColor: C.warn, backgroundColor: "rgba(255,159,10,.08)" },
  outcomeTxt: { fontFamily: "monospace", fontSize: 11, fontWeight: "700", color: C.dim, letterSpacing: 1 },
  row2: { flexDirection: "row", gap: 10, marginBottom: 10 },
  field: { flex: 1, marginBottom: 10 },
  fieldLbl: { fontFamily: "monospace", fontSize: 8, letterSpacing: 3, color: C.dim, marginBottom: 6 },
  input: { backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 12, color: C.bright, fontSize: 14 },
  signalRow: { flexDirection: "row", gap: 8 },
  signalBtn: { flex: 1, padding: 12, backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 4, alignItems: "center" },
  signalActive: { borderColor: C.blue },
  signalTxt: { fontFamily: "monospace", fontSize: 12, fontWeight: "700", color: C.dim },
  emoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  emoCard: { width: "47%", backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 12 },
  emoLbl: { fontFamily: "monospace", fontSize: 8, letterSpacing: 2, color: C.dim, marginBottom: 8 },
  emoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  emoBtn: { width: 28, height: 28, backgroundColor: C.p2, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  emoBtnTxt: { color: C.text, fontSize: 16, fontWeight: "700" },
  emoVal: { fontFamily: "monospace", fontSize: 20, fontWeight: "700" },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  ruleBox: { width: 20, height: 20, borderWidth: 1, borderColor: C.border, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  ruleBoxChecked: { backgroundColor: C.buy, borderColor: C.buy },
  ruleTxt: { flex: 1, fontSize: 13, color: C.text, lineHeight: 18 },
  saveBtn: { backgroundColor: C.gold, padding: 16, borderRadius: 6, alignItems: "center", marginBottom: 8 },
  saveBtnTxt: { fontFamily: "monospace", fontSize: 14, fontWeight: "700", color: "#000", letterSpacing: 2 },
  tradeRow: { flexDirection: "row", backgroundColor: C.p1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 12, marginBottom: 8, alignItems: "center", gap: 10 },
  tradeLeft: { width: 44 },
  tradeNum: { fontFamily: "monospace", fontSize: 11, color: C.dim },
  tradeTime: { fontFamily: "monospace", fontSize: 9, color: C.dim, marginTop: 2 },
  tradeMid: { flex: 1 },
  tradeSignal: { fontSize: 13, fontWeight: "700", marginBottom: 3 },
  tradeLesson: { fontSize: 11, color: C.dim, fontStyle: "italic" },
  tradeRight: { alignItems: "flex-end", gap: 4 },
  tradePnl: { fontFamily: "monospace", fontSize: 15, fontWeight: "700" },
  tradeOutcome: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2 },
});

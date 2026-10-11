import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import FocusablePressable from "../FocusablePressable";
import { scaledPixels } from "../../hooks/useScale";
import {
  questionsAt,
  answer,
  type CatalogItemWithScenes,
  type Lang,
  type Level,
  type QA,
} from "../../data/pauseAndAsk";

/**
 * Pause & Ask overlay panel (Amar Gaatha TV, C024).
 * Shown while paused: up to 3 authored questions for the current
 * scene. Selecting one shows the answer card with its source
 * badge. No free generation: unanswered territory stays silent
 * (kid-safe refusal lives in the engine's askFreeText).
 */
interface PauseAndAskProps {
  item: CatalogItemWithScenes;
  currentTime: number;
  lang?: Lang;
  level?: Level;
}

const PauseAndAsk: React.FC<PauseAndAskProps> = ({
  item,
  currentTime,
  lang = "en",
  level = "kid",
}) => {
  const questions = useMemo(
    () => questionsAt(item, currentTime),
    [item, currentTime]
  );
  const [selected, setSelected] = useState<QA | null>(null);

  if (questions.length === 0) {
    return null;
  }

  const result = selected ? answer(selected, level, lang) : null;

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>
        {lang === "hi" ? "Ruko aur Poochho" : "Pause & Ask"}
      </Text>
      <View style={styles.chips}>
        {questions.map((qa) => (
          <FocusablePressable
            key={qa.q_en}
            text={lang === "hi" ? qa.q_hi : qa.q_en}
            onSelect={() => setSelected(qa)}
            style={styles.chip}
          />
        ))}
      </View>
      {selected && result && (
        <View style={styles.card}>
          <Text style={styles.answer}>{result.text}</Text>
          <Text style={styles.badge}>
            {result.badge} · {result.source_note}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: scaledPixels(120),
    start: scaledPixels(80),
    end: scaledPixels(80),
  },
  heading: {
    color: "#FFD54F",
    fontSize: scaledPixels(28),
    fontWeight: "600",
    marginBottom: scaledPixels(16),
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    marginEnd: scaledPixels(16),
    marginBottom: scaledPixels(12),
  },
  card: {
    marginTop: scaledPixels(12),
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: scaledPixels(12),
    padding: scaledPixels(24),
    maxWidth: scaledPixels(1100),
  },
  answer: {
    color: "#FFFFFF",
    fontSize: scaledPixels(26),
    lineHeight: scaledPixels(38),
  },
  badge: {
    color: "#FFD54F",
    fontSize: scaledPixels(20),
    marginTop: scaledPixels(12),
  },
});

export default PauseAndAsk;

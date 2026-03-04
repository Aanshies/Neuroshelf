import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

export default function ScoreRing({ score }: { score: number }) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const getColor = () => {
    if (score >= 8) return "#16a34a";
    if (score >= 5) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <View style={[styles.circle, { borderColor: getColor() }]}>
      <Animated.Text style={[styles.score, { color: getColor() }]}>
        {score}/10
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  score: {
    fontSize: 26,
    fontWeight: "bold",
  },
});

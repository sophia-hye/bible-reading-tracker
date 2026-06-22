import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  percent: number; // 0..1
  read: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressRing({ percent, read, total, size = 168, strokeWidth = 12 }: Props) {
  const clamped = Math.min(Math.max(percent, 0), 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  const center = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke="#E5E3DE" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#B91C1C"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.pct}>{Math.round(clamped * 100)}%</Text>
        <Text style={styles.sub}>
          {read} / {total} 장
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pct: { fontSize: 34, fontWeight: '700', color: '#111' },
  sub: { fontSize: 13, color: '#8A8780', marginTop: 2 },
});

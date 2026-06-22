import React from 'react';
import { StyleSheet, View } from 'react-native';

export function BookProgressBar({ percent }: { percent: number }) {
  const pct = Math.round(Math.min(Math.max(percent, 0), 1) * 100);
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 4, borderRadius: 2, backgroundColor: '#E5E3DE', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: '#B91C1C' },
});

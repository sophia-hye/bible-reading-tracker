import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SizeStep } from '../src/types/bible';

export interface ChapterDot {
  chapter: number;
  sizeStep: SizeStep;
  /** 점 채움 색. null = 미독(연회색 외곽선만) */
  fill: string | null;
}

interface Props {
  title?: string;
  dots: ChapterDot[];
  onToggle: (chapter: number) => void;
  cols?: number;
}

const CELL = 32;

function diameter(step: SizeStep): number {
  if (step === 0) return 10;
  if (step === 1) return 14;
  return 18;
}

/**
 * 한 책의 장 점 매트릭스 (행=책, 점 크기=장 길이, 채움=읽음/누적 농도). 모바일 10열 wrap.
 * 점 자체는 작아도 셀(32x32) 전체가 탭 영역 → 접근성(설계 §5.2 원칙 6).
 */
export function DotMatrix({ title, dots, onToggle, cols = 10 }: Props) {
  return (
    <View style={styles.book}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={[styles.grid, { width: CELL * cols }]}>
        {dots.map((d) => {
          const size = diameter(d.sizeStep);
          return (
            <Pressable key={d.chapter} onPress={() => onToggle(d.chapter)} style={styles.cell} hitSlop={4}>
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: 1.5,
                  backgroundColor: d.fill ?? 'transparent',
                  borderColor: d.fill ?? '#CBC9C4',
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  book: { marginBottom: 18 },
  title: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' },
});

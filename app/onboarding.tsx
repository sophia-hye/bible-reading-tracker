import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal } from 'react-native';
import { useReadingStore } from '../lib/store/readingStore';
import { dateToHhmm, formatKoTime, hhmmToDate } from '../lib/settings';
import { BIBLE_BOOKS } from '../src/data/bibleData';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const PLANS = [
  { id: 'year-1', name: '1년 통독', detail: '365일 · 하루 약 3~4장' },
  { id: 'days-90', name: '90일 통독', detail: '집중 · 하루 약 13장' },
  { id: 'nt-90', name: '신약 90일', detail: '하루 약 3장' },
  { id: 'psalms-30', name: '시편·잠언 한 달', detail: '30일 · 하루 약 5장' },
  { id: 'custom', name: '직접 설정', detail: '읽을 범위와 기간을 직접 정하기' },
];
const ORDERS = [
  { id: 'canonical', label: '정경 순서' },
  { id: 'nt-first', label: '신약 후 구약' },
  { id: 'genre', label: '장르별' },
];
const ORDER_DESC: Record<string, string> = {
  canonical: '창세기부터 요한계시록까지 순서대로 읽어요.',
  'nt-first': '신약 27권을 먼저 읽고, 그다음 구약 39권을 읽어요.',
  genre: '같은 종류끼리 모아서: 율법 → 역사 → 시가 → 예언 → 복음 → 서신 순서로 읽어요.',
};
const CUSTOM_DAYS = [30, 60, 90, 180, 365];
const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

// 시작 화면 "글자가 떨어지는" 아트 (Figma 00 Start) — 위 군집→가는 줄기→아래로 퍼짐.
// 결정론적 시드로 한 번만 생성(렌더마다 동일).
interface Glyph { ch: string; x: number; y: number; size: number; rot: number; op: number; red: boolean }

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 깔때기 폭: 위가 넓고 아래로 갈수록 계속 좁아짐 (모래시계 아님). (t: 0=위, 1=아래)
function funnelHalf(t: number): number {
  const topHalf = 0.42;
  const bottomHalf = 0.03;
  return bottomHalf + (topHalf - bottomHalf) * Math.pow(1 - t, 1.4);
}

function buildGlyphs(): Glyph[] {
  const rnd = mulberry32(20260621);
  const pool = 'abcdefghilmnoprstuvwyABEHILORST';
  const out: Glyph[] = [];
  const N = 300;
  for (let i = 0; i < N; i++) {
    const t = Math.pow(rnd(), 1.7); // 위(t→0)에 더 밀집
    const half = funnelHalf(t);
    let spread = (rnd() * 2 - 1) * half;
    // 몇 개(≈6개)는 깔때기 밖으로 또렷이 벗어나게 — 의도된 아트 느낌
    if (rnd() < 0.02) {
      const side = rnd() < 0.5 ? -1 : 1;
      spread = side * (half + 0.06 + rnd() * 0.08);
    }
    const x = 50 + spread * 100 + (rnd() * 2 - 1) * 4.5; // 손으로 흩뿌린 듯한 흔들림
    const op = Math.max(0.1, 0.9 - t * 0.68 + (rnd() * 0.12 - 0.06)); // 아래로 갈수록 연하게
    out.push({
      ch: pool[Math.floor(rnd() * pool.length)]!,
      x,
      y: t * 100,
      size: 5 + rnd() * 6,
      rot: (rnd() * 2 - 1) * 55,
      op,
      red: rnd() < 0.08,
    });
  }
  return out;
}

const FALLING_GLYPHS = buildGlyphs();

export default function Onboarding() {
  const router = useRouter();
  const updateSettings = useReadingStore((s) => s.updateSettings);

  const [step, setStep] = useState(0);
  const [translation, setTranslation] = useState<'KRV' | 'KJV'>('KRV');
  const [planId, setPlanId] = useState('year-1');
  const [order, setOrder] = useState('canonical');
  const [customStart, setCustomStart] = useState(1);
  const [customEnd, setCustomEnd] = useState(66);
  const [customDays, setCustomDays] = useState(90);
  const [bookPickerFor, setBookPickerFor] = useState<'start' | 'end' | null>(null);
  const [reminderOn, setReminderOn] = useState(true);
  const [reminderDays, setReminderDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [reminderTime, setReminderTime] = useState('21:00');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const finish = async () => {
    await updateSettings({
      onboardingDone: true,
      translation,
      planId,
      order,
      reminderOn,
      reminderTime,
      reminderDays,
      customStartOrder: customStart,
      customEndOrder: customEnd,
      customDays,
    });
    router.replace('/');
  };

  const toggleDay = (d: number) =>
    setReminderDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const Dots = ({ active }: { active: number }) => (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotOn]} />
      ))}
    </View>
  );

  // ── Step 0: Start ──
  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.startTop}>
          <Text style={styles.brand}>THE BIBLE READING TRACKER</Text>
          <Text style={styles.verse}>In the beginning</Text>
        </View>
        <View style={styles.artBox}>
          {FALLING_GLYPHS.map((g, i) => (
            <Text
              key={i}
              style={{
                position: 'absolute',
                left: `${g.x}%`,
                top: `${g.y}%`,
                fontSize: g.size,
                opacity: g.op,
                color: g.red ? '#B91C1C' : '#1A1A1A',
                fontFamily: SERIF,
                fontStyle: 'italic',
                transform: [{ rotate: `${g.rot}deg` }],
              }}
            >
              {g.ch}
            </Text>
          ))}
        </View>
        <View style={styles.footer}>
          <Pressable style={styles.primary} onPress={() => setStep(1)}>
            <Text style={styles.primaryText}>시작하기</Text>
          </Pressable>
          <Pressable onPress={finish}>
            <Text style={styles.ghost}>이미 계정이 있어요</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 1: Translation ──
  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.body}>
          <Dots active={0} />
          <Text style={styles.kicker}>THE BIBLE READING TRACKER</Text>
          <Text style={styles.h1}>시작하기 전에</Text>
          <Text style={styles.sub}>통독할 번역본을 선택하세요.</Text>

          <Pressable
            style={[styles.option, translation === 'KRV' && styles.optionOn]}
            onPress={() => setTranslation('KRV')}
          >
            <View style={styles.optText}>
              <Text style={styles.optTitle}>개역한글</Text>
              <Text style={styles.optSub}>Korean Revised Version · 준비됨</Text>
            </View>
            <View style={translation === 'KRV' ? styles.radioOn : styles.radioOff} />
          </Pressable>
          <Pressable
            style={[styles.option, translation === 'KJV' && styles.optionOn]}
            onPress={() => setTranslation('KJV')}
          >
            <View style={styles.optText}>
              <Text style={styles.optTitle}>KJV</Text>
              <Text style={styles.optSub}>King James Version · 준비됨</Text>
            </View>
            <View style={translation === 'KJV' ? styles.radioOn : styles.radioOff} />
          </Pressable>

          {translation === 'KJV' ? (
            <>
              <Text style={styles.quote}>“Thy word is a lamp unto my feet, and a light unto my path.”</Text>
              <Text style={styles.quoteRef}>PSALM 119:105 · KJV</Text>
            </>
          ) : (
            <>
              <Text style={styles.quote}>“주의 말씀은 내 발에 등이요 내 길에 빛이니이다”</Text>
              <Text style={styles.quoteRef}>시편 119:105 · 개역한글</Text>
            </>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Pressable style={styles.primary} onPress={() => setStep(2)}>
            <Text style={styles.primaryText}>계속</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 2: Plan ──
  if (step === 2) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.body}>
          <Dots active={1} />
          <Text style={styles.h1}>통독 계획 선택</Text>
          <Text style={styles.sub}>어떻게 읽어 나갈까요?</Text>

          {PLANS.map((p) => {
            const on = planId === p.id;
            return (
              <Pressable key={p.id} style={[styles.option, on && styles.optionOn]} onPress={() => setPlanId(p.id)}>
                <View style={styles.optText}>
                  <Text style={styles.optTitle}>{p.name}</Text>
                  <Text style={styles.optSub}>{p.detail}</Text>
                </View>
                <View style={on ? styles.radioOn : styles.radioOff} />
              </Pressable>
            );
          })}

          {planId === 'custom' ? (
            <View style={styles.customBox}>
              <Text style={styles.kicker2}>읽을 범위</Text>
              <View style={styles.rangeRow}>
                <Pressable style={styles.rangeBtn} onPress={() => setBookPickerFor('start')}>
                  <Text style={styles.rangeLabel}>시작</Text>
                  <Text style={styles.rangeValue}>{BIBLE_BOOKS.find((b) => b.order === customStart)?.nameKo}</Text>
                </Pressable>
                <Text style={styles.rangeDash}>~</Text>
                <Pressable style={styles.rangeBtn} onPress={() => setBookPickerFor('end')}>
                  <Text style={styles.rangeLabel}>끝</Text>
                  <Text style={styles.rangeValue}>{BIBLE_BOOKS.find((b) => b.order === customEnd)?.nameKo}</Text>
                </Pressable>
              </View>

              <Text style={styles.kicker2}>기간</Text>
              <View style={styles.chips}>
                {CUSTOM_DAYS.map((d) => {
                  const on = customDays === d;
                  return (
                    <Pressable key={d} style={[styles.chip, on && styles.chipOn]} onPress={() => setCustomDays(d)}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{d}일</Text>
                    </Pressable>
                  );
                })}
              </View>
              {customEnd < customStart && (
                <Text style={styles.warn}>끝 책이 시작 책보다 앞이에요. 다시 선택해 주세요.</Text>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.kicker2}>읽기 순서</Text>
              <View style={styles.chips}>
                {ORDERS.map((o) => {
                  const on = order === o.id;
                  return (
                    <Pressable key={o.id} style={[styles.chip, on && styles.chipOn]} onPress={() => setOrder(o.id)}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.orderDesc}>{ORDER_DESC[order]}</Text>
            </>
          )}
        </ScrollView>

        <Modal visible={bookPickerFor !== null} animationType="slide" onRequestClose={() => setBookPickerFor(null)}>
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.pickerHead}>
              <Text style={styles.pickerTitle}>{bookPickerFor === 'start' ? '시작 책' : '끝 책'}</Text>
              <Pressable onPress={() => setBookPickerFor(null)} hitSlop={10}>
                <Text style={styles.pickerClose}>닫기</Text>
              </Pressable>
            </View>
            <ScrollView>
              {BIBLE_BOOKS.map((b) => (
                <Pressable
                  key={b.order}
                  style={styles.bookRow}
                  onPress={() => {
                    if (bookPickerFor === 'start') setCustomStart(b.order);
                    else setCustomEnd(b.order);
                    setBookPickerFor(null);
                  }}
                >
                  <Text style={styles.bookRowName}>{b.nameKo}</Text>
                  <Text style={styles.bookRowMeta}>{b.chapterCount}장</Text>
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
        <View style={styles.footer}>
          <Pressable
            style={[styles.primary, planId === 'custom' && customEnd < customStart && styles.primaryDisabled]}
            disabled={planId === 'custom' && customEnd < customStart}
            onPress={() => setStep(3)}
          >
            <Text style={styles.primaryText}>계속</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 3: Reminder ──
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Dots active={2} />
        <Text style={styles.h1}>꾸준히 이어가기</Text>
        <Text style={styles.sub}>매일 작은 알림이 연속 기록을 지켜줘요.</Text>

        <View style={styles.option}>
          <Text style={styles.optTitle}>매일 알림</Text>
          <Switch value={reminderOn} onValueChange={setReminderOn} trackColor={{ true: '#111' }} />
        </View>
        <Pressable
          style={[styles.option, !reminderOn && styles.optionDisabled]}
          disabled={!reminderOn}
          onPress={() => setShowTimePicker(true)}
        >
          <View style={styles.optText}>
            <Text style={[styles.optSub, !reminderOn && styles.disabled]}>알림 시간</Text>
            <Text style={[styles.optTitle, !reminderOn && styles.disabled]}>{formatKoTime(reminderTime)}</Text>
          </View>
          <Text style={styles.editHint}>변경</Text>
        </Pressable>
        {showTimePicker && (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={hhmmToDate(reminderTime)}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="light"
              textColor="#222222"
              onChange={(_e, d) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (d) setReminderTime(dateToHhmm(d));
              }}
            />
          </View>
        )}

        <Text style={styles.kicker2}>반복</Text>
        <View style={styles.daysRow}>
          {DAYS.map((d, i) => {
            const on = reminderDays.includes(i);
            return (
              <Pressable
                key={i}
                style={[styles.dayCircle, on && styles.dayCircleOn]}
                onPress={() => toggleDay(i)}
                disabled={!reminderOn}
              >
                <Text style={[styles.dayText, on && styles.dayTextOn]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable style={styles.primary} onPress={finish}>
          <Text style={styles.primaryText}>읽기 시작</Text>
        </Pressable>
        <Pressable onPress={finish}>
          <Text style={styles.ghost}>나중에 설정</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  body: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8, gap: 12, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 18 },
  dot: { width: 18, height: 4, borderRadius: 2, backgroundColor: '#DAD7D0' },
  dotOn: { backgroundColor: '#111', width: 26 },
  kicker: { fontSize: 11, letterSpacing: 1.5, color: '#9A968E', marginBottom: 8 },
  kicker2: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#8A8780', textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
  h1: { fontSize: 32, fontWeight: '700', color: '#111', lineHeight: 38 },
  sub: { fontSize: 14, color: '#8A8780', marginTop: 8, marginBottom: 20 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#EFEDE7', padding: 16, marginBottom: 10 },
  optionOn: { borderColor: '#111' },
  optionDisabled: { opacity: 0.5 },
  optText: { flex: 1 },
  optTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  optSub: { fontSize: 13, color: '#8A8780', marginTop: 2 },
  disabled: { color: '#B8B5AE' },
  editHint: { fontSize: 13, color: '#B91C1C', fontWeight: '600' },
  pickerWrap: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EFEDE7', marginBottom: 10 },
  radioOn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#111' },
  radioOff: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#CBC9C4' },
  quote: { fontSize: 16, fontStyle: 'italic', color: '#444', marginTop: 28, lineHeight: 24 },
  quoteRef: { fontSize: 11, letterSpacing: 1, color: '#9A968E', marginTop: 8 },
  customBox: { marginTop: 8 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rangeBtn: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E3DE', padding: 14 },
  rangeLabel: { fontSize: 12, color: '#8A8780' },
  rangeValue: { fontSize: 16, fontWeight: '600', color: '#111', marginTop: 2 },
  rangeDash: { fontSize: 18, color: '#8A8780' },
  warn: { fontSize: 12, color: '#B91C1C', marginTop: 10 },
  orderDesc: { fontSize: 13, color: '#8A8780', marginTop: 10, lineHeight: 19 },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ECEAE4' },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  pickerClose: { fontSize: 15, color: '#B91C1C', fontWeight: '600' },
  bookRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F2F0EB' },
  bookRowName: { fontSize: 16, color: '#222' },
  bookRowMeta: { fontSize: 13, color: '#A8A59E' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#EEECE6', alignItems: 'center' },
  chipOn: { backgroundColor: '#111' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#8A8780' },
  chipTextOn: { color: '#FFF' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCircle: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: '#D8D5CE', alignItems: 'center', justifyContent: 'center' },
  dayCircleOn: { backgroundColor: '#111', borderColor: '#111' },
  dayText: { fontSize: 13, color: '#8A8780' },
  dayTextOn: { color: '#FFF', fontWeight: '600' },
  brand: { fontSize: 12, letterSpacing: 2, color: '#9A968E' },
  verse: { fontSize: 22, fontStyle: 'italic', fontFamily: SERIF, color: '#222', marginTop: 16 },
  startTop: { alignItems: 'center', paddingTop: 40 },
  artBox: { flex: 1, alignSelf: 'stretch', marginHorizontal: 40, marginTop: 28, marginBottom: 36, position: 'relative' },
  primary: { backgroundColor: '#B91C1C', borderRadius: 28, paddingVertical: 16, alignItems: 'center', alignSelf: 'stretch' },
  primaryDisabled: { opacity: 0.4 },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  ghost: { color: '#8A8780', fontSize: 14, marginTop: 4 },
});

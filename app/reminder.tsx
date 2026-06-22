import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dateToHhmm, formatKoTime, hhmmToDate } from '../lib/settings';
import { useReadingStore } from '../lib/store/readingStore';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

export default function ReminderScreen() {
  const router = useRouter();
  const settings = useReadingStore((s) => s.settings);
  const updateSettings = useReadingStore((s) => s.updateSettings);

  const [on, setOn] = useState(settings.reminderOn);
  const [time, setTime] = useState(settings.reminderTime);
  const [days, setDays] = useState<number[]>(settings.reminderDays);
  const [show, setShow] = useState(false);

  const save = (patch: Partial<typeof settings>) => updateSettings(patch);

  const toggleOn = (v: boolean) => {
    setOn(v);
    save({ reminderOn: v });
  };
  const toggleDay = (d: number) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    setDays(next);
    save({ reminderDays: next });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#222" />
        </Pressable>
        <Text style={styles.title}>알림</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.option}>
          <Text style={styles.optTitle}>매일 읽기 알림</Text>
          <Switch value={on} onValueChange={toggleOn} trackColor={{ true: '#111' }} />
        </View>

        <Pressable
          style={[styles.option, !on && styles.disabled]}
          disabled={!on}
          onPress={() => setShow(true)}
        >
          <View>
            <Text style={styles.optSub}>알림 시간</Text>
            <Text style={styles.optTitle}>{formatKoTime(time)}</Text>
          </View>
          <Text style={styles.edit}>변경</Text>
        </Pressable>
        {show && (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={hhmmToDate(time)}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="light"
              textColor="#222222"
              onChange={(_e, d) => {
                setShow(Platform.OS === 'ios');
                if (d) {
                  const v = dateToHhmm(d);
                  setTime(v);
                  save({ reminderTime: v });
                }
              }}
            />
          </View>
        )}

        <Text style={styles.kicker}>반복</Text>
        <View style={styles.daysRow}>
          {DAYS.map((d, i) => {
            const active = days.includes(i);
            return (
              <Pressable
                key={i}
                style={[styles.day, active && styles.dayOn]}
                onPress={() => toggleDay(i)}
                disabled={!on}
              >
                <Text style={[styles.dayText, active && styles.dayTextOn]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.note}>실제 푸시 알림 발송은 다음 업데이트에서 연결됩니다. 지금은 시간·요일 설정만 저장돼요.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  content: { padding: 20, paddingBottom: 40 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#EFEDE7', padding: 16, marginBottom: 10 },
  disabled: { opacity: 0.5 },
  optTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  optSub: { fontSize: 13, color: '#8A8780', marginBottom: 2 },
  edit: { fontSize: 13, color: '#B91C1C', fontWeight: '600' },
  pickerWrap: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EFEDE7', marginBottom: 10 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#8A8780', textTransform: 'uppercase', marginTop: 18, marginBottom: 10 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#D8D5CE', alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: '#111', borderColor: '#111' },
  dayText: { fontSize: 13, color: '#8A8780' },
  dayTextOn: { color: '#FFF', fontWeight: '600' },
  note: { fontSize: 12, color: '#A8A59E', marginTop: 20, lineHeight: 18 },
});

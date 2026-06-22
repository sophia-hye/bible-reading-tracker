import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useT } from '../../lib/i18n';

function Dot({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: 9,
        height: 9,
        borderRadius: 5,
        borderWidth: 1.5,
        backgroundColor: focused ? '#111' : 'transparent',
        borderColor: focused ? '#111' : '#C4C0B8',
      }}
    />
  );
}

export default function TabsLayout() {
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#111',
        tabBarInactiveTintColor: '#9A968E',
        tabBarLabelStyle: { fontSize: 11, marginTop: 2 },
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#ECEAE4' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tab.home'), tabBarIcon: ({ focused }) => <Dot focused={focused} /> }}
      />
      <Tabs.Screen
        name="tracker"
        options={{ title: t('tab.tracker'), tabBarIcon: ({ focused }) => <Dot focused={focused} /> }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: t('tab.community'), tabBarIcon: ({ focused }) => <Dot focused={focused} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: t('tab.more'), tabBarIcon: ({ focused }) => <Dot focused={focused} /> }}
      />
    </Tabs>
  );
}

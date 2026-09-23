import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ChartScreen } from '../screens/ChartScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { ScriptsScreen } from '../screens/ScriptsScreen';
import { colors } from '../theme';

export type RootTabParamList = {
  Chart: undefined;
  Scripts: undefined;
  Alerts: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg.primary,
    card: colors.bg.primary,
    text: colors.text.primary,
    border: colors.border.subtle,
    primary: colors.accent.blue,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bg.primary,
            borderTopColor: colors.border.subtle,
            height: 58,
            paddingBottom: 6,
            paddingTop: 4,
          },
          tabBarActiveTintColor: colors.accent.blue,
          tabBarInactiveTintColor: colors.text.muted,
          tabBarIcon: ({ color, size }) => {
            const name: keyof typeof Ionicons.glyphMap =
              route.name === 'Chart'
                ? 'stats-chart'
                : route.name === 'Scripts'
                  ? 'code-slash-outline'
                  : route.name === 'Alerts'
                    ? 'notifications-outline'
                    : 'ellipse';
            return <Ionicons name={name} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Chart" component={ChartScreen} />
        <Tab.Screen name="Scripts" component={ScriptsScreen} />
        <Tab.Screen name="Alerts" component={AlertsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;

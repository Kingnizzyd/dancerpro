import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import ErrorBoundary from './components/ErrorBoundary';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import PasswordReset from './screens/PasswordReset';
import Dashboard from './screens/Dashboard';
import { AuthProvider } from './context/AuthContext';
import MessagingStack from './navigation/MessagingStack';
import Clients from './screens/Clients';
import Money from './screens/Money';
import Outfits from './screens/Outfits';
import Venues from './screens/Venues';
import Shifts from './screens/Shifts';
import AIInsights from './screens/AIInsights';
import AnalyticsScreen from './screens/AnalyticsScreen';
import SecuritySettings from './screens/SecuritySettings';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from './constants/Colors';
import { openDb, initDb } from './lib/db';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const map = {
            Dashboard: 'home-outline',
            Messages: 'chatbubble-outline',
            Clients: 'people-outline',
            Money: 'cash-outline',
            Outfits: 'shirt-outline',
            Venues: 'business-outline',
            Shifts: 'time-outline',
            AI: 'sparkles-outline',
            Analytics: 'stats-chart-outline',
            Security: 'shield-checkmark-outline',
          };
          const iconName = map[route.name] || 'ellipse-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Messages" component={MessagingStack} />
      <Tab.Screen name="Clients" component={Clients} />
      <Tab.Screen name="Money" component={Money} />
      <Tab.Screen name="Outfits" component={Outfits} />
      <Tab.Screen name="Venues" component={Venues} />
      <Tab.Screen name="Shifts" component={Shifts} />
      <Tab.Screen name="AI" component={AIInsights} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Security" component={SecuritySettings} />
    </Tab.Navigator>
  );
}

export default function App() {
  // Initialize native SQLite DB on app startup (no seeding)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        const db = openDb();
        // initDb is idempotent; safe to call multiple times
        initDb(db).catch(() => {});
      } catch {}
    }
  }, []);
  return (
    <AuthProvider>
      <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator
        initialRouteName="LoginScreen"
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          cardStyle: {
            backgroundColor: Colors.background,
          },
        }}
      >
          <Stack.Screen
          name="LoginScreen"
          component={LoginScreen}
          options={{ headerShown: false }}
          />
          <Stack.Screen
          name="SignupScreen"
          component={SignupScreen}
          options={{ title: 'Create Account' }}
          />
          <Stack.Screen
            name="PasswordReset"
            component={PasswordReset}
            options={{ title: 'Reset Password' }}
          />
          <Stack.Screen
          name="Dashboard"
          component={MainTabs}
          options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      </ErrorBoundary>
    </AuthProvider>
  );
}
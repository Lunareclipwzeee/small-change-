import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View } from "react-native";

import HomeScreen from "./src/screens/HomeScreen";
import NeuroScreen from "./src/screens/NeuroScreen";
import JournalScreen from "./src/screens/JournalScreen";
import InsightsScreen from "./src/screens/InsightsScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const COLORS = {
  bg: "#04060a",
  gold: "#d4a853",
  green: "#00d97e",
  red: "#ff3355",
  yellow: "#ff9f0a",
  blue: "#3d9cff",
  text: "#8aa8c0",
  border: "#132030",
};

function TabIcon({ name, focused }) {
  const icons = {
    Home: "⚡",
    Neuro: "🧠",
    Journal: "📓",
    Insights: "📊",
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>
      {icons[name]}
    </Text>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#080c12",
            borderTopColor: "#132030",
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 8,
            height: 64,
          },
          tabBarActiveTintColor: COLORS.gold,
          tabBarInactiveTintColor: COLORS.text,
          tabBarLabelStyle: {
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: 1,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} /> }}
        />
        <Tab.Screen
          name="Neuro"
          component={NeuroScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon name="Neuro" focused={focused} /> }}
        />
        <Tab.Screen
          name="Journal"
          component={JournalScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon name="Journal" focused={focused} /> }}
        />
        <Tab.Screen
          name="Insights"
          component={InsightsScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon name="Insights" focused={focused} /> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

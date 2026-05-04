import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { HomeScreen } from '@/screens/HomeScreen';
import { JutsuSimulationScreen } from '@/screens/JutsuSimulationScreen';
import { LanguageSelectionScreen } from '@/screens/LanguageSelectionScreen';
import { useLanguageContext } from '@/context/LanguageContext';
import { COLORS } from '@/theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { language, isLoaded } = useLanguageContext();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.text.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={language ? 'Home' : 'LanguageSelection'}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#08080F' },
        }}
      >
        <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="JutsuSimulation"
          component={JutsuSimulationScreen}
          options={{ animation: 'fade_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

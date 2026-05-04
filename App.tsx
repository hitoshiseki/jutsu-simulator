import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Knewave_400Regular } from '@expo-google-fonts/knewave';
import { SoundProvider } from './src/context/SoundContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App () {
  const [fontsLoaded] = useFonts({ Knewave_400Regular });
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <LanguageProvider>
          <SoundProvider>
            <AppNavigator />
          </SoundProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

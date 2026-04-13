import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import AuthScreen from './screens/AuthScreen';
import OddOneOutScreen from './screens/OddOneOutScreen';

export type RootStackParamList = {
  Home: undefined;
  Game: undefined;
  Auth: undefined;
  OddOneOut: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = useFonts({
    KarnakPro: require('./assets/fonts/KarnakPro-CondensedBlack.ttf'),
    NeueHelvetica: require('./assets/fonts/NeueHelveticaBQ-Bold.otf'),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="OddOneOut" component={OddOneOutScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

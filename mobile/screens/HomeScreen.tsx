import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>Wordbook</Text>
      <Text style={styles.subtitle}>PICK A GAME</Text>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Game')}>
        <Text style={styles.cardTitle}>Word Associations</Text>
        <Text style={styles.cardDesc}>Guess words associated with a given word before you run out of lives.</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 42,
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    letterSpacing: 4,
    color: '#9ca3af',
    marginBottom: 48,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
  },
});

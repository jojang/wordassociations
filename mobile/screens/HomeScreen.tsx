import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarChart2 } from 'lucide-react-native';
import { RootStackParamList } from '../App';
import { supabase } from '../lib/supabase';
import { getOddOneOutStats } from '../lib/api';
import type { OddOneOutStats } from '../lib/api';
import type { User } from '@supabase/supabase-js';

type GameStats = { highScore: number; totalGames: number; avgScore: number };

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [showWAStats, setShowWAStats] = useState(false);
  const [ooStats, setOoStats] = useState<OddOneOutStats | null>(null);
  const [showOOStats, setShowOOStats] = useState(false);

  const fetchUsername = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
    setUsername(data?.display_name ?? null);
  };

  const fetchStats = async (userId: string) => {
    const { data } = await supabase
      .from('user_stats')
      .select('total_games, high_score, avg_score')
      .eq('user_id', userId)
      .eq('game', 'word-associations')
      .single();
    if (data) setGameStats({ highScore: data.high_score, totalGames: data.total_games, avgScore: data.avg_score });
  };

  const fetchOOStats = async (userId: string) => {
    const s = await getOddOneOutStats(userId);
    if (s) setOoStats(s);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        fetchUsername(data.user.id);
        fetchStats(data.user.id);
        fetchOOStats(data.user.id);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUsername(session.user.id);
        fetchStats(session.user.id);
        fetchOOStats(session.user.id);
      } else {
        setUsername(null);
        setGameStats(null);
        setOoStats(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const maxDist = ooStats ? Math.max(...ooStats.distribution, 1) : 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Dismiss dropdown on outside tap */}
      {showDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>Wordbook</Text>
        {user ? (
          <View style={styles.userContainer}>
            <TouchableOpacity onPress={() => setShowDropdown((v) => !v)}>
              <Text style={styles.headerAction}>{username ?? user.email} ▾</Text>
            </TouchableOpacity>
            {showDropdown && (
              <View style={styles.dropdown}>
                <TouchableOpacity
                  onPress={() => { setShowDropdown(false); supabase.auth.signOut(); }}
                  style={styles.dropdownItem}
                >
                  <Text style={styles.dropdownText}>SIGN OUT</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
            <Text style={styles.headerAction}>SIGN IN</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.center}>
        <Text style={styles.title}>Wordbook</Text>
        <Text style={styles.subtitle}>PICK A GAME</Text>

        {/* Word Associations card */}
        <TouchableOpacity style={[styles.card, { marginBottom: 12 }]} onPress={() => navigation.navigate('Game')} activeOpacity={0.8}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Word Associations</Text>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowWAStats((v) => !v); }}
              hitSlop={24}
              activeOpacity={1}
            >
              <BarChart2 size={17} color={showWAStats ? '#000' : '#9ca3af'} />
            </TouchableOpacity>
          </View>
          {showWAStats && (
            <View style={styles.statsPopover}>
              {user && gameStats ? (
                <>
                  <View style={styles.statsHeader}>
                    <Text style={styles.statsTitle}>YOUR STATS</Text>
                    <Text style={styles.statsLabel}>{gameStats.totalGames} {gameStats.totalGames === 1 ? 'play' : 'plays'}</Text>
                  </View>
                  <View style={styles.statsDivider} />
                  <View style={styles.statsRow}><Text style={styles.statsLabel}>Best</Text><Text style={styles.statsValue}>{gameStats.highScore}</Text></View>
                  <View style={styles.statsRow}><Text style={styles.statsLabel}>Avg</Text><Text style={styles.statsValue}>{gameStats.avgScore}</Text></View>
                </>
              ) : user ? (
                <Text style={styles.statsLabel}>No game data</Text>
              ) : (
                <Text style={styles.statsLabel}>Sign in to view your stats</Text>
              )}
            </View>
          )}
          <Text style={styles.cardDesc}>Guess words associated with a given word before you run out of lives.</Text>
        </TouchableOpacity>

        {/* Odd One Out card */}
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('OddOneOut')} activeOpacity={0.8}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Odd One Out</Text>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowOOStats((v) => !v); }}
              hitSlop={24}
              activeOpacity={1}
            >
              <BarChart2 size={17} color={showOOStats ? '#000' : '#9ca3af'} />
            </TouchableOpacity>
          </View>
          {showOOStats && (
            <View style={styles.statsPopover}>
              {user && ooStats ? (
                <>
                  <View style={styles.statsHeader}>
                    <Text style={styles.statsTitle}>YOUR STATS</Text>
                    <Text style={styles.statsLabel}>{ooStats.total_games} {ooStats.total_games === 1 ? 'play' : 'plays'}</Text>
                  </View>
                  <View style={styles.statsDivider} />
                  {ooStats.distribution.map((count, i) => (
                    <View key={i} style={styles.distRow}>
                      <Text style={styles.distNum}>{i}</Text>
                      <View style={styles.distBarBg}>
                        <View
                          style={[
                            styles.distBarFill,
                            {
                              width: `${(count / maxDist) * 100}%` as any,
                              backgroundColor: '#111',
                              minWidth: count > 0 ? 20 : 0,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.distCount}>{count}</Text>
                    </View>
                  ))}
                </>
              ) : user ? (
                <Text style={styles.statsLabel}>No game data</Text>
              ) : (
                <Text style={styles.statsLabel}>Sign in to view your stats</Text>
              )}
            </View>
          )}
          <Text style={styles.cardDesc}>Find the word that doesn't belong. Five daily puzzles, increasing in difficulty.</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    zIndex: 10,
  },
  headerLogo: { fontSize: 18, letterSpacing: 1, color: '#111', fontFamily: 'KarnakPro' },
  headerAction: { fontSize: 11, letterSpacing: 2, color: '#9ca3af', fontFamily: 'NeueHelvetica' },
  userContainer: { position: 'relative' },
  dropdown: {
    position: 'absolute',
    top: 28,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    zIndex: 20,
    minWidth: 120,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownText: { fontSize: 11, letterSpacing: 3, color: '#111', fontFamily: 'NeueHelvetica' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 42, letterSpacing: 2, marginBottom: 4, color: '#111', fontFamily: 'KarnakPro' },
  subtitle: { fontSize: 11, letterSpacing: 4, color: '#9ca3af', marginBottom: 48, fontFamily: 'NeueHelvetica' },
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 16,
    padding: 20,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 16, letterSpacing: 0.5, color: '#111', fontFamily: 'KarnakPro' },
  cardDesc: { fontSize: 12, color: '#9ca3af', lineHeight: 18, fontFamily: 'NeueHelvetica' },
  statsPopover: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 10,
    paddingTop: 10,
    marginBottom: 8,
  },
  statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statsTitle: { fontSize: 9, letterSpacing: 3, color: '#9ca3af', fontFamily: 'NeueHelvetica' },
  statsDivider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  statsLabel: { fontSize: 11, color: '#9ca3af', fontFamily: 'NeueHelvetica' },
  statsValue: { fontSize: 11, color: '#111', fontFamily: 'NeueHelvetica' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  distNum: { fontSize: 11, color: '#9ca3af', width: 12, textAlign: 'right', fontFamily: 'NeueHelvetica' },
  distBarBg: { flex: 1, height: 12, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  distBarFill: { height: '100%', borderRadius: 3 },
  distCount: { fontSize: 11, color: '#9ca3af', width: 16, fontFamily: 'NeueHelvetica' },
});

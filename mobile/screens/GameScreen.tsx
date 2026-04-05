import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { generateWord, scoreGuess } from '../lib/api';
import { BarChart2, HelpCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

type GameStats = { highScore: number; totalGames: number; avgScore: number };

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game'>;
};

const TIMER_DURATION = 15;
const STRIKES_MAX = 3;

export default function GameScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingWord, setFetchingWord] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(STRIKES_MAX);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [finalScore, setFinalScore] = useState(0);
  const [showEnd, setShowEnd] = useState(false);
  const [glowColor, setGlowColor] = useState<'none' | 'red' | 'green'>('none');
  const [user, setUser] = useState<User | null>(null);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [showStats, setShowStats] = useState(false);

  const [showHelp, setShowHelp] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);

  const failedWordsRef = useRef<{ word: string; wrong_guesses: string[] }[]>([]);
  const currentWrongGuessesRef = useRef<string[]>([]);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const fetchStats = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_stats')
      .select('total_games, high_score, avg_score')
      .eq('user_id', userId)
      .eq('game', 'word-associations')
      .single();
    if (data) setGameStats({ highScore: data.high_score, totalGames: data.total_games, avgScore: data.avg_score });
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) fetchStats(data.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchStats(session.user.id);
      else setGameStats(null);
    });
    return () => subscription.unsubscribe();
  }, [fetchStats]);

  const saveStats = useCallback(async (final: number) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('user_stats')
      .select('total_games, high_score, avg_score')
      .eq('user_id', user.id)
      .eq('game', 'word-associations')
      .single();
    const totalGames = (existing?.total_games ?? 0) + 1;
    const highScore = Math.max(existing?.high_score ?? 0, final);
    const avgScore = Math.round(((existing?.avg_score ?? 0) * (existing?.total_games ?? 0) + final) / totalGames);
    await supabase.from('user_stats').upsert({
      user_id: user.id,
      game: 'word-associations',
      total_games: totalGames,
      high_score: highScore,
      avg_score: avgScore,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,game' });
    setGameStats({ highScore, totalGames, avgScore });
  }, [user]);

  const fetchNextWord = useCallback(async () => {
    setFetchingWord(true);
    setLoading(true);
    try {
      const word = await generateWord();
      setCurrentWord(word);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingWord(false);
      setLoading(false);
    }
  }, []);

  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const flashGlow = useCallback((color: 'red' | 'green') => {
    setGlowColor(color);
    glowAnim.setValue(1);
    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => setGlowColor('none'));
  }, [glowAnim]);

  const endGame = useCallback(async (final: number) => {
    setFinalScore(final);
    setScore(0);
    setStrikes(STRIKES_MAX);
    setTimeLeft(TIMER_DURATION);
    setShowEnd(true);
    failedWordsRef.current = [];
    currentWrongGuessesRef.current = [];
    fetchNextWord();
    await saveStats(final);
  }, [fetchNextWord, saveStats]);

  useEffect(() => {
    if (started) fetchNextWord();
  }, [started, fetchNextWord]);

  useEffect(() => {
    if (!started || showEnd || loading) return;
    if (timeLeft === 0) {
      if (currentWrongGuessesRef.current.length > 0) {
        failedWordsRef.current.push({ word: currentWord, wrong_guesses: [...currentWrongGuessesRef.current] });
        currentWrongGuessesRef.current = [];
      }
      endGame(score);
      return;
    }
    const tick = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(tick);
  }, [timeLeft, started, showEnd, loading, score, currentWord, endGame]);

  useEffect(() => {
    if (!started || strikes > 0) return;
    endGame(score);
  }, [strikes, started, score, endGame]);

  const handleSubmit = async () => {
    setShowStats(false);
    inputRef.current?.focus();
    if (loading || !currentWord) return;
    const trimmed = guess.trim().toLowerCase();
    const word = currentWord.toLowerCase();

    if (!trimmed || trimmed.length < 3 || word.includes(trimmed) || trimmed.includes(word)) {
      triggerShake();
      setGuess('');
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    setLoading(true);
    try {
      const result = await scoreGuess(currentWord, trimmed);
      if (result.correct) {
        flashGlow('green');
        setScore((s) => s + result.score);
        setGuess('');
        setStrikes(STRIKES_MAX);
        setTimeLeft(TIMER_DURATION);
        currentWrongGuessesRef.current = [];
        await fetchNextWord();
      } else {
        flashGlow('red');
        currentWrongGuessesRef.current.push(trimmed);
        const newStrikes = strikes - 1;
        setStrikes(newStrikes);
        setGuess('');
        if (newStrikes === 0) {
          failedWordsRef.current.push({ word: currentWord, wrong_guesses: [...currentWrongGuessesRef.current] });
          currentWrongGuessesRef.current = [];
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const glowStyle = glowColor === 'none' ? {} : {
    shadowColor: glowColor === 'green' ? '#22c55e' : '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowAnim,
    shadowRadius: 20,
  };

  const timerColor = timeLeft <= 5 && !loading ? '#ef4444' : '#6b7280';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { setShowStats(false); if (started && !showEnd) { setShowLeaveWarning(true); } else { navigation.goBack(); } }}>
          <Text style={styles.backText}>← HOME</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Word Associations</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowStats((v) => !v)} hitSlop={12}>
            <BarChart2 size={18} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowHelp(true)} hitSlop={12}>
            <HelpCircle size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats popover — full screen transparent overlay + popover */}
      <Modal visible={showStats} transparent animationType="none" onRequestClose={() => setShowStats(false)}>
        <TouchableOpacity style={[styles.statsOverlay, { paddingTop: insets.top + 50 }]} activeOpacity={1} onPress={() => setShowStats(false)}>
          <View style={styles.statsPopover}>
            <View style={styles.statsPopoverCaret} />
            {user && gameStats ? (
              <>
                <Text style={styles.statsTitle}>YOUR STATS</Text>
                <View style={styles.statsRow}><Text style={styles.statsLabel}>Best</Text><Text style={styles.statsValue}>{gameStats.highScore}</Text></View>
                <View style={styles.statsRow}><Text style={styles.statsLabel}>Games</Text><Text style={styles.statsValue}>{gameStats.totalGames}</Text></View>
                <View style={styles.statsRow}><Text style={styles.statsLabel}>Avg</Text><Text style={styles.statsValue}>{gameStats.avgScore}</Text></View>
              </>
            ) : user ? (
              <Text style={styles.statsLabel}>No game data</Text>
            ) : (
              <Text style={styles.statsLabel}>Sign in to view your stats</Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {!started ? (
        <TouchableOpacity style={styles.center} activeOpacity={1} onPress={() => setShowStats(false)}>
          <Text style={styles.startTitle}>Word Associations</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { setShowStats(false); setStarted(true); }}>
            <Text style={styles.primaryBtnText}>START</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.gameArea}>
          {/* Stats pill */}
          <View style={styles.statsPill}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>TIME</Text>
              <Text style={[styles.statValue, { color: timerColor }]}>{loading ? '—' : timeLeft}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>LIVES</Text>
              <View style={styles.heartsRow}>
                {[1, 2, 3].map((i) => (
                  <Text key={i} style={{ color: i <= strikes ? '#ef4444' : '#d1d5db', fontSize: 14 }}>♥</Text>
                ))}
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>SCORE</Text>
              <Text style={styles.statValue}>{score}</Text>
            </View>
          </View>

          {/* Current word */}
          <View style={styles.wordContainer}>
            {fetchingWord
              ? <ActivityIndicator color="#9ca3af" />
              : <Text style={styles.currentWord}>{currentWord}</Text>
            }
          </View>

          {/* Glow + Input */}
          <Animated.View style={[styles.inputWrapper, glowStyle, { transform: [{ translateX: shakeAnim }] }]}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={guess}
              onChangeText={setGuess}
              onSubmitEditing={handleSubmit}
              placeholder={loading ? '' : 'Enter word here...'}
              placeholderTextColor="#d1d5db"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              editable={!loading}
            />
          </Animated.View>
        </KeyboardAvoidingView>
      )}

      {/* Leave Warning Modal */}
      <Modal visible={showLeaveWarning} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowLeaveWarning(false)}>
          <TouchableOpacity style={styles.modal} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>LEAVE GAME?</Text>
            <Text style={[styles.helpText, { textAlign: 'center', marginBottom: 24 }]}>
              {user ? 'Your current score will be saved.' : 'Your progress will be lost. Sign in to save your stats.'}
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={async () => { setShowLeaveWarning(false); await saveStats(score); navigation.goBack(); }}
            >
              <Text style={styles.primaryBtnText}>LEAVE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineBtn, { marginTop: 10 }]}
              onPress={() => setShowLeaveWarning(false)}
            >
              <Text style={styles.outlineBtnText}>KEEP PLAYING</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Help Modal */}
      <Modal visible={showHelp} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowHelp(false)}>
          <TouchableOpacity style={styles.modal} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>HOW TO PLAY</Text>
            <View style={{ gap: 10, marginBottom: 24, alignSelf: 'stretch' }}>
              <Text style={styles.helpText}>Type a word associated with the given word.</Text>
              <Text style={styles.helpText}>Stronger associations score more points.</Text>
              <Text style={styles.helpText}>3 ♥ per word — a wrong guess costs one.</Text>
              <Text style={styles.helpText}>15 seconds per word — the clock resets on a correct guess, lives do too.</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowHelp(false)}>
              <Text style={styles.primaryBtnText}>BACK TO GAME</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* End Modal */}
      <Modal visible={showEnd} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { setShowEnd(false); setStarted(false); }}>
          <TouchableOpacity style={styles.modal} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>GAME OVER</Text>
            <Text style={styles.modalSubtitle}>FINAL SCORE</Text>
            <Text style={styles.modalScore}>{finalScore}</Text>
            {gameStats && (
              <Text style={styles.modalBest}>
                BEST <Text style={{ color: '#111' }}>{gameStats.highScore}</Text>
              </Text>
            )}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => { setShowEnd(false); setStarted(true); }}
            >
              <Text style={styles.primaryBtnText}>PLAY AGAIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineBtn, { marginTop: 10 }]}
              onPress={() => { setShowEnd(false); navigation.goBack(); }}
            >
              <Text style={styles.outlineBtnText}>HOME</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  },
  backText: { fontSize: 13, letterSpacing: 1, color: '#9ca3af', fontFamily: 'NeueHelvetica' },
  headerTitle: { fontSize: 16, letterSpacing: 0.5, color: '#111', fontFamily: 'KarnakPro' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statsOverlay: { flex: 1, alignItems: 'flex-end', paddingRight: 20 },
  statsPopoverCaret: {
    position: 'absolute',
    top: -6,
    right: 33,
    width: 12,
    height: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#f3f4f6',
    transform: [{ rotate: '45deg' }],
  },
  statsPopover: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    minWidth: 140,
  },
  statsTitle: { fontSize: 9, letterSpacing: 3, color: '#9ca3af', marginBottom: 8, fontFamily: 'NeueHelvetica' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  statsLabel: { fontSize: 11, color: '#9ca3af', fontFamily: 'NeueHelvetica' },
  statsValue: { fontSize: 11, color: '#111', fontFamily: 'NeueHelvetica' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 120 },
  startTitle: { fontSize: 30, letterSpacing: 1.5, marginBottom: 40, color: '#111', fontFamily: 'KarnakPro' },
  startDesc: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 40, fontFamily: 'NeueHelvetica' },
  gameArea: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 20 },
  statsPill: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'flex-end',
    marginBottom: 100,
  },
  statCell: { paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#e5e7eb' },
  statLabel: { fontSize: 9, letterSpacing: 2, color: '#9ca3af', marginBottom: 4, fontFamily: 'NeueHelvetica' },
  statValue: { fontSize: 18, letterSpacing: 0.5, color: '#111', fontFamily: 'NeueHelvetica' },
  heartsRow: { flexDirection: 'row', gap: 2 },
  wordContainer: { height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 56 },
  currentWord: { fontSize: 38, letterSpacing: 2, color: '#111', fontFamily: 'NeueHelvetica' },
  inputWrapper: { width: '100%', borderRadius: 8 },
  input: {
    width: '100%',
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 1.5,
    color: '#111',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    fontFamily: 'NeueHelvetica',
  },
  primaryBtn: {
    backgroundColor: '#000',
    paddingVertical: 13,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
    marginTop: 32,
  },
  primaryBtnText: { color: '#fff', fontSize: 12, letterSpacing: 4, fontFamily: 'NeueHelvetica' },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 13,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
  },
  outlineBtnText: { color: '#9ca3af', fontSize: 12, letterSpacing: 4, fontFamily: 'NeueHelvetica' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 22, letterSpacing: 2, marginBottom: 8, color: '#111', fontFamily: 'KarnakPro' },
  modalSubtitle: { fontSize: 10, letterSpacing: 4, color: '#9ca3af', marginBottom: 4, fontFamily: 'NeueHelvetica' },
  modalScore: { fontSize: 64, marginBottom: 4, color: '#111', fontFamily: 'KarnakPro' },
  modalBest: { fontSize: 11, letterSpacing: 3, color: '#9ca3af', marginBottom: 24, fontFamily: 'NeueHelvetica' },
  helpText: { fontSize: 13, color: '#6b7280', lineHeight: 20, letterSpacing: 0.3, fontFamily: 'NeueHelvetica' },
});

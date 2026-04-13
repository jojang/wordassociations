import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarChart2 } from 'lucide-react-native';
import { RootStackParamList } from '../App';
import { supabase } from '../lib/supabase';
import { getDailyPuzzle, getOddOneOutStats, completeOddOneOut } from '../lib/api';
import type { PuzzleSet, OddOneOutStats } from '../lib/api';
import type { User } from '@supabase/supabase-js';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OddOneOut'>;
};

export default function OddOneOutScreen({ navigation }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<PuzzleSet[]>([]);
  const [today, setToday] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [currentResult, setCurrentResult] = useState<boolean | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [stats, setStats] = useState<OddOneOutStats | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Animation refs per word slot (max 4 words per set)
  const scaleAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  const shakeAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const puzzle = await getDailyPuzzle();
        setSets(puzzle.sets);
        setToday(puzzle.date);

        const saved = await AsyncStorage.getItem('oo-progress');
        if (saved) {
          const { date, index, results: savedResults } = JSON.parse(saved);
          if (date === puzzle.date) {
            setCurrentIndex(index);
            setResults(savedResults);
          } else {
            await AsyncStorage.removeItem('oo-progress');
          }
        }

        const played = await AsyncStorage.getItem('oo-played');
        if (played) {
          const { date, score } = JSON.parse(played);
          if (date === puzzle.date) {
            setFinalScore(score);
            setGameOver(true);
            await AsyncStorage.removeItem('oo-progress');
          }
        }

        if (user) {
          const s = await getOddOneOutStats(user.id);
          if (s) {
            setStats(s);
            if (s.last_played_date === puzzle.date) {
              setFinalScore(s.last_score ?? 0);
              setGameOver(true);
              await AsyncStorage.removeItem('oo-progress');
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const currentSet = sets[currentIndex];
  const oddOneOut = currentSet?.odd_one_out?.trim().toUpperCase();
  const isCorrect = currentResult !== null ? currentResult : (picked !== null && picked.trim().toUpperCase() === oddOneOut);

  const resetAnims = () => {
    scaleAnims.forEach(a => a.setValue(1));
    shakeAnims.forEach(a => a.setValue(0));
  };

  const animatePop = (index: number) => {
    Animated.sequence([
      Animated.spring(scaleAnims[index], { toValue: 1.1, useNativeDriver: true, speed: 40, bounciness: 8 }),
      Animated.spring(scaleAnims[index], { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }),
    ]).start();
  };

  const animateShake = (index: number) => {
    Animated.sequence([
      Animated.timing(shakeAnims[index], { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnims[index], { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnims[index], { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnims[index], { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnims[index], { toValue: 3, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnims[index], { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handlePick = (word: string) => {
    if (showResult) return;
    setPicked(word);
  };

  const handleSubmit = async () => {
    if (!picked || showResult) return;
    const correct = picked.trim().toUpperCase() === oddOneOut;
    const newResults = [...results, correct];
    setCurrentResult(correct);
    setShowResult(true);

    // Animate: pop correct word, shake wrong pick
    if (currentSet) {
      currentSet.words.forEach((word, i) => {
        const wordNorm = word.trim().toUpperCase();
        const isOdd = wordNorm === oddOneOut;
        const isPicked = picked.trim().toUpperCase() === wordNorm;
        if (correct && isOdd) animatePop(i);
        else if (!correct && isPicked) animateShake(i);
      });
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < sets.length) {
      await AsyncStorage.setItem('oo-progress', JSON.stringify({ date: today, index: nextIndex, results: newResults }));
    }
  };

  const handleNext = async () => {
    const correct = currentResult ?? false;
    const newResults = [...results, correct];
    setResults(newResults);
    setCurrentResult(null);
    resetAnims();

    if (currentIndex === sets.length - 1) {
      const score = newResults.filter(Boolean).length;
      setFinalScore(score);
      setGameOver(true);
      await AsyncStorage.removeItem('oo-progress');
      await AsyncStorage.setItem('oo-played', JSON.stringify({ date: today, score }));
      if (user) {
        const updated = await completeOddOneOut(user.id, score, today);
        if (updated) setStats(updated);
      }
    } else {
      setCurrentIndex(currentIndex + 1);
      setPicked(null);
      setShowResult(false);
    }
  };

  const maxDist = stats ? Math.max(...stats.distribution, 1) : 1;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#9ca3af" />
          <Text style={styles.loadingText}>GENERATING TODAY'S PUZZLE...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* End modal */}
      <Modal visible={gameOver} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalLabel}>TODAY'S PUZZLE</Text>
            <Text style={styles.modalScore}>{finalScore} / 5</Text>

            {user && stats ? (
              <View style={{ width: '100%' }}>
                <Text style={styles.distTitle}>SCORE DISTRIBUTION</Text>
                {stats.distribution.map((count, i) => (
                  <View key={i} style={styles.distRow}>
                    <Text style={styles.distNum}>{i}</Text>
                    <View style={styles.distBarBg}>
                      <View
                        style={[
                          styles.distBarFill,
                          {
                            width: `${(count / maxDist) * 100}%` as any,
                            backgroundColor: i === finalScore ? '#111' : '#d1d5db',
                            minWidth: count > 0 ? 24 : 0,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.distCount}>{count}</Text>
                  </View>
                ))}
              </View>
            ) : !user ? (
              <Text style={styles.guestNote}>Sign in to track your score distribution.</Text>
            ) : null}

            <TouchableOpacity style={styles.homeBtn} onPress={() => { setGameOver(false); navigation.navigate('Home'); }} activeOpacity={0.8}>
              <Text style={styles.homeBtnText}>BACK TO HOME</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.homeLink}>‹ HOME</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Odd One Out</Text>
        <TouchableOpacity
          onPress={() => setShowStats(v => !v)}
          hitSlop={16}
          style={{ width: 60, alignItems: 'flex-end' }}
        >
          <BarChart2 size={17} color={showStats ? '#111' : '#9ca3af'} />
        </TouchableOpacity>
      </View>

      {/* Stats popover */}
      {showStats && (
        <View style={styles.statsPanel}>
          {user && stats ? (
            <>
              <View style={styles.statsPanelHeader}>
                <Text style={styles.statsPanelTitle}>YOUR STATS</Text>
                <Text style={styles.statsLabel}>{stats.total_games} {stats.total_games === 1 ? 'play' : 'plays'}</Text>
              </View>
              <View style={styles.statsDivider} />
              {stats.distribution.map((count, i) => (
                <View key={i} style={styles.distRow}>
                  <Text style={styles.distNum}>{i}</Text>
                  <View style={styles.distBarBg}>
                    <View
                      style={[
                        styles.distBarFill,
                        {
                          width: `${(count / maxDist) * 100}%` as any,
                          backgroundColor: '#111',
                          minWidth: count > 0 ? 24 : 0,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.distCount}>{count}</Text>
                </View>
              ))}
            </>
          ) : !user ? (
            <Text style={styles.statsLabel}>Sign in to view your stats</Text>
          ) : (
            <Text style={styles.statsLabel}>No game data yet</Text>
          )}
        </View>
      )}

      {/* Game area */}
      <View style={styles.game}>
        {/* Progress dots */}
        <View style={styles.progress}>
          {sets.map((_, i) => {
            let bg = '#e5e7eb';
            if (i < currentIndex) bg = results[i] ? '#22c55e' : '#ef4444';
            else if (i === currentIndex && showResult) bg = isCorrect ? '#22c55e' : '#ef4444';
            return <View key={i} style={[styles.dot, { backgroundColor: bg }]} />;
          })}
        </View>

        {currentSet && !gameOver && (
          <>
            {/* Word grid */}
            <View style={styles.grid}>
              {currentSet.words.map((word, i) => {
                const wordNorm = word.trim().toUpperCase();
                const isPicked = picked?.trim().toUpperCase() === wordNorm;
                const isOdd = wordNorm === oddOneOut;

                let bg = '#f9fafb';
                let borderColor = '#e5e7eb';
                let textColor = '#111';

                if (showResult) {
                  if (isOdd) { bg = '#22c55e'; borderColor = '#22c55e'; textColor = '#fff'; }
                  else if (isPicked) { bg = '#ef4444'; borderColor = '#ef4444'; textColor = '#fff'; }
                  else { bg = '#f9fafb'; borderColor = '#f3f4f6'; textColor = '#9ca3af'; }
                } else if (isPicked) {
                  bg = '#e5e7eb'; borderColor = '#9ca3af';
                }

                return (
                  <Animated.View
                    key={word}
                    style={{
                      width: '47%',
                      transform: [
                        { scale: scaleAnims[i] },
                        { translateX: shakeAnims[i] },
                      ],
                    }}
                  >
                    <TouchableOpacity
                      style={[styles.wordBtn, { backgroundColor: bg, borderColor }]}
                      onPress={() => handlePick(word)}
                      disabled={showResult}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.wordText, { color: textColor }]}>{word}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Result reveal */}
            <View style={styles.resultArea}>
              {showResult && (
                <>
                  <Text style={[styles.resultVerdict, { color: isCorrect ? '#22c55e' : '#ef4444' }]}>
                    {isCorrect ? 'CORRECT' : 'WRONG'}
                  </Text>
                  <Text style={styles.resultCategory}>{currentSet.category}</Text>
                </>
              )}
            </View>

            {/* Action button */}
            <TouchableOpacity
              style={[styles.actionBtn, (!picked && !showResult) && styles.actionBtnDisabled]}
              onPress={showResult ? handleNext : handleSubmit}
              disabled={!picked && !showResult}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>
                {showResult ? (currentIndex === sets.length - 1 ? 'FINISH' : 'NEXT') : 'SUBMIT'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 10, letterSpacing: 3, color: '#9ca3af', fontFamily: 'NeueHelvetica' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  homeLink: { fontSize: 13, letterSpacing: 0.5, color: '#9ca3af', fontFamily: 'KarnakPro', width: 60 },
  headerTitle: { fontSize: 18, letterSpacing: 1, color: '#111', fontFamily: 'KarnakPro' },
  statsPanel: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 12,
  },
  statsPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statsPanelTitle: { fontSize: 9, letterSpacing: 3, color: '#9ca3af', fontFamily: 'NeueHelvetica' },
  statsDivider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 10 },
  statsLabel: { fontSize: 11, color: '#9ca3af', fontFamily: 'NeueHelvetica' },
  game: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  progress: { flexDirection: 'row', gap: 8, marginBottom: 36 },
  dot: { width: 28, height: 5, borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%', marginBottom: 28 },
  wordBtn: {
    width: '100%', paddingVertical: 28, borderRadius: 16,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  wordText: { fontSize: 13, letterSpacing: 2, fontFamily: 'NeueHelvetica' },
  resultArea: { height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  resultVerdict: { fontSize: 10, letterSpacing: 3, fontFamily: 'NeueHelvetica', marginBottom: 4 },
  resultCategory: { fontSize: 16, letterSpacing: 0.5, color: '#111', fontFamily: 'KarnakPro' },
  actionBtn: {
    backgroundColor: '#111', paddingHorizontal: 48, paddingVertical: 14,
    borderRadius: 999,
  },
  actionBtnDisabled: { opacity: 0.3 },
  actionBtnText: { fontSize: 12, letterSpacing: 3, color: '#fff', fontFamily: 'NeueHelvetica' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 32,
    width: '85%', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24,
  },
  modalLabel: { fontSize: 10, letterSpacing: 3, color: '#9ca3af', marginBottom: 12, fontFamily: 'NeueHelvetica' },
  modalScore: { fontSize: 52, letterSpacing: 2, color: '#111', marginBottom: 24, fontFamily: 'KarnakPro' },
  distTitle: { fontSize: 9, letterSpacing: 3, color: '#9ca3af', textAlign: 'center', marginBottom: 12, fontFamily: 'NeueHelvetica' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  distNum: { fontSize: 11, color: '#9ca3af', width: 12, textAlign: 'right', fontFamily: 'NeueHelvetica' },
  distBarBg: { flex: 1, height: 14, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  distBarFill: { height: '100%', borderRadius: 4 },
  distCount: { fontSize: 11, color: '#9ca3af', width: 16, fontFamily: 'NeueHelvetica' },
  guestNote: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 16, fontFamily: 'NeueHelvetica' },
  homeBtn: {
    marginTop: 24, width: '100%', paddingVertical: 14, borderRadius: 999,
    backgroundColor: '#111', alignItems: 'center',
  },
  homeBtnText: { fontSize: 11, letterSpacing: 3, color: '#fff', fontFamily: 'NeueHelvetica' },
});

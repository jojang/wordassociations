import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { supabase } from '../lib/supabase';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Auth'>;
};

type View2 = 'login' | 'signup';

export default function AuthScreen({ navigation }: Props) {
  const [view, setView] = useState<View2>('login');
  const [loginUsername, setLoginUsername] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (view !== 'signup' || username.trim().length < 2) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('display_name', username.trim()).maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, view]);

  const switchView = (v: View2) => {
    Animated.timing(slideAnim, {
      toValue: v === 'signup' ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setView(v);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setLoginUsername('');
  };

  const handleSubmit = async () => {
    setError('');
    if (view === 'signup') {
      if (!username.trim()) { setError('Username is required'); return; }
      if (usernameStatus === 'taken') { setError('Username already taken'); return; }
      if (usernameStatus === 'checking') { setError('Still checking username'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    }
    setLoading(true);
    try {
      if (view === 'login') {
        const { data: resolvedEmail } = await supabase.rpc('get_email_by_username', { p_username: loginUsername });
        if (!resolvedEmail) throw new Error('Username not found');
        const { error: err } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, display_name: username.trim() });
        }
      }
      navigation.goBack();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const pillPosition = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '50%'] });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {/* Sliding tabs */}
          <View style={styles.tabContainer}>
            <Animated.View style={[styles.tabPill, { left: pillPosition }]} />
            <TouchableOpacity style={styles.tab} onPress={() => switchView('login')}>
              <Text style={[styles.tabText, view === 'login' && styles.tabTextActive]}>SIGN IN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab} onPress={() => switchView('signup')}>
              <Text style={[styles.tabText, view === 'signup' && styles.tabTextActive]}>SIGN UP</Text>
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            {view === 'login' ? (
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#9ca3af"
                value={loginUsername}
                onChangeText={setLoginUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            )}

            {view === 'signup' && (
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Username"
                  placeholderTextColor="#9ca3af"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {usernameStatus !== 'idle' && (
                  <Text style={[styles.statusText, {
                    color: usernameStatus === 'available' ? '#22c55e' :
                           usernameStatus === 'taken' ? '#ef4444' : '#9ca3af'
                  }]}>
                    {usernameStatus === 'checking' ? '...' : usernameStatus === 'available' ? '✓' : '✗'}
                  </Text>
                )}
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              onSubmitEditing={handleSubmit}
            />

            {view === 'signup' && (
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                onSubmitEditing={handleSubmit}
              />
            )}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, { opacity: loading ? 0.5 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>{loading ? '...' : view === 'login' ? 'SIGN IN' : 'SIGN UP'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  backBtn: { marginBottom: 32 },
  backText: { fontSize: 13, letterSpacing: 1, color: '#9ca3af' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    padding: 4,
    marginBottom: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  tabPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '50%',
    backgroundColor: '#000',
    borderRadius: 999,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', zIndex: 1 },
  tabText: { fontSize: 11, letterSpacing: 3, color: '#9ca3af' },
  tabTextActive: { color: '#fff' },
  fields: { gap: 12, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontSize: 16, width: 20, textAlign: 'center' },
  error: { color: '#ef4444', fontSize: 12, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: '#000',
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 12, letterSpacing: 4 },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { fontSize: 12, color: '#9ca3af', letterSpacing: 1 },
});

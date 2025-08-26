import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { supabase } from '../config/supabase';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [faithAffirmed, setFaithAffirmed] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isSignUp && !faithAffirmed) {
      Alert.alert('Faith Affirmation Required', 
        'Please affirm your faith to join our Christian prayer community.');
      return;
    }

    setLoading(true);

    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        Alert.alert('Authentication Error', error.message);
      } else if (isSignUp) {
        Alert.alert(
          'Success', 
          'If this email doesn\\'t already have an account, you\\'ll receive a confirmation email.'
        );
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.logo}>✝️</Text>
          <Text style={styles.title}>
            {isSignUp ? 'Join Our Community' : 'Welcome Back'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp 
              ? 'Create your account to share faith and fellowship'
              : 'Sign in to continue your spiritual journey'
            }
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
          />

          {isSignUp && (
            <View style={styles.faithContainer}>
              <Text style={styles.faithText}>
                ⭐ I affirm that I am a follower of Jesus Christ and I believe in His saving blood. 
                I agree that prayers in this app are directed to Jesus.
              </Text>
              <Button
                title={faithAffirmed ? '✓ Faith Affirmed' : 'Affirm Faith'}
                onPress={() => setFaithAffirmed(!faithAffirmed)}
                variant={faithAffirmed ? 'primary' : 'outline'}
                style={styles.faithButton}
              />
            </View>
          )}

          <Button
            title={loading ? 'Please wait...' : (isSignUp ? 'Join Community' : 'Sign In')}
            onPress={handleAuth}
            loading={loading}
            disabled={loading || (isSignUp && !faithAffirmed)}
            size="large"
            style={styles.authButton}
          />

          <Button
            title={isSignUp ? 'Already have an account? Sign In' : 'New here? Join Us'}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setFaithAffirmed(false);
              setEmail('');
              setPassword('');
            }}
            variant="outline"
            style={styles.switchButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7c3aed',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  faithContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  faithText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  faithButton: {
    marginTop: 8,
  },
  authButton: {
    marginBottom: 16,
  },
  switchButton: {
    borderColor: '#7c3aed',
  },
});
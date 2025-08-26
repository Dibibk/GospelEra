import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { API_BASE_URL } from './src/config/supabase';

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...');

  useEffect(() => {
    // Test API connection
    fetch(`${API_BASE_URL}/api/posts`)
      .then(response => response.json())
      .then(data => {
        setConnectionStatus('✅ Connected to Gospel Era backend!');
      })
      .catch(error => {
        setConnectionStatus(`❌ Connection failed: ${error.message}`);
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gospel Era Mobile</Text>
      <Text style={styles.subtitle}>Native App Foundation</Text>
      <Text style={styles.connection}>{connectionStatus}</Text>
      <Text style={styles.url}>Backend: {API_BASE_URL}</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7c3aed', // Purple theme
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  connection: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  url: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});

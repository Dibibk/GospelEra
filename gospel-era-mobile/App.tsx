import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const API_BASE_URL = 'https://0c5a25f0-9744-423a-9b7b-f354b588ed87-00-364hxv4w1n962.picard.replit.dev';

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState('Testing connection...');

  useEffect(() => {
    // Test API connection to your Gospel Era backend
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
      <Text style={styles.logo}>✝️</Text>
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
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 60,
    marginBottom: 20,
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
    marginBottom: 30,
  },
  connection: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
  },
  url: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import CreateScreen from './src/screens/CreateScreen';
import PrayerScreen from './src/screens/PrayerScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function App(): JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({route}) => ({
            tabBarIcon: ({focused, color, size}) => {
              let iconName: any;

              if (route.name === 'Home') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'Search') {
                iconName = focused ? 'search' : 'search-outline';
              } else if (route.name === 'Create') {
                iconName = focused ? 'add-circle' : 'add-circle-outline';
              } else if (route.name === 'Prayer') {
                iconName = focused ? 'heart' : 'heart-outline';
              } else if (route.name === 'Profile') {
                iconName = focused ? 'person' : 'person-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#262626',
            tabBarInactiveTintColor: '#8e8e8e',
            tabBarStyle: {
              backgroundColor: '#ffffff',
              borderTopColor: '#dbdbdb',
              borderTopWidth: 1,
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '500',
            },
            headerStyle: {
              backgroundColor: '#ffffff',
              borderBottomColor: '#dbdbdb',
              borderBottomWidth: 1,
            },
            headerTitleStyle: {
              color: '#262626',
              fontSize: 20,
              fontWeight: '700',
            },
          })}>
          <Tab.Screen 
            name="Home" 
            component={HomeScreen}
            options={{
              title: 'Gospel Era',
              headerTitleAlign: 'left',
            }}
          />
          <Tab.Screen 
            name="Search" 
            component={SearchScreen}
            options={{
              title: 'Search',
            }}
          />
          <Tab.Screen 
            name="Create" 
            component={CreateScreen}
            options={{
              title: 'Create',
            }}
          />
          <Tab.Screen 
            name="Prayer" 
            component={PrayerScreen}
            options={{
              title: 'Prayer',
            }}
          />
          <Tab.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{
              title: 'Profile',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default App;
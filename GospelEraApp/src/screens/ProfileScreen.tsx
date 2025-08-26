import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ProfileScreen = () => {
  const userStats = {
    posts: 42,
    prayers: 156,
    following: 89,
    followers: 124,
  };

  const showSettings = () => {
    Alert.alert('Settings', 'Settings screen coming soon!');
  };

  const showNotifications = () => {
    Alert.alert('Notifications', 'Notifications coming soon!');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarText}>●</Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>Gospel User</Text>
            <Text style={styles.username}>@gospeluser</Text>
          </View>
          
          <TouchableOpacity style={styles.settingsButton} onPress={showSettings}>
            <Icon name="settings" size={24} color="#262626" />
          </TouchableOpacity>
        </View>

        {/* Bio */}
        <Text style={styles.bio}>
          Sharing faith, hope, and love through Christ ✝️{'\n'}
          Prayer warrior | Bible study enthusiast
        </Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.posts}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.prayers}</Text>
            <Text style={styles.statLabel}>Prayers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareButton}>
            <Icon name="share" size={20} color="#262626" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Options */}
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem}>
          <Icon name="bookmark" size={24} color="#262626" />
          <Text style={styles.menuText}>Saved Posts</Text>
          <Icon name="chevron-right" size={20} color="#8e8e8e" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Icon name="favorite" size={24} color="#262626" />
          <Text style={styles.menuText}>My Prayer Requests</Text>
          <Icon name="chevron-right" size={20} color="#8e8e8e" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Icon name="history" size={24} color="#262626" />
          <Text style={styles.menuText}>Prayer History</Text>
          <Icon name="chevron-right" size={20} color="#8e8e8e" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={showNotifications}>
          <Icon name="notifications" size={24} color="#262626" />
          <Text style={styles.menuText}>Notifications</Text>
          <Icon name="chevron-right" size={20} color="#8e8e8e" />
        </TouchableOpacity>
      </View>

      {/* Achievement Section */}
      <View style={styles.achievementSection}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        
        <View style={styles.achievementGrid}>
          <View style={styles.achievementItem}>
            <Text style={styles.achievementIcon}>🙏</Text>
            <Text style={styles.achievementTitle}>Prayer Warrior</Text>
            <Text style={styles.achievementDesc}>100+ prayers</Text>
          </View>
          
          <View style={styles.achievementItem}>
            <Text style={styles.achievementIcon}>✝️</Text>
            <Text style={styles.achievementTitle}>Faithful</Text>
            <Text style={styles.achievementDesc}>30 day streak</Text>
          </View>
          
          <View style={styles.achievementItem}>
            <Text style={styles.achievementIcon}>💕</Text>
            <Text style={styles.achievementTitle}>Loving</Text>
            <Text style={styles.achievementDesc}>50+ likes given</Text>
          </View>
          
          <View style={styles.achievementItem}>
            <Text style={styles.achievementIcon}>📖</Text>
            <Text style={styles.achievementTitle}>Scholar</Text>
            <Text style={styles.achievementDesc}>Bible study active</Text>
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.settingsSection}>
        <TouchableOpacity style={styles.menuItem} onPress={showSettings}>
          <Icon name="settings" size={24} color="#262626" />
          <Text style={styles.menuText}>Settings & Privacy</Text>
          <Icon name="chevron-right" size={20} color="#8e8e8e" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Icon name="help" size={24} color="#262626" />
          <Text style={styles.menuText}>Help & Support</Text>
          <Icon name="chevron-right" size={20} color="#8e8e8e" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Icon name="info" size={24} color="#262626" />
          <Text style={styles.menuText}>About Gospel Era</Text>
          <Icon name="chevron-right" size={20} color="#8e8e8e" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  profileHeader: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dbdbdb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    color: '#8e8e8e',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262626',
  },
  username: {
    fontSize: 14,
    color: '#8e8e8e',
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
  },
  bio: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262626',
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e8e',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  shareButton: {
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuSection: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#262626',
    marginLeft: 16,
  },
  achievementSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 16,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 12,
    color: '#8e8e8e',
    textAlign: 'center',
  },
  settingsSection: {
    paddingVertical: 8,
  },
});

export default ProfileScreen;
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {APIService} from '../services/APIService';

interface PrayerRequest {
  id: number;
  title: string;
  content: string;
  author: string;
  prayers: number;
  timestamp: string;
  anonymous: boolean;
}

const PrayerScreen = () => {
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPrayerRequests();
  }, []);

  const loadPrayerRequests = async () => {
    try {
      const data = await APIService.getPrayerRequests();
      setPrayerRequests(data.map((request: any, index: number) => ({
        id: request.id || index,
        title: request.title || 'Prayer Request',
        content: request.content || 'Please pray for guidance and strength',
        author: request.anonymous ? 'Anonymous' : (request.author || 'FaithfulUser'),
        prayers: Math.floor(Math.random() * 100) + 5,
        timestamp: getRandomTime(),
        anonymous: request.anonymous || Math.random() > 0.5,
      })));
    } catch (error) {
      console.error('Error loading prayer requests:', error);
      // Show demo data if API fails
      setPrayerRequests([
        {
          id: 1,
          title: 'Healing for Family Member',
          content: 'Please pray for my mother\'s healing and strength during her recovery',
          author: 'FaithfulDaughter',
          prayers: 47,
          timestamp: '3h',
          anonymous: false,
        },
        {
          id: 2,
          title: 'Job Search Guidance',
          content: 'Seeking God\'s guidance in finding the right job opportunity',
          author: 'Anonymous',
          prayers: 23,
          timestamp: '1d',
          anonymous: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrayerRequests();
    setRefreshing(false);
  };

  const getRandomTime = () => {
    const times = ['1h', '3h', '6h', '1d', '2d', '1w'];
    return times[Math.floor(Math.random() * times.length)];
  };

  const prayForRequest = (requestId: number) => {
    setPrayerRequests(prev => prev.map(request => 
      request.id === requestId 
        ? {...request, prayers: request.prayers + 1}
        : request
    ));
    Alert.alert('Prayed! 🙏', 'Thank you for your prayers');
  };

  const createNewRequest = () => {
    Alert.alert('Create Prayer Request', 'Prayer request creation coming soon!');
  };

  return (
    <View style={styles.container}>
      {/* Header with Stats */}
      <View style={styles.headerStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>127</Text>
          <Text style={styles.statLabel}>Active Requests</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>2.4K</Text>
          <Text style={styles.statLabel}>Prayers Today</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>45</Text>
          <Text style={styles.statLabel}>Answered</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.primaryButton} onPress={createNewRequest}>
          <Icon name="add" size={20} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Submit Request</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton}>
          <Icon name="favorite" size={20} color="#262626" />
          <Text style={styles.secondaryButtonText}>My Prayers</Text>
        </TouchableOpacity>
      </View>

      {/* Prayer Requests Feed */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {prayerRequests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            {/* Request Header */}
            <View style={styles.requestHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {request.anonymous ? '?' : '●'}
                </Text>
              </View>
              <View style={styles.requestUserInfo}>
                <Text style={styles.username}>{request.author}</Text>
                <Text style={styles.requestTime}>{request.timestamp}</Text>
              </View>
              {request.anonymous && (
                <View style={styles.anonymousBadge}>
                  <Text style={styles.anonymousText}>Anonymous</Text>
                </View>
              )}
            </View>

            {/* Request Content */}
            <Text style={styles.requestTitle}>{request.title}</Text>
            <Text style={styles.requestContent}>{request.content}</Text>

            {/* Prayer Actions */}
            <View style={styles.requestActions}>
              <TouchableOpacity 
                style={styles.prayButton}
                onPress={() => prayForRequest(request.id)}>
                <Icon name="favorite" size={20} color="#ffffff" />
                <Text style={styles.prayButtonText}>Pray</Text>
              </TouchableOpacity>
              
              <Text style={styles.prayerCount}>
                {request.prayers} prayers
              </Text>
              
              <TouchableOpacity style={styles.shareButton}>
                <Icon name="share" size={18} color="#8e8e8e" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f2',
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#262626',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbdbdb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    color: '#8e8e8e',
    fontWeight: 'bold',
  },
  requestUserInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  requestTime: {
    fontSize: 12,
    color: '#8e8e8e',
  },
  anonymousBadge: {
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  anonymousText: {
    fontSize: 10,
    color: '#8e8e8e',
    fontWeight: '500',
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  requestContent: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20,
    marginBottom: 16,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  prayButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  prayerCount: {
    flex: 1,
    fontSize: 12,
    color: '#8e8e8e',
    fontWeight: '500',
  },
  shareButton: {
    padding: 8,
  },
});

export default PrayerScreen;
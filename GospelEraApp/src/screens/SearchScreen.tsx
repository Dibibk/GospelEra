import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SearchScreen = () => {
  const [searchText, setSearchText] = useState('');

  const recentSearches = [
    'Prayer requests',
    'Bible study',
    'Worship music',
    'Christian community',
  ];

  const popularTopics = [
    'Faith',
    'Prayer',
    'Worship',
    'Bible',
    'Community',
    'Testimony',
  ];

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#8e8e8e" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts and users"
          value={searchText}
          onChangeText={setSearchText}
          autoFocus
        />
      </View>

      <ScrollView style={styles.content}>
        {/* Recent Searches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {recentSearches.map((search, index) => (
            <TouchableOpacity key={index} style={styles.searchItem}>
              <Icon name="history" size={20} color="#8e8e8e" />
              <Text style={styles.searchText}>{search}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Popular Topics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Topics</Text>
          <View style={styles.topicsContainer}>
            {popularTopics.map((topic, index) => (
              <TouchableOpacity key={index} style={styles.topicTag}>
                <Text style={styles.topicText}>#{topic}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Suggested Users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested</Text>
          {[1, 2, 3].map((user) => (
            <TouchableOpacity key={user} style={styles.userItem}>
              <View style={styles.userAvatar}>
                <Text style={styles.avatarText}>●</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.username}>faithfuluser{user}</Text>
                <Text style={styles.userDesc}>Active in prayer community</Text>
              </View>
              <TouchableOpacity style={styles.followButton}>
                <Text style={styles.followText}>Follow</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#262626',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  searchText: {
    fontSize: 14,
    color: '#262626',
    marginLeft: 12,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicTag: {
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  topicText: {
    fontSize: 14,
    color: '#262626',
    fontWeight: '500',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbdbdb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    color: '#8e8e8e',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  userDesc: {
    fontSize: 12,
    color: '#8e8e8e',
    marginTop: 2,
  },
  followButton: {
    backgroundColor: '#262626',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  followText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SearchScreen;
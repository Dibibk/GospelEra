import React, {useState, useEffect} from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {APIService} from '../services/APIService';

const {width} = Dimensions.get('window');

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  likes: number;
  comments: number;
  timestamp: string;
}

const HomeScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await APIService.getPosts();
      setPosts(data.map((post: any, index: number) => ({
        id: post.id || index,
        title: post.title || 'Gospel Post',
        content: post.content || post.title || 'Sharing faith and hope',
        author: post.author || 'gospeluser',
        likes: Math.floor(Math.random() * 500) + 10,
        comments: Math.floor(Math.random() * 50) + 1,
        timestamp: getRandomTime(),
      })));
    } catch (error) {
      console.error('Error loading posts:', error);
      // Show demo data if API fails
      setPosts([
        {
          id: 1,
          title: 'Welcome to Gospel Era',
          content: 'Share your faith, grow together in Christ',
          author: 'gospelera',
          likes: 124,
          comments: 12,
          timestamp: '2h',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const getRandomTime = () => {
    const times = ['2h', '5h', '1d', '3d', '1w'];
    return times[Math.floor(Math.random() * times.length)];
  };

  const toggleLike = (postId: number) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? {...post, likes: post.likes + (Math.random() > 0.5 ? 1 : -1)}
        : post
    ));
  };

  const showComments = () => {
    Alert.alert('Comments', 'Comments feature coming soon!');
  };

  const sharePost = () => {
    Alert.alert('Share', 'Share feature coming soon!');
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Daily Scripture */}
      <View style={styles.scriptureContainer}>
        <Text style={styles.scriptureText}>
          "For I know the plans I have for you" - Jeremiah 29:11
        </Text>
      </View>

      {/* Posts Feed */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* Post Header */}
            <View style={styles.postHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>●</Text>
              </View>
              <View style={styles.postUserInfo}>
                <Text style={styles.username}>{post.author}</Text>
                <Text style={styles.postTime}>{post.timestamp}</Text>
              </View>
              <TouchableOpacity style={styles.optionsButton}>
                <Icon name="more-horiz" size={20} color="#262626" />
              </TouchableOpacity>
            </View>

            {/* Post Image Placeholder */}
            <View style={styles.postImage}>
              <Text style={styles.postImageIcon}>○</Text>
            </View>

            {/* Post Actions */}
            <View style={styles.postActions}>
              <View style={styles.actionLeft}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => toggleLike(post.id)}>
                  <Icon name="favorite-border" size={24} color="#262626" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={showComments}>
                  <Icon name="chat-bubble-outline" size={24} color="#262626" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={sharePost}>
                  <Icon name="share" size={24} color="#262626" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.actionButton}>
                <Icon name="bookmark-border" size={24} color="#262626" />
              </TouchableOpacity>
            </View>

            {/* Likes Count */}
            <Text style={styles.likesCount}>{post.likes} likes</Text>

            {/* Post Caption */}
            <View style={styles.postCaption}>
              <Text style={styles.captionUsername}>{post.author}</Text>
              <Text style={styles.captionText}>{post.content}</Text>
            </View>

            {/* View Comments */}
            <TouchableOpacity onPress={showComments}>
              <Text style={styles.viewComments}>
                View all {post.comments} comments
              </Text>
            </TouchableOpacity>

            {/* Post Timestamp */}
            <Text style={styles.postTimestamp}>{post.timestamp.toUpperCase()}</Text>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  searchInput: {
    height: 36,
    backgroundColor: '#f2f2f2',
    borderRadius: 18,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#262626',
  },
  scriptureContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
    alignItems: 'center',
  },
  scriptureText: {
    fontSize: 12,
    color: '#8e8e8e',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbdbdb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#dbdbdb',
  },
  avatarText: {
    fontSize: 16,
    color: '#8e8e8e',
  },
  postUserInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  postTime: {
    fontSize: 12,
    color: '#8e8e8e',
  },
  optionsButton: {
    padding: 8,
  },
  postImage: {
    width: width,
    height: 300,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbdbdb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImageIcon: {
    fontSize: 48,
    color: '#dbdbdb',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionLeft: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginRight: 8,
  },
  likesCount: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  postCaption: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
  },
  captionUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginRight: 8,
  },
  captionText: {
    fontSize: 14,
    color: '#262626',
    flex: 1,
  },
  viewComments: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 14,
    color: '#8e8e8e',
  },
  postTimestamp: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontSize: 10,
    color: '#8e8e8e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default HomeScreen;
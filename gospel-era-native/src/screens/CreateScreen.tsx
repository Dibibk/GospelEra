import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchImageLibrary} from 'react-native-image-picker';
import {APIService} from '../services/APIService';

const CreateScreen = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      (response) => {
        if (response.assets && response.assets[0]) {
          setSelectedImage(response.assets[0].uri || null);
        }
      }
    );
  };

  const createPost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in both title and content');
      return;
    }

    setLoading(true);
    try {
      await APIService.createPost({
        title: title.trim(),
        content: content.trim(),
      });
      
      Alert.alert('Success', 'Post created successfully!', [
        {text: 'OK', onPress: () => {
          setTitle('');
          setContent('');
          setSelectedImage(null);
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity 
          onPress={createPost}
          disabled={loading || !title.trim() || !content.trim()}>
          <Text style={[
            styles.shareText,
            (!title.trim() || !content.trim() || loading) && styles.shareTextDisabled
          ]}>
            {loading ? 'Posting...' : 'Share'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>●</Text>
          </View>
          <Text style={styles.username}>gospeluser</Text>
        </View>

        {/* Post Title */}
        <TextInput
          style={styles.titleInput}
          placeholder="Post title..."
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        {/* Post Content */}
        <TextInput
          style={styles.contentInput}
          placeholder="Share your faith, testimony, or encouragement..."
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={2000}
        />

        {/* Selected Image */}
        {selectedImage && (
          <View style={styles.imageContainer}>
            <Image source={{uri: selectedImage}} style={styles.selectedImage} />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={() => setSelectedImage(null)}>
              <Icon name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Media Options */}
        <View style={styles.mediaOptions}>
          <TouchableOpacity style={styles.mediaButton} onPress={selectImage}>
            <Icon name="photo-library" size={24} color="#262626" />
            <Text style={styles.mediaText}>Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.mediaButton}>
            <Icon name="videocam" size={24} color="#262626" />
            <Text style={styles.mediaText}>Video</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.mediaButton}>
            <Icon name="location-on" size={24} color="#262626" />
            <Text style={styles.mediaText}>Location</Text>
          </TouchableOpacity>
        </View>

        {/* Tags Section */}
        <View style={styles.tagsSection}>
          <Text style={styles.sectionTitle}>Popular Tags</Text>
          <View style={styles.tagsContainer}>
            {['#Faith', '#Prayer', '#Testimony', '#Worship', '#Bible', '#Community'].map((tag, index) => (
              <TouchableOpacity key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Character Count */}
        <Text style={styles.characterCount}>
          {content.length}/2000 characters
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  cancelText: {
    fontSize: 16,
    color: '#262626',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  shareText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  shareTextDisabled: {
    color: '#8e8e8e',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
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
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    marginBottom: 16,
  },
  contentInput: {
    fontSize: 16,
    color: '#262626',
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f2f2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    marginBottom: 20,
  },
  mediaButton: {
    alignItems: 'center',
  },
  mediaText: {
    fontSize: 12,
    color: '#262626',
    marginTop: 4,
  },
  tagsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#262626',
  },
  characterCount: {
    fontSize: 12,
    color: '#8e8e8e',
    textAlign: 'right',
    marginBottom: 20,
  },
});

export default CreateScreen;
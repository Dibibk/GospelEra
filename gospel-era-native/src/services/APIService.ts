// API Service for connecting to Gospel Era backend
class APIService {
  private static baseURL = 'https://0c5a25f0-9744-423a-9b7b-f354b588ed87-00-364hxv4w1n962.picard.replit.dev';

  static async getPosts() {
    try {
      const response = await fetch(`${this.baseURL}/api/posts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  static async createPost(postData: {title: string; content: string}) {
    try {
      const response = await fetch(`${this.baseURL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  static async login(credentials: {email: string; password: string}) {
    try {
      const response = await fetch(`${this.baseURL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  static async getPrayerRequests() {
    try {
      const response = await fetch(`${this.baseURL}/api/prayer-requests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching prayer requests:', error);
      throw error;
    }
  }
}

export {APIService};
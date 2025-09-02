import React, { useState } from 'react';
import { Search, TrendingUp, Users, BookOpen } from 'lucide-react';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000000',
      minHeight: '100vh',
      color: 'white'
    }}>
      {/* Mobile Native Header */}
      <div style={{
        backgroundColor: '#1a1a1a',
        padding: '16px 20px',
        borderBottom: '1px solid #333',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: 'white',
          textAlign: 'center',
          margin: 0,
          letterSpacing: '-0.02em'
        }}>
          Search
        </h1>
      </div>

      {/* Search Input - Mobile Optimized */}
      <div style={{
        padding: '20px',
        backgroundColor: '#000000'
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search 
            size={20} 
            color="#888" 
            style={{
              position: 'absolute',
              left: '16px',
              zIndex: 2
            }}
          />
          <input
            data-testid="input-search"
            type="text"
            placeholder="Search posts, people, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 16px 16px 50px',
              fontSize: '17px',
              border: '2px solid #333',
              borderRadius: '25px',
              backgroundColor: '#1a1a1a',
              color: 'white',
              outline: 'none',
              WebkitAppearance: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4285f4';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#333';
            }}
          />
        </div>
      </div>

      {/* Search Results/Content */}
      <div style={{
        flex: 1,
        padding: '0 20px 20px'
      }}>
        {searchQuery ? (
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid #333'
          }}>
            <Search size={32} color="#4285f4" style={{ marginBottom: '12px' }} />
            <p style={{ 
              fontSize: '16px', 
              color: '#ccc',
              margin: 0
            }}>
              Search results for "{searchQuery}"
            </p>
            <p style={{ 
              fontSize: '14px', 
              color: '#888',
              marginTop: '8px',
              margin: 0
            }}>
              Results would appear here
            </p>
          </div>
        ) : (
          <>
            {/* Empty State */}
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              backgroundColor: '#1a1a1a',
              borderRadius: '16px',
              marginBottom: '20px',
              border: '1px solid #333'
            }}>
              <Search size={48} color="#4285f4" style={{ marginBottom: '16px' }} />
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px',
                margin: 0
              }}>
                Discover Gospel Era
              </h2>
              <p style={{ 
                fontSize: '16px',
                color: '#999',
                margin: 0
              }}>
                Search for posts, people, and faith topics
              </p>
            </div>

            {/* Quick Actions */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              <div style={{
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                border: '1px solid #333',
                cursor: 'pointer'
              }}>
                <TrendingUp size={24} color="#4285f4" style={{ marginBottom: '8px' }} />
                <p style={{ 
                  fontSize: '14px',
                  color: 'white',
                  fontWeight: '500',
                  margin: 0
                }}>
                  Trending
                </p>
              </div>
              <div style={{
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                border: '1px solid #333',
                cursor: 'pointer'
              }}>
                <Users size={24} color="#4285f4" style={{ marginBottom: '8px' }} />
                <p style={{ 
                  fontSize: '14px',
                  color: 'white',
                  fontWeight: '500',
                  margin: 0
                }}>
                  People
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
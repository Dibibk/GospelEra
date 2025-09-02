import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '16px',
        borderBottom: '1px solid #e9ecef',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333',
          textAlign: 'center',
          margin: 0
        }}>
          Search
        </h1>
      </div>

      {/* Search Content */}
      <div style={{
        flex: 1,
        padding: '20px'
      }}>
        <Card style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <Search size={24} color="#666" />
            <Input
              data-testid="input-search"
              type="text"
              placeholder="Search posts, people, and topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                backgroundColor: '#f8f9fa'
              }}
            />
          </div>

          {searchQuery && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#666'
            }}>
              <p>Search results for "{searchQuery}" would appear here</p>
            </div>
          )}

          {!searchQuery && (
            <div style={{
              textAlign: 'center',
              color: '#999',
              padding: '40px 20px'
            }}>
              <Search size={48} color="#ccc" style={{ marginBottom: '16px' }} />
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>Search Gospel Era</p>
              <p style={{ fontSize: '14px' }}>Find posts, people, and topics in our community</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SearchPage;
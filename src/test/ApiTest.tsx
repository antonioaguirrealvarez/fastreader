import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Form, FormField } from '../components/ui/Form';

interface TextContent {
  title: string;
  description: string;
}

export function ApiTest() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [searchKey, setSearchKey] = useState('');
  const [result, setResult] = useState<TextContent | null>(null);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('texts')
        .insert([{ title, description }]);

      if (error) throw error;

      setStatus({
        type: 'success',
        message: 'Content successfully added to the database',
      });

      setTitle('');
      setDescription('');
    } catch (error: any) {
      setStatus({
        type: 'error',
        message: error.message,
      });
    }
  };

  const handleSearch = async () => {
    try {
      const { data, error } = await supabase
        .from('texts')
        .select('*')
        .eq('title', searchKey)
        .single();

      if (error) throw error;

      setResult(data);
      setStatus({
        type: 'success',
        message: 'Content found',
      });
    } catch (error: any) {
      setStatus({
        type: 'error',
        message: error.message,
      });
      setResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">API Test Page</h1>
          <p className="text-gray-600">
            Test posting and retrieving content from the database.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Post Content Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Post Content</h2>
            <Form onSubmit={handleSubmit}>
              <FormField
                label="Title"
                required
              >
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter title"
                />
              </FormField>

              <FormField
                label="Description"
                required
              >
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter description"
                />
              </FormField>

              <Button type="submit" variant="primary" className="w-full">
                Submit
              </Button>
            </Form>
          </Card>

          {/* Search Content */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Search Content</h2>
            <div className="space-y-4">
              <FormField
                label="Search by Title"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter title to search"
                  />
                  <Button onClick={handleSearch} variant="secondary">
                    Search
                  </Button>
                </div>
              </FormField>

              {result && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <h3 className="font-semibold mb-2">{result.title}</h3>
                  <p className="text-gray-600">{result.description}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {status.type && (
          <Banner
            variant={status.type}
            title={status.type === 'success' ? 'Success' : 'Error'}
            message={status.message}
            className="mt-6"
            onClose={() => setStatus({ type: null, message: '' })}
          />
        )}
      </div>
    </div>
  );
}
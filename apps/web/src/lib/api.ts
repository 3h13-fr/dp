export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_URL}${path}`, { ...options, headers });
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem('access_token', token);
}

export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem('access_token');
}

/**
 * Get a presigned URL for reading an image from S3
 * This is useful when the S3 bucket is private and images need presigned URLs
 */
export async function getPresignedImageUrl(publicUrl: string, expiresIn = 3600): Promise<string | null> {
  if (!publicUrl) return null;
  
  try {
    const response = await fetch(
      `${API_URL}/uploads/presigned-read?url=${encodeURIComponent(publicUrl)}&expiresIn=${expiresIn}`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      console.error('Failed to get presigned URL:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data.signedUrl || null;
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    return null;
  }
}

/**
 * Search for a city by name and return its coordinates
 */
export async function searchCity(query: string): Promise<{ id: string; slug: string; name: Record<string, string>; latitude: number; longitude: number } | null> {
  if (!query?.trim()) return null;
  
  try {
    const response = await fetch(
      `${API_URL}/listings/cities/search?q=${encodeURIComponent(query.trim())}`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // City not found
      }
      console.error('Failed to search city:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching city:', error);
    return null;
  }
}

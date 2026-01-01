# Technical Architecture & Implementation Guide

> **Note:** This document describes the **future enterprise architecture** using Next.js, Vercel, and full-stack patterns. For the **current deployed PWA architecture** (Netlify + Supabase + vanilla JS), see the root `README.md` and `netlify.toml`. This serves as a roadmap for migration and expansion.

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Web App    │  │   iOS App    │  │ Android App  │            │
│  │  (Next.js)   │  │ (Capacitor)  │  │ (Capacitor)  │            │
│  │   + PWA      │  │              │  │              │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│           │                │                 │                     │
│           └────────────────┴─────────────────┘                     │
│                          │                                         │
└──────────────────────────┼─────────────────────────────────────────┘
                           │
                           │ HTTPS / WSS
                           │
┌──────────────────────────┼─────────────────────────────────────────┐
│                     API GATEWAY LAYER                              │
├──────────────────────────┼─────────────────────────────────────────┤
│                          │                                         │
│                   ┌──────▼─────┐                                   │
│                   │  Next.js   │                                   │
│                   │ API Routes │                                   │
│                   │            │                                   │
│                   │  +  Auth   │                                   │
│                   │ Middleware │                                   │
│                   └──────┬─────┘                                   │
│                          │                                         │
└──────────────────────────┼─────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐
│   Supabase   │  │  External APIs  │  │   Redis    │
│              │  │                 │  │   Cache    │
│ PostgreSQL   │  │ • YouTube API   │  │            │
│ Auth         │  │ • Bible API     │  └────────────┘
│ Storage      │  │ • Payment API   │
│ Realtime     │  │ • SMS Provider  │
└──────────────┘  └─────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      BACKGROUND JOBS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │   Cron     │  │  Push      │  │  Email     │  │  Data      │  │
│  │   Jobs     │  │Notifications│  │  Service   │  │ Analytics  │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    MONITORING & LOGGING                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Sentry (Errors)  │  Vercel Analytics  │  PostHog (Product)       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack Detailed

### Frontend Stack

#### Core Framework
```javascript
// Recommended: Next.js 14+ with App Router
{
  "framework": "Next.js 14.2+",
  "language": "TypeScript 5.4+",
  "runtime": "Node.js 20+",
  "styling": "Tailwind CSS 3.4+",
  "components": "shadcn/ui + Radix UI",
  "icons": "Lucide React",
  "forms": "React Hook Form + Zod",
  "state": "Zustand or React Query",
  "charts": "Recharts or Chart.js",
  "calendar": "React Big Calendar",
  "video": "React Player",
  "editor": "Tiptap or Lexical"
}
```

#### Project Structure
```
bible-reader-enterprise/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth routes
│   │   ├── login/
│   │   ├── signup/
│   │   └── onboarding/
│   ├── (dashboard)/         # Protected routes
│   │   ├── home/
│   │   ├── bible/
│   │   ├── plans/
│   │   ├── announcements/
│   │   ├── sermons/
│   │   ├── events/
│   │   ├── community/
│   │   ├── kids/
│   │   ├── quizzes/
│   │   ├── prayers/
│   │   └── groups/
│   ├── (admin)/             # Admin routes
│   │   └── admin/
│   ├── api/                 # API routes
│   │   ├── auth/
│   │   ├── bible/
│   │   ├── users/
│   │   ├── announcements/
│   │   ├── sermons/
│   │   ├── events/
│   │   ├── posts/
│   │   ├── quizzes/
│   │   └── webhooks/
│   ├── layout.tsx
│   └── page.tsx
├── components/              # React components
│   ├── ui/                  # shadcn components
│   ├── bible/
│   ├── announcements/
│   ├── sermons/
│   ├── events/
│   ├── community/
│   ├── quizzes/
│   └── shared/
├── lib/                     # Utilities
│   ├── supabase/           # Supabase client
│   ├── api/                # API helpers
│   ├── hooks/              # Custom hooks
│   ├── utils/              # Utility functions
│   ├── validators/         # Zod schemas
│   └── constants/
├── types/                   # TypeScript types
├── public/                  # Static assets
├── prisma/                  # Database schema (if using Prisma)
│   └── schema.prisma
├── supabase/               # Supabase migrations
│   └── migrations/
├── tests/                   # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

### Backend & Database

#### Supabase (Recommended)
```javascript
// Why Supabase?
- Built on PostgreSQL (robust, scalable)
- Built-in authentication (email, phone, OAuth)
- Real-time subscriptions (WebSockets)
- Row-level security (RLS) for data protection
- Storage for images/videos
- Edge functions for serverless compute
- Auto-generated REST API
- Free tier available
```

#### Database Architecture
```sql
-- Connection pooling configuration
-- Supabase provides built-in pooling with PgBouncer

-- Indexes for performance
CREATE INDEX idx_users_church_id ON users(church_id);
CREATE INDEX idx_bible_reading_user_id ON bible_reading_progress(user_id);
CREATE INDEX idx_posts_church_created ON posts(church_id, created_at DESC);
CREATE INDEX idx_announcements_published ON announcements(published_at DESC);
CREATE INDEX idx_sermons_youtube ON sermons(youtube_video_id);

-- Full-text search
CREATE INDEX idx_sermons_search ON sermons USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_posts_search ON posts USING gin(to_tsvector('english', content));
```

#### Row-Level Security (RLS) Examples
```sql
-- Users can only read their own data
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Users can only read announcements from their church
CREATE POLICY "Members can view church announcements"
ON announcements FOR SELECT
USING (
  church_id IN (
    SELECT church_id FROM users WHERE id = auth.uid()
  )
);

-- Only admins can create announcements
CREATE POLICY "Admins can create announcements"
ON announcements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND church_id = announcements.church_id
    AND role IN ('admin', 'super_admin')
  )
);
```

---

### API Design

#### RESTful API Structure
```typescript
// app/api/announcements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's church
  const { data: userData } = await supabase
    .from('users')
    .select('church_id')
    .eq('id', user.id)
    .single();

  // Fetch announcements
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('church_id', userData?.church_id)
    .order('published_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  
  // Check admin role
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from('users')
    .select('role, church_id')
    .eq('id', user?.id)
    .single();

  if (!['admin', 'super_admin', 'leader'].includes(userData?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      ...body,
      church_id: userData.church_id,
      author_id: user?.id,
      published_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
```

#### API Routes Overview
```typescript
// API Endpoints
const API_ROUTES = {
  auth: {
    signup: '/api/auth/signup',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    resetPassword: '/api/auth/reset-password',
    verifyEmail: '/api/auth/verify-email',
  },
  users: {
    profile: '/api/users/profile',
    update: '/api/users/profile',
    preferences: '/api/users/preferences',
  },
  bible: {
    books: '/api/bible/books',
    chapters: '/api/bible/chapters/:book/:chapter',
    search: '/api/bible/search',
    progress: '/api/bible/progress',
  },
  plans: {
    list: '/api/plans',
    details: '/api/plans/:id',
    subscribe: '/api/plans/:id/subscribe',
    progress: '/api/plans/:id/progress',
  },
  announcements: {
    list: '/api/announcements',
    create: '/api/announcements',
    details: '/api/announcements/:id',
    update: '/api/announcements/:id',
    delete: '/api/announcements/:id',
  },
  sermons: {
    list: '/api/sermons',
    create: '/api/sermons',
    details: '/api/sermons/:id',
    series: '/api/sermons/series',
  },
  events: {
    list: '/api/events',
    create: '/api/events',
    register: '/api/events/:id/register',
  },
  posts: {
    feed: '/api/posts/feed',
    create: '/api/posts',
    like: '/api/posts/:id/like',
    comment: '/api/posts/:id/comments',
  },
  quizzes: {
    list: '/api/quizzes',
    details: '/api/quizzes/:id',
    submit: '/api/quizzes/:id/submit',
    leaderboard: '/api/quizzes/:id/leaderboard',
  },
  prayers: {
    list: '/api/prayers',
    create: '/api/prayers',
    pray: '/api/prayers/:id/pray',
  },
  kids: {
    submissions: '/api/kids/submissions',
    upload: '/api/kids/upload',
    approve: '/api/kids/:id/approve',
  },
};
```

---

## 🔐 Authentication Flow

### Authentication Architecture
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createServerSupabaseClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
};

// middleware.ts - Protect routes
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if already logged in
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
```

### User Registration Flow
```typescript
// app/api/auth/signup/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  churchSlug: z.string(),
});

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  // Validate input
  const validation = signupSchema.safeParse(body);
  if (!validation.success) {
    return Response.json(
      { error: 'Invalid input', details: validation.error },
      { status: 400 }
    );
  }

  const { email, password, fullName, churchSlug } = validation.data;

  // Find church
  const { data: church } = await supabase
    .from('churches')
    .select('id')
    .eq('slug', churchSlug)
    .single();

  if (!church) {
    return Response.json(
      { error: 'Church not found' },
      { status: 404 }
    );
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        church_id: church.id,
      },
    },
  });

  if (authError) {
    return Response.json(
      { error: authError.message },
      { status: 400 }
    );
  }

  // Create user profile (triggered by database trigger or here)
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user?.id,
      email,
      full_name: fullName,
      church_id: church.id,
      role: 'member',
    });

  if (profileError) {
    console.error('Profile creation failed:', profileError);
  }

  return Response.json(
    { data: authData, message: 'Check your email for verification link' },
    { status: 201 }
  );
}
```

---

## 📱 Real-time Features

### Supabase Realtime Subscriptions
```typescript
// components/community/RealtimeFeed.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Post } from '@/types';

export function RealtimeFeed({ churchId }: { churchId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*, author:users(*), likes_count, comments_count')
        .eq('church_id', churchId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setPosts(data);
    };

    fetchPosts();

    // Subscribe to new posts
    const channel = supabase
      .channel('posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `church_id=eq.${churchId}`,
        },
        (payload) => {
          setPosts((current) => [payload.new as Post, ...current]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `church_id=eq.${churchId}`,
        },
        (payload) => {
          setPosts((current) =>
            current.map((post) =>
              post.id === payload.new.id ? (payload.new as Post) : post
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [churchId, supabase]);

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

---

## 🔔 Push Notifications

### Web Push Implementation
```typescript
// lib/push-notifications.ts
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function subscribeToPushNotifications(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });

    // Save subscription to database
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription,
      }),
    });

    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// app/api/push/send/route.ts
import webpush from 'web-push';
import { createServerSupabaseClient } from '@/lib/supabase/server';

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const { userId, title, body, actionUrl } = await request.json();

  // Get user's push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (!subscriptions || subscriptions.length === 0) {
    return Response.json({ error: 'No subscriptions found' }, { status: 404 });
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    data: { url: actionUrl },
  });

  // Send to all subscriptions
  const promises = subscriptions.map((sub) =>
    webpush.sendNotification(sub, payload).catch((err) => {
      console.error('Push failed:', err);
      // Remove invalid subscriptions
      if (err.statusCode === 410) {
        supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
    })
  );

  await Promise.all(promises);

  return Response.json({ success: true });
}
```

---

## 📊 State Management

### Zustand Store Example
```typescript
// lib/store/user-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  fullName: string;
  avatar: string | null;
  role: string;
  churchId: string;
}

interface UserState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'user-storage',
    }
  )
);

// lib/store/bible-store.ts
import { create } from 'zustand';

interface BibleState {
  selectedBook: string;
  selectedChapter: number;
  translation: string;
  readingProgress: Record<string, number[]>;
  setSelectedBook: (book: string) => void;
  setSelectedChapter: (chapter: number) => void;
  setTranslation: (translation: string) => void;
  markChapterRead: (book: string, chapter: number) => void;
}

export const useBibleStore = create<BibleState>((set) => ({
  selectedBook: 'genesis',
  selectedChapter: 1,
  translation: 'NIV',
  readingProgress: {},
  setSelectedBook: (book) => set({ selectedBook: book, selectedChapter: 1 }),
  setSelectedChapter: (chapter) => set({ selectedChapter: chapter }),
  setTranslation: (translation) => set({ translation }),
  markChapterRead: (book, chapter) =>
    set((state) => ({
      readingProgress: {
        ...state.readingProgress,
        [book]: [...(state.readingProgress[book] || []), chapter],
      },
    })),
}));
```

---

## 🎨 Component Architecture

### Component Patterns
```typescript
// components/announcements/AnnouncementCard.tsx
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  publishedAt: string;
  author: {
    fullName: string;
    avatar: string;
  };
}

export function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const priorityColors = {
    low: 'bg-gray-500',
    normal: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">{announcement.title}</h3>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(announcement.publishedAt), {
                addSuffix: true,
              })}
            </p>
          </div>
          <Badge className={priorityColors[announcement.priority]}>
            {announcement.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{announcement.content}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex items-center gap-2">
          <img
            src={announcement.author.avatar || '/default-avatar.png'}
            alt={announcement.author.fullName}
            className="w-8 h-8 rounded-full"
          />
          <span className="text-sm">{announcement.author.fullName}</span>
        </div>
        <Button variant="outline">Read More</Button>
      </CardFooter>
    </Card>
  );
}

// Usage in page
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard';

export default async function AnnouncementsPage() {
  const announcements = await fetchAnnouncements();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Church Announcements</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {announcements.map((announcement) => (
          <AnnouncementCard key={announcement.id} announcement={announcement} />
        ))}
      </div>
    </div>
  );
}
```

---

## 🧪 Testing Strategy

### Unit Tests (Jest + React Testing Library)
```typescript
// components/__tests__/AnnouncementCard.test.tsx
import { render, screen } from '@testing-library/react';
import { AnnouncementCard } from '../AnnouncementCard';

describe('AnnouncementCard', () => {
  const mockAnnouncement = {
    id: '1',
    title: 'Test Announcement',
    content: 'This is a test',
    priority: 'high' as const,
    category: 'general',
    publishedAt: new Date().toISOString(),
    author: {
      fullName: 'John Doe',
      avatar: '/avatar.jpg',
    },
  };

  it('renders announcement title', () => {
    render(<AnnouncementCard announcement={mockAnnouncement} />);
    expect(screen.getByText('Test Announcement')).toBeInTheDocument();
  });

  it('displays correct priority badge', () => {
    render(<AnnouncementCard announcement={mockAnnouncement} />);
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('shows author information', () => {
    render(<AnnouncementCard announcement={mockAnnouncement} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should allow user to sign up', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePassword123!');
    await page.fill('[name="fullName"]', 'Test User');
    await page.selectOption('[name="church"]', 'test-church');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/onboarding');
  });

  test('should allow user to login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'password123');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });
});
```

---

## 🚀 Deployment

### Vercel Deployment
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key"
  }
}
```

### Environment Variables
```bash
# .env.local
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# APIs
YOUTUBE_API_KEY=your-youtube-api-key
BIBLE_API_KEY=your-bible-api-key

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# Payment (optional)
STRIPE_SECRET_KEY=your-stripe-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-public

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
```

---

## 📈 Performance Optimization

### Next.js Optimizations
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-supabase-project.supabase.co', 'img.youtube.com'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;
```

### Caching Strategy
```typescript
// app/api/sermons/route.ts
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic'; // or 'force-static'
export const revalidate = 3600; // Revalidate every hour

export async function GET(request: NextRequest) {
  // Cache response for 1 hour
  const response = await fetch('...');
  
  return new Response(response.body, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
```

---

## 🔍 Monitoring & Logging

### Sentry Integration
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

// Usage in components
try {
  // risky operation
} catch (error) {
  Sentry.captureException(error);
}
```

---

This technical architecture provides a solid foundation for building the enterprise church app. Next steps would be to:

1. Set up the Next.js project
2. Configure Supabase
3. Implement authentication
4. Build core features phase by phase

Would you like me to start implementing any specific component or feature?

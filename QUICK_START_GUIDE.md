# Quick Start Implementation Guide

## 🚀 Getting Started - Week 1

This guide will help you set up the foundation for the enterprise church app in the first week.

---

## Prerequisites

Before starting, ensure you have:
- Node.js 20+ installed
- Git installed
- A code editor (VS Code recommended)
- A Supabase account (free tier available)
- Basic knowledge of React and TypeScript

---

## Day 1: Project Setup

### Step 1: Create Next.js Project

```bash
# Create new Next.js app with TypeScript
npx create-next-app@latest church-app --typescript --tailwind --app --eslint

# Navigate to project
cd church-app

# Install additional dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install zustand react-hook-form zod @hookform/resolvers
npm install date-fns lucide-react
npm install -D @types/node

# Install shadcn/ui (component library)
npx shadcn-ui@latest init
```

### Step 2: Install shadcn/ui Components

```bash
# Install essential components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add form
npx shadcn-ui@latest add select
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add dropdown-menu
```

### Step 3: Configure Environment Variables

Create `.env.local` file:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Config
NEXT_PUBLIC_APP_NAME="Church App"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Create `.env.example` for team reference:

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_APP_URL=
```

---

## Day 2: Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your project URL and anon key
4. Add them to `.env.local`

### Step 2: Create Database Tables

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Churches table
CREATE TABLE churches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin', 'super_admin')),
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Bible reading progress
CREATE TABLE bible_reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id, chapter_number)
);

-- Reading plans
CREATE TABLE reading_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('canonical', 'chronological', 'topical', 'custom')),
  duration_days INTEGER,
  is_public BOOLEAN DEFAULT true,
  created_by_user_id UUID REFERENCES users(id),
  church_id UUID REFERENCES churches(id),
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User reading plan subscriptions
CREATE TABLE user_reading_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reading_plan_id UUID REFERENCES reading_plans(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  current_day INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, reading_plan_id)
);

-- Announcements
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT DEFAULT 'general',
  author_id UUID REFERENCES users(id),
  thumbnail_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_church_id ON users(church_id);
CREATE INDEX idx_bible_reading_user_id ON bible_reading_progress(user_id);
CREATE INDEX idx_announcements_church_published ON announcements(church_id, published_at DESC);
CREATE INDEX idx_reading_plans_public ON reading_plans(is_public, created_at DESC);
```

### Step 3: Set Up Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Bible reading progress policies
CREATE POLICY "Users can view own progress"
  ON bible_reading_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON bible_reading_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Announcements policies
CREATE POLICY "Members can view church announcements"
  ON announcements FOR SELECT
  USING (
    church_id IN (
      SELECT church_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND church_id = announcements.church_id
      AND role IN ('admin', 'super_admin', 'leader')
    )
  );
```

### Step 4: Seed Initial Data

```sql
-- Insert a test church
INSERT INTO churches (id, name, slug, description, city, state, country)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'First Baptist Church',
  'first-baptist',
  'A welcoming community church',
  'Springfield',
  'IL',
  'USA'
);

-- Insert reading plans
INSERT INTO reading_plans (title, description, type, duration_days, is_public)
VALUES 
  ('Canonical Bible Plan', 'Read the Bible from Genesis to Revelation', 'canonical', 365, true),
  ('Chronological Bible Plan', 'Read the Bible in historical order', 'chronological', 365, true);
```

---

## Day 3: Authentication Setup

### Create Supabase Client Utilities

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

### Create Middleware for Route Protection

Create `middleware.ts` in root:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
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
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if accessing protected routes without auth
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if already logged in and trying to access auth pages
  if (user && ['/login', '/signup'].includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/signup',
  ],
};
```

---

## Day 4: Create Authentication Pages

### Login Page

Create `app/(auth)/login/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in to your church account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Signup Page

Create `app/(auth)/signup/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [churchId, setChurchId] = useState('');
  const [churches, setChurches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Fetch available churches
    async function fetchChurches() {
      const { data } = await supabase.from('churches').select('id, name, slug');
      if (data) setChurches(data);
    }
    fetchChurches();
  }, [supabase]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          church_id: churchId,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Create user profile
    if (authData.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        church_id: churchId,
        role: 'member',
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Join your church community</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="church">Select Church</Label>
              <Select value={churchId} onValueChange={setChurchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your church" />
                </SelectTrigger>
                <SelectContent>
                  {churches.map((church) => (
                    <SelectItem key={church.id} value={church.id}>
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Create Auth Layout

Create `app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

---

## Day 5: Dashboard Setup

### Create Dashboard Layout

Create `app/(dashboard)/layout.tsx`:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*, church:churches(*)')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={profile} />
      <div className="lg:pl-64">
        <Header user={profile} />
        <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
```

### Create Sidebar Component

Create `components/dashboard/Sidebar.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Book, Calendar, Users, MessageSquare, Award, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const navigation = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Bible', href: '/dashboard/bible', icon: Book },
  { name: 'Events', href: '/dashboard/events', icon: Calendar },
  { name: 'Community', href: '/dashboard/community', icon: Users },
  { name: 'Announcements', href: '/dashboard/announcements', icon: MessageSquare },
  { name: 'Quizzes', href: '/dashboard/quizzes', icon: Award },
];

export function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 py-4">
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-2xl font-bold text-blue-600">Church App</h1>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                          ${
                            isActive
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
            <li className="mt-auto">
              <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold text-gray-900">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  {user?.full_name?.[0] || 'U'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">{user?.church?.name}</p>
                </div>
              </div>
              <Button onClick={handleLogout} variant="ghost" className="w-full justify-start">
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
```

### Create Dashboard Home Page

Create `app/(dashboard)/dashboard/page.tsx`:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user's reading progress
  const { data: progress } = await supabase
    .from('bible_reading_progress')
    .select('*')
    .eq('user_id', user?.id);

  // Fetch recent announcements
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Welcome back!</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Chapters Read</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{progress?.length || 0}</p>
            <p className="text-sm text-gray-500">Total chapters completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">7</p>
            <p className="text-sm text-gray-500">Days in a row</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">2</p>
            <p className="text-sm text-gray-500">Reading plans</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {announcements && announcements.length > 0 ? (
            <ul className="space-y-2">
              {announcements.map((announcement) => (
                <li key={announcement.id} className="border-b pb-2 last:border-0">
                  <h3 className="font-semibold">{announcement.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {announcement.content}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No announcements yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Day 6-7: Migrate Existing Bible Reading Features

### Create Bible Reading Page

Create `app/(dashboard)/dashboard/bible/page.tsx`:

```typescript
import { BibleReader } from '@/components/bible/BibleReader';

export default function BiblePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Bible Reader</h1>
      <BibleReader />
    </div>
  );
}
```

### Create Bible Reader Component

Create `components/bible/BibleReader.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Copy your BOOKS array from original script.js
const BOOKS = [
  { id: 'genesis', name: 'Genesis', chapters: 50 },
  { id: 'exodus', name: 'Exodus', chapters: 40 },
  // ... add all 66 books
];

export function BibleReader() {
  const [selectedBook, setSelectedBook] = useState('genesis');
  const [readChapters, setReadChapters] = useState<Record<string, number[]>>({});
  const supabase = createClient();

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
      .from('bible_reading_progress')
      .select('book_id, chapter_number')
      .eq('user_id', user?.id);

    if (data) {
      const progress: Record<string, number[]> = {};
      data.forEach((item) => {
        if (!progress[item.book_id]) progress[item.book_id] = [];
        progress[item.book_id].push(item.chapter_number);
      });
      setReadChapters(progress);
    }
  };

  const toggleChapter = async (bookId: string, chapter: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isRead = readChapters[bookId]?.includes(chapter);

    if (isRead) {
      // Remove from progress
      await supabase
        .from('bible_reading_progress')
        .delete()
        .eq('user_id', user?.id)
        .eq('book_id', bookId)
        .eq('chapter_number', chapter);

      setReadChapters((prev) => ({
        ...prev,
        [bookId]: prev[bookId].filter((c) => c !== chapter),
      }));
    } else {
      // Add to progress
      await supabase.from('bible_reading_progress').insert({
        user_id: user?.id,
        book_id: bookId,
        chapter_number: chapter,
      });

      setReadChapters((prev) => ({
        ...prev,
        [bookId]: [...(prev[bookId] || []), chapter],
      }));
    }
  };

  const book = BOOKS.find((b) => b.id === selectedBook);
  const bookProgress = readChapters[selectedBook]?.length || 0;
  const bookTotal = book?.chapters || 0;
  const progressPercentage = (bookProgress / bookTotal) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Books Sidebar */}
      <Card className="p-4">
        <h2 className="font-bold mb-4">Books</h2>
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {BOOKS.map((b) => {
            const read = readChapters[b.id]?.length || 0;
            const pct = Math.round((read / b.chapters) * 100);
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBook(b.id)}
                className={`w-full text-left p-2 rounded text-sm ${
                  selectedBook === b.id
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between">
                  <span>{b.name}</span>
                  <span className="text-xs text-gray-500">
                    {read}/{b.chapters}
                  </span>
                </div>
                <Progress value={pct} className="h-1 mt-1" />
              </button>
            );
          })}
        </div>
      </Card>

      {/* Chapters Grid */}
      <Card className="p-6 md:col-span-3">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{book?.name}</h2>
          <p className="text-sm text-gray-500">
            {bookProgress} / {bookTotal} chapters ({Math.round(progressPercentage)}%)
          </p>
          <Progress value={progressPercentage} className="mt-2" />
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {Array.from({ length: bookTotal }, (_, i) => i + 1).map((chapter) => {
            const isRead = readChapters[selectedBook]?.includes(chapter);
            return (
              <Button
                key={chapter}
                variant={isRead ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleChapter(selectedBook, chapter)}
                className="h-12"
              >
                {chapter}
              </Button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
```

---

## Testing Your Setup

### Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### Test the Flow

1. Navigate to `/signup`
2. Create an account
3. Log in
4. Access `/dashboard`
5. Navigate to `/dashboard/bible`
6. Mark some chapters as read
7. Check that progress persists on reload

---

## Next Steps

After completing this week 1 setup:

1. **Week 2**: Add announcements CRUD and sermon library
2. **Week 3**: Implement community posts and events
3. **Week 4**: Add quiz system and kids corner
4. **Week 5**: Build admin dashboard
5. **Week 6**: Mobile optimization and testing

---

## Troubleshooting

### Common Issues

**Supabase connection errors**:
- Verify environment variables in `.env.local`
- Check Supabase project URL and keys
- Ensure RLS policies are set up correctly

**Authentication not working**:
- Check middleware.ts is in the root directory
- Verify cookie settings in Supabase clients
- Clear browser cookies and try again

**Database errors**:
- Run all SQL migrations in order
- Check table names match exactly
- Verify foreign key relationships

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**You now have a solid foundation! Continue building features incrementally following the phases in the main development plan.**

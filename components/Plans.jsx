import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { supabase } from '../lib/supabaseClient';

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

const planFiles = {
  canonical: '/reading-plan-canonical.json',
  chronological: '/reading-plan-chronological.json',
};

export default function Plans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState({ canonical: null, chronological: null });
  const [selectedPlan, setSelectedPlan] = useState('canonical');
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const entries = await Promise.all(
        Object.entries(planFiles).map(async ([k, url]) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return [k, null];
            const json = await res.json();
            return [k, json];
          } catch (e) {
            console.warn('Failed to load plan', k, e);
            return [k, null];
          }
        })
      );
      if (!mounted) return;
      const map = Object.fromEntries(entries);
      setPlans(map);
      // pick a reasonable default day based on day of year
      const today = dayOfYear();
      const canonicalDays = map.canonical ? Object.keys(map.canonical).length : 0;
      const d = canonicalDays ? ((today % canonicalDays) || canonicalDays) : 1;
      setSelectedDay(String(d));
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const days = useMemo(() => {
    const p = plans[selectedPlan];
    return p ? Object.keys(p).sort((a, b) => Number(a) - Number(b)) : [];
  }, [plans, selectedPlan]);

  const readings = useMemo(() => {
    if (!plans[selectedPlan] || !selectedDay) return [];
    return plans[selectedPlan][selectedDay] || [];
  }, [plans, selectedPlan, selectedDay]);

  if (loading) return <div className="p-6">Loading plans…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">📚 Reading Plans</h2>
          <p className="text-sm text-muted-foreground">Track your daily Bible reading journey</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input-field"
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}>
            <option value="canonical">Canonical (Genesis → Revelation)</option>
            <option value="chronological">Chronological</option>
          </select>
          <select
            className="input-field w-32"
            value={selectedDay || ''}
            onChange={(e) => setSelectedDay(e.target.value)}>
            {days.map((d) => (
              <option key={d} value={d}>Day {d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm text-muted-foreground">Selected Day</div>
            <div className="text-lg font-medium">Day {selectedDay}</div>
          </div>
          <div>
            <button
              className="btn-primary"
              onClick={async () => {
                if (!user) {
                  setStatus('Please sign in to save progress');
                  return;
                }
                if (!selectedDay) return;
                setSaving(true);
                setStatus('Saving...');
                try {
                  const dayNum = Number(selectedDay);
                  // fetch existing row
                  const { data, error } = await supabase
                    .from('reading_progress')
                    .select('completed_days')
                    .eq('user_id', user.id)
                    .eq('plan_name', selectedPlan)
                    .maybeSingle();

                  let arr = [];
                  if (data && data.completed_days) {
                    arr = Array.isArray(data.completed_days) ? data.completed_days.slice() : data.completed_days;
                  }
                  // ensure numbers
                  arr = arr.map((v) => Number(v)).filter((v) => !Number.isNaN(v));
                  if (!arr.includes(dayNum)) arr.push(dayNum);

                  const { error: upsertError } = await supabase
                    .from('reading_progress')
                    .upsert({ user_id: user.id, plan_name: selectedPlan, completed_days: arr }, { returning: 'minimal' });

                  if (upsertError) throw upsertError;

                  setStatus('Saved');
                } catch (e) {
                  console.error('Failed to save progress', e);
                  setStatus('Failed to save. See console.');
                } finally {
                  setSaving(false);
                  setTimeout(() => setStatus(''), 2500);
                }
              }}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Mark day completed'}
            </button>
            <div className="text-sm text-muted-foreground mt-2">{status}</div>
          </div>
        </div>

        <ul className="divide-y divide-gray-100">
          {readings.map((r, idx) => (
            <li key={`${r.book}-${r.chapter}-${idx}`} className="py-3 flex items-start justify-between">
              <div>
                <div className="font-medium">{r.book}</div>
                <div className="text-sm text-muted-foreground">Chapter {r.chapter}</div>
              </div>
              <div className="text-sm text-muted-foreground">{r.chapter}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

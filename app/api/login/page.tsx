'use client';
import { useState } from 'react';
import { postJson } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e: any) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await postJson('/api/login', form);
      router.push('/dashboard'); // ✅ cookie auto set, user logged in
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <main className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={onChange} className="border p-2 w-full" />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={onChange} className="border p-2 w-full" />
        {error && <p className="text-red-500">{error}</p>}
        <button disabled={loading} className="bg-blue-500 text-white p-2 w-full rounded">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="mt-3 text-center text-sm">
        Don’t have an account? <a href="/signup" className="text-blue-600">Signup</a>
      </p>
    </main>
  );
}

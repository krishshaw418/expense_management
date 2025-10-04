import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const token = cookies().get('access-token')?.value;

  if (!token) redirect('/login'); // ✅ redirects if not logged in

  return (
    <main className="max-w-3xl mx-auto mt-10">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-4">Welcome! You are successfully logged in 🎉</p>
    </main>
  );
}


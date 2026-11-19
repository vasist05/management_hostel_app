import React, { useState } from 'react';
import { Building2, CheckCircle2, Lock, Mail } from 'lucide-react';
import { useHostel } from '../services/hostelStore';
import { Button, Card, Input } from '../components/ui/Primitives';

export const LoginPage: React.FC = () => {
  const { login, notifyToast } = useHostel();
  const [identifier, setIdentifier] = useState('owner@srisaihostel.in');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [resetTarget, setResetTarget] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = login(identifier, password);
    if (!res.ok) setError(res.error || 'Unable to sign in');
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget.trim()) return;
    notifyToast('info', `Demo mode: Reset instructions simulated for ${resetTarget}.`);
    setForgotMode(false);
    setResetTarget('');
  };

  const quickFill = (email: string) => {
    setIdentifier(email);
    setPassword('demo1234');
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            HOSTEL MANAGER V4.1
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            PG, Hostel &amp; Co-Living Operations Platform
          </p>
        </div>

        <Card className="p-6 sm:p-7">
          {!forgotMode ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Sign in to Workspace
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Use your registered email address or Indian mobile number
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                  {error}
                </div>
              )}

              <Input
                label="Email or Phone Number"
                placeholder="owner@srisaihostel.in or +91 98450 11223"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Owner &amp; Staff Roles
                </span>
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full py-2.5">
                <Lock className="h-4 w-4" /> Sign In to Dashboard
              </Button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Reset Password
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Enter your email or mobile number to receive a recovery link.
                </p>
              </div>
              <Input
                label="Registered Email or Mobile"
                placeholder="owner@srisaihostel.in"
                value={resetTarget}
                onChange={(e) => setResetTarget(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setForgotMode(false)}
                >
                  Back to Login
                </Button>
                <Button type="submit" className="flex-1">
                  <Mail className="h-4 w-4" /> Send Reset Link
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="mb-2.5 text-xs font-medium text-slate-500">
              Demo Role Accounts (Password: <span className="font-mono text-slate-700">demo1234</span>)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickFill('owner@srisaihostel.in')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => quickFill('warden@srisaihostel.in')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Warden
              </button>
              <button
                type="button"
                onClick={() => quickFill('accounts@srisaihostel.in')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Accountant
              </button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Sri Sai Executive PG · Bengaluru Demo Workspace · Local Browser Persistence
        </p>
      </div>
    </div>
  );
};

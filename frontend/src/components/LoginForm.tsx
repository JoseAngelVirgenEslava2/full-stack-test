'use client';

import React, { useState } from 'react';
import axios from 'axios';

interface LoginFormProps {
  onLogin: ()=> void;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post('http://localhost:4000/login', {
        email,
        password,
      });
      localStorage.setItem('token', res.data.token);
      onLogin();
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="flex flex-col justify-center items-center bg-zinc-950 min-h-screen pb-5 px-4">
      <div className="mx-auto flex w-full flex-col justify-center md:max-w-[50%] lg:max-w-[450px]">
        <div className="my-auto mt-20 flex flex-col w-full max-w-[450px]">
          <p className="text-[32px] font-bold text-white">Sign In</p>
          <p className="mb-4 mt-2 text-zinc-400">
            Enter your email and password to sign in!
          </p>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="mb-4">
            <div className="grid gap-4">
              <div>
                <label htmlFor="email" className="text-white block mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-400 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="password" className="text-white block mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-white text-zinc-950 hover:bg-white/90 py-3 font-medium text-base mt-2 transition-colors"
              >
                Sign in
              </button>
            </div>
          </form>

          <div className="text-sm text-white space-y-2">
            <p>
              <a href="#" className="hover:underline">
                Forgot your password?
              </a>
            </p>
            <p>
            </p>
            <p>
              <a href="#" className="hover:underline">
                Don’t have an account? Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
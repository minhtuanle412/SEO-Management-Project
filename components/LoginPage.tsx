
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../contexts/ToastContext';
import { ChartBarIcon, SpinnerIcon, QuestionMarkCircleIcon } from './Icons';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { addToast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        addToast('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.', 'success');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Auth state listener in AuthContext will handle redirect
        addToast('Đăng nhập thành công!', 'success');
      }
    } catch (error: any) {
      addToast(error.message || 'Đã xảy ra lỗi xác thực.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            <ChartBarIcon className="h-12 w-12 text-primary" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          SEO Management 2025
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isSignUp ? 'Đăng ký tài khoản mới' : 'Đăng nhập để tiếp tục'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleAuth}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Địa chỉ Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? <SpinnerIcon className="h-5 w-5" /> : (isSignUp ? 'Đăng ký' : 'Đăng nhập')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Hoặc
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
                <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:text-blue-700 font-medium text-sm"
                >
                    {isSignUp ? 'Đã có tài khoản? Đăng nhập ngay' : 'Chưa có tài khoản? Đăng ký ngay'}
                </button>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
            <Link to="/setup" className="inline-flex items-center text-gray-500 hover:text-primary transition-colors text-sm font-medium">
                <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />
                Hướng dẫn cài đặt & Cấu hình
            </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

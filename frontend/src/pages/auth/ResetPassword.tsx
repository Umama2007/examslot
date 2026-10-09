import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchClient, ApiError } from '../../api/client';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function ResetPassword() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema)
  });

  const passwordValue = watch('password', '');
  
  const hasLength = passwordValue.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(passwordValue);
  const hasDigit = /[0-9]/.test(passwordValue);

  const onSubmit = async (data: PasswordForm) => {
    if (!token) {
      setError('Invalid or missing token.');
      return;
    }
    try {
      setError('');
      await fetchClient('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: data.password }),
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="glass w-full max-w-md p-8 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-secondary mb-2">Password Reset Successful!</h2>
          <p className="text-secondary/70">Your password has been successfully reset. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      
      <div className="glass relative z-10 w-full max-w-md p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Reset Password</h1>
          <p className="text-secondary/70 mt-2 text-sm">Enter your new secure password.</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-secondary">New Password</label>
            <div className="relative">
              <input 
                {...register('password')} 
                type={showPassword ? 'text' : 'password'}
                className={`w-full p-2.5 rounded-lg border bg-white/50 focus:bg-white focus:ring-2 focus:outline-none transition-all ${errors.password ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-primary/20 focus:border-primary'}`}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            
            <div className="mt-2 space-y-1">
              <div className="flex items-center text-xs">
                <span className={`mr-2 ${hasLength ? 'text-green-500' : 'text-gray-400'}`}>●</span>
                <span className={hasLength ? 'text-gray-700' : 'text-gray-500'}>At least 8 characters</span>
              </div>
              <div className="flex items-center text-xs">
                <span className={`mr-2 ${hasLetter ? 'text-green-500' : 'text-gray-400'}`}>●</span>
                <span className={hasLetter ? 'text-gray-700' : 'text-gray-500'}>At least one letter</span>
              </div>
              <div className="flex items-center text-xs">
                <span className={`mr-2 ${hasDigit ? 'text-green-500' : 'text-gray-400'}`}>●</span>
                <span className={hasDigit ? 'text-gray-700' : 'text-gray-500'}>At least one digit</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-secondary">Confirm Password</label>
            <div className="relative">
              <input 
                {...register('confirmPassword')} 
                type={showConfirmPassword ? 'text' : 'password'}
                className={`w-full p-2.5 rounded-lg border bg-white/50 focus:bg-white focus:ring-2 focus:outline-none transition-all ${errors.confirmPassword ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-primary/20 focus:border-primary'}`}
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !token}
            className="w-full bg-primary hover:bg-primary-hover text-white p-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

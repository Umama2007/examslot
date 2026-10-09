import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { fetchClient, ApiError } from '../../api/client';
import { Loader2, MailCheck } from 'lucide-react';

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema)
  });

  const onSubmit = async (data: ForgotForm) => {
    try {
      setError('');
      await fetchClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      // Always show success regardless of account existence
      setSuccess(true);
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
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MailCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-secondary mb-2">Check your email</h2>
          <p className="text-secondary/70 mb-6">If an account with that email exists, a password reset link has been sent.</p>
          <Link to="/login" className="text-primary hover:underline font-medium">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      
      <div className="glass relative z-10 w-full max-w-md p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Forgot Password</h1>
          <p className="text-secondary/70 mt-2 text-sm">Enter your email and we'll send you a reset link.</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-secondary">Email</label>
            <input 
              {...register('email')} 
              className={`w-full p-2.5 rounded-lg border bg-white/50 focus:bg-white focus:ring-2 focus:outline-none transition-all ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-primary/20 focus:border-primary'}`}
              placeholder="Enter your email"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary-hover text-white p-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Send Reset Link'}
          </button>

          <div className="text-center mt-4">
            <Link to="/login" className="text-sm text-secondary/70 hover:text-primary transition-colors">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

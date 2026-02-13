import React from 'react';
import { Button } from './ui/button';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-3xl">CH</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CoHive</h1>
          <p className="text-lg text-gray-600">
            AI-Powered Workflow Intelligence
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-600 mb-6">
            Sign in to access your CoHive workspace
          </p>

          {/* Features list */}
          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Hexagonal Workflow Navigation</p>
                <p className="text-xs text-gray-500">Visual breadcrumb system for complex processes</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Databricks Integration</p>
                <p className="text-xs text-gray-500">Seamless connection to your data workspace</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Template System</p>
                <p className="text-xs text-gray-500">Customizable workflows for different roles</p>
              </div>
            </div>
          </div>

          {/* Login button */}
          <Button
            onClick={onLogin}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            Continue to CoHive
          </Button>

          <p className="text-xs text-gray-500 text-center mt-6">
            By continuing, you agree to connect with Databricks
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Contact your administrator
        </p>
      </div>
    </div>
  );
}

export default Login;

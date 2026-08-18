import React from 'react';

const Hero = () => {
  return (
    <div className="bg-gradient-to-br from-primary/10 to-secondary/10 py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl tracking-tight font-extrabold text-slate-900 sm:text-5xl md:text-6xl">
          <span className="block xl:inline">Never miss an</span>{' '}
          <span className="block text-primary xl:inline">expiry date again</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-slate-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Manage your inventory effortlessly. Scan UPC codes, track expiration dates, and get notified before products go bad to reduce waste and save money.
        </p>
        <div className="mt-10 sm:flex sm:justify-center">
          <div className="rounded-md shadow">
            <a
              href="/register"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-opacity-90 md:py-4 md:text-lg md:px-10 transition-all duration-300 transform hover:scale-105"
            >
              Get Started for Free
            </a>
          </div>
          <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
            <a
              href="/login"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-white hover:bg-slate-50 md:py-4 md:text-lg md:px-10 transition-colors"
            >
              Login to Account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;

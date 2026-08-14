import React from 'react';

const Header = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <span className="font-bold text-2xl text-primary">Expiry Manager</span>
          </div>
          <nav className="flex space-x-4">
            <a href="/login" className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Login
            </a>
            <a href="/register" className="bg-primary text-white hover:bg-opacity-90 px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Register
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;

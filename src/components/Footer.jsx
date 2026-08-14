import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-base text-gray-400">
          &copy; {new Date().getFullYear()} Expiry Date Manager. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

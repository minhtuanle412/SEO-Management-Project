
import React from 'react';
import { Link } from 'react-router-dom';
import { ChartBarIcon } from './Icons';


const Header: React.FC = () => {
  return (
    <header className="bg-primary shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
             <ChartBarIcon className="h-8 w-8 text-white"/>
            <span className="text-2xl font-bold text-white">
              Trình quản lý dự án SEO
            </span>
          </Link>
          <div className="text-sm text-secondary">
            Dành cho Account & Kế toán
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

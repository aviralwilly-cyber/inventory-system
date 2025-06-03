import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
            Inventory Management System
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => navigate('/foh')}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-8 text-xl font-semibold transition duration-200 shadow-md hover:shadow-lg"
            >
              Front of House (FOH)
            </button>
            
            <button 
              className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg p-8 text-xl font-semibold transition duration-200 shadow-md hover:shadow-lg"
            >
              Back of House (BOH)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

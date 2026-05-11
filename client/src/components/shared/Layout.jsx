import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:ml-72 lg:px-10">
        {children}
      </main>
    </div>
  );
};

export default Layout; 

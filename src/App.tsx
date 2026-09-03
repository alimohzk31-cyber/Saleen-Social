/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Network } from '@capacitor/network';
import { WifiOff, RefreshCw } from 'lucide-react';
import Layout from './components/Layout';
import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';
import AdminDashboard from './pages/AdminDashboard';
import AboutUs from './pages/AboutUs';
import { ServicesProvider } from './context/ServicesContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Only scroll to top if there's no saved position (meaning it's a new navigation)
    const isHome = pathname === '/';
    const isCategory = pathname.startsWith('/category/');
    const categoryId = isCategory ? pathname.split('/').pop() : '';
    
    const hasSavedHome = sessionStorage.getItem('homeScrollPos');
    const hasSavedCategory = categoryId ? sessionStorage.getItem(`categoryScrollPos-${categoryId}`) : null;

    if (!hasSavedHome && !hasSavedCategory) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}

export default function App() {
  useEffect(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <ServicesProvider>
          <HashRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="category/:id" element={<CategoryPage />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="about" element={<AboutUs />} />
              </Route>
            </Routes>
          </HashRouter>
        </ServicesProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

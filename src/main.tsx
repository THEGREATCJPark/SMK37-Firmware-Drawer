import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
if(import.meta.env.PROD && 'serviceWorker' in navigator) window.addEventListener('load',()=>{
  // No skipWaiting, controllerchange reload, or forced activation during an installation.
  navigator.serviceWorker.register(new URL('./sw.js', document.baseURI).href).catch(()=>{});
});

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import FriendPreview from './screens/FriendPreview.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'friends' ? <FriendPreview /> : <App />}
  </StrictMode>
);

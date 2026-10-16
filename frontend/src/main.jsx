import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './design/ui.css';
import FriendPreview from './screens/FriendPreview.jsx';
import FriendIdentityReview from './screens/FriendIdentityReview.jsx';
import AuthGate from './auth/AuthGate.jsx';
import CharacterStatePreview from '../dev/CharacterStatePreview.jsx';

const preview = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('preview') : null;
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {preview === 'character-state' ? <CharacterStatePreview /> : preview === 'friends' ? new URLSearchParams(window.location.search).get('review') === 'abc' ? <FriendIdentityReview /> : <FriendPreview /> : <AuthGate><App /></AuthGate>}
  </StrictMode>
);

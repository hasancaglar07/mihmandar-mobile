import React from 'react';
import MinimalPrayerScreen from './src/screens/MinimalPrayerScreen';
import WebContentScreen from './src/screens/WebContentScreen';

function App(): React.JSX.Element {
  // Test için anasayfayı aç (header + NamazWidget). Beğenilirse sonra release'e alırız.
  return <WebContentScreen path="/" title="Mihmandar" />;
}

export default App;

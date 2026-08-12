const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const syncStateCode = `
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  useEffect(() => {
    const handleOnline = () => setSyncStatus('synced');
    const handleOffline = () => setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) setSyncStatus('offline');
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
`;

content = content.replace(/export default function App\(\) \{[\s\S]*?(?=const \[projectMeta)/, "export default function App() {\n" + syncStateCode + "\n  ");

content = content.replace(/<Header/g, "<Header syncStatus={syncStatus}");

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx for sync status state");

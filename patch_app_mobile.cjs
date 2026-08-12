const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Add states
const stateInjection = `  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isDashboardTab = !isMobile || activeTab === 'dashboard';
  const isPlanosTab = !isMobile || activeTab === 'planos';
  const isBitacoraTab = !isMobile || activeTab === 'bitacora';
  const isSectoresTab = !isMobile || activeTab === 'sectores';
`;

content = content.replace(/export default function App\(\) \{/, "export default function App() {\n" + stateInjection);

// Modify main container for bottom padding on mobile
content = content.replace(/<div className="min-h-screen bg-slate-100 text-slate-900 p-2 sm:p-4 flex flex-col gap-3 max-w-\[1700px\] mx-auto print-container">/, 
  `<div className="min-h-[100dvh] bg-slate-100 text-slate-900 p-2 sm:p-4 flex flex-col gap-3 max-w-[1700px] mx-auto print-container pb-[calc(env(safe-area-inset-bottom)+70px)] lg:pb-4">`);

fs.writeFileSync('src/App.tsx', content);

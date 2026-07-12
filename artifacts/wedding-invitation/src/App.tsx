import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Home from './pages/Home';
import Scanner from './pages/Scanner';
import Admin from './pages/Admin';
import Wall from './pages/Wall';
import TableMoments from './pages/TableMoments';
import Memories from './pages/Memories';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/i/:token" component={Home} />
      <Route path="/scanner" component={Scanner} />
      <Route path="/admin" component={Admin} />
      <Route path="/wall" component={Wall} />
      <Route path="/t/:tableToken" component={TableMoments} />
      <Route path="/memories" component={Memories} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

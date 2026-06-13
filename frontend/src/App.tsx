import { CopilotKit } from '@copilotkit/react-core';
import '@copilotkit/react-ui/styles.css';
import { WealthManagerApp } from './components/WealthManagerApp';

export default function App() {
  return (
    <CopilotKit runtimeUrl="/api/agent">
      <WealthManagerApp />
    </CopilotKit>
  );
}

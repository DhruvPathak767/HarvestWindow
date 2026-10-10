import { HashRouter } from "react-router-dom";
import { AppRoutes } from "@/app/router";
import { AppStoreProvider } from "@/store/AppStore";
import { ToastProvider } from "@/components/feedback/ToastProvider";

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AppStoreProvider>
          <AppRoutes />
        </AppStoreProvider>
      </ToastProvider>
    </HashRouter>
  );
}

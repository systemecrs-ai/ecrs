import GradientBackground from "@/components/ui/GradientBackground";
import Header from "@/components/layout/Header";
import ChatInterface from "@/components/chat/ChatInterface";

import DocumentUploader from "@/components/ui/DocumentUploader";

/**
 * Home Page
 *
 * Main application page rendering the StyleAI chat interface
 * and document ingestion UI with animated background.
 */
export default function Home() {
  return (
    <>
      <GradientBackground />
      <div className="flex h-screen flex-col">
        <Header />
        <main className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Main Chat Interface */}
          <div className="flex-1 border-r border-white/10 overflow-hidden relative">
            <ChatInterface />
          </div>
          
          {/* Sidebar: Document Ingestion */}
          <div className="w-full lg:w-96 xl:w-[450px] overflow-y-auto bg-black/20 backdrop-blur-xl shrink-0 border-t lg:border-t-0 border-white/10 p-6 hidden md:block">
            <DocumentUploader />
          </div>
        </main>
      </div>
    </>
  );
}

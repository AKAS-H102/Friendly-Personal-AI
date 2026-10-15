import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  Code2,
  Download,
  Copy,
  Check,
  FileCode,
  FolderArchive,
  Monitor,
  Smartphone,
  ExternalLink,
  Terminal,
  FileText
} from 'lucide-react';
import { WINDOWS_FILES, ANDROID_FILES, CodeFile } from '../data/codeFiles';

export const CodeHub: React.FC = () => {
  const [activePlatform, setActivePlatform] = useState<'windows' | 'android'>('windows');
  const [selectedFile, setSelectedFile] = useState<CodeFile>(WINDOWS_FILES[0]);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const files = activePlatform === 'windows' ? WINDOWS_FILES : ANDROID_FILES;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadZip = async (platform: 'windows' | 'android') => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const filesToZip = platform === 'windows' ? WINDOWS_FILES : ANDROID_FILES;
      const folderName = platform === 'windows' ? 'machi_windows_desktop' : 'machi_android_flutter';

      const root = zip.folder(folderName);
      if (root) {
        filesToZip.forEach((file) => {
          // Strip prefix folder if present to keep zip neat
          const relativePath = file.path.replace(/^(windows_machi|android_machi)\//, '');
          root.file(relativePath, file.content);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${folderName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Download Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Source Code Hub & Deliverables</h2>
              <p className="text-xs text-slate-400">
                Complete, standalone source code for Windows 11 Desktop & Android APK
              </p>
            </div>
          </div>

          {/* Quick ZIP Download Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleDownloadZip('windows')}
              disabled={isDownloading}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download Windows (.zip)</span>
            </button>
            <button
              onClick={() => handleDownloadZip('android')}
              disabled={isDownloading}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-600/20 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Android APK (.zip)</span>
            </button>
          </div>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => {
              setActivePlatform('windows');
              setSelectedFile(WINDOWS_FILES[0]);
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activePlatform === 'windows'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Windows Desktop (Python 3.12 / PySide6)</span>
          </button>

          <button
            onClick={() => {
              setActivePlatform('android');
              setSelectedFile(ANDROID_FILES[0]);
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activePlatform === 'android'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android APK (Flutter / Kotlin / OPPO CPH2527)</span>
          </button>
        </div>

        {/* File Navigator & Code Viewer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
          {/* File Tree List */}
          <div className="md:col-span-4 space-y-1.5">
            <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              Project Files:
            </span>
            <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
              {files.map((file) => {
                const isSelected = selectedFile.path === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-start space-x-2.5 ${
                      isSelected
                        ? 'bg-slate-800 text-cyan-300 border border-cyan-500/50'
                        : 'bg-slate-950/70 text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-slate-800/80'
                    }`}
                  >
                    <FileCode className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <div className="truncate">
                      <div className="font-semibold text-white truncate">{file.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{file.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="md:col-span-8 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            {/* Code Header Bar */}
            <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400/80" />
                <span className="text-xs font-mono font-bold text-slate-200">{selectedFile.path}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                  {selectedFile.language}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition-all"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Code Content */}
            <div className="p-4 overflow-x-auto max-h-[420px] font-mono text-xs text-slate-300 leading-relaxed whitespace-pre selection:bg-cyan-500/30">
              {selectedFile.content}
            </div>
          </div>
        </div>
      </div>

      {/* Build & Packaging Terminal Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Windows 11 Build Box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Windows 11 Build Commands</span>
          </div>
          <p className="text-xs text-slate-400">
            Run PyInstaller from the activated virtual environment to generate a standalone Windows application executable.
          </p>
          <div className="bg-slate-950 p-3 rounded-xl font-mono text-[11px] text-cyan-300 border border-slate-800/90 space-y-1">
            <div>cd windows_machi</div>
            <div>python -m venv venv</div>
            <div>.\venv\Scripts\activate</div>
            <div>pip install -r requirements.txt</div>
            <div>pyinstaller --noconfirm --onedir --windowed main.py</div>
          </div>
        </div>

        {/* Android APK Build Box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Android APK Build Commands</span>
          </div>
          <p className="text-xs text-slate-400">
            Build the installable APK using Flutter and install directly to OPPO CPH2527 via ADB or file transfer.
          </p>
          <div className="bg-slate-950 p-3 rounded-xl font-mono text-[11px] text-emerald-300 border border-slate-800/90 space-y-1">
            <div>cd android_machi</div>
            <div>flutter pub get</div>
            <div>flutter build apk --release</div>
            <div className="text-slate-500"># Output: build/app/outputs/flutter-apk/app-release.apk</div>
            <div>adb install -r build/app/outputs/flutter-apk/app-release.apk</div>
          </div>
        </div>
      </div>
    </div>
  );
};

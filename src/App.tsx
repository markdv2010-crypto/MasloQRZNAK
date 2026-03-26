import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File as FileIcon, Trash2, Settings, Download, Loader2, CheckCircle2, AlertCircle, QrCode } from 'lucide-react';
import { processPdfFile, ExtractedCode } from './lib/pdfProcessor';
import { generateGridPdf, PdfOptions } from './lib/pdfGenerator';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedCodes, setExtractedCodes] = useState<ExtractedCode[]>([]);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [options, setOptions] = useState<PdfOptions>({
    columns: 3,
    rows: 10,
    margin: 10,
    showCutLines: true,
    showGtin: true,
    orientation: 'portrait',
    codeScale: 0.8,
    useFixedSize: true,
    fixedSizeMm: 40,
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    let allNewCodes: ExtractedCode[] = [];

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      setProcessingStatus(`Обработка файла ${i + 1} из ${acceptedFiles.length}: ${file.name}`);
      try {
        const codes = await processPdfFile(file, (p) => {
          setProgress(((i + p) / acceptedFiles.length) * 100);
        });
        if (codes.length === 0) {
          console.warn(`No codes found in ${file.name}`);
        }
        allNewCodes = [...allNewCodes, ...codes];
      } catch (err: any) {
        console.error(`Error processing ${file.name}:`, err);
        setError(`Ошибка при обработке ${file.name}: ${err.message || 'Неизвестная ошибка. Возможно, файл поврежден или не является PDF.'}`);
      }
    }

    if (allNewCodes.length === 0 && acceptedFiles.length > 0 && !error) {
      setError('В загруженных файлах не найдено ни одного кода маркировки. Убедитесь, что PDF содержит четкие DataMatrix или QR коды.');
    }

    setExtractedCodes(prev => {
      // Filter out duplicates by text
      const existingTexts = new Set(prev.map(c => c.text));
      const uniqueNewCodes = allNewCodes.filter(c => !existingTexts.has(c.text));
      return [...prev, ...uniqueNewCodes];
    });
    
    setIsProcessing(false);
    setProgress(0);
    setProcessingStatus('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    }
  } as any);

  const handleGeneratePdf = () => {
    if (extractedCodes.length === 0) return;
    try {
      generateGridPdf(extractedCodes, options);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setError(`Ошибка при генерации PDF: ${err.message || 'Неизвестная ошибка'}`);
    }
  };

  const clearCodes = () => {
    setExtractedCodes([]);
  };

  const removeCode = (id: string) => {
    setExtractedCodes(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass-card sticky top-0 z-50 px-6 py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 bg-blue-600 rounded-lg accent-glow">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                МаслоМаркет <span className="text-blue-400">Объединение QR</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-blue-500/80 font-bold">Проклятый Знак</p>
            </div>
          </motion.div>
          
          <div className="flex flex-col items-end">
            {extractedCodes.length > 0 && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20"
              >
                НАЙДЕНО: {extractedCodes.length}
              </motion.div>
            )}
            <div className="text-[9px] text-white/30 mt-1 font-mono">M.A.R.A.T GUARD PROTECTED</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 w-full">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Dropzone */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            {...getRootProps()} 
            className={cn(
              "glass-card relative overflow-hidden border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300",
              isDragActive ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:border-blue-500/50 hover:bg-white/5",
              isProcessing && "opacity-50 pointer-events-none"
            )}
          >
            {isProcessing && <div className="scan-line" />}
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">Загрузить PDF</p>
                <p className="text-xs text-white/50 mt-1">Перетащите файлы сюда или нажмите для выбора</p>
              </div>
            </div>
          </motion.div>

          {/* Processing Status */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="glass-card p-5 rounded-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-xs font-medium text-white/80">{processingStatus}</span>
                  </div>
                  <span className="text-xs font-bold text-blue-400">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <motion.div 
                    className="bg-blue-500 h-full accent-glow" 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Status */}
          {error && !isProcessing && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-400">
                <p className="font-bold">Ошибка загрузки</p>
                <p className="mt-1 opacity-80">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Settings Panel */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 rounded-2xl space-y-6"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Settings className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">Конфигурация Сетки</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={options.useFixedSize}
                      onChange={e => setOptions({...options, useFixedSize: e.target.checked})}
                      className="peer sr-only"
                    />
                    <div className="w-10 h-5 bg-white/10 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </div>
                  <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">Фикс. размер (40x40 мм)</span>
                </label>
              </div>

              {!options.useFixedSize ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Колонки</label>
                    <input 
                      type="number" 
                      min="1" max="10" 
                      value={options.columns}
                      onChange={e => setOptions({...options, columns: parseInt(e.target.value) || 1})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Ряды</label>
                    <input 
                      type="number" 
                      min="1" max="20" 
                      value={options.rows}
                      onChange={e => setOptions({...options, rows: parseInt(e.target.value) || 1})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Размер кода (мм)</label>
                  <input 
                    type="number" 
                    min="10" max="100" 
                    value={options.fixedSizeMm}
                    onChange={e => setOptions({...options, fixedSizeMm: parseInt(e.target.value) || 10})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Ориентация</label>
                <select 
                  value={options.orientation}
                  onChange={e => setOptions({...options, orientation: e.target.value as any})}
                  className="w-full bg-gray-900 border border-white/20 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500/50 outline-none transition-all appearance-none"
                >
                  <option value="portrait" className="bg-gray-900 text-white">Книжная</option>
                  <option value="landscape" className="bg-gray-900 text-white">Альбомная</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Масштаб</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="0.1" max="1.0" step="0.05"
                    value={options.codeScale}
                    onChange={e => setOptions({...options, codeScale: parseFloat(e.target.value)})}
                    className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none accent-blue-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-white/60 w-8">{Math.round(options.codeScale * 100)}%</span>
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Отступы страницы (мм)</label>
                <input 
                  type="number" 
                  min="0" max="50" 
                  value={options.margin}
                  onChange={e => setOptions({...options, margin: parseInt(e.target.value) || 0})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/5">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={options.showCutLines}
                  onChange={e => setOptions({...options, showCutLines: e.target.checked})}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500/50"
                />
                <span className="text-xs font-medium text-white/60 group-hover:text-white/90 transition-colors">Линии реза</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={options.showGtin}
                  onChange={e => setOptions({...options, showGtin: e.target.checked})}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500/50"
                />
                <span className="text-xs font-medium text-white/60 group-hover:text-white/90 transition-colors">Печатать GTIN</span>
              </label>
            </div>
          </motion.div>

          {/* Actions */}
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGeneratePdf}
              disabled={extractedCodes.length === 0 || isProcessing}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed text-white py-4 px-6 rounded-2xl font-bold transition-all accent-glow shadow-lg shadow-blue-600/20"
            >
              <Download className="w-5 h-5" />
              СГЕНЕРИРОВАТЬ PDF
            </motion.button>
            
            {extractedCodes.length > 0 && (
              <button
                onClick={clearCodes}
                className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-red-400 py-2 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <Trash2 className="w-3 h-3" />
                Очистить базу
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-8">
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="glass-card rounded-2xl h-full min-h-[600px] flex flex-col overflow-hidden"
          >
            <div className="px-8 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/80">Терминал Просмотра</h2>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-white/30">
                  {extractedCodes.length > 0 ? `STATUS: ONLINE [${extractedCodes.length}]` : 'STATUS: WAITING'}
                </span>
              </div>
            </div>
            
            <div className="p-8 flex-1 overflow-auto custom-scrollbar">
              {extractedCodes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4">
                  <div className="relative">
                    <FileIcon className="w-20 h-20 opacity-10" />
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-2 border-dashed border-blue-500/20 rounded-full"
                    />
                  </div>
                  <p className="text-sm font-medium tracking-wide">ОЖИДАНИЕ ВХОДНЫХ ДАННЫХ...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6">
                  <AnimatePresence mode="popLayout">
                    {extractedCodes.map((code, idx) => (
                      <motion.div 
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        key={code.id} 
                        className="relative glass-card rounded-xl p-4 flex flex-col items-center gap-3 hover:border-blue-500/50 transition-all group bg-white/5"
                      >
                        <button 
                          onClick={() => removeCode(code.id)}
                          className="absolute -top-2 -right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="w-full aspect-square bg-white rounded-lg flex items-center justify-center p-3 shadow-inner">
                          <img src={code.imageUrl} alt="QR" className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="text-center w-full space-y-1">
                          <div className="text-[9px] font-bold text-blue-400/60 uppercase tracking-tighter">GTIN</div>
                          <p className="text-[10px] font-mono text-white/80 truncate px-1" title={code.gtin}>
                            {code.gtin}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="px-8 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <p className="text-[10px] text-white/20 font-medium">
            © 2026 МаслоМаркет. Все права защищены.
          </p>
          <div className="h-3 w-[1px] bg-white/10 hidden sm:block"></div>
          <p className="text-[10px] text-blue-500/50 font-bold tracking-widest">
            ЗАЩИЩЕНО M.A.R.A.T GUARD
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">System Secure</span>
        </div>
      </footer>
    </div>
  );
}

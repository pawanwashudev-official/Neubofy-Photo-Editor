"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'cropperjs';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import {
  FiSettings, FiRotateCcw, FiRotateCw,
  FiCrop, FiDownload, FiCopy, FiUploadCloud, FiTrash2, FiImage, FiCornerUpLeft, FiCornerUpRight
} from 'react-icons/fi';
import { TbFlipHorizontal, TbFlipVertical } from 'react-icons/tb';

export default function Home() {
  const [filters, setFilters] = useState({
    br: 100, ct: 100, sa: 100, bl: 0, hu: 0, se: 0, in: 0
  });

  const [transforms, setTransforms] = useState({
    rotate: 0, flipH: 1, flipV: 1
  });

  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [lockAspect, setLockAspect] = useState(true);

  const [bgColor, setBgColor] = useState('#ffffff');
  const [useBgColor, setUseBgColor] = useState(false);

  const [mainImageSrc, setMainImageSrc] = useState<string | null>(null);
  const [finalImageBlob, setFinalImageBlob] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [exportFormat, setExportFormat] = useState('image/png');
  const [exportQuality, setExportQuality] = useState(85);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [keys, setKeys] = useState({ imgbb: '', cloud: '', preset: '' });

  // Load keys on mount
  useEffect(() => {
    setKeys({
      imgbb: localStorage.getItem('nb_imgbb') || '',
      cloud: localStorage.getItem('nb_cloud') || '',
      preset: localStorage.getItem('nb_preset') || ''
    });
  }, []);

  const saveKeys = () => {
    localStorage.setItem('nb_imgbb', keys.imgbb);
    localStorage.setItem('nb_cloud', keys.cloud);
    localStorage.setItem('nb_preset', keys.preset);
    setShowSettings(false);
  };

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Cropper State
  const [isCropping, setIsCropping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const cropperImageRef = useRef<HTMLImageElement>(null);

  // --- History Engine ---
  const pushHistory = useCallback(() => {
    if (!mainImageSrc) return;
    const currentState = {
      filters: { ...filters },
      transforms: { ...transforms },
      dimensions: { ...dimensions },
      bgColor,
      useBgColor,
      mainImageSrc
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [filters, transforms, dimensions, bgColor, useBgColor, mainImageSrc, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      applyHistoryState(prevState);
      setHistoryIndex(prev => prev - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      applyHistoryState(nextState);
      setHistoryIndex(prev => prev + 1);
    }
  };

  const applyHistoryState = (state: any) => {
    setFilters(state.filters);
    if(state.transforms) setTransforms(state.transforms);
    setDimensions(state.dimensions);
    setBgColor(state.bgColor);
    setUseBgColor(state.useBgColor);
    setMainImageSrc(state.mainImageSrc);
  };

  const renderCanvas = useCallback(() => {
    if (!mainImageSrc || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = mainImageSrc;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = dimensions.w || img.width;
      const h = dimensions.h || img.height;

      // Determine canvas size based on rotation
      const isRotated90 = Math.abs(transforms.rotate) % 180 === 90;
      canvas.width = isRotated90 ? h : w;
      canvas.height = isRotated90 ? w : h;

      if (useBgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.filter = `brightness(${filters.br}%) contrast(${filters.ct}%) saturate(${filters.sa}%) blur(${filters.bl}px) hue-rotate(${filters.hu}deg) sepia(${filters.se}%) invert(${filters.in}%)`;

      // Apply transforms
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((transforms.rotate * Math.PI) / 180);
      ctx.scale(transforms.flipH, transforms.flipV);

      ctx.drawImage(img, -w / 2, -h / 2, w, h);

      setFinalImageBlob(canvas.toDataURL(exportFormat, exportQuality / 100));
    };
  }, [mainImageSrc, dimensions, useBgColor, bgColor, filters, transforms, exportFormat, exportQuality]);

  useEffect(() => {
    if (!isCropping) {
        renderCanvas();
    }
  }, [renderCanvas, isCropping]);

  const handleFilterChange = (key: string, value: number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetVisuals = () => {
    setFilters({ br: 100, ct: 100, sa: 100, bl: 0, hu: 0, se: 0, in: 0 });
  };

  const handleRotate = (deg: number) => {
    setTransforms(prev => ({ ...prev, rotate: (prev.rotate + deg) % 360 }));
    pushHistory();
  };

  const handleFlip = (axis: 'h' | 'v') => {
    setTransforms(prev => ({
      ...prev,
      flipH: axis === 'h' ? prev.flipH * -1 : prev.flipH,
      flipV: axis === 'v' ? prev.flipV * -1 : prev.flipV
    }));
    pushHistory();
  };

  const resetTransforms = () => {
    setTransforms({ rotate: 0, flipH: 1, flipV: 1 });
    pushHistory();
  };

  const handleDimensionChange = (axis: 'w' | 'h', value: number) => {
    if (lockAspect && aspectRatio) {
      if (axis === 'w') {
        setDimensions({ w: value, h: Math.round(value / aspectRatio) });
      } else {
        setDimensions({ w: Math.round(value * aspectRatio), h: value });
      }
    } else {
      setDimensions(prev => ({ ...prev, [axis]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        setMainImageSrc(src);

        const img = new Image();
        img.onload = () => {
          setDimensions({ w: img.width, h: img.height });
          setAspectRatio(img.width / img.height);
          // Only push history on initial load when history is empty
          if (history.length === 0) {
              setTimeout(() => {
                  setHistory([{
                    filters: {br: 100, ct: 100, sa: 100, bl: 0, hu: 0, se: 0, in: 0},
                    transforms: {rotate: 0, flipH: 1, flipV: 1},
                    dimensions: {w: img.width, h: img.height},
                    bgColor: '#ffffff',
                    useBgColor: false,
                    mainImageSrc: src
                  }]);
                  setHistoryIndex(0);
              }, 100);
          }
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
  };

  // --- AI Background Removal ---
  const handleBgRemove = async () => {
    if (!canvasRef.current || !mainImageSrc) return;
    setIsLoading(true);

    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });

    selfieSegmentation.setOptions({
      modelSelection: 1,
    });

    selfieSegmentation.onResults((results) => {
      const canvas = document.createElement('canvas');
      canvas.width = results.image.width;
      canvas.height = results.image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      setMainImageSrc(canvas.toDataURL('image/png'));
      setIsLoading(false);
      pushHistory();
    });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = finalImageBlob || mainImageSrc;
    img.onload = async () => {
      await selfieSegmentation.send({ image: img });
    };
  };

  // --- Cropper ---
  const activateCropper = () => {
    if (!finalImageBlob) return;
    setIsCropping(true);

    // Allow DOM to render the image element first
    setTimeout(() => {
        if (cropperImageRef.current) {
            cropperRef.current = new Cropper(cropperImageRef.current, {
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.8,
            });
        }
    }, 100);
  };

  const applyCrop = () => {
    if (cropperRef.current) {
      const croppedCanvas = cropperRef.current.getCroppedCanvas();
      const newSrc = croppedCanvas.toDataURL('image/png');

      setMainImageSrc(newSrc);
      setDimensions({ w: croppedCanvas.width, h: croppedCanvas.height });
      setAspectRatio(croppedCanvas.width / croppedCanvas.height);

      cropperRef.current.destroy();
      cropperRef.current = null;
      setIsCropping(false);
      pushHistory();
    }
  };

  const cancelCrop = () => {
    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = null;
    }
    setIsCropping(false);
  };

  const handleDownload = () => {
     if(!finalImageBlob) return;
     const a = document.createElement('a');
     a.href = finalImageBlob;

     const extMap: Record<string, string> = {
       'image/jpeg': 'jpg',
       'image/png': 'png',
       'image/webp': 'webp'
     };
     const ext = extMap[exportFormat] || 'png';

     a.download = `NEUBOFY_MASTER_${Date.now()}.${ext}`;
     a.click();
  };

  const handleCloudUpload = async (provider: 'imgbb' | 'cloudinary') => {
    if (!finalImageBlob) return;
    setIsLoading(true);

    try {
        const res = await fetch(finalImageBlob);
        const blob = await res.blob();
        const fd = new FormData();

        let uploadRes, data, url = '';

        if (provider === 'imgbb') {
            const k = localStorage.getItem('nb_imgbb')?.trim();
            if(!k) throw new Error("Vault Missing ImgBB Key");
            fd.append('image', blob);
            fd.append('key', k);
            uploadRes = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
        } else {
            const n = localStorage.getItem('nb_cloud')?.trim();
            const pr = localStorage.getItem('nb_preset')?.trim();
            if(!n || !pr) throw new Error("Vault Missing Cloudinary Config");
            fd.append('file', blob);
            fd.append('upload_preset', pr);
            uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${n}/image/upload`, { method: 'POST', body: fd });
        }

        data = await uploadRes.json();
        url = data.data?.url || data.secure_url;

        if (!url) throw new Error("Cloud Refusal: Invalid Response");

        alert(`Cloud Sync Verified. Image URL copied to clipboard!\n${url}`);
        navigator.clipboard.writeText(url);
    } catch (e: any) {
        alert(e.message || "Upload Failed");
    } finally {
        setIsLoading(false);
    }
  };

  const handleKBCalibration = async () => {
    const kb = prompt("Enter target KB:");
    const targetKb = parseFloat(kb || "");
    if (!targetKb || !canvasRef.current) return;

    setIsLoading(true);
    setExportFormat('image/jpeg'); // Must be jpeg/webp to use quality params

    // Binary search to find optimal quality
    let min = 0.01, max = 1.0, best = 0.5;

    // Using a promise-based generator since canvas.toBlob is async
    const canvas = canvasRef.current;

    for (let i = 0; i < 15; i++) {
        best = (min + max) / 2;

        const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', best));
        if(!blob) continue;

        if (blob.size / 1024 > targetKb) {
            max = best;
        } else {
            min = best;
        }
    }

    setExportQuality(Math.round(best * 100));
    setIsLoading(false);
    alert(`Precision KB Calibration Done. Export quality set to ${Math.round(best * 100)}%`);
  };

  const currentSizeKb = finalImageBlob ? (finalImageBlob.length * (3/4) / 1024).toFixed(1) : "0";

  return (
    <div className="p-3 md:p-6 pb-20">
      {/* Header */}
      <header className="glass-card mb-6 p-4 flex justify-between items-center max-w-[1500px] mx-auto shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-yellow-500/20 shadow-xl">
            <span className="text-yellow-500 text-xl font-black italic">N</span>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase leading-none text-slate-800">Neubofy <span className="text-yellow-600">Elite</span></h1>
            <p className="text-[8px] font-bold text-gray-400 tracking-[.4em] uppercase mt-1">PRO v9.0 • REACT EDITION</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={undo} disabled={historyIndex <= 0} className={`p-3 bg-white border rounded-xl hover:bg-yellow-50 transition-all ${historyIndex <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <FiCornerUpLeft size={18} />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className={`p-3 bg-white border rounded-xl hover:bg-yellow-50 transition-all ${historyIndex >= history.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <FiCornerUpRight size={18} />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-3 btn-brown rounded-xl shadow-lg">
            <FiSettings size={20} />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Sidebar - Visuals & Transform */}
        <div className="lg:col-span-3 order-2 lg:order-1 space-y-4 sidebar-scroll no-scrollbar">

          {/* Visual Studio */}
          <div className="glass-card p-5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[9px] font-black text-yellow-800 uppercase tracking-[0.2em]">Visual Studio</h3>
              <button onClick={resetVisuals} className="text-[8px] font-black text-ruby-600 bg-ruby-50 px-2 py-1 rounded">RESET</button>
            </div>
            <div className="space-y-4">
              {[
                { id: 'br', label: 'Bright', min: 0, max: 200, val: filters.br },
                { id: 'ct', label: 'Contrast', min: 0, max: 200, val: filters.ct },
                { id: 'sa', label: 'Saturation', min: 0, max: 200, val: filters.sa },
                { id: 'bl', label: 'Blur', min: 0, max: 20, val: filters.bl },
                { id: 'hu', label: 'Hue', min: 0, max: 360, val: filters.hu },
                { id: 'se', label: 'Sepia', min: 0, max: 100, val: filters.se },
                { id: 'in', label: 'Invert', min: 0, max: 100, val: filters.in },
              ].map(f => (
                <div key={f.id} className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase">
                    <span>{f.label}</span><span>{f.val}</span>
                  </div>
                  <input
                    type="range" min={f.min} max={f.max} value={f.val}
                    onChange={(e) => handleFilterChange(f.id, parseInt(e.target.value))}
                    onMouseUp={pushHistory}
                    onTouchEnd={pushHistory}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div className="glass-card p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[9px] font-black text-yellow-800 uppercase tracking-[0.2em]">Background Color</h3>
              <button onClick={() => { setUseBgColor(false); setBgColor('#ffffff'); }} className="text-[8px] font-black text-ruby-600 bg-ruby-50 px-2 py-1 rounded">CLEAR</button>
            </div>
            <div className="space-y-2">
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-full h-8 rounded cursor-pointer border-0 p-0" />
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={useBgColor} onChange={(e) => setUseBgColor(e.target.checked)} className="accent-yellow-600" />
                <label className="text-[9px] font-black uppercase">Apply Background Color</label>
              </div>
            </div>
          </div>

          {/* Transform */}
          <div className="glass-card p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[9px] font-black text-yellow-800 uppercase tracking-[0.2em]">Transform</h3>
              <button onClick={resetTransforms} className="text-[8px] font-black text-ruby-600 bg-ruby-50 px-2 py-1 rounded">AUTO RESET</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => handleRotate(-90)} className="p-3 bg-white border rounded-xl hover:bg-yellow-50"><FiRotateCcw className="mx-auto" /></button>
              <button onClick={() => handleRotate(90)} className="p-3 bg-white border rounded-xl hover:bg-yellow-50"><FiRotateCw className="mx-auto" /></button>
              <button onClick={() => handleFlip('h')} className="p-3 bg-white border rounded-xl hover:bg-yellow-50"><TbFlipHorizontal className="mx-auto" /></button>
              <button onClick={() => handleFlip('v')} className="p-3 bg-white border rounded-xl hover:bg-yellow-50"><TbFlipVertical className="mx-auto" /></button>
            </div>
          </div>

          {/* Dimensions */}
          <div className="glass-card p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[9px] font-black text-yellow-800 uppercase tracking-[0.2em]">Dimensions</h3>
              <button className="text-[8px] font-black text-ruby-600 bg-ruby-50 px-2 py-1 rounded">RE-SYNC</button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} className="accent-yellow-600" />
              <label className="text-[9px] font-black uppercase">Lock Aspect Ratio</label>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input type="number" placeholder="W" value={dimensions.w || ''} onChange={(e) => handleDimensionChange('w', parseInt(e.target.value) || 0)} onBlur={pushHistory} className="p-3 bg-gray-50 rounded-xl text-xs font-bold outline-none border focus:border-yellow-500 transition-all" />
              <input type="number" placeholder="H" value={dimensions.h || ''} onChange={(e) => handleDimensionChange('h', parseInt(e.target.value) || 0)} onBlur={pushHistory} className="p-3 bg-gray-50 rounded-xl text-xs font-bold outline-none border focus:border-yellow-500 transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button onClick={() => setDimensions({w: 413, h: 531})} className="py-2 bg-white border text-[8px] font-black rounded-lg hover:bg-black hover:text-white transition-all">PASSPORT</button>
              <button onClick={() => setDimensions({w: 1080, h: 1080})} className="py-2 bg-white border text-[8px] font-black rounded-lg hover:bg-black hover:text-white transition-all">INSTA</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDimensions({w: 1280, h: 720})} className="py-2 bg-white border text-[8px] font-black rounded-lg hover:bg-black hover:text-white transition-all">HD (720p)</button>
              <button onClick={() => setDimensions({w: 1920, h: 1080})} className="py-2 bg-white border text-[8px] font-black rounded-lg hover:bg-black hover:text-white transition-all">FHD (1080p)</button>
            </div>
          </div>
        </div>

        {/* Center - Workspace Canvas */}
        <div className="lg:col-span-6 order-1 lg:order-2">
          <div className="sticky-preview">
            <div className="glass-card min-h-[400px] lg:min-h-[600px] flex flex-col items-center justify-center p-4 relative overflow-hidden border-2 border-dashed border-yellow-300">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

              {!mainImageSrc ? (
                <div onClick={() => fileInputRef.current?.click()} className="text-center cursor-pointer group">
                  <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-xl border border-yellow-100 group-hover:scale-110 transition-transform">
                    <FiUploadCloud size={32} className="text-yellow-600" />
                  </div>
                  <p className="font-black text-xl tracking-tight uppercase">Launch Workspace</p>
                  <p className="text-[9px] text-gray-400 mt-2 font-black tracking-widest uppercase">Click to Select File</p>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden p-2">
                  <canvas ref={canvasRef} className="hidden" />

                  {isCropping && finalImageBlob ? (
                      <div className="max-w-full max-h-[550px]">
                          <img ref={cropperImageRef} src={finalImageBlob} alt="Crop Source" className="max-w-full block" />
                      </div>
                  ) : (
                      finalImageBlob && (
                        <img src={finalImageBlob} alt="Result" className="max-h-[550px] w-auto shadow-2xl rounded-[2rem] object-contain" />
                      )
                  )}

                  {/* Actions Float */}
                  {!isCropping && (
                    <div className="absolute top-6 right-6 flex flex-col gap-3">
                      <button onClick={() => { setMainImageSrc(null); setFinalImageBlob(null); setHistory([]); setHistoryIndex(-1); }} className="p-4 btn-ruby rounded-2xl shadow-xl active:scale-90 transition-transform z-10">
                        <FiTrash2 size={22} />
                      </button>
                      <button onClick={handleBgRemove} className="p-4 btn-brown rounded-2xl shadow-xl active:scale-90 transition-transform z-10">
                        <FiImage size={22} />
                      </button>
                    </div>
                  )}

                  {isLoading && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-2xl flex items-center justify-center z-50">
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-yellow-100 border-t-yellow-600 rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest mt-6 text-gray-900">Synchronizing AI Studio...</p>
                        </div>
                    </div>
                  )}
                </div>
              )}

              {/* Target Bar / KB Tool */}
              {mainImageSrc && (
                <div className="glass-card mt-4 p-5 flex items-center justify-between gap-4 border-2 border-white w-full">
                  <div className="flex-1">
                    <label className="text-[8px] font-black text-yellow-800 uppercase mb-2 block">KB Compression</label>
                    <div className="flex gap-2">
                        <button onClick={handleKBCalibration} className="btn-gold px-6 py-3 rounded-xl text-[9px] shadow-lg w-full">CALIBRATE TARGET KB</button>
                    </div>
                  </div>
                  <div className="text-right border-l pl-6 border-yellow-100">
                      <p className="text-[8px] font-black text-gray-400">OUTPUT</p>
                      <p className="text-2xl font-black text-[#3E2723]">{currentSizeKb} KB</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Sidebar - Production Hub */}
        <div className="lg:col-span-3 order-3 space-y-4">
          <div className="glass-card p-6">
            <h3 className="text-[9px] font-black text-yellow-800 uppercase tracking-widest mb-6">Production Hub</h3>
            <div className="space-y-5">

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase">Format</label>
                <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="w-full p-4 rounded-xl text-xs font-black outline-none cursor-pointer">
                  <option value="image/jpeg">JPG PREMIUM</option>
                  <option value="image/png">PNG LOSSLESS</option>
                  <option value="image/webp">WEBP NEXTGEN</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase"><span>Quality</span><span>{exportQuality}%</span></div>
                <input type="range" min="1" max="100" value={exportQuality} onChange={(e) => setExportQuality(parseInt(e.target.value))} />
              </div>

              <button onClick={handleDownload} className="w-full py-5 btn-gold rounded-2xl text-[10px] shadow-xl flex items-center justify-center gap-3">
                <FiDownload size={18} strokeWidth={3} />
                <span>DOWNLOAD MASTER</span>
              </button>

              <button onClick={() => { if(finalImageBlob) navigator.clipboard.writeText(finalImageBlob); }} className="w-full py-3 bg-[#1a1a1a] text-white text-[9px] font-black rounded-xl hover:bg-yellow-600 transition-colors uppercase tracking-widest">
                Copy Base64 String
              </button>

              <div className="pt-6 border-t border-yellow-100 grid grid-cols-2 gap-2">
                  <button onClick={() => handleCloudUpload('imgbb')} className="py-3 bg-gray-900 text-white text-[9px] font-black rounded-xl uppercase">ImgBB</button>
                  <button onClick={() => handleCloudUpload('cloudinary')} className="py-3 bg-blue-900 text-white text-[9px] font-black rounded-xl uppercase">Cloudinary</button>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            {!isCropping ? (
                <button onClick={activateCropper} className="w-full py-4 btn-ruby rounded-xl text-[10px] shadow-lg">INITIALIZE CROPPER</button>
            ) : (
                <div className="space-y-2">
                    <button onClick={applyCrop} className="w-full py-3 btn-gold rounded-xl text-[10px]">APPLY CROP</button>
                    <button onClick={cancelCrop} className="w-full text-[9px] font-bold text-gray-400">CANCEL</button>
                </div>
            )}
          </div>
        </div>

      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-6">
            <div className="glass-card w-full max-w-sm p-10 shadow-2xl border-2 border-yellow-500/20">
                <h2 className="text-2xl font-black mb-6 uppercase tracking-tight text-center text-white">CLOUD VAULT</h2>
                <div className="space-y-4">
                    <input type="password" value={keys.imgbb} onChange={(e) => setKeys({...keys, imgbb: e.target.value})} placeholder="ImgBB Secret Key" className="w-full p-4 bg-gray-50 rounded-2xl text-xs outline-none border transition-all focus:border-yellow-600 text-black" />
                    <input type="text" value={keys.cloud} onChange={(e) => setKeys({...keys, cloud: e.target.value})} placeholder="Cloudinary Cloud Name" className="w-full p-4 bg-gray-50 rounded-2xl text-xs border text-black" />
                    <input type="text" value={keys.preset} onChange={(e) => setKeys({...keys, preset: e.target.value})} placeholder="Cloudinary Preset" className="w-full p-4 bg-gray-50 rounded-2xl text-xs border text-black" />
                    <button onClick={saveKeys} className="w-full py-4 btn-gold rounded-2xl font-black shadow-lg">LOCK & SYNC</button>
                    <button onClick={() => setShowSettings(false)} className="w-full mt-2 text-[10px] font-black text-gray-400 uppercase">Dismiss Vault</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

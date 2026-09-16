import React, { useEffect, useRef } from 'react';

export const OscilloscopeWaveform: React.FC<{ height?: number }> = ({ height = 70 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      const w = (canvas.width = canvas.parentElement?.clientWidth || 300);
      const h = (canvas.height = height);

      ctx.clearRect(0, 0, w, h);

      // Draw horizontal zero line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Draw dynamic sine-packet wave
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 6;

      for (let x = 0; x < w; x++) {
        // Multi-frequency harmonic synthesis
        const y1 = Math.sin(x * 0.04 + t) * (h * 0.22);
        const y2 = Math.sin(x * 0.08 - t * 1.5) * (h * 0.12);
        const y3 = Math.cos(x * 0.02 + t * 0.5) * (h * 0.08);
        const envelope = Math.sin((x / w) * Math.PI); // taper ends
        const y = h / 2 + (y1 + y2 + y3) * envelope;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      t += 0.045;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [height]);

  return <canvas ref={canvasRef} className="w-full block" style={{ height }} />;
};

import React, { useEffect, useRef } from 'react';

interface CyberneticRadarCanvasProps {
  className?: string;
}

export const CyberneticRadarCanvas: React.FC<CyberneticRadarCanvasProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || 600;
    };

    window.addEventListener('resize', handleResize);

    // Mouse tracking
    let mouseX = width / 2;
    let mouseY = height / 2;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    // Particle nodes
    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      label?: string;
    }

    const nodeCount = 28;
    const nodes: Node[] = [];
    const colors = ['#38bdf8', '#60a5fa', '#bef264', '#f97316', '#a855f7'];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        label: i < 6 ? `SYS_0${i + 1}` : undefined,
      });
    }

    let radarAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadarRadius = Math.min(width, height) * 0.46;

      // 1. Draw Technical Graticule (Concentric Rings & Crosshairs)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;

      // Concentric range circles
      [0.25, 0.5, 0.75, 1.0].forEach((ratio) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadarRadius * ratio, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Axis crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadarRadius, centerY);
      ctx.lineTo(centerX + maxRadarRadius, centerY);
      ctx.moveTo(centerX, centerY - maxRadarRadius);
      ctx.lineTo(centerX, centerY + maxRadarRadius);
      ctx.stroke();

      // 2. Sweeping Radar Beam with Phosphor Fade
      radarAngle += 0.025;
      if (radarAngle > Math.PI * 2) radarAngle = 0;

      const beamGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        maxRadarRadius
      );
      beamGradient.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      beamGradient.addColorStop(0.6, 'rgba(56, 189, 248, 0.06)');
      beamGradient.addColorStop(1, 'transparent');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadarRadius, radarAngle - 0.45, radarAngle);
      ctx.closePath();
      ctx.fillStyle = beamGradient;
      ctx.fill();

      // Leading beam edge line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(radarAngle) * maxRadarRadius,
        centerY + Math.sin(radarAngle) * maxRadarRadius
      );
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 3. Update & Draw Dynamic Particle Network
      nodes.forEach((node, i) => {
        // Subtle mouse repulsion/attraction
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        if (distToMouse < 120 && distToMouse > 0) {
          node.x -= (dx / distToMouse) * 0.4;
          node.y -= (dy / distToMouse) * 0.4;
        }

        // Velocity motion
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off canvas bounds
        if (node.x < 20 || node.x > width - 20) node.vx *= -1;
        if (node.y < 20 || node.y > height - 20) node.vy *= -1;

        // Draw connections between nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const ndx = node.x - other.x;
          const ndy = node.y - other.y;
          const nDist = Math.sqrt(ndx * ndx + ndy * ndy);

          if (nDist < 90) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 * (1 - nDist / 90)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Draw Node Point
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Draw technical tag if present
        if (node.label) {
          ctx.fillStyle = 'rgba(147, 197, 253, 0.7)';
          ctx.font = '9px "Share Tech Mono", monospace';
          ctx.fillText(node.label, node.x + 8, node.y + 3);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{ pointerEvents: 'auto' }}
    />
  );
};

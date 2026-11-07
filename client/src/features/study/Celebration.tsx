import { useEffect, useRef } from 'react';
import styles from './Celebration.module.css';

const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6EC7', '#845EC2', '#FFC75F', '#00C9A7'];
type Particle = Readonly<{
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  opacity: number;
}>;

function draw(context: CanvasRenderingContext2D, particle: Particle) {
  context.save();
  context.translate(particle.x, particle.y);
  context.rotate((particle.rotation * Math.PI) / 180);
  context.globalAlpha = Math.max(0, particle.opacity);
  context.fillStyle = particle.color;
  context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
  context.restore();
}

export function Celebration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animation = { frame: 0 };
    const start = () => {
      cancelAnimationFrame(animation.frame);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      const particles: Particle[] = Array.from({ length: 150 }, () => ({
        x: Math.random() * width,
        y: reducedMotion.matches ? Math.random() * height : -10,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 10 - 14,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 24 + 12,
        opacity: reducedMotion.matches ? 0.35 : 1,
      }));
      const paint = (current: readonly Particle[]) => {
        context.clearRect(0, 0, width, height);
        current.forEach((particle) => draw(context, particle));
      };
      if (reducedMotion.matches) {
        paint(particles);
        return;
      }
      const animate = (current: readonly Particle[], previousTime: number, time: number) => {
        const step = Math.min((time - previousTime) / (1000 / 60), 3);
        const next = current
          .map((particle) => ({
            ...particle,
            x: particle.x + particle.vx * step,
            y: particle.y + particle.vy * step,
            vy: particle.vy + 0.12 * step,
            rotation: particle.rotation + particle.rotationSpeed * step,
            opacity: particle.opacity - 0.001 * step,
          }))
          .filter((particle) => particle.opacity > 0 && particle.y < height + 50);
        paint(next);
        if (next.length) animation.frame = requestAnimationFrame((nextTime) => animate(next, time, nextTime));
      };
      const now = performance.now();
      animation.frame = requestAnimationFrame((time) => animate(particles, now, time));
    };
    start();
    window.addEventListener('resize', start);
    reducedMotion.addEventListener('change', start);
    return () => {
      cancelAnimationFrame(animation.frame);
      window.removeEventListener('resize', start);
      reducedMotion.removeEventListener('change', start);
    };
  }, []);
  return <canvas ref={canvasRef} role="img" aria-label="Study completion celebration" className={styles.confetti} />;
}

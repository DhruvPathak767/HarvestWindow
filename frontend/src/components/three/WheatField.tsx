import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { WheatFieldScene } from "@/components/three/WheatFieldScene";
import { IMAGES_3D } from "@/data/mock/renders";
import { cn } from "@/utils/cn";

/**
 * React host for the WebGL wheat field. Falls back to a 3D-rendered still
 * if WebGL is unavailable, and fades the canvas in once the first frame is drawn.
 */
export function WheatField({
  getProgress,
  play = true,
  className,
}: {
  getProgress?: () => number;
  play?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<WheatFieldScene | null>(null);
  const progressRef = useRef(getProgress);
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    progressRef.current = getProgress;
  }, [getProgress]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let scene: WheatFieldScene | null = null;
    try {
      scene = new WheatFieldScene({
        container: host,
        reducedMotion: !!reduced,
        getProgress: () => progressRef.current?.() ?? 0,
        onReady: () => setReady(true),
      });
      sceneRef.current = scene;
    } catch {
      setFailed(true);
    }
    return () => {
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    if (play) sceneRef.current?.startIntro();
  }, [play, ready, reduced]);

  return (
    <div className={cn("absolute inset-0", className)} aria-hidden>
      <div
        ref={hostRef}
        className={cn(
          "absolute inset-0 transition-opacity duration-[1600ms] ease-out",
          ready ? "opacity-100" : "opacity-0"
        )}
      />
      {failed && (
        <img
          src={IMAGES_3D.portal}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
      )}
    </div>
  );
}

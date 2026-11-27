"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import { prefersReducedMotion } from "@/lib/motion";

type Direction = "forward" | "back";
type Navigate = (href: string, direction: Direction) => void;

const NavigateContext = createContext<Navigate | null>(null);
/** Tiempo máximo que la página antigua queda congelada si la nueva tarda. */
const MAX_WAIT_MS = 2500;

/**
 * Transiciones entre pantallas con la View Transitions API del navegador.
 * La captura de la página actual se mantiene hasta que el router muestra la
 * nueva ruta; los elementos con el mismo `view-transition-name` se transforman
 * de una pantalla a otra. Sin soporte o con movimiento reducido, navega normal.
 */
export function ViewTransitions({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pending = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    pending.current?.();
    pending.current = null;
  }, [pathname]);

  const navigate = useCallback<Navigate>(
    (href, direction) => {
      const target = new URL(href, window.location.href);
      const root = document.documentElement;
      if (
        typeof document.startViewTransition !== "function" ||
        prefersReducedMotion() ||
        target.pathname === window.location.pathname
      ) {
        router.push(href);
        return;
      }
      root.dataset.navDirection = direction;
      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            pending.current = resolve;
            router.push(href);
            setTimeout(resolve, MAX_WAIT_MS);
          }),
      );
      void transition.finished.finally(() => {
        delete root.dataset.navDirection;
      });
    },
    [router],
  );

  return (
    <NavigateContext.Provider value={navigate}>
      {children}
    </NavigateContext.Provider>
  );
}

/** `Link` que anima el cambio de pantalla cuando el navegador lo permite. */
export function TransitionLink({
  direction = "forward",
  onClick,
  ...props
}: ComponentProps<typeof Link> & { direction?: Direction }) {
  const navigate = useContext(NavigateContext);
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      !navigate ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (props.target && props.target !== "_self") ||
      typeof props.href !== "string"
    )
      return;
    event.preventDefault();
    navigate(props.href, direction);
  }
  return <Link {...props} onClick={handleClick} />;
}

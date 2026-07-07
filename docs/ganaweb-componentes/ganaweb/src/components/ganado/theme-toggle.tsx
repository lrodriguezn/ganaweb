import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle — alterna claro/oscuro agregando/quitando `dark` en <html>.
 * Spec: ganaweb-design.md v1.1 — el modo oscuro existe para el ordeño y
 * los manejos de madrugada; claro sigue siendo el default (trabajo al sol).
 *
 * La preferencia se persiste en localStorage ("ganaweb-theme"). Para
 * evitar el flash al cargar, incluir en el <head> del documento:
 *
 *   <script>
 *     if (localStorage.getItem("ganaweb-theme") === "dark")
 *       document.documentElement.classList.add("dark");
 *   </script>
 */
const STORAGE_KEY = "ganaweb-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState<boolean>(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    } catch {
      /* almacenamiento no disponible: la preferencia dura la sesión */
    }
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-pressed={dark}
      className={cn(
        "size-9 rounded-lg flex items-center justify-center text-muted-foreground",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {dark ? (
        <Sun aria-hidden="true" className="size-4" />
      ) : (
        <Moon aria-hidden="true" className="size-4" />
      )}
    </button>
  );
}

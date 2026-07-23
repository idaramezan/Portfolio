import { useEffect } from "react";
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    let element = document.querySelector(
      'meta[name="description"]',
    ) as HTMLMetaElement | null;
    if (!element) {
      element = document.createElement("meta");
      element.name = "description";
      document.head.appendChild(element);
    }
    element.content = description;
  }, [title, description]);
}

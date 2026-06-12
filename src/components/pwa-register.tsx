"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return
    }

    const load = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      } catch {
        // Offline support is best-effort during beta.
      }
    }

    void load()
  }, [])

  return null
}

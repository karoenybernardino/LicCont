import { useSyncExternalStore } from "react";

// Endereço do site no navegador ("" no servidor): o QR leva a ele.
export const useOrigem = () => useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");

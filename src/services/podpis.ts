/** Elektronicky podepsaná revizní zpráva – nahrání, stažení a odebrání podepsaného PDF. */
import { buildApiUrl, getAuthHeaders, handleResponse } from './httpClient';

export interface PodpisOvereni {
  casoveRazitko: boolean;
  podepsal: string | null;
  vydavatel: string | null;
  kvalifikovany: boolean;
  casPodpisu: string | null;
  platnostCertifikatuDo: string | null;
  otiskSouhlasi: boolean | null;
  podpisPlatny: boolean | null;
  pokryvaCelySoubor: boolean;
  chyba?: string;
}

export interface PodepsanaZprava {
  id: number;
  revizeId: number;
  nazev: string;
  velikost: number;
  podepsal: string | null;
  vydavatel: string | null;
  kvalifikovany: boolean;
  casPodpisu: string | null;
  overeni: PodpisOvereni[] | null;
  nahranoAt: string;
}

const souborNaDataUrl = (file: Blob): Promise<string> => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(r.error ?? new Error('Soubor nelze načíst'));
  r.readAsDataURL(file);
});

export const podpisService = {
  async get(revizeId: number): Promise<PodepsanaZprava | null> {
    const res = await fetch(buildApiUrl(`/revize/${revizeId}/podepsana`), { headers: getAuthHeaders() });
    return handleResponse<PodepsanaZprava | null>(res);
  },

  async nahrat(revizeId: number, file: File): Promise<{ podepsal: string | null; kvalifikovany: boolean; casPodpisu: string | null }> {
    if (!navigator.onLine) throw new Error('Nahrání podepsané zprávy vyžaduje připojení k internetu.');
    const data = await souborNaDataUrl(file);
    const res = await fetch(buildApiUrl(`/revize/${revizeId}/podepsana`), {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ nazev: file.name, data }),
    });
    return handleResponse(res);
  },

  async stahnout(revizeId: number): Promise<void> {
    const res = await fetch(buildApiUrl(`/revize/${revizeId}/podepsana/soubor`), { headers: getAuthHeaders() });
    const { nazev, data } = await handleResponse<{ nazev: string; data: string }>(res);
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nazev || `revize-${revizeId}-podepsano.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },

  async odebrat(revizeId: number): Promise<void> {
    const res = await fetch(buildApiUrl(`/revize/${revizeId}/podepsana`), { method: 'DELETE', headers: getAuthHeaders() });
    await handleResponse(res);
  },
};

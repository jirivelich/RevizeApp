// Roboto Regular font v base64 pro jsPDF

import { jsPDF } from 'jspdf';

// Transliterace českých znaků - spolehlivé řešení
export function transliterateCzech(text: string | undefined | null): string {
  if (!text) return '';
  
  const map: Record<string, string> = {
    'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i', 
    'ň': 'n', 'ó': 'o', 'ř': 'r', 'š': 's', 'ť': 't', 'ú': 'u', 
    'ů': 'u', 'ý': 'y', 'ž': 'z',
    'Á': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E', 'Ě': 'E', 'Í': 'I', 
    'Ň': 'N', 'Ó': 'O', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ú': 'U', 
    'Ů': 'U', 'Ý': 'Y', 'Ž': 'Z',
    'ö': 'o', 'ü': 'u', 'ä': 'a', 'Ö': 'O', 'Ü': 'U', 'Ä': 'A',
    'ß': 'ss', '°': ' st.', '²': '2', '³': '3', 'Ω': 'Ohm'
  };
  
  return text.split('').map(char => map[char] || char).join('');
}

// Alias pro kratší zápis
export const t = transliterateCzech;

// Funkce pro přidání fontu do jsPDF instance (fallback na helvetica)
export async function addCzechFont(doc: jsPDF): Promise<void> {
  // Použijeme helvetica - text bude transliterován
  doc.setFont('helvetica');
}

// Roboto font s podporou češtiny pro jsPDF
import { jsPDF } from 'jspdf';
import { robotoRegular, robotoBold } from './robotoFont';

// Funkce pro přidání fontu do jsPDF instance
export async function addCzechFont(doc: jsPDF): Promise<void> {
  // Přidáme Roboto font s podporou Unicode/české diakritiky
  doc.addFileToVFS('Roboto-Regular.ttf', robotoRegular);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  
  doc.addFileToVFS('Roboto-Bold.ttf', robotoBold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  
  doc.setFont('Roboto');
}

// Funkce pro text - nyní jen průchozí, protože máme správný font
export function t(text: string | undefined | null): string {
  if (!text) return '';
  return text;
}

// Zachováme alias pro zpětnou kompatibilitu
export const transliterateCzech = t;

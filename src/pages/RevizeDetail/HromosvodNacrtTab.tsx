import React from 'react';
import type { Revize } from '../../types';
import { HromosvodNacrtCanvas } from '../../components/HromosvodNacrtCanvas';

interface Props {
  formData: Partial<Revize>;
  setFormData: (data: Partial<Revize>) => void;
}

export const HromosvodNacrtTab: React.FC<Props> = ({ formData, setFormData }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Náčrt LPS schématu</h3>
        <p className="text-sm text-slate-500">
          Nakreslete schéma systému ochrany před bleskem na půdorys nebo obrys objektu.
          Umístěte symboly jímačů, svodů a uzemnění a propojte je vedením hromosvodu.
          Výsledek bude součástí tiskové sestavy revize.
        </p>
      </div>

      <HromosvodNacrtCanvas
        value={formData.hromosvodNacrt}
        onChange={(dataUrl) => setFormData({ ...formData, hromosvodNacrt: dataUrl })}
      />
    </div>
  );
};

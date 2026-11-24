/**
 * Ověření elektronického podpisu v PDF (PAdES / adbe.pkcs7.detached) bez externích knihoven.
 *
 * Co se ověřuje:
 *  - PDF obsahuje podpis (slovník s /ByteRange a CMS SignedData v /Contents),
 *  - otisk podepsaných bajtů souhlasí s otiskem v podpisu (dokument se po podpisu nezměnil),
 *  - podpis nad podepsanými atributy odpovídá veřejnému klíči certifikátu podepisujícího,
 *  - poslední podpis pokrývá celý soubor (za ním už nebylo nic připsáno).
 *
 * Co se NEověřuje: důvěryhodnost certifikační autority, řetězec certifikátů, odvolání (OCSP/CRL)
 * a platnost v čase podpisu. To ukáže Adobe Reader / ověřovací služba – zde jen informativně
 * vracíme, zda je certifikát kvalifikovaný (rozšíření QCStatements s QcCompliance).
 */
import { createHash, createPublicKey, verify as cryptoVerify, X509Certificate } from 'node:crypto';

// ── Minimální DER parser ──────────────────────────────────────────────────

interface Der {
  tag: number;
  /** Začátek celého prvku (včetně hlavičky). */
  start: number;
  /** Začátek obsahu. */
  contentStart: number;
  end: number;
  buf: Buffer;
}

function readDer(buf: Buffer, pos: number): Der {
  const tag = buf[pos];
  let p = pos + 1;
  let len = buf[p++];
  if (len === undefined || tag === undefined) throw new Error('Neplatná struktura podpisu (DER)');
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4) throw new Error('Nepodporovaná délka v DER');
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[p++];
  }
  const end = p + len;
  if (end > buf.length) throw new Error('Zkrácená struktura podpisu (DER)');
  return { tag, start: pos, contentStart: p, end, buf };
}

function children(d: Der): Der[] {
  const out: Der[] = [];
  let p = d.contentStart;
  while (p < d.end) {
    const c = readDer(d.buf, p);
    out.push(c);
    p = c.end;
  }
  return out;
}

const content = (d: Der) => d.buf.subarray(d.contentStart, d.end);
const whole = (d: Der) => d.buf.subarray(d.start, d.end);

function oid(d: Der): string {
  const b = content(d);
  const parts: number[] = [Math.floor(b[0] / 40), b[0] % 40];
  let v = 0;
  for (let i = 1; i < b.length; i++) {
    v = v * 128 + (b[i] & 0x7f);
    if (!(b[i] & 0x80)) { parts.push(v); v = 0; }
  }
  return parts.join('.');
}

function derTime(d: Der): string | null {
  const s = content(d).toString('latin1');
  // UTCTime YYMMDDHHMMSSZ, GeneralizedTime YYYYMMDDHHMMSSZ
  const m = d.tag === 0x17 ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z$/.exec(s)
    : d.tag === 0x18 ? /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(?:\.\d+)?Z$/.exec(s) : null;
  if (!m) return null;
  const rok = d.tag === 0x17 ? (Number(m[1]) < 50 ? 2000 : 1900) + Number(m[1]) : Number(m[1]);
  return new Date(Date.UTC(rok, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0))).toISOString();
}

// ── OID ───────────────────────────────────────────────────────────────────

const OID_SIGNED_DATA = '1.2.840.113549.1.7.2';
const OID_MESSAGE_DIGEST = '1.2.840.113549.1.9.4';
const OID_SIGNING_TIME = '1.2.840.113549.1.9.5';
const HASH: Record<string, string> = {
  '1.3.14.3.2.26': 'sha1',
  '2.16.840.1.101.3.4.2.1': 'sha256',
  '2.16.840.1.101.3.4.2.2': 'sha384',
  '2.16.840.1.101.3.4.2.3': 'sha512',
};
const OID_RSA_PSS = '1.2.840.113549.1.1.10';
// QCStatements (id-pe-qcStatements) a QcCompliance (id-etsi-qcs-QcCompliance) v DER
const QC_STATEMENTS = Buffer.from('06082b06010505070103', 'hex');
const QC_COMPLIANCE = Buffer.from('060604008e460101', 'hex');

// ── Výsledek ──────────────────────────────────────────────────────────────

export interface PodpisInfo {
  /** Podpis časového razítka dokumentu (DocTimeStamp), ne podpis osoby. */
  casoveRazitko: boolean;
  podepsal: string | null;
  vydavatel: string | null;
  kvalifikovany: boolean;
  casPodpisu: string | null;
  platnostCertifikatuDo: string | null;
  /** Otisk dokumentu souhlasí s podpisem. */
  otiskSouhlasi: boolean | null;
  /** Kryptografický podpis odpovídá certifikátu. null = nelze ověřit (nepodporovaný algoritmus). */
  podpisPlatny: boolean | null;
  pokryvaCelySoubor: boolean;
  chyba?: string;
}

export interface OvereniPdf {
  jePdf: boolean;
  podpisy: PodpisInfo[];
  /** Souhrnně: PDF je podepsané osobou, podpis sedí a po podpisu se dokument neměnil. */
  ok: boolean;
  /** Lidsky čitelný důvod, proč ok === false. */
  duvod?: string;
  /** Hlavní (poslední) podpis osoby. */
  hlavni?: PodpisInfo;
}

const cn = (dn: string | undefined): string | null => {
  if (!dn) return null;
  const radek = dn.split('\n').find(r => r.startsWith('CN='));
  return radek ? radek.slice(3) : dn.split('\n')[0] ?? null;
};

function analyzujCms(der: Buffer, podepsaneBajty: Buffer[], casoveRazitko: boolean): Omit<PodpisInfo, 'pokryvaCelySoubor' | 'casoveRazitko'> {
  const info: Omit<PodpisInfo, 'pokryvaCelySoubor' | 'casoveRazitko'> = {
    podepsal: null, vydavatel: null, kvalifikovany: false, casPodpisu: null, platnostCertifikatuDo: null,
    otiskSouhlasi: null, podpisPlatny: null,
  };
  const contentInfo = readDer(der, 0);
  const [typ, obal] = children(contentInfo);
  if (!typ || oid(typ) !== OID_SIGNED_DATA || !obal) throw new Error('Podpis neobsahuje CMS SignedData');
  const signedData = children(obal)[0];
  const sd = children(signedData);
  // version, digestAlgorithms, encapContentInfo, [0] certificates?, [1] crls?, signerInfos
  const certs = sd.filter(c => c.tag === 0xa0).flatMap(c => children(c)).filter(c => c.tag === 0x30)
    .map(c => { try { return new X509Certificate(whole(c)); } catch { return null; } })
    .filter((c): c is X509Certificate => c !== null);
  const signerInfos = sd[sd.length - 1];
  const si = children(children(signerInfos)[0]);
  // version, sid, digestAlgorithm, [0] signedAttrs?, signatureAlgorithm, signature, [1]?
  const sid = si[1];
  const digestAlg = HASH[oid(children(si[2])[0])];
  const signedAttrs = si.find(c => c.tag === 0xa0);
  const idxAttrs = signedAttrs ? si.indexOf(signedAttrs) : 2;
  const sigAlgSeq = si[idxAttrs + 1];
  const signature = content(si[idxAttrs + 2]);

  // Certifikát podepisujícího: podle sériového čísla (issuerAndSerialNumber), jinak první koncový
  let cert: X509Certificate | undefined;
  if (sid?.tag === 0x30) {
    const serial = content(children(sid)[1]).toString('hex').replace(/^(00)+/, '').toUpperCase();
    cert = certs.find(c => c.serialNumber.replace(/^(00)+/, '').toUpperCase() === serial);
  }
  cert ??= certs.find(c => !c.ca) ?? certs[0];
  if (cert) {
    info.podepsal = cn(cert.subject);
    info.vydavatel = cn(cert.issuer);
    info.platnostCertifikatuDo = new Date(cert.validTo).toISOString();
    const raw = cert.raw;
    info.kvalifikovany = raw.includes(QC_STATEMENTS) && raw.includes(QC_COMPLIANCE);
  }

  if (!signedAttrs) {
    info.chyba = 'Podpis bez podepsaných atributů není podporován';
    return info;
  }
  let otiskVPodpisu: Buffer | null = null;
  for (const attr of children(signedAttrs)) {
    const [aOid, hodnoty] = children(attr);
    const prvni = hodnoty ? children(hodnoty)[0] : undefined;
    if (!prvni) continue;
    if (oid(aOid) === OID_MESSAGE_DIGEST) otiskVPodpisu = content(prvni);
    if (oid(aOid) === OID_SIGNING_TIME) info.casPodpisu = derTime(prvni);
  }

  // U časového razítka je otisk dokumentu v TSTInfo (messageImprint), ne v messageDigest
  if (!casoveRazitko && digestAlg && otiskVPodpisu) {
    const h = createHash(digestAlg);
    for (const b of podepsaneBajty) h.update(b);
    info.otiskSouhlasi = h.digest().equals(otiskVPodpisu);
  }

  // Podpis je nad DER kódováním signedAttrs s tagem SET (0x31) místo [0]
  if (cert && digestAlg && sigAlgSeq) {
    const data = Buffer.from(whole(signedAttrs));
    data[0] = 0x31;
    try {
      const key = createPublicKey(cert.publicKey.export({ type: 'spki', format: 'pem' }));
      const pss = oid(children(sigAlgSeq)[0]) === OID_RSA_PSS;
      info.podpisPlatny = cryptoVerify(
        digestAlg, data,
        pss ? { key, padding: 6 /* RSA_PKCS1_PSS_PADDING */, saltLength: -2 } : key,
        signature,
      );
      // ECDSA podpis v CMS je DER, Node ho tak i očekává (dsaEncoding: 'der' je výchozí)
    } catch {
      info.podpisPlatny = null;
    }
  }
  return info;
}

/** Najde všechny podpisové slovníky podle /ByteRange a ověří je. */
export function overPodpisPdf(pdf: Buffer): OvereniPdf {
  const jePdf = pdf.subarray(0, 1024).includes('%PDF-');
  if (!jePdf) return { jePdf, podpisy: [], ok: false, duvod: 'Soubor není PDF.' };

  const text = pdf.toString('latin1');
  const re = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
  const podpisy: PodpisInfo[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const [a0, a1, b0, b1] = m.slice(1, 5).map(Number);
    const pokryvaCelySoubor = a0 === 0 && b0 + b1 === pdf.length;
    // Typ podpisu podle okolí slovníku (SubFilter / Type)
    const okoli = text.slice(Math.max(0, m.index - 1500), Math.min(text.length, m.index + 1500));
    const casoveRazitko = /\/SubFilter\s*\/ETSI\.RFC3161|\/Type\s*\/DocTimeStamp/.test(okoli);
    const zaklad: PodpisInfo = {
      casoveRazitko, podepsal: null, vydavatel: null, kvalifikovany: false, casPodpisu: null,
      platnostCertifikatuDo: null, otiskSouhlasi: null, podpisPlatny: null, pokryvaCelySoubor,
    };
    if (a0 !== 0 || a1 > b0 || b0 + b1 > pdf.length) {
      podpisy.push({ ...zaklad, chyba: 'Neplatný rozsah podpisu (ByteRange)' });
      continue;
    }
    try {
      const hex = pdf.subarray(a1, b0).toString('latin1').replace(/[<>\s]/g, '');
      const der = Buffer.from(hex, 'hex');
      const info = analyzujCms(der, [pdf.subarray(a0, a0 + a1), pdf.subarray(b0, b0 + b1)], casoveRazitko);
      podpisy.push({ ...zaklad, ...info });
    } catch (e) {
      podpisy.push({ ...zaklad, chyba: (e as Error).message });
    }
  }

  const osobni = podpisy.filter(p => !p.casoveRazitko);
  const hlavni = osobni[osobni.length - 1];
  const posledni = podpisy[podpisy.length - 1];
  let duvod: string | undefined;
  if (!hlavni) duvod = 'PDF neobsahuje elektronický podpis. Podepište zprávu a nahrajte podepsaný soubor.';
  else if (hlavni.chyba) duvod = `Podpis nelze přečíst: ${hlavni.chyba}.`;
  else if (osobni.some(p => p.otiskSouhlasi === false)) duvod = 'Dokument byl po podpisu změněn – podpis neodpovídá obsahu.';
  else if (osobni.some(p => p.podpisPlatny === false)) duvod = 'Podpis neodpovídá certifikátu podepisujícího.';
  else if (!posledni.pokryvaCelySoubor) duvod = 'Za posledním podpisem byly do PDF připsány další změny.';
  return { jePdf, podpisy, ok: !duvod, duvod, hlavni };
}

// Gerador de QR code local (sem serviço externo): modo byte, correção L,
// versões 1 a 6 (até 134 bytes). Máscara escolhida só pelas regras 1 e 2 de
// penalidade (shortcut: basta para uma URL curta; se a leitura falhar em
// impressão ruim, completar as regras 3 e 4 ou trocar por biblioteca).

const ECC_POR_BLOCO = [7, 10, 15, 20, 26, 18];
const BLOCOS = [1, 1, 1, 1, 1, 2];
const ALINHAMENTO = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];

export const urlDaCaixa = (origem: string, caixaId: string) => `${origem.replace(/\/+$/, "")}/mapa?caixa=${caixaId}`;

const EXP: number[] = [];
const LOG: number[] = [];
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 256) x ^= 0x11d;
}
const mul = (a: number, b: number) => (a && b ? EXP[(LOG[a] + LOG[b]) % 255] : 0);

function restoRS(dados: number[], grau: number) {
  let g = [1];
  for (let i = 0; i < grau; i++) {
    const n = new Array<number>(g.length + 1).fill(0);
    g.forEach((c, j) => {
      n[j] ^= c;
      n[j + 1] ^= mul(c, EXP[i]);
    });
    g = n;
  }
  const r = new Array<number>(grau).fill(0);
  for (const b of dados) {
    const f = b ^ r.shift()!;
    r.push(0);
    g.slice(1).forEach((c, j) => (r[j] ^= mul(c, f)));
  }
  return r;
}

function codigosBrutos(v: number) {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) {
    const a = Math.floor(v / 7) + 2;
    r -= (25 * a - 10) * a - 55;
  }
  return r >> 3;
}

export function gerarQr(texto: string): boolean[][] {
  const bytes = [...new TextEncoder().encode(texto)];
  let v = 1;
  while (v <= 6 && codigosBrutos(v) - ECC_POR_BLOCO[v - 1] * BLOCOS[v - 1] < bytes.length + 2) v++;
  if (v > 6) throw new Error("Texto grande demais para o QR.");
  const brutos = codigosBrutos(v);
  const eccLen = ECC_POR_BLOCO[v - 1];
  const nBlocos = BLOCOS[v - 1];
  const nDados = brutos - eccLen * nBlocos;

  const bits: number[] = [];
  const poe = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  poe(4, 4);
  poe(bytes.length, 8);
  bytes.forEach((b) => poe(b, 8));
  poe(0, Math.min(4, nDados * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const dados: number[] = [];
  for (let i = 0; i < bits.length; i += 8) dados.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let p = 0xec; dados.length < nDados; p ^= 0xec ^ 0x11) dados.push(p);

  // Blocos e intercalação.
  const curtos = nBlocos - (brutos % nBlocos);
  const tamCurto = Math.floor(brutos / nBlocos);
  const blocos: { d: number[]; e: number[] }[] = [];
  for (let i = 0, k = 0; i < nBlocos; i++) {
    const d = dados.slice(k, k + tamCurto - eccLen + (i < curtos ? 0 : 1));
    k += d.length;
    blocos.push({ d, e: restoRS(d, eccLen) });
  }
  const todos: number[] = [];
  for (let i = 0; i < tamCurto - eccLen + 1; i++) blocos.forEach((b) => i < b.d.length && todos.push(b.d[i]));
  for (let i = 0; i < eccLen; i++) blocos.forEach((b) => todos.push(b.e[i]));

  const n = v * 4 + 17;
  const m = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const fn = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const set = (x: number, y: number, escuro: boolean) => {
    m[y][x] = escuro;
    fn[y][x] = true;
  };
  for (let i = 0; i < n; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]])
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < n && y >= 0 && y < n) set(x, y, d !== 2 && d !== 4);
      }
  const pos = ALINHAMENTO[v - 1];
  for (const cx of pos)
    for (const cy of pos) {
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === pos[1]) || (cx === pos[1] && cy === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  const formato = (mascara: number) => {
    const d = (1 << 3) | mascara; // correção L = 01
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const f = ((d << 10) | r) ^ 0x5412;
    const b = (i: number) => ((f >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, b(i));
    set(8, 7, b(6));
    set(8, 8, b(7));
    set(7, 8, b(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, b(i));
    for (let i = 0; i < 8; i++) set(n - 1 - i, 8, b(i));
    for (let i = 8; i < 15; i++) set(8, n - 15 + i, b(i));
    set(8, n - 8, true);
  };
  formato(0); // reserva as áreas de formato antes de espalhar os dados

  const reservado = fn.map((l) => [...l]);
  let k = 0;
  for (let dir = n - 1; dir >= 1; dir -= 2) {
    if (dir === 6) dir = 5;
    for (let vert = 0; vert < n; vert++)
      for (let j = 0; j < 2; j++) {
        const x = dir - j;
        const y = ((dir + 1) & 2) === 0 ? n - 1 - vert : vert;
        if (!reservado[y][x] && k < todos.length * 8) {
          m[y][x] = ((todos[k >>> 3] >>> (7 - (k & 7))) & 1) !== 0;
          k++;
        }
      }
  }

  const MASCARAS = [
    (x: number, y: number) => (x + y) % 2 === 0,
    (_: number, y: number) => y % 2 === 0,
    (x: number) => x % 3 === 0,
    (x: number, y: number) => (x + y) % 3 === 0,
    (x: number, y: number) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x: number, y: number) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x: number, y: number) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const aplicar = (i: number) => {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!reservado[y][x] && MASCARAS[i](x, y)) m[y][x] = !m[y][x];
  };
  const penalidade = () => {
    let p = 0;
    for (let a = 0; a < n; a++) {
      let h = 1;
      let w = 1;
      for (let b = 1; b < n; b++) {
        h = m[a][b] === m[a][b - 1] ? h + 1 : 1;
        w = m[b][a] === m[b - 1][a] ? w + 1 : 1;
        p += (h === 5 ? 3 : h > 5 ? 1 : 0) + (w === 5 ? 3 : w > 5 ? 1 : 0);
      }
    }
    for (let y = 0; y < n - 1; y++)
      for (let x = 0; x < n - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
    return p;
  };
  let melhor = 0;
  let menor = Infinity;
  for (let i = 0; i < 8; i++) {
    aplicar(i);
    const p = penalidade();
    if (p < menor) [menor, melhor] = [p, i];
    aplicar(i);
  }
  aplicar(melhor);
  formato(melhor);
  return m;
}

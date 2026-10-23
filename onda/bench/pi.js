const n = 200000000; let s = 0;
for (let i = 0; i < n; i++) { const x = (i + 0.5) / n; s += 4.0 / (1.0 + x * x); }
console.log(s / n);
